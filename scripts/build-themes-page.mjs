// Writes the preset and theme sections of site/themes.html from the source data: the presets
// (src/presets.ts), their stories (src/stories.ts), the effects (src/effects.ts), the fonts
// and the theme files. src/test/themesPage.test.ts and stories.test.ts check the result.
// Run with: npm run themes-page

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const out = name => require(join(ROOT, "out", `${name}.js`));
const { contrast } = out("color");
const { PRESETS } = out("presets");
const { EFFECTS } = out("effects");
const { FONTS } = out("fonts");
const { PRESET_STORIES, PRESET_TALES, THEME_STORIES } = out("stories");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

const ICONS = Object.fromEntries(pkg.contributes.iconThemes.map(t => [t.id, t.label]));
const PRODUCT_ICONS = Object.fromEntries(
	pkg.contributes.productIconThemes.map(t => [t.id, t.label])
);
const KINDS = {
	"vs-dark": "Dark",
	vs: "Light",
	"hc-black": "High contrast, dark",
	"hc-light": "High contrast, light"
};
const GROUPS = [
	[
		"Retro terminals",
		"Monitors and terminals of the 1970s and 80s, each true to the color of its phosphor.",
		["phosphor-terminal", "amber-monitor", "black-ice"]
	],
	[
		"Inspired by film",
		"Moods from screen worlds, described in our own words.",
		[
			"night-city",
			"monolith",
			"glass-lab",
			"vault",
			"simulation",
			"steel-and-rust",
			"deep-desert",
			"haze"
		]
	],
	[
		"Inspired by books",
		"Moods from novels and stories, named with credit to their authors.",
		["brass", "tea-garden", "sunroom", "countdown", "overlay"]
	],
	["Everyday", "Bright rooms and maximum contrast.", ["daylight", "high-contrast"]]
];
const THEME_GROUPS = [
	["Retro terminals", ["Stylesmith Phosphor", "Stylesmith Amber", "Stylesmith ICE"]],
	[
		"Inspired by film",
		[
			"Stylesmith Neon Night",
			"Stylesmith Monolith",
			"Stylesmith Glass Lab",
			"Stylesmith Vault",
			"Stylesmith Simulation",
			"Stylesmith Steel and Rust",
			"Stylesmith Deep Desert",
			"Stylesmith Haze"
		]
	],
	[
		"Inspired by books",
		[
			"Stylesmith Brass",
			"Stylesmith Tea Garden",
			"Stylesmith Sunroom",
			"Stylesmith Countdown",
			"Stylesmith Overlay"
		]
	],
	[
		"Everyday",
		[
			"Stylesmith Daylight",
			"Stylesmith Neon High Contrast",
			"Stylesmith Daylight High Contrast"
		]
	]
];

const sameSet = (a, b) => [...a].sort().join() === [...b].sort().join();
if (
	!sameSet(
		GROUPS.flatMap(g => g[2]),
		PRESETS.map(p => p.id)
	)
)
	throw new Error("every preset must be in exactly one group");
if (
	!sameSet(
		THEME_GROUPS.flatMap(g => g[1]),
		pkg.contributes.themes.map(t => t.label)
	)
)
	throw new Error("every theme must be in exactly one group");

// The id VS Code stores in settings: a renamed theme keeps its earlier name as `id`.
const settingsId = t => t.id ?? t.label;

const theme = label => {
	const entry = pkg.contributes.themes.find(t => t.label === label);
	return { entry, file: JSON.parse(readFileSync(join(ROOT, entry.path), "utf-8")) };
};
const font = id => FONTS.find(f => f.id === id);
const fontLink = id => `<a href="fonts.html#font-${id}">${font(id).label}</a>`;

function sample(label) {
	const { file } = theme(label);
	const c = file.colors;
	const token = scope =>
		file.tokenColors
			.find(r => [].concat(r.scope)[0] === scope)
			.settings.foreground.toLowerCase();
	let style = `--sample-bg: ${c["editor.background"]}; --sample-fg: ${c["editor.foreground"]}; --sample-kw: ${token("keyword")}; --sample-fn: ${token("entity.name.function")}; --sample-str: ${token("string")}; --sample-num: ${token("constant.numeric")}; --sample-cm: ${token("comment")}`;
	if (c.contrastBorder) style += `; --sample-border: ${c.contrastBorder}`;
	return `<pre class="theme-sample" data-theme="${label}" style="${style}"><code><span class="cm">// tally the night shift</span>\n<span class="kw">function</span> <span class="fn">total</span>(hours) {\n  <span class="kw">return</span> hours * <span class="num">1.5</span> + <span class="str">" h"</span>;\n}</code></pre>`;
}

