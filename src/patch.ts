/**
 * Pure transformations of VS Code's workbench HTML.
 *
 * Everything `patch` adds is wrapped in marker comments. The original Content-Security-Policy
 * is kept in a comment next to the extended one, so `unpatch` restores the file byte for byte.
 */

import { extendPolicy, scriptHash } from "./csp";

export type ImportKind = "css" | "js";

/** Found near the top of every patched workbench file. */
export const PATCH_MARKER = "<!-- !! STYLESMITH-START !! -->";
const HEAD_START = `${PATCH_MARKER}\n`;
const HEAD_END = "<!-- !! STYLESMITH-END !! -->\n";
const BODY_START = "<!-- !! STYLESMITH-INDICATOR-START !! -->\n";
const BODY_END = "<!-- !! STYLESMITH-INDICATOR-END !! -->\n";
const CSP_START = "<!-- !! STYLESMITH-CSP ";
const CSP_END = " !! -->";
const CSP_META_START = '<meta http-equiv="Content-Security-Policy" data-stylesmith-csp content="';

// Also match the "VSCODE-CUSTOM-CSS" markers of Custom CSS and JS Loader, so switching
// from the original extension cleans up its patch.
const HEAD_BLOCK_RE =
	/<!-- !! (STYLESMITH|VSCODE-CUSTOM-CSS)-START !! -->[\s\S]*?<!-- !! \1-END !! -->\n?/g;
const BODY_BLOCK_RE =
	/<!-- !! (STYLESMITH|VSCODE-CUSTOM-CSS)-INDICATOR-START !! -->[\s\S]*?<!-- !! \1-INDICATOR-END !! -->\n?/g;
// The original policy in a comment, optionally followed by the extended policy that replaced it.
const CSP_COMMENT_RE =
	/<!-- !! (?:STYLESMITH|VSCODE-CUSTOM-CSS)-CSP ([\s\S]*?) !! -->(?:<meta http-equiv="Content-Security-Policy" data-stylesmith-csp [^>]*>)?/g;
const CSP_META_RE = /<meta\s+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi;
const CSP_CONTENT_RE = /\scontent\s*=\s*"([^"]*)"/i;

// Left behind by Custom CSS and JS Loader <= 7.5.1, which deleted the CSP outright.
const LEGACY_SESSION_RE = /<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ([\w-]+) !! -->\n*/;
const LEGACY_SESSION_GLOBAL_RE = new RegExp(LEGACY_SESSION_RE.source, "g");
const LEGACY_INDICATOR_RE =
	/<script>\/\* eslint-env browser \*\/[\s\S]*?__CUSTOM_CSS_JS_INDICATOR_CLS[\s\S]*?<\/script>\n*/g;

/** A stylesheet or script to add to the workbench. */
export interface Snippet {
	kind: ImportKind;
	source: string;
}

/**
 * Injects `head` before `</head>` (so auxiliary windows, which clone the head, get it too)
 * and `body` before `</body>`. `pristine` must be unpatched HTML.
 */
export function patch(
	pristine: string,
	head: readonly Snippet[],
	body: readonly Snippet[] = []
): string {
	const headTags = head.map(toTag);
	const bodyTags = body.map(toTag);
	const headContent = headTags.map(tag => tag.html).join("");
	const bodyContent = bodyTags.map(tag => tag.html).join("");

	// Allow exactly the scripts being added, by hash, and nothing else. The hashes come from
	// the scripts' text as it is written into the page, not from parsing the HTML afterwards.
	const hashes = [...headTags, ...bodyTags].flatMap(tag => (tag.hash ? [tag.hash] : []));

	let html = pristine.replace(CSP_META_RE, meta => {
		const content = CSP_CONTENT_RE.exec(meta)?.[1];
		if (content === undefined || meta.includes("-->")) {
			throw new Error("Cannot read VS Code's Content-Security-Policy");
		}
		const policy = extendPolicy(content, hashes);
		if (/["<>]/.test(policy)) throw new Error("Unexpected Content-Security-Policy content");
		return `${CSP_START}${meta}${CSP_END}${CSP_META_START}${policy}">`;
	});
	html = insertBefore(html, html.indexOf("</head>"), HEAD_START + headContent + HEAD_END);
	if (bodyContent) {
		html = insertBefore(html, html.lastIndexOf("</body>"), BODY_START + bodyContent + BODY_END);
	}

	// Refuse to produce a file we could not cleanly revert later.
	if (unpatch(html) !== pristine) {
		throw new Error("The patched workbench could not be verified as reversible");
	}
	return html;
}

/** Removes everything this extension (any version) added to the workbench HTML. */
export function unpatch(html: string): string {
	return html
		.replace(HEAD_BLOCK_RE, "")
		.replace(BODY_BLOCK_RE, "")
		.replace(LEGACY_SESSION_GLOBAL_RE, "")
		.replace(LEGACY_INDICATOR_RE, "")
		.replace(CSP_COMMENT_RE, (_, meta: string) => meta);
}

/** Session ID of a Custom CSS and JS Loader <= 7.5.1 patch; it names the backup file it made. */
export function getLegacySessionId(html: string): string | undefined {
	return LEGACY_SESSION_RE.exec(html)?.[1];
}

/** Wraps a stylesheet or script as an inline tag that cannot close itself early. */
export function wrapImport(kind: ImportKind, source: string): string {
	return toTag({ kind, source }).html;
}

/** The inline tag for a snippet, plus the CSP hash of its content if it is a script. */
function toTag({ kind, source }: Snippet): { html: string; hash?: string } {
	const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source; // strip BOM
	if (kind === "css") {
		return { html: `<style>${text.replace(/<\/(style)/gi, "<\\/$1")}</style>\n` };
	}
	const script = text.replace(/<\/(script)/gi, "<\\/$1");
	return { html: `<script>${script}</script>\n`, hash: scriptHash(script) };
}

function insertBefore(html: string, index: number, content: string): string {
	if (index < 0) throw new Error("The workbench HTML has an unexpected structure");
	return html.slice(0, index) + content + html.slice(index);
}
