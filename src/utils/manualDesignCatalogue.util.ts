export const DESIGN_PRESET_CATALOGUE: Record<string, string> = {
  classic_elegant: "Classic Elegant Wedding. A timeless, sophisticated aesthetic featuring refined typography, understated floristry, and perfectly balanced white space.",
  modern_minimalist: "Modern Minimalist. A sleek, contemporary design with stark geometric alignment, ample breathing room, and a stark lack of unnecessary ornamentation.",
  rustic_botanical: "Rustic Botanical. A warm, organic aesthetic featuring lush, hand-painted greenery, earthy tones, and a slightly textured, inviting feel.",
  vintage_royal: "Vintage Royal. A grand, opulent design evoking 19th-century luxury with intricate damask patterns, ornate borders, and rich, deep hues.",
  moody_avant_garde: "Moody Avant-Garde. A dramatic, unconventional aesthetic utilizing deep shadows, stark contrasts, and striking, artistic botanical or abstract elements.",
};

export const TEXTURE_EMULATION_CATALOGUE: Record<string, string> = {
  smooth_matte: "Emulate a premium, ultra-smooth matte cardstock finish. The colors should appear flat and velvety with zero glare or grain.",
  deckled_watercolor: "Emulate heavy cold-pressed watercolor paper. The background should have a subtle, organic bump-map texture consistent with high-end artisanal paper.",
  heavy_linen: "Emulate a luxurious linen weave texture. The background should exhibit a faint, crisp cross-hatch fabric pattern visible in the macro details.",
  frosted_vellum: "Emulate translucent frosted vellum over a solid backing. Elements should feel slightly ethereal and layered, with a soft, diffused light quality.",
  pearl_shimmer: "Emulate a pearlescent shimmer cardstock. The background should have a subtle, elegant iridescent glow that catches imaginary light across the canvas.",
};

export const METALLIC_ACCENTS_CATALOGUE: Record<string, string> = {
  none: "",
  gold_foil: "Render specific ornamental details, borders, or central focal points with a highly realistic gold foil stamping effect. The gold should be deeply reflective and slightly debossed.",
  silver_filigree: "Incorporate delicate, web-like silver filigree accents around the borders or framing elements. The silver should have a crisp, bright metallic sheen.",
  rose_gold_leaf: "Add scattered, organic rose-gold leafing effects. The metallic elements should have a warm, coppery-pink hue with uneven, artisanal edges.",
  holographic_edge: "Apply a subtle holographic or iridescent foil effect to the framing elements, catching a spectrum of colors as if hit by a direct light source.",
};

export const NEGATIVE_SPACE_CATALOGUE: Record<string, string> = {
  centered_core: "Leave the absolute center of the canvas completely blank and unobstructed as clean negative space. Push all ornamental elements and artwork toward the outer edges to create a central void for future text.",
  bottom_heavy: "Leave the top half of the canvas completely clean and open. Concentrate all artwork, floristry, and design weight into the bottom half of the canvas.",
  asymmetric_left: "Concentrate the heavy design elements and artwork down the left side of the canvas. Leave the right side sweeping and empty as clean negative space.",
  bordered_frame: "Create a distinct, solid inner frame. Leave the interior of this frame completely blank, clean, and untextured for future typesetting.",
  floating_cloud: "Push the artwork to the extreme corners, fading out with a soft, cloud-like gradient toward a completely clean, solid-color center.",
};

export const MONOGRAM_STYLE_CATALOGUE: Record<string, string> = {
  none: "",
  calligraphic_crest: "Incorporate a large, highly ornate calligraphic crest or shield at the top center of the design. Leave the inside of the crest blank (do not render letters).",
  modern_serif: "Include a sleek, modern, interlocking geometric monogram frame at the focal point. Do not render actual letters, just the structured container.",
  floral_wreath: "Design a delicate, highly detailed floral wreath or ring situated at the upper-middle of the canvas. Leave the center of the wreath perfectly empty.",
  geometric_deco: "Add an Art Deco inspired geometric shield or diamond crest. It should feature sharp angles and symmetry, with a blank interior.",
};

export const EDGE_STYLING_CATALOGUE: Record<string, string> = {
  sharp_cut: "Render the design with clean, sharp, perfect edge-to-edge bleeds.",
  torn_deckled: "Render the outer edges of the canvas to look like torn, handmade deckled paper edges, revealing a slight shadow against a dark background.",
  gold_gilded: "Add a thick, painted metallic gold gilded edge bordering the extreme outer perimeter of the canvas.",
  scalloped_frame: "Introduce a soft, scalloped die-cut border effect around the inner margin of the canvas.",
  floral_bleed: "Have large, oversized floral elements spilling aggressively over the edges of the canvas, partially cropped out of the frame.",
};

export const getDesignPreset = (key: string) => DESIGN_PRESET_CATALOGUE[key] || key;
export const getTextureEmulation = (key: string) => TEXTURE_EMULATION_CATALOGUE[key] || key;
export const getMetallicAccents = (key: string) => METALLIC_ACCENTS_CATALOGUE[key] || key;
export const getNegativeSpace = (key: string) => NEGATIVE_SPACE_CATALOGUE[key] || key;
export const getMonogramStyle = (key: string) => MONOGRAM_STYLE_CATALOGUE[key] || key;
export const getEdgeStyling = (key: string) => EDGE_STYLING_CATALOGUE[key] || key;
