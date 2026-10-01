// Builds the Stylesmith Pixel file icon theme into icons/.
// Run with: npm run icons
//
// Every icon is 16×16 pixel art: a page with a folded corner and a colored band with a short
// label in a 3×5 pixel font, or a pixel folder. Each icon comes in a dark and a light version,
// adjusted so it keeps at least 3:1 contrast on the side bar (WCAG non-text contrast).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, mix } from "../out/color.js";
import { EDITOR, FILES, FOLDER, GLYPHS, OUTLINE, PROBLEM_ICONS, SIDEBAR } from "./data/icons.mjs";

const MIN_CONTRAST = 3;

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
	const dark = mix(color, "#000000", 60); // 40% darker
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
