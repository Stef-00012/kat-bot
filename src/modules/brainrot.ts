import { doubleMetaphone } from "double-metaphone";
import latinize from "latinize";
import stringSimilarity from "string-similarity-js";

const words = ["skibidi", "sigma", "gronk", "fanum", "rizz", "gyatt", "σ", "balls"];

export function brainRotEval(msg: string) {
  // process
  msg = latinize(msg);
  msg = msg
    // .replace(/[^A-Za-z0-9\s]/gi, "")
    .trim()
    .toLowerCase()
    .normalize("NFKD");
  const inputs = msg.split(/\s/g);
  const metaPhoneValues = inputs.map((x) => doubleMetaphone(x)).flat();

  let flaggedCount = 0;
  for (const input of inputs) {
    for (const word of words) {
      if (input === word || input.includes(word)) {
        flaggedCount++;
      }

      if (stringSimilarity(word, input) >= 0.85) {
        flaggedCount++;
      }
    }
  }

  if (metaPhoneValues.includes("SKPT")) {
    flaggedCount++;
  }

  if (metaPhoneValues.includes("SKPT") && metaPhoneValues.includes("TLT")) {
    flaggedCount += 2;
  }

  if (metaPhoneValues.includes("FNM") && metaPhoneValues.includes("TKS")) {
    flaggedCount += 2;
  }

  return flaggedCount;
}
