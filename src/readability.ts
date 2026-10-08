/**
 * The readability checks every Stylesmith theme must pass (src/test/themes.test.ts). The
 * website states these same numbers, and src/test/claims.test.ts checks that it does, so a
 * threshold and the sentence describing it can't drift apart (issue #37).
 */

/**
 * WCAG 2 contrast levels: 4.5:1 for normal text (AA, 1.4.3), 7:1 for enhanced contrast
 * (AAA, 1.4.6), and 3:1 for UI parts you need to find, like the cursor (non-text, 1.4.11).
 * High contrast themes are held to AAA for all text and 4.5:1 for non-text parts.
 */
export const LEVELS = {
	normal: { strong: 7, text: 4.5, nonText: 3 },
	high: { strong: 7, text: 7, nonText: 4.5 }
} as const;

/** Above this, text starts to glare. High contrast themes are exempt: maximum contrast is their job. */
export const MAX_BODY_CONTRAST = 16;

/**
 * Colors that carry meaning must stay this far apart (CIE76 ΔE) with every kind of color
 * blindness. About 2 is barely noticeable; 15 and more is clearly different at a glance.
 */
export const MIN_COLOR_DIFFERENCE = 15;
