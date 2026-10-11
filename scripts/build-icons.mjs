// Builds the Stylesmith Pixel file icon themes into icons/ (#101).
// Run with: npm run icons
//
// Every icon is 16×16 pixel art in one color, drawn as a glyph of one icon font
// (icons/stylesmith-pixel-icons.otf), the way VS Code's own Seti icons work: a page with a
// folded corner and a band with a short label cut out of it, a few pictures, and folders with a
// cut-out emblem or label. Each icon theme is a JSON file that gives every icon its color:
// - Stylesmith Pixel colors each file type in its own color.
// - Every color theme has its own set, colored by kind of file in the theme's own colors.
// Colors are adjusted so every icon keeps at least 3:1 contrast on the side bar (WCAG
// non-text contrast), in dark and in light themes.
//
// The Problem Lens gutter icons are drawn here too, as SVG files: one set in each Stylesmith
// theme's own colors, and a dark and a light set for any other theme.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import { contrast } from "../out/color.js";
import {
	EDITOR,
	FILES,
	FOLDER,
	FOLDERS,
	GLYPHS,
	KIND_COLORS,
	MARKS,
	MUTED,
	PICTURES,
	PROBLEM_ICONS,
	SIDEBAR,
	SPECIAL_FILES,
	kindOf
} from "./data/icons.mjs";
import { palettes } from "./data/palettes.mjs";
import { atFixedTime } from "./fixed-time.mjs";

const MIN_CONTRAST = 3;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
export const FONT = "stylesmith-pixel-icons.otf";
const ALL_FILES = [...FILES, ...SPECIAL_FILES];

