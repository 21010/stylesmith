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
	Simulation:
		"A greyed, green-cast city where only the code glows: a late-1990s film world, with a block cursor in the terminal.",
	"Steel and Rust":
		"Cold blue-grey steel and dim light, with rust for what matters: the real world outside the simulation, with dimmed unfocused editors.",
	Brass: "Brass and copper on dark bronze, with verdigris in the strings, and only the calm settings, for slow and careful thinking.",
	"Tea Garden":
		"A sunlit greenhouse: off-white with a hint of green, moss text, and leaf, sunflower and terracotta accents, with only a smooth cursor and the current line.",
	Sunroom:
		"Soft sunlight on pale walls: warm cream, muted grey-blue structure and peach accents, with unfocused editors dimmed.",
	Countdown:
		"Cold grey-black with faint cyan structure and every number in red, like a countdown, with unfocused editors dimmed.",
	Overlay:
		"A security unit's view of the world: cyan interface overlays and amber alerts on dark slate, with a block cursor in the terminal.",
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
	"Stylesmith Simulation":
		"A charcoal city with a faint green cast: greyed text and syntax, keywords in glowing code green, a warm red for return, break and throw, and blue for constants.",
	"Stylesmith Steel and Rust":
		"Cold blue-grey steel and dim light: steel-blue keywords, rust for numbers and control flow, and muted brass strings.",
	"Stylesmith Brass":
		"Dark bronze-brown with warm cream text: brass keywords, copper functions and numbers, and verdigris strings and types.",
	"Stylesmith Tea Garden":
		"Light: warm off-white with a hint of green, dark moss text, leaf-green keywords, terracotta strings and sunflower numbers.",
	"Stylesmith Sunroom":
		"Light: pale warm cream, grey-blue keywords and types, peach strings and soft sunlit numbers, low in saturation.",
	"Stylesmith Countdown":
		"Neutral grey-black, pale steel text, faint cyan keywords and types, and one red: every number.",
	"Stylesmith Overlay":
		"Dark slate with cyan keywords like interface overlays, and amber strings and numbers like alerts. Utilitarian, not neon.",
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
		colors: "Everything stays within that green. Keywords are the brightest strokes, strings and functions sit in softer greens, and comments are dimmed like a fading trace on the glass. There are no italics or bold: on the terminal, emphasis came from brightness alone.",
		settings:
			"Block cursors in the editor and the terminal blink on and off without animation, and the compact layout packs the screen the way terminals of the time did."
	},
	"Amber Monitor": {
		origin: "By the early 1980s, a monitor could glow amber as well as green or white: DEC's VR201, for one, was sold with white, green or amber (P134) phosphor.",
		colors: "Warm amber and orange on a dark brown-black. Keywords burn brightest, numbers lean toward orange, and comments fade toward brown. One weight and no italics, as on the monitor itself.",
		settings:
			"The same mechanical feel as Phosphor Terminal: block cursors that blink without animation, and a compact layout."
	},
	"Black ICE": {
		origin: "DEC's VT100 terminal (1978) glowed in white P4 phosphor. A few years later, William Gibson's stories, from Burning Chrome to Neuromancer, gave cyberspace its ICE: intrusion countermeasures electronics, the cold walls around guarded data, a term Gibson credited to Tom Maddox.",
		colors: "Cold white phosphor on a blue-black screen: blue-white text and syntax and frost-cyan keywords. Only errors and deleted lines break the ice, in warm colors. No italics or bold, like the character terminals of its time.",
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
	Simulation: {
		origin: "Cyberpunk cinema of the late 1990s graded its simulated world green: grey office towers, rain and black coats under a sickly cast, while the code itself fell bright down black screens.",
		colors: "A charcoal background with a faint green cast, and greyed text and syntax, like the color grade. Only keywords glow in code green. A warm red marks return, break and throw, the moments that change what happens, and blue marks constants.",
		settings: "The calm settings, and a block cursor in the terminal, where the code lives."
	},
	"Steel and Rust": {
		origin: "The same films showed the world outside the simulation as cold, dim and worn: steel corridors, blue-grey light and rust, where people lived after waking up.",
		colors: "Cold blue-grey steel and dim light. Keywords are steel blue, strings a muted brass, and rust marks numbers and the keywords that change control flow.",
		settings:
			"Only the quiet settings, with unfocused editors dimmed, like the low light of a ship's corridor."
	},
	Brass: {
		origin: "Ted Chiang's story collection Exhalation (2019) opens in a world of mechanical beings whose thoughts run on air: brass lungs, copper gears, and an anatomist who opens his own head to see how memory works.",
		colors: "Dark bronze-brown, like the inside of a polished machine. Brass keywords, copper functions and numbers, and the green of verdigris, the patina old metal gathers, for strings and types.",
		settings:
			"Only the calm settings: smooth cursor, current-line highlight and bracket guides. Slow, careful work, like the anatomist's."
	},
	"Tea Garden": {
		origin: "Becky Chambers' A Psalm for the Wild-Built (2021) follows a tea monk through a gentle world where people learned to live within their means, long after the robots walked away into the wilderness.",
		colors: "A warm off-white with a hint of green, like light through a greenhouse. Text in dark moss, keywords in leaf green, strings in terracotta and numbers in sunflower.",
		settings:
			"Only a smooth cursor and the current-line highlight: nothing mechanical, nothing that ticks."
	},
	Sunroom: {
		origin: "Kazuo Ishiguro's Klara and the Sun (2021) is told by an artificial friend who watches the world through a shop window, and trusts in the kindness of the Sun.",
		colors: "Pale warm cream, like a wall in afternoon light. Muted grey-blue for keywords and types, peach for strings, and the soft yellow of sunlight for numbers. Nothing is saturated.",
		settings:
			"A smooth cursor, the current-line highlight, and unfocused editors dimmed, so attention rests on one window at a time, as Klara's does."
	},
	Countdown: {
		origin: "Liu Cixin's The Three-Body Problem (2008; in English, 2014) begins with physics breaking down, and a countdown that only one scientist can see, ticking in his vision.",
		colors: "Neutral grey-black and pale steel text, with faint cyan for keywords and types. One red is reserved for numbers: every number in the code is part of the countdown.",
		settings: "The calm settings, with unfocused editors dimmed: cold, quiet and focused."
	},
	Overlay: {
		origin: "Martha Wells' The Murderbot Diaries (2017–) are told by a security unit that would rather watch its media than talk to humans, and that sees the world through camera feeds and system overlays.",
		colors: "Dark slate, like a display behind glass. Keywords in the cyan of an interface overlay, and strings and numbers in amber, like alerts that need attention but not panic.",
		settings:
			"Smooth cursor, current-line highlight and bracket guides, and a block cursor in the terminal, where the feeds come in."
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

/** One line of a boot log, with an optional status at its end. */
export interface BootLine {
	text: string;
	status?: "ok" | "warn";
}

/** A boot log for Stylesmith: Boot Sequence (#82), with the ANSI color of its first line. */
export interface BootLog {
	color: "green" | "yellow" | "cyan" | "magenta" | "blue";
	lines: readonly BootLine[];
}

/**
 * The boot logs of the retro presets, by preset label: original text in the spirit of each
 * story, with no product names (src/test/trademarks.test.ts checks this file).
 */
export const BOOT_LOGS: Readonly<Record<string, BootLog>> = {
	"Night City": {
		color: "magenta",
		lines: [
			{ text: "NEON/OS  DISTRICT NETWORK NODE 7" },
			{ text: "STREET GRID", status: "ok" },
			{ text: "RAIN SENSORS: HEAVY", status: "ok" },
			{ text: "BILLBOARDS LIT: 4096", status: "ok" },
			{ text: "IMPLANT FIRMWARE: UPDATE PENDING", status: "warn" },
			{ text: "ENCRYPTED UPLINK", status: "ok" },
			{ text: "THE CITY NEVER SLEEPS. NEITHER DO YOU." }
		]
	},
	"Phosphor Terminal": {
		color: "green",
		lines: [
			{ text: "STYLESMITH TERMINAL MONITOR  REV 2.3" },
			{ text: "MEMORY CHECK  65536 BYTES", status: "ok" },
			{ text: "CHARACTER GENERATOR", status: "ok" },
			{ text: "PHOSPHOR WARM-UP", status: "ok" },
			{ text: "SERIAL LINE  9600 BAUD", status: "ok" },
			{ text: "KEYBOARD", status: "ok" },
			{ text: "READY." }
		]
	},
	"Amber Monitor": {
		color: "yellow",
		lines: [
			{ text: "POWER-ON SELF-TEST" },
			{ text: "PROCESSOR", status: "ok" },
			{ text: "SYSTEM MEMORY  640 KB", status: "ok" },
			{ text: "DISPLAY ADAPTER  MONOCHROME", status: "ok" },
			{ text: "DISK DRIVE A:", status: "ok" },
			{ text: "REAL-TIME CLOCK NOT SET", status: "warn" },
			{ text: "LOADING EDITOR..." }
		]
	},
	"Black ICE": {
		color: "cyan",
		lines: [
			{ text: "ICE CONSOLE  COUNTERMEASURES ONLINE" },
			{ text: "PERIMETER SCAN", status: "ok" },
			{ text: "HANDSHAKE ENCRYPTED", status: "ok" },
			{ text: "TRACE ROUTINES ARMED", status: "ok" },
			{ text: "INTRUSION ATTEMPTS: 0", status: "ok" },
			{ text: "UPLINK LATENCY HIGH", status: "warn" },
			{ text: "WELCOME BACK, OPERATOR." }
		]
	},
	Vault: {
		color: "yellow",
		lines: [
			{ text: "SHELTER CONSOLE 7  UNDERGROUND RESIDENCE SYSTEMS" },
			{ text: "AIR FILTRATION", status: "ok" },
			{ text: "WATER RECYCLING", status: "ok" },
			{ text: "REACTOR OUTPUT 98%", status: "ok" },
			{ text: "BLAST DOOR SEAL", status: "ok" },
			{ text: "SURFACE CONDITIONS: UNKNOWN", status: "warn" },
			{ text: "GOOD MORNING, RESIDENT. HAVE A PRODUCTIVE SHIFT." }
		]
	},
	Simulation: {
		color: "green",
		lines: [
			{ text: "SIMULATION KERNEL  BUILD 1999" },
			{ text: "CITY GRID RENDERED", status: "ok" },
			{ text: "WEATHER: RAIN", status: "ok" },
			{ text: "OFFICE LIGHTING: GREEN CAST", status: "ok" },
			{ text: "RESIDENTS DREAMING", status: "ok" },
			{ text: "ANOMALY DETECTED AT YOUR DESK", status: "warn" },
			{ text: "THE CODE IS FALLING. WAKE UP WHEN YOU ARE READY." }
		]
	},
	"Steel and Rust": {
		color: "blue",
		lines: [
			{ text: "HULL SYSTEMS  DEEP TUNNEL CRAFT" },
			{ text: "HULL PRESSURE", status: "ok" },
			{ text: "POWER CELLS 41%", status: "warn" },
			{ text: "BROADCAST ANTENNA", status: "ok" },
			{ text: "CABIN HEATING LOW", status: "warn" },
			{ text: "CREW AWAKE: 9", status: "ok" },
			{ text: "DINNER: THE SAME AS YESTERDAY." }
		]
	}
};

/** The boot log for every other theme. */
export const DEFAULT_BOOT_LOG: BootLog = {
	color: "cyan",
	lines: [
		{ text: "STYLESMITH WORKSHOP" },
		{ text: "COLOR THEMES", status: "ok" },
		{ text: "FILE ICONS", status: "ok" },
		{ text: "FONTS", status: "ok" },
		{ text: "PROBLEM LENS", status: "ok" },
		{ text: "READY." }
	]
};
