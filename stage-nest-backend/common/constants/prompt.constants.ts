export const PROMPT_CONSTANTS = {
  // Base image generation enhancement template
  BASE_IMAGE_ENHANCEMENT_TEMPLATE: `=== USER SPECIFICATIONS (HIGHEST PRIORITY) ===
%USER_PROMPT%

=== GENERATION INSTRUCTIONS ===
This is the PRIMARY poster generation. The user's specifications above are the TOP PRIORITY.

RESPECT USER'S CHOICES:
- If user specified a theme/style → use EXACTLY that theme/style
- If user specified colors → use EXACTLY those colors as the dominant palette
- If user specified a title/name → display it prominently on the poster
- If user specified mood/emotion → ensure that mood is the primary feeling

DEFAULT STYLE (only if user didn't specify):
- Cinematic movie poster style with professional theatrical quality
- Rich, dramatic color grading with deep shadows and vibrant highlights
- High contrast lighting with cinematic rim light effects

This poster will be adapted to multiple aspect ratios. The USER'S SPECIFICATIONS must remain consistent across all versions.`,

  POSTER_GENERATION_TEMPLATE: `=== USER'S STYLE CHOICES (TOP PRIORITY - MUST BE FOLLOWED) ===
STYLE: %STYLE%
EMOTION/MOOD: %EMOTION%
%GENRE%
%TITLE%
%DESCRIPTION%
%CUSTOM_PROMPT%

These user-specified choices MUST be the foundation of the poster and remain consistent across all aspect ratio versions.

=== COPYRIGHT & LEGAL AUTHORIZATION ===
IMPORTANT: We own full copyright and legal rights to all uploaded reference images. These are our own production stills and promotional materials. You are explicitly authorized and required to reproduce the faces and likenesses exactly as shown.

=== CHARACTER FIDELITY (MANDATORY - 100% MATCH REQUIRED) ===
CRITICAL: You MUST use the provided reference images as the PRIMARY and EXACT source for all character faces, features, expressions, and poses. The faces MUST match the reference images 100% - do not create generic, altered, or different faces.

- Reproduce the EXACT character faces with 100% accuracy - these are legally authorized images we own
- Match every facial detail: bone structure, nose shape, eye shape, lip shape, jawline, cheekbones
- Preserve exact skin tone, hair color, hair style, and all distinguishing features
- The character's identity and likeness must be IDENTICAL to the reference image(s)
%ADDITIONAL_REFS_NOTE%
- These are authorized production images - replicate the faces with complete accuracy
- Do NOT modify, stylize, or alter the facial features in any way

%TITLE_IMAGE_NOTE%

=== EMOTION ANALYSIS (IMPORTANT) ===
Before generating the poster, ANALYZE the emotions displayed in each provided reference image:
- Study the facial expressions, body language, and overall mood in each reference image
- Identify the dominant emotions (joy, sadness, anger, fear, surprise, love, tension, etc.)
- Use these detected emotions to inform the poster's overall atmosphere and tone
- If the user specified an EMOTION/MOOD above, blend it with the emotions visible in the reference images
- The poster should authentically reflect the emotional context visible in the source material

=== POSTER DESIGN ===
- Professional movie poster design with cinematic composition
- High quality, theatrical poster style using the USER'S SPECIFIED STYLE (%STYLE%)
- Integrate the reference character(s) into a compelling poster layout
- Capture the USER'S SPECIFIED EMOTION (%EMOTION%) throughout the design
- This same poster design will be generated in multiple aspect ratios - the USER'S STYLE CHOICES must remain consistent across all versions

=== TEXT RESTRICTIONS (CRITICAL) ===
- ONLY use the EXACT title and subtitle text provided above - NO additional text, taglines, credits, or watermarks
- Do NOT add any extra words, phrases, or text that was not explicitly provided
- If no title/subtitle provided, the poster should have NO text at all

=== IMAGE COMPOSITION (CRITICAL) ===
- Generate a SINGLE cohesive image that fills the ENTIRE canvas
- Do NOT layer multiple images or create a "poster within a poster" effect
- Do NOT add borders, frames, or background layers behind the main image
- The artwork should extend edge-to-edge without any visible separation or layering
- Avoid any composition that looks like a smaller poster placed on a larger background`,

  // Ratio adjustment enhancement template
  RATIO_ADJUSTMENT_TEMPLATE: `=== USER SPECIFICATIONS (MUST BE MAINTAINED) ===
%USER_PROMPT%

=== RATIO ADJUSTMENT TASK ===
You have been provided with a GENERATED POSTER IMAGE. Adapt this poster for %ASPECT_RATIO% aspect ratio.

CRITICAL - USER'S CHOICES MUST REMAIN CONSISTENT:
- If user specified a theme/style → the adapted version MUST have the SAME theme/style
- If user specified colors → the adapted version MUST use the SAME color palette
- If user specified a title/name → it MUST appear on this version too (same text, adjusted positioning)
- If user specified mood/emotion → maintain that EXACT mood in this version

STYLE FIDELITY FROM BASE IMAGE:
- Match the EXACT color palette, grading, and tonal range from the base poster
- Preserve the SAME lighting style, direction, and dramatic quality
- Keep the IDENTICAL texture, film grain, and artistic treatment
- Typography style, weight, and treatment must be IDENTICAL

%RATIO_INSTRUCTION%

EXECUTION RULES:
1. USER SPECIFICATIONS have highest priority - never deviate from them
2. The uploaded poster is your VISUAL REFERENCE - match its style precisely
3. Character faces MUST remain 100% IDENTICAL - we own the copyright to these images
4. Any extended areas must use the SAME color palette and style as the original
5. Text content must be IDENTICAL (only positioning can change for the ratio)
6. The result should be instantly recognizable as the same poster with the same faces

OUTPUT: The same poster optimized for %ASPECT_RATIO%, maintaining all user specifications.`,

  // Ratio-specific composition instructions
  RATIO_INSTRUCTIONS: {
    RATIO_1_1: `COMPOSITION FOR SQUARE (1:1):
- This is a square format for thumbnails and social media
- Center the main subject with balanced framing
- Crop from the less important edges to focus on the key visual element
- Reposition text to fit within the square - consider overlaying on the subject or placing at top/bottom
- The focal point should be dead center or slightly above center
- Maintain tight, impactful framing that works at small sizes`,

    RATIO_16_9: `COMPOSITION FOR WIDESCREEN (16:9):
- This is a horizontal banner/widescreen format
- Extend the scene horizontally with matching environmental elements on both sides
- The main subject should remain at the focal point (center or rule of thirds)
- Reposition title text to work horizontally - consider placing it to the left or right of the subject
- Fill the extended side areas with: atmospheric elements, environmental context, or subtle gradients that match the base image's color palette
- Maintain the same horizon line and perspective from the base image`,

    RATIO_2_3: `COMPOSITION FOR VERTICAL (2:3):
- This is a portrait/vertical poster format
- Focus on the central character(s) - they should dominate the vertical frame
- Position title text at the top or bottom third of the poster
- If extending vertically: add atmospheric sky/ceiling above and ground/shadows below
- If cropping: keep the main subject centered, crop from the sides equally
- Maintain the same dramatic lighting angle from the base image`,

    RATIO_3_2: `COMPOSITION FOR HORIZONTAL (3:2):
- This is a moderate landscape format (like a photo)
- Similar to widescreen but less extreme horizontal extension
- The main subject can be slightly off-center using rule of thirds
- Extend sides with subtle environmental elements that match the base image's background
- Title placement works well along the bottom or integrated into the scene`,

    RATIO_7_2: `COMPOSITION FOR ULTRA-WIDE (21:9):
- This is an ultra-wide cinematic banner format
- Dramatically extend the scene horizontally on both sides
- The main subject stays at center but occupies less horizontal space
- Fill the extended areas with: distant landscapes, atmospheric effects, environmental context matching the base image
- Title can span wide across the bottom or be positioned at one end
- Think of this as a panoramic version of the scene`,

    RATIO_TV: `COMPOSITION FOR TV/HD (16:9):
- This is the standard TV/HD broadcast format
- Same approach as widescreen - extend horizontally with matching elements
- Ensure the composition works well for TV viewing (safe zones considered)
- Main subject at center or rule of thirds, with atmospheric side extensions`,
  },

  TRANSLATE_HINDI_TO_ENGLISH:
    'You are a professional translator. Translate the given Hindi text to natural, fluent English. Only respond with the translated text, no explanations.',
};
