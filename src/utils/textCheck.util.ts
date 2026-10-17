// Checking the text Gemini typeset on an invite card against what it was asked to write.
// Import-free so it can be unit tested without an env, a database or Gemini.

export type ExpectedText = { label: string; value: string }[];

export type TextCheck = "PASSED" | "MISMATCH";

// Case, accents, punctuation and line breaks don't count; only the words do
const words = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

// The labels of expected values with a word missing from the read text, in any order.
// A number also matches its ordinal ("28" in "28th").
// ponytail: only Latin-script words are compared, so a name in another script always passes;
// compare transliterations if hosts use those
export const findMissingText = (expected: ExpectedText, readText: string) => {
  const read = new Set(words(readText));
  const has = (word: string) =>
    read.has(word) ||
    (/^\d+$/.test(word) &&
      ["st", "nd", "rd", "th"].some((suffix) => read.has(word + suffix)));

  return expected
    .filter(({ value }) => words(value).some((word) => !has(word)))
    .map(({ label }) => label);
};

// TYPESETTING, then a read-back. A mismatch gets one more TYPESETTING (DESIGN is never redone
// here) and the image with fewer missing values wins. Reading or retrying going wrong never
// fails the card: it completes with what it has.
export const typesetWithTextCheck = async <Image>({
  typeset,
  readText,
  expected,
}: {
  typeset: () => Promise<Image>;
  readText: (image: Image) => Promise<string>;
  expected: ExpectedText;
}): Promise<{ image: Image; textCheck: TextCheck | null; missing: string[] }> => {
  const check = async (image: Image) => {
    try {
      return findMissingText(expected, await readText(image));
    } catch {
      return null;
    }
  };

  const first = await typeset();
  const firstMissing = await check(first);
  if (!firstMissing) return { image: first, textCheck: null, missing: [] };
  if (!firstMissing.length) return { image: first, textCheck: "PASSED", missing: [] };

  let second: Image;
  try {
    second = await typeset();
  } catch {
    return { image: first, textCheck: "MISMATCH", missing: firstMissing };
  }
  const secondMissing = await check(second);

  const best =
    secondMissing && secondMissing.length <= firstMissing.length
      ? { image: second, missing: secondMissing }
      : { image: first, missing: firstMissing };

  return {
    image: best.image,
    textCheck: best.missing.length ? "MISMATCH" : "PASSED",
    missing: best.missing,
  };
};
