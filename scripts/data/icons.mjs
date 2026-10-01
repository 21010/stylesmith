// The pixel art and colors of Stylesmith's icons. scripts/build-icons.mjs draws them and
// adjusts the colors for contrast; src/test/icons.test.ts checks the result.

// 3×5 pixel font: five rows of three bits each.
export const GLYPHS = {
	A: "010101111101101",
	B: "110101110101110",
	C: "011100100100011",
	D: "110101101101110",
	E: "111100110100111",
	F: "111100110100100",
	G: "011100101101011",
	H: "101101111101101",
	I: "111010010010111",
	J: "001001001101010",
	K: "101101110101101",
	L: "100100100100111",
	M: "101111111101101",
	N: "110101101101101",
	O: "010101101101010",
	P: "110101110100100",
	Q: "010101101110011",
	R: "110101110101101",
	S: "011100010001110",
	T: "111010010010010",
	U: "101101101101111",
	V: "101101101101010",
	W: "101101111111101",
	X: "101101010101101",
	Y: "101101010010010",
	Z: "111001010100111",
	"#": "101111101111101",
	"+": "000010111010000",
	"{": "011010110010011",
	"}": "110010011010110",
	"<": "001010100010001",
	">": "100010001010100",
	"/": "001001010100100"
};

// label, color, and the file extensions, file names and language IDs that use the icon.
export const FILES = [
	{ id: "js", label: "JS", color: "#f7df1e", ext: ["js", "mjs", "cjs"], lang: ["javascript"] },
	{ id: "ts", label: "TS", color: "#3b8eea", ext: ["ts", "mts", "cts"], lang: ["typescript"] },
	{ id: "jsx", label: "JSX", color: "#61dafb", ext: ["jsx"], lang: ["javascriptreact"] },
	{ id: "tsx", label: "TSX", color: "#61dafb", ext: ["tsx"], lang: ["typescriptreact"] },
	{
		id: "json",
		label: "{}",
		color: "#e5c07b",
		ext: ["json", "jsonc", "json5"],
		lang: ["json", "jsonc"]
	},
	{ id: "md", label: "MD", color: "#6fb3d2", ext: ["md", "mdx", "markdown"], lang: ["markdown"] },
	{ id: "html", label: "</>", color: "#ef6c4a", ext: ["html", "htm"], lang: ["html"] },
	{ id: "css", label: "CSS", color: "#9b7bef", ext: ["css"], lang: ["css"] },
	{ id: "scss", label: "SCS", color: "#e57cb0", ext: ["scss", "sass"], lang: ["scss", "sass"] },
	{ id: "less", label: "LES", color: "#6f8fd8", ext: ["less"], lang: ["less"] },
	{ id: "py", label: "PY", color: "#5a9fd4", ext: ["py", "pyi", "pyw"], lang: ["python"] },
	{ id: "ipynb", label: "NB", color: "#f58a3c", ext: ["ipynb"], lang: [] },
	{ id: "go", label: "GO", color: "#35c2e8", ext: ["go"], lang: ["go"] },
	{ id: "rs", label: "RS", color: "#e0a57e", ext: ["rs"], lang: ["rust"] },
	{ id: "java", label: "JV", color: "#e0913a", ext: ["java", "jar"], lang: ["java"] },
	{ id: "kt", label: "KT", color: "#a97bff", ext: ["kt", "kts"], lang: ["kotlin"] },
	{ id: "c", label: "C", color: "#8fa8c8", ext: ["c"], lang: ["c"] },
	{ id: "cpp", label: "C++", color: "#5b9bd5", ext: ["cpp", "cc", "cxx"], lang: ["cpp"] },
	{ id: "h", label: "H", color: "#b39ddb", ext: ["h", "hpp", "hh"], lang: [] },
	{ id: "cs", label: "C#", color: "#5cbf5c", ext: ["cs", "csx"], lang: ["csharp"] },
	{ id: "php", label: "PHP", color: "#8f93d6", ext: ["php"], lang: ["php"] },
	{ id: "rb", label: "RB", color: "#e0574f", ext: ["rb", "gemspec"], lang: ["ruby"] },
	{
		id: "sh",
		label: "SH",
		color: "#89e051",
		ext: ["sh", "bash", "zsh", "fish"],
		lang: ["shellscript"]
	},
	{
		id: "ps1",
		label: "PS",
		color: "#5391fe",
		ext: ["ps1", "psm1", "psd1"],
		lang: ["powershell"]
	},
	{ id: "yaml", label: "YML", color: "#e06c75", ext: ["yml", "yaml"], lang: ["yaml"] },
	{ id: "toml", label: "TML", color: "#c98a4a", ext: ["toml"], lang: ["toml"] },
	{ id: "xml", label: "XML", color: "#f08d49", ext: ["xml", "xsd", "plist"], lang: ["xml"] },
	{ id: "svg", label: "SVG", color: "#ffb13b", ext: ["svg"], lang: [] },
	{
		id: "image",
		label: "IMG",
		color: "#b58ae0",
		ext: ["png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "avif"],
		lang: []
	},
	{
		id: "font",
		label: "FNT",
		color: "#c8c8d8",
		ext: ["woff", "woff2", "ttf", "otf", "eot"],
		lang: []
	},
	{ id: "sql", label: "SQL", color: "#e8a33d", ext: ["sql"], lang: ["sql"] },
	{ id: "vue", label: "VUE", color: "#41b883", ext: ["vue"], lang: ["vue"] },
	{ id: "svelte", label: "SVL", color: "#ff5a2a", ext: ["svelte"], lang: ["svelte"] },
	{ id: "lua", label: "LUA", color: "#6f8fe8", ext: ["lua"], lang: ["lua"] },
	{ id: "dart", label: "DRT", color: "#2fc6bd", ext: ["dart"], lang: ["dart"] },
	{ id: "swift", label: "SWF", color: "#f7743e", ext: ["swift"], lang: ["swift"] },
	{
		id: "zip",
		label: "ZIP",
		color: "#e3b341",
		ext: ["zip", "tar", "gz", "tgz", "7z", "rar", "xz", "vsix"],
		lang: []
	},
	{ id: "pdf", label: "PDF", color: "#ef5b4a", ext: ["pdf"], lang: [] },
	{ id: "csv", label: "CSV", color: "#4cc26a", ext: ["csv", "tsv"], lang: [] },
	{ id: "txt", label: "TXT", color: "#a8aec4", ext: ["txt", "log"], lang: ["plaintext", "log"] },
	{
		id: "lock",
		label: "LCK",
		color: "#9aa0b4",
		ext: ["lock"],
		lang: [],
		names: ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]
	},
	{
		id: "env",
		label: "ENV",
		color: "#ecd53f",
		ext: ["env"],
		lang: [],
		names: [".env", ".env.local", ".env.example"]
	},
	{
		id: "docker",
		label: "DKR",
		color: "#2f9cef",
		ext: ["dockerfile"],
		lang: ["dockerfile"],
		names: ["Dockerfile", "docker-compose.yml", "compose.yaml", ".dockerignore"]
	},
	{
		id: "git",
		label: "GIT",
		color: "#f26b4f",
		ext: [],
		lang: ["ignore"],
		names: [".gitignore", ".gitattributes", ".gitmodules"]
	},
	{
		id: "npm",
		label: "NPM",
		color: "#e04a4a",
		ext: [],
		lang: [],
		names: ["package.json", ".npmrc"]
	},
	{
		id: "license",
		label: "LIC",
		color: "#d8bf4a",
		ext: [],
		lang: [],
		names: ["LICENSE", "LICENSE.md", "LICENSE.txt"]
	}
];