const presetCard = p => `<li class="preset-card">
<img src="img/${p.id}.png" width="1280" height="760" alt="VS Code with the ${p.label} preset" loading="lazy" />
<div class="card-body">
<h4>${p.label}</h4>
<p>${PRESET_STORIES[p.label]}</p>
<details class="tale">
<summary>The story</summary>
<p><strong>Where it comes from.</strong> ${PRESET_TALES[p.label].origin}</p>
<p><strong>The colors.</strong> ${PRESET_TALES[p.label].colors}</p>
<p><strong>The settings.</strong> ${PRESET_TALES[p.label].settings}</p>
</details>
<dl class="preset-parts">
<dt>Color theme</dt>
<dd>${pkg.contributes.themes.find(t => settingsId(t) === p.theme).label}</dd>
<dt>File icons</dt>
<dd>${ICONS[p.iconTheme]}</dd>
<dt>Interface icons</dt>
<dd>${p.productIconTheme ? PRODUCT_ICONS[p.productIconTheme] : "VS Code&rsquo;s own"}</dd>
<dt>Settings on</dt>
<dd>${EFFECTS.filter(e => p.effects[e.setting])
	.map(e => e.label)
	.join(", ")}</dd>
<dt>Recommended font</dt>
<dd>${fontLink(p.font)}</dd>
</dl>
</div>
</li>`;

function themeCard(label) {
	const { entry, file } = theme(label);
	const c = file.colors;
	const users = PRESETS.filter(p => p.theme === settingsId(entry)).map(p => p.label);
	return `<li class="theme-card${entry.uiTheme.startsWith("hc") ? " high-contrast" : ""}">
${sample(label)}
<div class="card-body">
<h4>${label}</h4>
<p class="theme-kind">${KINDS[entry.uiTheme]}</p>
<p>${THEME_STORIES[label]}</p>
<dl class="preset-parts">
<dt>Editor text contrast</dt>
<dd>${contrast(c["editor.foreground"].slice(0, 7), c["editor.background"].slice(0, 7)).toFixed(1)}:1</dd>
<dt>Used by preset</dt>
<dd>${users.length ? users.join(", ") : "None; use it on its own"}</dd>
</dl>
</div>
</li>`;
}

const howTo = `<h3 class="group-title">How presets work</h3>
<div class="preset-howto">
<div>
<h4>Apply</h4>
<p>Choose a preset from the Stylesmith button in the status bar, or run <strong>Stylesmith: Apply Preset&hellip;</strong>. In one step it sets the color theme, the file icon theme and the settings listed on its card.</p>
</div>
<div>
<h4>Undo</h4>
<p>Run <strong>Stylesmith: Disable</strong> to put back your own color theme, icons and settings. If you changed one of them yourself after applying the preset, your change is kept.</p>
</div>
<div>
<h4>What it leaves to you</h4>
<p>A preset doesn&rsquo;t choose a font or change Problem Lens. Each card recommends a font: choose it in the Stylesmith menu, which can install it for you after you confirm.</p>
</div>
</div>`;

const table = `<h3 class="group-title">Compare presets</h3>
<div class="table-scroll">
<table class="preset-table">
<caption>The settings each preset turns on, and the font that suits it</caption>
<thead>
<tr><th scope="col">Preset</th>${EFFECTS.map(e => `<th scope="col">${e.label}</th>`).join("")}<th scope="col">Recommended font</th></tr>
</thead>
<tbody>
${GROUPS.flatMap(g => g[2])
	.map(id => {
		const p = PRESETS.find(x => x.id === id);
		return `<tr><th scope="row">${p.label}</th>${EFFECTS.map(e => (p.effects[e.setting] ? '<td class="on">on</td>' : '<td class="off">off</td>')).join("")}<td>${fontLink(p.font)}</td></tr>`;
	})
	.join("\n")}
</tbody>
</table>
</div>`;

const credits = `<p class="credits">The stories name the books and machines that inspired these looks: <em>Neuromancer</em> and <em>Burning Chrome</em> by William Gibson; <em>Story of Your Life</em> and <em>Exhalation</em> by Ted Chiang; <em>A Psalm for the Wild-Built</em> by Becky Chambers; <em>Klara and the Sun</em> by Kazuo Ishiguro; <em>The Three-Body Problem</em> by Liu Cixin; <em>The Murderbot Diaries</em> by Martha Wells; the IBM 5151 display (IBM); the VT100 terminal and VR201 monitor (Digital Equipment Corporation). Names belong to their owners. Stylesmith is an independent project, not affiliated with or endorsed by any of them, and its themes are original work.</p>`;

const presetsHtml = [
	howTo,
	table,
	...GROUPS.map(
		([title, intro, ids]) => `<h3 class="group-title">${title}</h3>
<p class="group-intro">${intro}</p>
<ul class="preset-grid">
${ids.map(id => presetCard(PRESETS.find(p => p.id === id))).join("\n")}
</ul>`
	),
	credits
].join("\n");

const themesHtml = THEME_GROUPS.map(
	([title, labels]) => `<h3 class="group-title">${title}</h3>
<ul class="theme-grid">
${labels.map(themeCard).join("\n")}
</ul>`
).join("\n");

const file = join(ROOT, "site", "themes.html");
let html = readFileSync(file, "utf-8");
// Replaces what follows a section's lead paragraph, up to the end of the section.
function replaceAfterLead(sectionId, content) {
	const start = html.indexOf(`aria-labelledby="${sectionId}"`);
	if (start < 0) throw new Error(`no section ${sectionId}`);
	const leadEnd =
		html.indexOf("</p>", html.indexOf('class="section-lead"', start)) + "</p>".length;
	const end = html.indexOf("</section>", start);
	html = `${html.slice(0, leadEnd)}\n${content}\n${html.slice(end)}`;
}
replaceAfterLead("presets-title", presetsHtml);
replaceAfterLead("themes-title", themesHtml);
writeFileSync(file, html);
console.log(`wrote ${file}`);
