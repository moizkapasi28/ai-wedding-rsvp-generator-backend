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
  promptBody: string;
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
