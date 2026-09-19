import { createHash } from "node:crypto";

// Identifies the exact stage 1 input that produced a saved artwork. Hashing the built
// prompt (rather than a hand-picked list of columns) means any change that could alter the
// artwork — including an edit to a prompt builder — forces a redraw, while text-only
// fields, which only reach stage 2, do not.
export const computeDesignFingerprint = ({
  model,
  prompt,
  imageKeys,
}: {
  model: string;
  prompt: string;
  imageKeys: (string | null)[];
}): string =>
  createHash("sha256")
    .update(JSON.stringify([model, prompt, imageKeys]))
    .digest("hex");
