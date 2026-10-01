// Builds the Stylesmith Pixel file icon theme into icons/.
// Run with: npm run icons
//
// Every icon is 16×16 pixel art: a page with a folded corner and a colored band with a short
// label in a 3×5 pixel font, or a pixel folder. Each icon comes in a dark and a light version,
// adjusted so it keeps at least 3:1 contrast on the side bar (WCAG non-text contrast).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 3×5 pixel font: five rows of three bits each.
const GLYPHS = {
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
const FILES = [
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

const SIDEBAR = {
	// The side bar colors the icons are checked against: VS Code's defaults and Stylesmith's.
	dark: ["#181818", "#252526", "#0b0d19", "#070e09", "#0f0b04", "#000000"],
	light: ["#f8f8f8", "#f3f3f3", "#efe8d6", "#ffffff"]
};
const OUTLINE = { dark: "#b4bad2", light: "#50566c" };
const FOLDER = { dark: "#56c8f0", light: "#0a6a94" };
const MIN_CONTRAST = 3;

function luminance(hex) {
	const [r, g, b] = [1, 3, 5].map(i => {
		const v = parseInt(hex.slice(i, i + 2), 16) / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
	const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
}

// Darkens (light version) or lightens (dark version) a color until it has enough contrast
// against every side bar color of that kind.
function fit(color, kind, backgrounds = SIDEBAR[kind]) {
	const channels = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
	for (let step = 0; step <= 100; step++) {
		const t = step / 100;
		const mixed = channels.map(c =>
			Math.round(kind === "dark" ? c + (255 - c) * t : c * (1 - t))
		);
		const hex = "#" + mixed.map(c => c.toString(16).padStart(2, "0")).join("");
		if (backgrounds.every(bg => contrast(hex, bg) >= MIN_CONTRAST)) return hex;
	}
	throw new Error(`cannot fit ${color} for ${kind}`);
}

function svg(pixels) {
	const rects = pixels
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
		)
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>\n`;
}

// A page with a folded top-right corner; `band` adds a colored label area at the bottom.
function page(outline, band, label) {
	const px = [
		[2, 1, 8, 1, outline], // top edge
		[2, 1, 1, 14, outline], // left edge
		[2, 14, 12, 1, outline], // bottom edge
		[13, 5, 1, 10, outline], // right edge
		[10, 1, 1, 4, outline], // fold
		[10, 4, 4, 1, outline],
		[11, 2, 1, 1, outline],
		[12, 3, 1, 1, outline],
		[4, 4, 4, 1, outline], // text lines
		[4, 6, 7, 1, outline]
	];
	if (!band) {
		px.push([4, 8, 7, 1, outline], [4, 10, 5, 1, outline], [4, 12, 6, 1, outline]);
		return px;
	}
	px.push([2, 8, 12, 7, band.color]);
	const width = label.length * 4 - 1;
	let x = 2 + Math.floor((12 - width) / 2);
	for (const char of label) {
		const bits = GLYPHS[char];
		if (!bits) throw new Error(`no glyph for "${char}"`);
		for (let i = 0; i < 15; i++) {
			if (bits[i] === "1") px.push([x + (i % 3), 9 + Math.floor(i / 3), 1, 1, band.text]);
		}
		x += 4;
	}
	return px;
}

function folder(color, open) {
	const dark = mix(color, "#000000", 0.4);
	if (!open) {
		return [
			[1, 2, 5, 1, color], // tab
			[1, 3, 6, 1, color],
			[1, 4, 14, 10, color], // body
			[1, 5, 14, 1, dark] // crease under the tab
		];
	}
	// The back of the folder, then the front flap tilted towards you.
	return [
		[1, 2, 5, 1, dark],
		[1, 3, 6, 1, dark],
		[1, 4, 14, 10, dark],
		[4, 7, 12, 1, color],
		[3, 8, 12, 2, color],
		[2, 10, 12, 2, color],
		[1, 12, 12, 2, color]
	];
}

function mix(a, b, t) {
	const [x, y] = [a, b].map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
	return (
		"#" +
		x
			.map((v, i) =>
				Math.round(v + (y[i] - v) * t)
					.toString(16)
					.padStart(2, "0")
			)
			.join("")
	);
}

// Black or white label text, whichever reads better on the band.
function textOn(color) {
	return contrast("#000000", color) >= contrast("#ffffff", color) ? "#000000" : "#ffffff";
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
const dir = join(root, "pixel");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const theme = {
	iconDefinitions: {},
	fileExtensions: {},
	fileNames: {},
	languageIds: {},
	light: {}
};
theme.light = { fileExtensions: {}, fileNames: {}, languageIds: {} };

function define(id, kind, pixels) {
	const name = kind === "dark" ? id : `${id}_light`;
	writeFileSync(join(dir, `${name}.svg`), svg(pixels));
	theme.iconDefinitions[name] = { iconPath: `./pixel/${name}.svg` };
	return name;
}

for (const kind of ["dark", "light"]) {
	const target = kind === "dark" ? theme : theme.light;
	const outline = OUTLINE[kind];
	const folderColor = fit(FOLDER[kind], kind);

	target.file = define("_file", kind, page(outline));
	target.folder = define("_folder", kind, folder(folderColor, false));
	target.folderExpanded = define("_folder_open", kind, folder(folderColor, true));
	target.rootFolder = target.folder;
	target.rootFolderExpanded = target.folderExpanded;

	for (const file of FILES) {
		const color = fit(file.color, kind);
		const name = define(
			file.id,
			kind,
			page(outline, { color, text: textOn(color) }, file.label)
		);
		for (const ext of file.ext) target.fileExtensions[ext] = name;
		for (const lang of file.lang) target.languageIds[lang] = name;
		for (const fileName of file.names ?? []) target.fileNames[fileName] = name;
	}
}

writeFileSync(join(root, "pixel-icon-theme.json"), JSON.stringify(theme, null, "\t") + "\n");
console.log(`wrote ${Object.keys(theme.iconDefinitions).length} icons`);

// Gutter icons for the Problem Lens. Each kind has its own shape, so it isn't told apart by
// color alone: a square with an X, a triangle with "!", and a circle with "i".
const PROBLEM_ICONS = {
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
const EDITOR = {
	dark: ["#1e1e1e", "#1f1f1f", "#0f1120", "#0b130d", "#140f07", "#000000"],
	light: ["#ffffff", "#f7f2e4", "#f3f3f3"]
};

const problemDir = join(root, "problems");
rmSync(problemDir, { recursive: true, force: true });
mkdirSync(problemDir, { recursive: true });
for (const [name, icon] of Object.entries(PROBLEM_ICONS)) {
	for (const kind of ["dark", "light"]) {
		const color = fit(icon.color[kind], kind, EDITOR[kind]);
		const pixels = [];
		icon.map.forEach((row, y) => {
			for (let x = 0; x < row.length; x++)
				if (row[x] === "#") pixels.push([x, y, 1, 1, color]);
		});
		writeFileSync(join(problemDir, `${name}-${kind}.svg`), svg(pixels));
	}
}
console.log("wrote problem gutter icons");
