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

/** One preset's longer story: where its look comes from, how its colors tell it, and why its settings. */
export interface Tale {
	origin: string;
	colors: string;
	settings: string;
}

/**
 * The longer story of every preset, shown on the Themes page. Books and hardware are named, with
 * credit (the page lists their owners); films and games are evoked, never named
 * (src/test/trademarks.test.ts checks the known titles).
 */
export const PRESET_TALES: Readonly<Record<string, Tale>> = {
	"Phosphor Terminal": {
		origin: "IBM's 5151 monochrome display (1981) drew its text in green P39 phosphor that kept glowing after the beam had moved on. It cut flicker, and left a faint trace whenever text scrolled.",
		colors: "Everything stays within that green. Keywords are the brightest strokes, strings and functions sit in softer greens, and comments are dimmed like a fading trace on the glass.",
		settings:
			"Block cursors in the editor and the terminal blink on and off without animation, and the compact layout packs the screen the way terminals of the time did."
	},
	"Amber Monitor": {
		origin: "By the early 1980s, a monitor could glow amber as well as green or white: DEC's VR201, for one, was sold with white, green or amber (P134) phosphor.",
		colors: "Warm amber and orange on a dark brown-black. Keywords burn brightest, numbers lean toward orange, and comments fade toward brown.",
		settings:
			"The same mechanical feel as Phosphor Terminal: block cursors that blink without animation, and a compact layout."
	},
	"Black ICE": {
		origin: "DEC's VT100 terminal (1978) glowed in white P4 phosphor. A few years later, William Gibson's stories, from Burning Chrome to Neuromancer, gave cyberspace its ICE: intrusion countermeasures electronics, the cold walls around guarded data, a term Gibson credited to Tom Maddox.",
		colors: "Cold white phosphor on a blue-black screen: blue-white text and syntax and frost-cyan keywords. Only errors and deleted lines break the ice, in warm colors.",
		settings:
			"Only the calm settings: smooth cursor, current-line highlight and bracket guides. Nothing moves that doesn't have to."
	},
	"Night City": {
		origin: "In William Gibson's Neuromancer (1984), Night City is the outlaw district beside Chiba, where the neon never goes off. The same rain-wet, sign-lit streets run through the cyberpunk films of the 1980s.",
		colors: "Hot pink and cyan accents glow against a deep indigo night, with yellow strings like light from a passing sign. Comments sink back into the blue, like shopfronts out of focus.",
		settings:
			"The smooth cursor and current-line highlight keep the city calm while you work; a block cursor in the terminal is the one nod to the machines of the era."
	},
	Monolith: {
		origin: "Ted Chiang's novella Story of Your Life (1998), and the film made from it, imagine a linguist learning a language written in rings of ink, in grey rooms full of fog and patience.",
		colors: "Blue-grey stone and one deep blue accent. Syntax stays in quiet greys and sage, so the single accent carries the structure.",
		settings:
			"Only the quiet settings, and the editors you aren't working in are dimmed, as if in fog, so the one in use stands out."
	},
	"Glass Lab": {
		origin: "Science-fiction cinema of the 2010s imagined a research lab of glass and concrete hidden in a forest: quiet, precise, minimal and a little unsettling, where a single color marks everything that matters.",
		colors: "Warm concrete greys, soft off-white text and one coral accent. Errors lean magenta and deleted lines orange, so neither is mistaken for the accent.",
		settings:
			"Only the quiet settings, with unfocused editors dimmed, as in Monolith: the lab stays still while you think."
	},
	Vault: {
		origin: "The 1950s pictured the atomic future with confidence: clean institutional design, bright primaries and a cheerful voice on the loudspeaker, even deep underground. Decades later, games turned that optimism into a whole aesthetic.",
		colors: "A deep navy shelter, warm off-white text and a bright vault yellow for keywords. Blue and yellow stay far apart with every kind of color blindness.",
		settings:
			"The calm settings, and a block cursor in the terminal, like the consoles of a shelter built to last."
	},
	"Digital Rain": {
		origin: "Cyberpunk cinema of the late 1990s turned code into weather: green characters falling down a black screen, a world made of data, and the few who learn to read it.",
		colors: "Layered greens instead of a single one: bright keywords, mid-tone strings and dim comments. Constants are blue, and a rare red marks patterns, the way those films saved red for what matters.",
		settings: "The calm settings, and a block cursor in the terminal."
	},
	Daylight: {
		origin: "Not every session happens at night. Daylight starts from the printed page: dark ink on warm paper, the oldest readable display there is.",
		colors: "Dark ink on a warm, paper-like background, with deep magenta, blue and brown accents chosen to stay readable in a bright room.",
		settings: "A smooth cursor and a current-line highlight, and nothing else to distract."
	},
	"High Contrast": {
		origin: "Some days, and some eyes, need the most contrast a screen can give. This preset pairs well with AtkynsonMono, based on Atkinson Hyperlegible Mono, which the Braille Institute designed for readers with low vision.",
		colors: "White text on black with Neon Night's accents at full strength: every text color at least 7:1, and borders around every area.",
		settings: "No smooth cursor animation, a current-line highlight and clear bracket guides."
	}
};
