// Writes the prompt previews on the Oh My Posh page (site/oh-my-posh.html): the Stylesmith prompt
// in every color theme, drawn in the theme's own terminal colors, as the prompt takes them
// (extras/oh-my-posh uses ANSI color names). src/test/promptPreviews.test.ts checks the colors.
// Run with: npm run prompt-previews

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

/** Writes a theme preview grid between <!-- marker:start --> and <!-- marker:end --> (#257). */
export function writeThemePreviews({ page, marker, roles, label, body }) {
	const file = join(ROOT, "site", page);
	const render = theme => {
		const themeFile = JSON.parse(readFileSync(join(ROOT, theme.path), "utf-8"));
		const vars = Object.entries(roles)
			.map(([role, key]) => `--p-${role}: ${themeFile.colors[key].slice(0, 7)}`)
			.join("; ");
		const name = theme.label.replace("Stylesmith ", "");
		return `<figure class="prompt-preview" data-theme="${theme.label}" style="${vars}">
<pre aria-label="${label(name)}">${body}</pre>
<figcaption>${name}</figcaption>
</figure>`;
	};
	const start = `<!-- ${marker}:start -->`;
	const end = `<!-- ${marker}:end -->`;
	const html = readFileSync(file, "utf-8");
	const i = html.indexOf(start);
	const j = html.indexOf(end);
	if (i < 0 || j < i) throw new Error(`the page has no ${marker} markers`);
	const grid = `<div class="prompt-previews">\n${pkg.contributes.themes.map(render).join("\n")}\n</div>`;
	writeFileSync(file, `${html.slice(0, i + start.length)}\n${grid}\n${html.slice(j)}`);
	console.log(`wrote ${pkg.contributes.themes.length} ${marker.replace("-", " ")}`);
}

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	writeThemePreviews({
		page: "oh-my-posh.html",
		marker: "prompt-previews",
		roles: ROLES,
		label: name => `The prompt in ${name}`,
		body: '<span class="chrome">╭─</span><span class="path"> ~/stylesmith</span> <span class="chrome">on</span><span class="git"> main</span><br><span class="chrome">╰─</span><span class="ok">❯</span> npm test<br><span class="chrome">╭─</span><span class="path"> ~/stylesmith</span> <span class="took">took 3s</span><span class="error"> ✗ 1</span><br><span class="chrome">╰─</span><span class="fail">❯</span>'
	});
}
