// Writes the prompt previews on the Oh My Posh page (site/oh-my-posh.html): the Stylesmith prompt
// in every color theme, drawn in the theme's own terminal colors, as the prompt takes them
// (extras/oh-my-posh uses ANSI color names). src/test/promptPreviews.test.ts checks the colors.
// Run with: npm run prompt-previews

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "site", "oh-my-posh.html");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

/** The prompt's roles and the ANSI color each takes (see extras/oh-my-posh/stylesmith.omp.json). */
export const ROLES = {
	bg: "terminal.background",
	fg: "terminal.foreground",
	chrome: "terminal.ansiBrightBlack",
	path: "terminal.ansiCyan",
	git: "terminal.ansiGreen",
	took: "terminal.ansiYellow",
	error: "terminal.ansiRed",
	ok: "terminal.ansiBrightGreen",
	fail: "terminal.ansiBrightRed"
};

const preview = theme => {
	const file = JSON.parse(readFileSync(join(ROOT, theme.path), "utf-8"));
	const vars = Object.entries(ROLES)
		.map(([role, key]) => `--p-${role}: ${file.colors[key].slice(0, 7)}`)
		.join("; ");
	const name = theme.label.replace("Stylesmith ", "");
	return `<figure class="prompt-preview" data-theme="${theme.label}" style="${vars}">
<pre aria-label="The prompt in ${name}"><span class="chrome">╭─</span><span class="path"> ~/stylesmith</span> <span class="chrome">on</span><span class="git"> main</span><br><span class="chrome">╰─</span><span class="ok">❯</span> npm test<br><span class="chrome">╭─</span><span class="path"> ~/stylesmith</span> <span class="took">took 3s</span><span class="error"> ✗ 1</span><br><span class="chrome">╰─</span><span class="fail">❯</span></pre>
<figcaption>${name}</figcaption>
</figure>`;
};

const START = "<!-- prompt-previews:start -->";
const END = "<!-- prompt-previews:end -->";
const html = readFileSync(PAGE, "utf-8");
const i = html.indexOf(START);
const j = html.indexOf(END);
if (i < 0 || j < i) throw new Error("the page has no prompt-previews markers");
const grid = `<div class="prompt-previews">\n${pkg.contributes.themes.map(preview).join("\n")}\n</div>`;
writeFileSync(PAGE, html.slice(0, i + START.length) + "\n" + grid + "\n" + html.slice(j));
console.log(`wrote ${pkg.contributes.themes.length} prompt previews`);
