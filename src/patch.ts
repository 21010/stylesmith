/**
 * Pure transformations of VS Code's workbench HTML.
 *
 * Everything `patch` adds is wrapped in marker comments, and the Content-Security-Policy
 * is commented out instead of deleted, so `unpatch` restores the original file byte for byte.
 */

export type ImportKind = "css" | "js";

const HEAD_START = "<!-- !! STYLESMITH-START !! -->\n";
const HEAD_END = "<!-- !! STYLESMITH-END !! -->\n";
const BODY_START = "<!-- !! STYLESMITH-INDICATOR-START !! -->\n";
const BODY_END = "<!-- !! STYLESMITH-INDICATOR-END !! -->\n";
const CSP_START = "<!-- !! STYLESMITH-CSP ";
const CSP_END = " !! -->";

// Also match the "VSCODE-CUSTOM-CSS" markers of Custom CSS and JS Loader, so switching
// from the original extension cleans up its patch.
const HEAD_BLOCK_RE =
	/<!-- !! (STYLESMITH|VSCODE-CUSTOM-CSS)-START !! -->[\s\S]*?<!-- !! \1-END !! -->\n?/g;
const BODY_BLOCK_RE =
	/<!-- !! (STYLESMITH|VSCODE-CUSTOM-CSS)-INDICATOR-START !! -->[\s\S]*?<!-- !! \1-INDICATOR-END !! -->\n?/g;
const CSP_COMMENT_RE = /<!-- !! (?:STYLESMITH|VSCODE-CUSTOM-CSS)-CSP ([\s\S]*?) !! -->/g;
const CSP_META_RE = /<meta\s+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi;

// Left behind by Custom CSS and JS Loader <= 7.5.1, which deleted the CSP outright.
const LEGACY_SESSION_RE = /<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ([\w-]+) !! -->\n*/;
const LEGACY_SESSION_GLOBAL_RE = new RegExp(LEGACY_SESSION_RE.source, "g");
const LEGACY_INDICATOR_RE =
	/<script>\/\* eslint-env browser \*\/[\s\S]*?__CUSTOM_CSS_JS_INDICATOR_CLS[\s\S]*?<\/script>\n*/g;

/**
 * Injects `headContent` before `</head>` (so auxiliary windows, which clone the head, get it too)
 * and `bodyContent` before `</body>`. `pristine` must be unpatched HTML.
 */
export function patch(pristine: string, headContent: string, bodyContent = ""): string {
	let html = pristine.replace(CSP_META_RE, meta => {
		if (meta.includes("-->")) throw new Error("Unexpected Content-Security-Policy markup");
		return CSP_START + meta + CSP_END;
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
	const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source; // strip BOM
	return kind === "css"
		? `<style>${text.replace(/<\/(style)/gi, "<\\/$1")}</style>\n`
		: `<script>${text.replace(/<\/(script)/gi, "<\\/$1")}</script>\n`;
}

function insertBefore(html: string, index: number, content: string): string {
	if (index < 0) throw new Error("The workbench HTML has an unexpected structure");
	return html.slice(0, index) + content + html.slice(index);
}