export const SIDEBAR = {
	// The side bar colors the icons are checked against: VS Code's defaults and Stylesmith's.
	dark: ["#181818", "#252526", "#0b0d19", "#070e09", "#0f0b04", "#000000"],
	light: ["#f8f8f8", "#f3f3f3", "#efe8d6", "#ffffff"]
};
export const OUTLINE = { dark: "#b4bad2", light: "#50566c" };
export const FOLDER = { dark: "#56c8f0", light: "#0a6a94" };

// Gutter icons for the Problem Lens. Each kind has its own shape, so it isn't told apart by
// color alone: a square with an X, a triangle with "!", and a circle with "i".
export const PROBLEM_ICONS = {
	error: {
		color: { dark: "#ff6b8b", light: "#b8203a" },
		map: [
			"................",
			".##############.",
			".#............#.",
			".#.##......##.#.",
			".#..##....##..#.",
			".#...##..##...#.",
			".#....####....#.",
			".#.....##.....#.",
			".#....####....#.",
			".#...##..##...#.",
			".#..##....##..#.",
			".#.##......##.#.",
			".#............#.",
			".##############.",
			"................",
			"................"
		]
	},
	warning: {
		color: { dark: "#ffcc66", light: "#7a5000" },
		map: [
			"................",
			".......##.......",
			"......####......",
			"......#..#......",
			".....##..##.....",
			".....#.##.#.....",
			"....##.##.##....",
			"....#..##..#....",
			"...##..##..##...",
			"...#........#...",
			"..##...##...##..",
			"..#....##....#..",
			".##..........##.",
			".##############.",
			"................",
			"................"
		]
	},
	info: {
		color: { dark: "#5fe0ff", light: "#005c80" },
		map: [
			"................",
			".....######.....",
			"....#......#....",
			"...#...##...#...",
			"..#....##....#..",
			"..#..........#..",
			"..#...###....#..",
			"..#....##....#..",
			"..#....##....#..",
			"..#....##....#..",
			"...#..####..#...",
			"....#......#....",
			".....######.....",
			"................",
			"................",
			"................"
		]
	}
};

// Editor backgrounds the problem icons are checked against: VS Code's defaults and Stylesmith's.
export const EDITOR = {
	dark: ["#1e1e1e", "#1f1f1f", "#0f1120", "#0b130d", "#140f07", "#000000"],
	light: ["#ffffff", "#f7f2e4", "#f3f3f3"]
};
