export type ImageType = "couple" | "bride" | "groom";

export interface StyleConfig {
  styleId: string;
  displayName: string;
  displayDescription: string;
  /** Injected into STYLE TRANSFORMATION */
  promptBody: string;
  /** Injected into WARDROBE_INSTRUCTION alongside attire.promptBody */
  wardrobeRenderQuality: string;
  settingInstruction: string;
  framingInstruction: string;
  aspectRatioDefault: string;
  faceSimilarityThreshold: number;
  supportsCouple: boolean;
  requiresModerationReview: boolean;
}

export interface AttireConfig {
  attireId: string;
  displayName: string;
  category: string;
  // Describes the pairing as a whole; used when both subjects are described together
  promptBody: string;
  // Per-subject halves, so a bride-only or groom-only card is never told to wear both
  bridePromptBody?: string;
  groomPromptBody?: string;
  appliesTo: "couple" | "single" | "both";
}

export interface BuildPromptParams {
  imageType: ImageType;
  styleId: string;
  attireId?: string | null;
  brideAttireId?: string | null;
  groomAttireId?: string | null;
  customStyleNote?: string | null;
  theme?: string | null;
}
