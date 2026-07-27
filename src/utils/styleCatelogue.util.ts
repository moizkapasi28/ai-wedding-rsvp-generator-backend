import { StyleConfig } from "../types/eventInviteFormat.type";

export const STYLE_CATALOG: Record<string, StyleConfig> = {
  royal_regal_portrait: {
    styleId: "royal_regal_portrait",
    displayName: "Royal Portrait",
    displayDescription: "Palace-worthy, ornate, majestic",
    promptBody:
      "a formal royal portrait painting style, reminiscent of classical monarchy " +
      "portraiture. Rich oil-painting texture, deep jewel-toned color palette " +
      "(burgundy, gold, emerald), dramatic chiaroscuro lighting, ornate gilded " +
      "frame elements in the background, ceremonial posture.",
    wardrobeRenderQuality:
      "richer fabric texture, subtle embellishment detail, and deep jewel-toned " +
      "color grading (burgundy, gold, emerald) consistent with royal portraiture",
    settingInstruction:
      "Palace interior backdrop with velvet drapery and soft golden light.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.45,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  watercolor_fine_art: {
    styleId: "watercolor_fine_art",
    displayName: "Watercolor Dream",
    displayDescription: "Soft, romantic, hand-painted",
    promptBody:
      "a delicate watercolor illustration style with visible paper texture, soft " +
      "color bleeds, loose expressive brushwork, pastel palette, light washes of " +
      "color, and gentle white space around the subjects rather than a fully " +
      "rendered background.",
    wardrobeRenderQuality: "soft watercolor bleeds and visible paper texture",
    settingInstruction:
      "Minimal — a soft floral wash or blank textured paper background.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.42,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  heritage_miniature: {
    styleId: "heritage_miniature",
    displayName: "Heritage Miniature",
    displayDescription: "Rajasthani/Mughal-inspired art",
    promptBody:
      "a traditional Indian miniature painting style (Rajasthani/Mughal court art " +
      "tradition), flat perspective with fine detailed linework, intricate gold-leaf " +
      "border patterns, vibrant flat color fields, decorative foliage and arch motifs " +
      "framing the subjects, stylized formal side-facing or three-quarter posture " +
      "typical of the miniature tradition.",
    wardrobeRenderQuality:
      "flat, ornamental linework with gold-leaf bordering typical of the " +
      "Rajasthani/Mughal miniature tradition",
    settingInstruction:
      "Decorative arch or garden pavilion motif, flat ornamental background typical of miniature art.",
    framingInstruction:
      "Three-quarter or side-facing formal posture, full-figure framing.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.4,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  storybook_3d: {
    styleId: "storybook_3d",
    displayName: "3D Storybook",
    displayDescription: "Warm, expressive, animated-film look",
    promptBody:
      "a warm 3D animated feature-film illustration style — soft stylized " +
      "proportions, large expressive eyes, smooth rounded shading, cinematic soft " +
      "lighting, subtle skin texture stylization while keeping facial proportions " +
      "close to the real reference photo, vibrant but natural color grading.",
    wardrobeRenderQuality:
      "smooth toon-shaded fabric texture with soft cinematic lighting",
    settingInstruction:
      "Dreamy soft-focus outdoor wedding backdrop — string lights, floral arch.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.4,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  modern_line_art: {
    styleId: "modern_line_art",
    displayName: "Modern Line Art",
    displayDescription: "Clean, minimal, single-line elegance",
    promptBody:
      "a minimalist single-line-art illustration style, continuous fine black " +
      "linework on a plain or single-tone background, no shading or minimal flat " +
      "shading, elegant and modern, sparse decorative accents (a small floral sprig or monogram).",
    wardrobeRenderQuality:
      "clean, single continuous linework silhouette, minimal or no shading",
    settingInstruction: "Plain cream or blush background, no clutter.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.35,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  vintage_keepsake: {
    styleId: "vintage_keepsake",
    displayName: "Vintage Keepsake",
    displayDescription: "Old-world, timeless, nostalgic",
    promptBody:
      "a vintage sepia-toned portrait photograph style from the early-to-mid 20th " +
      "century — soft grain texture, warm brown-and-cream tones, soft vignette, " +
      "classic studio portrait lighting, slightly faded edges reminiscent of an " +
      "heirloom photograph.",
    wardrobeRenderQuality:
      "sepia-toned rendering with soft grain, consistent with a vintage studio photograph",
    settingInstruction:
      "Classic studio backdrop, soft drape fabric behind subjects.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.45,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  anime_style: {
    styleId: "anime_style",
    displayName: "Anime Style",
    displayDescription: "Japanese animation-inspired portrait",
    promptBody:
      "a Japanese animation-inspired illustration style — clean cel-shaded " +
      "coloring, large expressive eyes, soft outlined features, delicate " +
      "linework, gentle pastel-to-vivid color palette, while keeping the overall " +
      "face shape and hairstyle recognizable from the reference photo.",
    wardrobeRenderQuality:
      "clean cel-shaded flat coloring with delicate linework",
    settingInstruction: "Soft cherry-blossom or bokeh-light background.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.35,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  pop_art_bash: {
    styleId: "pop_art_bash",
    displayName: "Pop Art Bash",
    displayDescription: "Bold, graphic, high-energy",
    promptBody:
      "a bold pop-art illustration style — high-contrast flat color blocking, " +
      "thick black outlines, halftone dot texture in shadows, saturated " +
      "contrasting color palette, graphic and punchy, retro comic-print aesthetic.",
    wardrobeRenderQuality:
      "bold flat color blocking with thick black outlines and halftone texture in shadow areas",
    settingInstruction:
      "Bright solid-color background with graphic starburst or halftone pattern.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.35,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  fairytale_romance: {
    styleId: "fairytale_romance",
    displayName: "Fairytale Romance",
    displayDescription: "Magical, storybook, whimsical",
    promptBody:
      "a whimsical fairytale storybook illustration style — soft painterly " +
      "rendering, magical glowing light particles, dreamy soft-focus background, " +
      "enchanted garden or castle silhouette, gentle painterly color palette with warm highlights.",
    wardrobeRenderQuality:
      "soft flowing painterly fabric texture with a subtle magical glow accent at the hem or veil",
    settingInstruction: "Enchanted garden or twilight castle silhouette.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.4,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  retro_cinema_poster: {
    styleId: "retro_cinema_poster",
    displayName: "Retro Cinema Poster",
    displayDescription: "70s Bollywood movie-poster nostalgia",
    promptBody:
      "a retro 1970s Bollywood hand-painted movie poster illustration style — " +
      "bold saturated colors, dramatic painterly brushwork, dynamic hero-pose " +
      "energy, retro poster typography space left in the composition (no text " +
      "needed), nostalgic film-poster grain texture.",
    wardrobeRenderQuality:
      "bold saturated painterly color with dramatic poster-style highlight/shadow contrast",
    settingInstruction:
      "Dynamic radial or sunset gradient background typical of retro film posters.",
    framingInstruction: "Dynamic hero-pose framing, half-body to full-figure.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.4,
    supportsCouple: true,
    requiresModerationReview: false,
  },
  fun_caricature: {
    styleId: "fun_caricature",
    displayName: "Fun Caricature",
    displayDescription: "Playful, exaggerated, light-hearted",
    promptBody:
      "a warm, flattering caricature illustration style — gently exaggerated " +
      "expressive features (keep exaggeration subtle and affectionate, not " +
      "comedic or unflattering), bright cheerful color palette, playful pose " +
      "energy, hand-drawn ink-and-color texture.",
    wardrobeRenderQuality:
      "bright, simplified color and playful linework, gently exaggerated but flattering",
    settingInstruction:
      "Simple celebratory background — confetti, balloons, or floral banner.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.3,
    supportsCouple: true,
    // Section 6: caricature is most likely to drift into unflattering territory.
    requiresModerationReview: true,
  },
  classic_oil_painting: {
    styleId: "classic_oil_painting",
    displayName: "Classic Oil Painting",
    displayDescription: "Museum-quality, timeless elegance",
    promptBody:
      "a Renaissance-era oil painting style — rich glazed brushwork, warm " +
      "chiaroscuro lighting, classical portrait composition, muted earthy palette " +
      "with gold accents, canvas texture visible.",
    wardrobeRenderQuality:
      "rich glazed brushwork and classical fabric drape typical of Renaissance portraiture",
    settingInstruction:
      "Dark neutral studio background typical of classical portraiture, soft directional light.",
    framingInstruction:
      "Portrait framing, subject centered, shoulders-up to half-body.",
    aspectRatioDefault: "4:5",
    faceSimilarityThreshold: 0.45,
    supportsCouple: true,
    requiresModerationReview: false,
  },
};

export function getStyle(styleId: string): StyleConfig {
  const style = STYLE_CATALOG[styleId];
  if (!style) {
    throw new Error(`Unknown styleId: ${styleId}`);
  }
  return style;
}