// Darkens (light version) or lightens (dark version) a color until it has enough contrast
// against every one of the backgrounds.
function fit(color, kind, backgrounds) {
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

// ---- The glyphs: 16×16 grids of pixels that are on ----

const grid = () => Array.from({ length: 16 }, () => Array(16).fill(false));
function fill(g, x, y, w, h, on = true) {
	for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = on;
}
function cutLabel(g, label, x0, x1, top) {
	const width = label.length * 4 - 1;
	let x = x0 + Math.floor((x1 - x0 + 1 - width) / 2);
	for (const char of label) {
		const bits = GLYPHS[char];
		if (!bits) throw new Error(`no glyph for "${char}"`);
		for (let i = 0; i < 15; i++) {
			if (bits[i] === "1") g[top + Math.floor(i / 3)][x + (i % 3)] = false;
		}
		x += 4;
	}
}
function cutMark(g, rows, x, y) {
	rows.forEach((row, j) => [...row].forEach((c, i) => c === "#" && (g[y + j][x + i] = false)));
}
/** A mark (MARKS) or a label, cut out centered between x0 and x1 from row `top`. */
function cut(g, mark, x0, x1, top) {
	if (MARKS[mark]) cutMark(g, MARKS[mark], x0 + Math.floor((x1 - x0 + 1 - 5) / 2), top);
	else cutLabel(g, mark, x0, x1, top);
}

// A page with a folded top-right corner.
function pageOutline() {
	const g = grid();
	fill(g, 2, 1, 8, 1); // top edge
	fill(g, 2, 1, 1, 14); // left edge
	fill(g, 2, 14, 12, 1); // bottom edge
	fill(g, 13, 5, 1, 10); // right edge
	fill(g, 10, 1, 1, 4); // fold
	fill(g, 10, 4, 4, 1);
	fill(g, 11, 2, 1, 1);
	fill(g, 12, 3, 1, 1);
	fill(g, 4, 4, 4, 1); // text lines
	fill(g, 4, 6, 7, 1);
	return g;
}
const SHAPES = {
	/** A page with a band at the bottom, a label cut out of it. */
	page: label => {
		const g = pageOutline();
		fill(g, 2, 8, 12, 7);
		cutLabel(g, label, 2, 13, 9);
		return g;
	},
	/** Any other file: a page of text. */
	plain: () => {
		const g = pageOutline();
		fill(g, 4, 8, 7, 1);
		fill(g, 4, 10, 5, 1);
		fill(g, 4, 12, 6, 1);
		return g;
	},
	/** Agent instructions: the band carries a sparkle and a small one. */
	sparkle: () => {
		const g = pageOutline();
		fill(g, 2, 8, 12, 7);
		cutMark(g, MARKS.sparkle, 5, 9);
		cutMark(g, [".#.", "###", ".#."], 10, 9);
		return g;
	},
	picture: name => PICTURES[name].map(row => [...row].map(c => c === "#")),
	/** A folder, closed or open, with an optional cut-out mark. */
	folder: (open, mark) => {
		const g = grid();
		if (!open) {
			fill(g, 1, 2, 5, 1); // tab
			fill(g, 1, 3, 6, 1);
			fill(g, 1, 4, 14, 10); // body
			fill(g, 1, 5, 14, 1, false); // the crease under the tab
			if (mark) cut(g, mark, 1, 14, 7);
			return g;
		}
		// The back as an outline, the front flap filled and tilted towards you.
		fill(g, 1, 2, 5, 1);
		fill(g, 1, 3, 6, 1);
		fill(g, 1, 4, 14, 1);
		fill(g, 1, 4, 1, 4);
		fill(g, 14, 4, 1, 2);
		fill(g, 3, 6, 12, 1);
		fill(g, 2, 7, 13, 1);
		fill(g, 1, 8, 14, 6);
		if (mark) cut(g, mark, 1, 14, 8);
		return g;
	}
};

/** Every glyph, by a key; the font gets them in this order. */
function glyphs() {
	const list = new Map();
	const add = (key, draw) => list.has(key) || list.set(key, draw());
	add("file", () => SHAPES.plain());
	for (const file of ALL_FILES) {
		if (file.picture === "sparkle") add("sparkle", () => SHAPES.sparkle());
		else if (file.picture) add(`picture:${file.picture}`, () => SHAPES.picture(file.picture));
		else add(`page:${file.label}`, () => SHAPES.page(file.label));
	}
	for (const open of [false, true]) {
		add(`folder:${open}:`, () => SHAPES.folder(open));
		for (const folder of FOLDERS) {
			add(`folder:${open}:${folder.mark}`, () => SHAPES.folder(open, folder.mark));
		}
	}
	return list;
}
const fileGlyph = file =>
	file.picture === "sparkle"
		? "sparkle"
		: file.picture
			? `picture:${file.picture}`
			: `page:${file.label}`;

// ---- The font ----

const PIXEL = 100;
const EM = 16 * PIXEL;
const FIRST_CODE_POINT = 0xe000;

/** One rectangle per run of pixels, merged with the same run in the rows below. */
function outline(g) {
	const runs = g.map(row => {
		const found = [];
		for (let x = 0; x < 16;) {
			if (!row[x]) {
				x++;
				continue;
			}
			let end = x;
			while (end < 16 && row[end]) end++;
			found.push([x, end]);
			x = end;
		}
		return found;
	});
	const path = new opentype.Path();
	const done = new Set();
	runs.forEach((rowRuns, y) => {
		for (const [start, end] of rowRuns) {
			if (done.has(`${y}:${start}:${end}`)) continue;
			let last = y;
			while (runs[last + 1]?.some(([s, e]) => s === start && e === end)) {
				last++;
				done.add(`${last}:${start}:${end}`);
			}
			// Font coordinates grow upwards: row 0 is the top of the em box.
			const top = EM - y * PIXEL;
			const bottom = EM - (last + 1) * PIXEL;
			path.moveTo(start * PIXEL, bottom);
			path.lineTo(end * PIXEL, bottom);
			path.lineTo(end * PIXEL, top);
			path.lineTo(start * PIXEL, top);
			path.close();
		}
	});
	return path;
}

function writeFont(list) {
	const codes = new Map();
	const font = new opentype.Font({
		familyName: "Stylesmith Pixel Icons",
		styleName: "Regular",
		unitsPerEm: EM,
		ascender: EM,
		descender: 0,
		designer: "Stylesmith",
		license: "MIT",
		glyphs: [
			new opentype.Glyph({
				name: ".notdef",
				unicode: 0,
				advanceWidth: EM,
				path: new opentype.Path()
			}),
			...[...list].map(([key, g], i) => {
				codes.set(key, FIRST_CODE_POINT + i);
				return new opentype.Glyph({
					name: `g${i}`,
					unicode: FIRST_CODE_POINT + i,
					advanceWidth: EM,
					path: outline(g)
				});
			})
		]
	});
	writeFileSync(
		join(root, FONT),
		Buffer.from(atFixedTime(new Date(Date.UTC(2026, 9, 11)), () => font.toArrayBuffer()))
	);
	return codes;
}

// ---- The icon themes ----

/**
 * The colors of a set in dark or light themes: `file(file)` gives a file's color; folders
 * use `folder`, or `muted` for generated ones; `plain` is any other file.
 */
function brandColors(kind) {
	const backgrounds = SIDEBAR[kind];
	return {
		file: file => fit(kindOf(file) === "muted" ? MUTED[kind] : file.color, kind, backgrounds),
		folder: fit(FOLDER[kind], kind, backgrounds),
		muted: fit(MUTED[kind], kind, backgrounds),
		plain: fit(MUTED[kind], kind, backgrounds)
	};
}
/** A theme's colors by kind, fitted to its own side bar as well as VS Code's. */
function themeKindColors(palette, kind, sideBar) {
	const backgrounds = [...SIDEBAR[kind], ...(sideBar ? [sideBar] : [])];
	// A palette may take a kind's color from elsewhere, to set its icons apart (#130).
	const paths = { ...KIND_COLORS, ...palette.iconKinds };
	return Object.fromEntries(
		Object.entries(paths).map(([name, path]) => [
			name,
			fit(
				path.reduce((value, key) => value[key], palette),
				kind,
				backgrounds
			)
		])
	);
}
function themeColors(palette, kind) {
	const own = (palette.kind ?? "dark") === kind ? palette.bg : undefined;
	const colors = themeKindColors(palette, kind, own);
	return {
		file: file => colors[kindOf(file)],
		folder: colors.folder,
		muted: colors.muted,
		// Any other file: a page of text, in the theme's code color.
		plain: colors.code
	};
}

function iconSet(set, colorsFor, codes) {
	const theme = {
		fonts: [
			{
				id: "stylesmith-pixel",
				src: [{ path: `./${FONT}`, format: "opentype" }],
				weight: "normal",
				style: "normal",
				// One font pixel per screen pixel: crisp at the side bar's 16px icons.
				size: "16px"
			}
		],
		iconDefinitions: {},
		fileExtensions: {},
		fileNames: {},
		languageIds: {},
		folderNames: {},
		folderNamesExpanded: {},
		light: {
			fileExtensions: {},
			fileNames: {},
			languageIds: {},
			folderNames: {},
			folderNamesExpanded: {}
		}
	};
	for (const kind of ["dark", "light"]) {
		const target = kind === "dark" ? theme : theme.light;
		const colors = colorsFor(kind);
		// One definition per glyph and color: its code point and the color, unique by build.
		const define = (glyph, color) => {
			const id = `_${codes.get(glyph).toString(16)}_${color.slice(1)}${kind === "light" ? "_light" : ""}`;
			theme.iconDefinitions[id] = {
				fontCharacter: `\\${codes.get(glyph).toString(16)}`,
				fontColor: color
			};
			return id;
		};
		target.file = define("file", colors.plain);
		target.folder = define("folder:false:", colors.folder);
		target.folderExpanded = define("folder:true:", colors.folder);
		target.rootFolder = target.folder;
		target.rootFolderExpanded = target.folderExpanded;
		for (const file of ALL_FILES) {
			const name = define(fileGlyph(file), colors.file(file));
			for (const ext of file.ext) target.fileExtensions[ext] = name;
			for (const lang of file.lang) target.languageIds[lang] = name;
			for (const fileName of file.names ?? []) target.fileNames[fileName] = name;
		}
		for (const folder of FOLDERS) {
			const color = folder.muted ? colors.muted : colors.folder;
			const closed = define(`folder:false:${folder.mark}`, color);
			const open = define(`folder:true:${folder.mark}`, color);
			for (const name of folder.names) {
				target.folderNames[name] = closed;
				target.folderNamesExpanded[name] = open;
			}
		}
	}
	writeFileSync(join(root, `${set}-icon-theme.json`), JSON.stringify(theme, null, "\t") + "\n");
	return Object.keys(theme.iconDefinitions).length;
}

// The sets: Stylesmith Pixel, and one for every color theme.
const SETS = [
	{ set: "pixel", id: "stylesmith-pixel", label: "Stylesmith Pixel", colors: brandColors },
	...palettes.map(palette => ({
		set: `pixel-${palette.id}`,
		id: `stylesmith-pixel-${palette.id}`,
		label: palette.name.replace("Stylesmith ", "Stylesmith Pixel "),
		colors: kind => themeColors(palette, kind)
	}))
];

function build() {
	// Old SVG sets and theme files: the font and the JSON files replace them.
	for (const entry of readdirSync(root)) {
		if (entry.startsWith("pixel")) rmSync(join(root, entry), { recursive: true, force: true });
	}
	mkdirSync(root, { recursive: true });
	const list = glyphs();
	const codes = writeFont(list);
	console.log(`wrote ${FONT}: ${list.size} glyphs`);
	for (const { set, colors } of SETS) {
		const count = iconSet(set, colors, codes);
		console.log(`wrote ${set}: ${count} icons`);
	}

	const problemDir = join(root, "problems");
	rmSync(problemDir, { recursive: true, force: true });
	mkdirSync(problemDir, { recursive: true });
	const problemIcon = (map, color) => {
		const rects = [];
		map.forEach((row, y) => {
			for (let x = 0; x < row.length; x++) {
				if (row[x] === "#")
					rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`);
			}
		});
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects.join("")}</svg>\n`;
	};
	// For any other theme: one icon per severity for dark themes, one for light themes.
	for (const [name, icon] of Object.entries(PROBLEM_ICONS)) {
		for (const kind of ["dark", "light"]) {
			const color = fit(icon.color[kind], kind, EDITOR[kind]);
			writeFileSync(join(problemDir, `${name}-${kind}.svg`), problemIcon(icon.map, color));
		}
	}
	// For each Stylesmith theme (#106): its own color for each severity, as its editor uses.
	for (const palette of palettes) {
		const kind = (palette.kind ?? "dark").endsWith("light") ? "light" : "dark";
		mkdirSync(join(problemDir, palette.id));
		for (const [name, icon] of Object.entries(PROBLEM_ICONS)) {
			const color = fit(palette.status[name], kind, [palette.bg]);
			writeFileSync(
				join(problemDir, palette.id, `${name}.svg`),
				problemIcon(icon.map, color)
			);
		}
	}
	console.log("wrote problem gutter icons");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
