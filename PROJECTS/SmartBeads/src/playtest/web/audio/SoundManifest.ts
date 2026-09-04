/**
 * Runtime SFX file map — files live in repo `public/audio/` (Vite static assets).
 * Regenerate WAV sources: `node scripts/generate-sfx-wavs.mjs`
 */
export const SFX_URLS = {
  select: '/audio/sfx_select.wav',
  slide: '/audio/sfx_slide.wav',
  capture: '/audio/sfx_capture.wav',
  flourish: '/audio/sfx_flourish.wav',
  start: '/audio/sfx_start.wav',
  victory: '/audio/sfx_victory.wav',
  defeat: '/audio/sfx_defeat.wav',
  draw: '/audio/sfx_draw.wav',
} as const;

export type SfxUrlKey = keyof typeof SFX_URLS;
