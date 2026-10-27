// Writes the Vim previews on the Vim page (site/vim.html): the Stylesmith Vim color scheme in
// every color theme, drawn in the theme's own terminal colors, as the scheme takes them
// (extras/vim/colors/stylesmith.vim uses ANSI color names). src/test/vimPreviews.test.ts checks
// the colors.
// Run with: npm run vim-previews

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "site", "vim.html");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

/** The Vim preview's roles and the ANSI color each takes (see extras/vim/colors/stylesmith.vim). */
export const ROLES = {
	bg: "terminal.background",
	fg: "terminal.foreground",
	chrome: "terminal.ansiBrightBlack",
	kw: "terminal.ansiMagenta",
	fn: "terminal.ansiCyan",
	str: "terminal.ansiYellow",
	num: "terminal.ansiBrightYellow"
};

const preview = theme => {
	const file = JSON.parse(readFileSync(join(ROOT, theme.path), "utf-8"));
	const vars = Object.entries(ROLES)
		.map(([role, key]) => `--p-${role}: ${file.colors[key].slice(0, 7)}`)
		.join("; ");
	const name = theme.label.replace("Stylesmith ", "");
	return `<figure class="prompt-preview" data-theme="${theme.label}" style="${vars}">
<pre aria-label="Vim in ${name}"><span class="chrome">  1 </span><span class="chrome">// tally the night shift</span><br><span class="chrome">  2 </span><span class="kw">function</span> <span class="fn">total</span>(hours) {<br><span class="num">  3 </span>  <span class="kw">return</span> hours * <span class="num">1.5</span> + <span class="str">" h"</span>;<br><span class="chrome">  4 </span>}</pre>
<figcaption>${name}</figcaption>
</figure>`;
};

const START = "<!-- vim-previews:start -->";
const END = "<!-- vim-previews:end -->";
const html = readFileSync(PAGE, "utf-8");
const i = html.indexOf(START);
const j = html.indexOf(END);
if (i < 0 || j < i) throw new Error("the page has no vim-previews markers");
const grid = `<div class="prompt-previews">\n${pkg.contributes.themes.map(preview).join("\n")}\n</div>`;
writeFileSync(PAGE, html.slice(0, i + START.length) + "\n" + grid + "\n" + html.slice(j));
console.log(`wrote ${pkg.contributes.themes.length} vim previews`);
