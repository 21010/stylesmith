/**
 * The story of every preset and color theme: what it evokes, in Stylesmith's own words. This is
 * the one place to write them. The Themes page (site/themes.html) and the README, which is also
 * the Marketplace listing, show them word for word; src/test/stories.test.ts checks that. The
 * preset menu shows the shorter descriptions in presets.ts.
 *
 * Describe the inspiration, never name it: no film, game or product names (see
 * src/test/trademarks.test.ts), and no claims about comfort or health that the tests don't
 * measure.
 */

/** By preset label. */
export const PRESET_STORIES: Readonly<Record<string, string>> = {
	"Night City":
		"Neon pinks and cyans on deep indigo, the look of a city at night, with pixel file icons and a block cursor in the terminal.",
	"Phosphor Terminal":
		"A late-1970s green-phosphor video terminal: green on near-black, pixel icons in the same greens, a dense, compact layout, and block cursors that blink without animation.",
	"Amber Monitor":
		"An early-1980s amber monochrome monitor: warm amber tones, matching pixel icons, a compact layout, and block cursors that blink without animation.",
	"Black ICE":
		"A cold white-phosphor screen with ice-blue accents and matching pixel icons, and only the calmer editor settings.",
	Monolith:
		"Blue-grey stone with one deep blue accent, and only the quiet editor settings. Editors you aren't working in are dimmed, so the one in use stands out.",
	"Glass Lab":
		"Warm concrete greys, soft off-white text and one coral accent, with the quiet editor settings and dimmed unfocused editors.",
	Vault: "Deep navy and bright vault yellow, an optimistic 1950s vision of the future, with a block cursor in the terminal.",
	"Digital Rain":
		"Layered greens on a green-black screen, a sleek late-1990s hacker mood, with a block cursor in the terminal.",
	Daylight:
		"Dark ink on a warm, paper-like background for well-lit rooms, with pixel file icons.",
	"High Contrast":
		"The high-contrast theme with borders around every area, no smooth cursor animation, and clear bracket guides."
};

/** By color theme label. */
export const THEME_STORIES: Readonly<Record<string, string>> = {
	"Stylesmith Neon Night":
		"Neon signs reflected on wet streets at night: hot pink and cyan accents and yellow strings on a deep indigo background.",
	"Stylesmith Phosphor":
		"A late-1970s video terminal with green phosphor: one green range on near-black, with comments dimmed like a fading trace.",
	"Stylesmith Amber":
		"An early-1980s monochrome monitor with amber phosphor: warm amber and orange tones on a dark brown-black background.",
	"Stylesmith ICE":
		"A cold white-phosphor screen at night: blue-white text, accents and syntax on a dark blue-grey background.",
	"Stylesmith Monolith":
		"Blue-grey stone and a single deep blue accent: a calm, minimal dark theme, with syntax in quiet greys and sage.",
	"Stylesmith Glass Lab":
		"Warm concrete greys, soft off-white text and one coral accent. Errors lean magenta and deleted lines orange, so neither reads as the accent.",
	"Stylesmith Vault":
		"A deep navy shelter with warm off-white text and a bright yellow accent: the upbeat look of a 1950s vision of the future.",
	"Stylesmith Digital Rain":
		"Layered greens on green-black: bright keywords, mid-tone strings and dim comments, with blue for constants and a rare red for patterns.",
	"Stylesmith Daylight":
		"Dark ink on a warm, paper-like background, with deep magenta, blue and brown accents. Made for well-lit rooms.",
	"Stylesmith Neon High Contrast":
		"Neon Night's accents at full strength: white text on black, every text color at least 7:1, and borders around every area.",
	"Stylesmith Daylight High Contrast":
		"Black text on white with dark, saturated accents, every text color at least 7:1, and borders around every area."
};
