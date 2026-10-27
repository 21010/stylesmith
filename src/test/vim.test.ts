import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { ROOT } from "./files";

/**
 * The optional Vim color scheme in extras/vim/colors/stylesmith.vim. Like the Oh My Posh
 * prompt, it must use only the terminal's named ANSI colors whose contrast the theme tests
 * check on the terminal background, and NONE for the terminal's own foreground or background.
 * Black, White, LightGray and Gray are left out: they're the background-like colors of dark
 * or light themes, which the theme tests skip.
 */
const SAFE_COLORS = new Set([
	"NONE",
	"Red",
	"Green",
	"Yellow",
	"Blue",
	"Magenta",
	"Cyan",
	"DarkGray",
	"LightRed",
	"LightGreen",
	"LightYellow",
	"LightBlue",
	"LightMagenta",
	"LightCyan"
]);

const REQUIRED_GROUPS = [
	"Normal",
	"Comment",
	"Constant",
	"String",
	"Number",
	"Identifier",
	"Function",
	"Statement",
	"Keyword",
	"Operator",
	"PreProc",
	"Type",
	"Special",
	"Error",
	"Todo",
	"LineNr",
	"CursorLineNr",
	"StatusLine",
	"Visual",
	"Search",
	"DiffAdd",
	"DiffChange",
	"DiffDelete",
	"DiagnosticError",
	"DiagnosticWarn",
	"DiagnosticInfo"
];

const scheme = readFileSync(path.join(ROOT, "extras", "vim", "colors", "stylesmith.vim"), "utf-8");
const highlights = scheme
	.split(/\r?\n/)
	.map(line => line.trim())
	.filter(line => line.startsWith("highlight ") && line !== "highlight clear");

describe("Vim color scheme", () => {
	it("resets existing highlights, turns off termguicolors, and names itself stylesmith", () => {
		assert.match(scheme, /^\s*set notermguicolors$/m);
		assert.match(scheme, /^highlight clear$/m);
		assert.match(scheme, /^let g:colors_name = "stylesmith"$/m);
	});

	it("defines the core Vim and Neovim highlight groups", () => {
		const defined = new Set(highlights.map(line => line.split(/\s+/)[1]));
		for (const group of REQUIRED_GROUPS) {
			assert.ok(defined.has(group), `defines ${group}`);
		}
	});

	it("sets no 24-bit gui colors, so it always follows the terminal palette", () => {
		assert.doesNotMatch(scheme, /\bgui(?:fg|bg|sp)?=/i);
	});

	for (const line of highlights) {
		const [, group = ""] = line.split(/\s+/);
		it(`colors ${group} only with checked terminal colors and no background fill`, () => {
			const fg = /\bctermfg=(\S+)/.exec(line)?.[1];
			const bg = /\bctermbg=(\S+)/.exec(line)?.[1];
			assert.ok(fg && SAFE_COLORS.has(fg), `${group}: "${fg}" is not a checked color`);
			assert.equal(bg, "NONE", `${group}: background must be NONE`);
		});
	}
});
