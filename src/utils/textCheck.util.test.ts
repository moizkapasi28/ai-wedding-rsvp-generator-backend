import assert from "node:assert/strict";
import { test } from "node:test";
import { findMissingText, typesetWithTextCheck } from "./textCheck.util";

const expected = [
  { label: "bride name", value: "Priyá Sharma" },
  { label: "groom name", value: "Arjun Mehta" },
  { label: "event", value: "Sangeet" },
  { label: "date", value: "28 March 2030" },
  { label: "venue", value: "The Leela Palace" },
];

const card = `PRIYA SHARMA
&
Arjun Mehta
request the pleasure of your company at the
Sangeet
Thursday, 28th March 2030 · 7:00 PM
The Leela Palace, Udaipur`;

test("text read off a correct card matches, whatever the case, accents, order or ordinals", () => {
  assert.deepEqual(findMissingText(expected, card), []);
});

test("a misspelt name and a wrong date are reported by label", () => {
  const wrong = card.replace("Mehta", "Metha").replace("2030", "2031");
  assert.deepEqual(findMissingText(expected, wrong), ["groom name", "date"]);
});

test("a number doesn't match a different number's ordinal", () => {
  assert.deepEqual(findMissingText([{ label: "date", value: "2 March" }], "22nd March"), ["date"]);
});

// The fake typesetter returns which attempt it was; readText says what that card reads as
const run = (reads: (string | Error)[], typesetFails = false) => {
  let typesets = 0;
  return typesetWithTextCheck({
    typeset: async () => {
      typesets++;
      if (typesetFails && typesets > 1) throw new Error("Gemini down");
      return typesets;
    },
    readText: async (attempt) => {
      const read = reads[attempt - 1];
      if (read instanceof Error) throw read;
      return read;
    },
    expected,
  }).then((result) => ({ ...result, typesets }));
};

test("a correct first card is kept with one typesetting call", async () => {
  assert.deepEqual(await run([card]), { image: 1, textCheck: "PASSED", missing: [], typesets: 1 });
});

test("a mismatch gets exactly one more typesetting call", async () => {
  const fixed = await run([card.replace("Mehta", "Metha"), card]);
  assert.deepEqual(fixed, { image: 2, textCheck: "PASSED", missing: [], typesets: 2 });

  const stillWrong = await run([card.replace("Mehta", "Metha"), card.replace("Sangeet", "Sangit")]);
  assert.equal(stillWrong.typesets, 2);
  assert.equal(stillWrong.textCheck, "MISMATCH");
});

test("the retry is kept only if it reads at least as well", async () => {
  const worse = await run([
    card.replace("Mehta", "Metha"),
    card.replace("Mehta", "Metha").replace("Sangeet", "Sangit"),
  ]);
  assert.deepEqual(worse, { image: 1, textCheck: "MISMATCH", missing: ["groom name"], typesets: 2 });
});

test("an unreadable card or a failed retry never fails the generation", async () => {
  assert.deepEqual(await run([new Error("read failed")]), { image: 1, textCheck: null, missing: [], typesets: 1 });

  const retryFailed = await run([card.replace("Mehta", "Metha")], true);
  assert.deepEqual(retryFailed, { image: 1, textCheck: "MISMATCH", missing: ["groom name"], typesets: 2 });
});
