import { AttireConfig } from "../types/eventInviteFormat.type";

export const NEUTRAL_DEFAULT_ATTIRE_PROMPT =
  "elegant, well-tailored formal wedding attire suited to this artistic style — a " +
  "structured jacket/suit for the groom, a flowing gown or fitted ensemble for the " +
  "bride, in colors and embellishment consistent with the chosen art style. Keep " +
  "attire modest and elegant. Do not default to any single culture, region, or " +
  "religious tradition's ceremonial dress unless the user has specifically selected one.";

export const ATTIRE_CATALOG: Record<string, AttireConfig> = {
  default: {
    attireId: "default",
    displayName: "Default / Let style decide",
    category: "Neutral",
    promptBody: NEUTRAL_DEFAULT_ATTIRE_PROMPT,
    appliesTo: "both",
  },
  lehenga_sherwani: {
    attireId: "lehenga_sherwani",
    displayName: "Lehenga & Sherwani",
    category: "South Asian ceremonial",
    promptBody:
      "a richly embroidered lehenga with dupatta for the bride and a matching " +
      "sherwani with churidar for the groom",
    appliesTo: "couple",
  },
  sharara_sherwani: {
    attireId: "sharara_sherwani",
    displayName: "Sharara/Gharara & Sherwani",
    category: "South Asian ceremonial (Nikah-style)",
    promptBody:
      "an embellished sharara or gharara set with dupatta for the bride and a " +
      "matching sherwani for the groom, Nikah-style ceremonial formality",
    appliesTo: "couple",
  },
  kurta_pagri_sharara: {
    attireId: "kurta_pagri_sharara",
    displayName: "Kurta, Pagri & Sharara",
    category: "South Asian ceremonial (Anand Karaj-style)",
    promptBody:
      "a sharara or salwar set with dupatta for the bride and a kurta with pagri " +
      "(turban) for the groom, Anand Karaj-style ceremonial formality",
    appliesTo: "couple",
  },
  saree_bandhgala: {
    attireId: "saree_bandhgala",
    displayName: "Saree & Bandhgala",
    category: "South Asian ceremonial",
    promptBody:
      "a silk ceremonial saree with draped pallu for the bride and a fitted " +
      "bandhgala jacket for the groom",
    appliesTo: "couple",
  },
  white_gown_tuxedo: {
    attireId: "white_gown_tuxedo",
    displayName: "White Gown & Tuxedo",
    category: "Western/church-style formal",
    promptBody:
      "a flowing white wedding gown for the bride and a classic black tuxedo for the groom",
    appliesTo: "couple",
  },
  qipao_tang_suit: {
    attireId: "qipao_tang_suit",
    displayName: "Qipao/Cheongsam & Tang Suit",
    category: "East Asian ceremonial",
    promptBody:
      "an embroidered red qipao/cheongsam for the bride and a matching Tang suit for the groom",
    appliesTo: "couple",
  },
  hanbok: {
    attireId: "hanbok",
    displayName: "Hanbok",
    category: "Korean ceremonial",
    promptBody:
      "a traditional Korean hanbok with structured jeogori and full chima skirt " +
      "for the bride, and a matching durumagi for the groom",
    appliesTo: "couple",
  },
  kimono_montsuki: {
    attireId: "kimono_montsuki",
    displayName: "Kimono & Montsuki",
    category: "Japanese ceremonial",
    promptBody:
      "an elegant formal kimono with obi for the bride and a montsuki haori-hakama for the groom",
    appliesTo: "couple",
  },
  agbada_asooke: {
    attireId: "agbada_asooke",
    displayName: "Agbada & Aso-Oke",
    category: "West African ceremonial",
    promptBody:
      "a vibrant Aso-Oke ceremonial dress and gele headwrap for the bride and a " +
      "flowing embroidered agbada for the groom",
    appliesTo: "couple",
  },
  jalabiya_thobe: {
    attireId: "jalabiya_thobe",
    displayName: "Jalabiya & Thobe-style",
    category: "Middle Eastern formal",
    promptBody:
      "an elegant embellished jalabiya-style gown for the bride and a formal " +
      "thobe-style ensemble for the groom",
    appliesTo: "couple",
  },
  modern_fusion: {
    attireId: "modern_fusion",
    displayName: "Modern Fusion",
    category: "Fusion",
    promptBody:
      "a Western-cut wedding ensemble with regional embellishment detail — " +
      "modern silhouette with traditional embroidery or fabric accents",
    appliesTo: "couple",
  },
  surprise_me: {
    attireId: "surprise_me",
    displayName: "Surprise me",
    category: "Model's choice",
    promptBody:
      "an elegant, modest wedding outfit of the model's choosing, appropriate to " +
      "the chosen illustration style",
    appliesTo: "couple",
  },
};

export function getAttire(attireId?: string | null): AttireConfig | null {
  if (!attireId) return null;
  const attire = ATTIRE_CATALOG[attireId];
  if (!attire) {
    throw new Error(`Unknown attireId: ${attireId}`);
  }
  return attire;
}
