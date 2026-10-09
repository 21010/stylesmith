/**
 * The preset gallery's page (#84), with no VS Code API, so it can be tested: the HTML of the
 * webview, and the check of the messages it sends back. presetGallery.ts shows it.
 *
 * The page loads nothing: its content security policy is default-src 'none', and its one style
 * block and one script carry a fresh nonce. Theme colors go into that style block as classes,
 * since the policy also blocks style attributes. Every text is escaped, and every color must be
 * a hex color before it's written.
 */

/** The colors of a theme's code sample. */
export interface SampleColors {
	bg: string;
	fg: string;
	keyword: string;
	function: string;
	string: string;
	number: string;
	comment: string;
}

export interface GalleryCard {
	id: string;
	label: string;
	story: string;
	themeLabel: string;
	colors: SampleColors;
	settingsOn: readonly string[];
	fontLabel: string;
	/** The preset's color theme is the one in use. */
	current: boolean;
}

/** What the page may ask for. */
export type GalleryMessage = { type: "apply"; id: string } | { type: "disable" };

/** A message from the page, if it's one the gallery accepts: anything else is ignored. */
export function parseMessage(message: unknown, ids: readonly string[]): GalleryMessage | undefined {
	if (typeof message !== "object" || message === null) return undefined;
	const { type, id } = message as Record<string, unknown>;
	if (type === "disable") return { type };
	if (type === "apply" && typeof id === "string" && ids.includes(id)) return { type, id };
	return undefined;
}

/** The sample colors of a generated color theme file. */
export function sampleColors(theme: {
	colors: Record<string, string>;
	tokenColors: { scope?: string | string[]; settings: { foreground?: string } }[];
}): SampleColors {
	const token = (scope: string) =>
		theme.tokenColors.find(rule => [rule.scope ?? []].flat()[0] === scope)?.settings
			.foreground ?? theme.colors["editor.foreground"]!;
	return {
		bg: theme.colors["editor.background"]!,
		fg: theme.colors["editor.foreground"]!,
		keyword: token("keyword"),
		function: token("entity.name.function"),
		string: token("string"),
		number: token("constant.numeric"),
		comment: token("comment")
	};
}

const escape = (text: string) =>
	text.replace(
		/[&<>"']/g,
		c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
	);

const hex = (color: string) => {
	if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)) throw new Error(`not a color: ${color}`);
	return color;
};

const STYLE = `
:root { color-scheme: light dark; }
body { margin: 0; padding: 24px; font-family: var(--vscode-font-family, system-ui, sans-serif);
	font-size: var(--vscode-font-size, 13px); color: var(--vscode-foreground, #cccccc);
	background: var(--vscode-editor-background, #1e1e1e); line-height: 1.5; }
header { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between; margin-bottom: 20px; }
h1 { font-size: 1.6em; margin: 0; } header p { margin: 4px 0 0; color: var(--vscode-descriptionForeground, #b4b4b4); }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
article { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 16px;
	border: 1px solid var(--vscode-panel-border, #444444); border-radius: 6px;
	background: var(--vscode-sideBar-background, #252526); }
article.current { border-color: var(--vscode-focusBorder, #3794ff); }
h2 { font-size: 1.2em; margin: 0; display: flex; gap: 8px; align-items: baseline; }
.badge { font-size: 0.75em; font-weight: 600; padding: 1px 6px; border-radius: 3px;
	color: var(--vscode-badge-foreground, #ffffff); background: var(--vscode-badge-background, #4d4d4d); }
article p { margin: 0; }
pre { margin: 0; padding: 10px 12px; border-radius: 4px; overflow-x: auto;
	font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 1.6;
	background: var(--bg); color: var(--fg); }
.kw { color: var(--kw); } .fn { color: var(--fn); } .str { color: var(--str); } .num { color: var(--num); } .cm { color: var(--cm); }
dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; font-size: 0.92em; }
dt { color: var(--vscode-descriptionForeground, #b4b4b4); } dd { margin: 0; }
button { margin-top: auto; align-self: flex-start; font: inherit; padding: 6px 14px; border-radius: 2px; cursor: pointer;
	border: 1px solid var(--vscode-button-border, transparent);
	color: var(--vscode-button-foreground, #ffffff); background: var(--vscode-button-background, #0e639c); }
button:hover { background: var(--vscode-button-hoverBackground, #1177bb); }
button.secondary { margin: 0; color: var(--vscode-button-secondaryForeground, #ffffff);
	background: var(--vscode-button-secondaryBackground, #3a3d41); }
button:focus-visible { outline: 2px solid var(--vscode-focusBorder, #3794ff); outline-offset: 2px; }
`;

const SCRIPT = `
const vscode = acquireVsCodeApi();
document.addEventListener("click", event => {
	const button = event.target.closest("button");
	if (!button) return;
	if (button.dataset.preset) vscode.postMessage({ type: "apply", id: button.dataset.preset });
	else if (button.dataset.action === "disable") vscode.postMessage({ type: "disable" });
});
`;

function card(card: GalleryCard, i: number): string {
	const sample = `<pre class="sample s${i}" aria-label="A code sample in ${escape(card.themeLabel)}"><code><span class="cm">// tally the night shift</span>
<span class="kw">function</span> <span class="fn">total</span>(hours) {
  <span class="kw">return</span> hours * <span class="num">1.5</span> + <span class="str">" h"</span>;
}</code></pre>`;
	return `<li><article class="${card.current ? "current" : ""}" aria-labelledby="p${i}">
<h2 id="p${i}">${escape(card.label)}${card.current ? ' <span class="badge">In use</span>' : ""}</h2>
${sample}
<p>${escape(card.story)}</p>
<dl>
<dt>Color theme</dt><dd>${escape(card.themeLabel)}</dd>
<dt>Settings on</dt><dd>${escape(card.settingsOn.join(", ") || "none")}</dd>
<dt>Recommended font</dt><dd>${escape(card.fontLabel)}</dd>
</dl>
<button type="button" data-preset="${escape(card.id)}">Apply ${escape(card.label)}</button>
</article></li>`;
}

/** The gallery page. `nonce` must be new for every page. */
export function galleryHtml(cards: readonly GalleryCard[], nonce: string): string {
	if (!/^[A-Za-z0-9+/=]{16,}$/.test(nonce)) throw new Error("the nonce must be random base64");
	const colors = cards
		.map(
			({ colors: c }, i) =>
				`.s${i} { --bg: ${hex(c.bg)}; --fg: ${hex(c.fg)}; --kw: ${hex(c.keyword)}; --fn: ${hex(c.function)}; --str: ${hex(c.string)}; --num: ${hex(c.number)}; --cm: ${hex(c.comment)}; }`
		)
		.join("\n");
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stylesmith Presets</title>
<style nonce="${nonce}">${STYLE}
${colors}</style>
</head>
<body>
<header>
<div><h1>Stylesmith presets</h1><p>A preset sets a color theme, icons and VS Code settings. Disable puts your own back.</p></div>
<button type="button" class="secondary" data-action="disable">Disable Stylesmith</button>
</header>
<main>
<ul>
${cards.map(card).join("\n")}
</ul>
</main>
<script nonce="${nonce}">${SCRIPT}</script>
</body>
</html>`;
}
