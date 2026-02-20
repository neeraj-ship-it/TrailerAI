import { PROMPT_CONSTANTS } from '../constants/prompt.constants';
import {
  GeminiAspectRatio,
  PosterGenerationParams,
} from '../interfaces/ai.interface';

export const generatePosterPrompt = ({
  customPrompt,
  description,
  emotion,
  genre,
  hasAdditionalRefs,
  hasTitleImage,
  style,
  title,
}: PosterGenerationParams): string => {
  let prompt = PROMPT_CONSTANTS.POSTER_GENERATION_TEMPLATE;

  prompt = prompt.replace(/%STYLE%/g, style);

  prompt = prompt.replace(/%EMOTION%/g, emotion);

  if (genre) {
    prompt = prompt.replace(/%GENRE%/g, `GENRE: ${genre}`);
  } else {
    prompt = prompt.replace(/%GENRE%/g, '');
  }

  if (title) {
    prompt = prompt.replace(
      /%TITLE%/g,
      `TITLE TEXT: "${title}" - This EXACT text must appear prominently on the poster and remain IDENTICAL across all aspect ratio versions`,
    );
  } else {
    prompt = prompt.replace(/%TITLE%/g, '');
  }

  if (description) {
    prompt = prompt.replace(
      /%DESCRIPTION%/g,
      `DESCRIPTION/TAGLINE TEXT: "${description}" - This EXACT text should appear below the title, smaller than the main title`,
    );
  } else {
    prompt = prompt.replace(/%DESCRIPTION%/g, '');
  }

  // Custom prompt has highest priority - user's specific requirements
  if (customPrompt) {
    prompt = prompt.replace(
      /%CUSTOM_PROMPT%/g,
      `\n=== CUSTOM REQUIREMENTS (HIGHEST PRIORITY) ===\n${customPrompt}\n\nThese custom requirements MUST be followed and remain consistent across ALL aspect ratio versions.`,
    );
  } else {
    prompt = prompt.replace(/%CUSTOM_PROMPT%/g, '');
  }

  if (hasAdditionalRefs) {
    prompt = prompt.replace(
      /%ADDITIONAL_REFS_NOTE%/g,
      '- Use all provided reference images to maintain character consistency across the poster',
    );
  } else {
    prompt = prompt.replace(/%ADDITIONAL_REFS_NOTE%/g, '');
  }

  if (hasTitleImage) {
    prompt = prompt.replace(
      /%TITLE_IMAGE_NOTE%/g,
      `=== TITLE IMAGE PRESERVATION (CRITICAL) ===
The FIRST reference image provided is the TITLE IMAGE. This contains the official title/logo design that MUST be preserved exactly:
- Extract and use the EXACT title text, font, styling, and design from this image
- Preserve the title's typography: font family, weight, size proportions, letter spacing, and any stylistic effects
- Maintain the title's color scheme, gradients, shadows, outlines, or any decorative elements
- The title design is our official branding - reproduce it with 100% accuracy
- Position the preserved title prominently on the poster
- Do NOT recreate or redesign the title - use it EXACTLY as shown in the title image`,
    );
  } else {
    prompt = prompt.replace(/%TITLE_IMAGE_NOTE%/g, '');
  }

  prompt = prompt.replace(/\n{3,}/g, '\n\n').trim();

  return prompt;
};

/**
 * Enhances prompt for base image generation (first generation)
 * User prompt has highest priority - their style/theme/color choices come first
 */
export const enhancePromptForBaseImage = (userPrompt: string): string => {
  return PROMPT_CONSTANTS.BASE_IMAGE_ENHANCEMENT_TEMPLATE.replace(
    /%USER_PROMPT%/g,
    userPrompt,
  );
};

/**
 * Gets ratio-specific composition instruction from Gemini aspect ratio
 */
const getRatioInstruction = (aspectRatio: GeminiAspectRatio): string => {
  const instructionMap: Partial<Record<GeminiAspectRatio, string>> = {
    '1:1': PROMPT_CONSTANTS.RATIO_INSTRUCTIONS.RATIO_1_1,
    '16:9': PROMPT_CONSTANTS.RATIO_INSTRUCTIONS.RATIO_16_9,
    '2:3': PROMPT_CONSTANTS.RATIO_INSTRUCTIONS.RATIO_2_3,
    '21:9': PROMPT_CONSTANTS.RATIO_INSTRUCTIONS.RATIO_7_2,
    '3:2': PROMPT_CONSTANTS.RATIO_INSTRUCTIONS.RATIO_3_2,
  };

  return instructionMap[aspectRatio] || '';
};

/**
 * Enhances prompt for ratio-specific adjustments using Gemini aspect ratios
 */
export const enhancePromptForRatioAdjustment = (
  userPrompt: string,
  aspectRatio: GeminiAspectRatio,
): string => {
  const ratioInstruction = getRatioInstruction(aspectRatio);

  return PROMPT_CONSTANTS.RATIO_ADJUSTMENT_TEMPLATE.replace(
    /%USER_PROMPT%/g,
    userPrompt,
  )
    .replace(/%ASPECT_RATIO%/g, aspectRatio)
    .replace(/%RATIO_INSTRUCTION%/g, ratioInstruction);
};
