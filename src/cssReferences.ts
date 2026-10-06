/**
 * Finds the files a stylesheet loads from the network, for pinned imports: a #sha256 pin
 * covers the stylesheet's own bytes, so anything it loads from the network would escape it.
 *
 * It reads the stylesheet the way a browser does where that matters: comments are skipped,
 * escapes are decoded (`u\72l(` is `url(`), names are case-insensitive, and the URL is
 * cleaned up as the browser's URL parser would. It errs on the side of refusing: every string
 * inside a function, such as `image-set("...")` or `src("...")`, counts as a reference.
 */

/** The references in `css` that load from the network, as written after decoding. */
export function networkReferences(css: string): string[] {
	return references(css).filter(isNetwork);
}

/** Whether a URL would be fetched from another machine: //host, or a scheme other than local ones. */
function isNetwork(reference: string): boolean {
	// What the URL parser does first: drop tabs and newlines, trim spaces and control
	// characters, and read backslashes as slashes.
	const withoutWhitespaceControls = reference.replace(/[\t\n\r]/g, "");
	let start = 0;
	let end = withoutWhitespaceControls.length;
	while (start < end && withoutWhitespaceControls.charCodeAt(start) <= 0x20) start++;
	while (end > start && withoutWhitespaceControls.charCodeAt(end - 1) <= 0x20) end--;
	const url = withoutWhitespaceControls
		.slice(start, end)
		.replace(/\\/g, "/")
		.toLowerCase();
	if (url.startsWith("//")) return true;
	const scheme = /^([a-z][a-z0-9+.-]*):/.exec(url)?.[1];
	return scheme !== undefined && !LOCAL_SCHEMES.has(scheme);
}

const LOCAL_SCHEMES = new Set(["data", "file", "vscode-file"]);

/** Every URL in `css`: url() values, @import strings, and strings inside any function. */
function references(css: string): string[] {
	const found: string[] = [];
	let i = 0;
	let depth = 0; // how many function parentheses we're inside
	let afterImport = false; // right after @import, where a string is a URL

	while (i < css.length) {
		const char = css[i]!;
		if (css.startsWith("/*", i)) {
			const end = css.indexOf("*/", i + 2);
			i = end < 0 ? css.length : end + 2;
		} else if (char === '"' || char === "'") {
			const string = readString(css, i);
			if (depth > 0 || afterImport) found.push(string.value);
			afterImport = false;
			i = string.end;
		} else if (char === "@" && startsIdent(css, i + 1)) {
			const name = readIdent(css, i + 1);
			afterImport = name.value.toLowerCase() === "import";
			i = name.end;
		} else if (startsIdent(css, i)) {
			const name = readIdent(css, i);
			i = name.end;
			if (css[i] !== "(") continue;
			i++;
			if (name.value.toLowerCase() === "url") {
				const url = readUrl(css, i);
				if (url.value !== undefined) found.push(url.value);
				else depth++; // url("..."): a function with a string, handled above
				i = url.end;
			} else {
				depth++;
			}
			afterImport = false;
		} else {
			if (char === "(") depth++;
			else if (char === ")") depth = Math.max(0, depth - 1);
			else if (char === ";" || char === "{") afterImport = false;
			i++;
		}
	}
	return found;
}

interface Read {
	value: string;
	end: number;
}

/** Whether an identifier starts at `i`: a letter, _, -, non-ASCII, or an escape. */
function startsIdent(css: string, i: number): boolean {
	const char = css[i];
	if (char === undefined) return false;
	if (char === "\\") return css[i + 1] !== undefined && css[i + 1] !== "\n";
	if (char === "-") return startsIdent(css, i + 1) || css[i + 1] === "-";
	return /[A-Za-z_]/.test(char) || char.charCodeAt(0) >= 0x80;
}

function readIdent(css: string, start: number): Read {
	let value = "";
	let i = start;
	while (i < css.length) {
		const char = css[i]!;
		if (char === "\\" && css[i + 1] !== undefined && css[i + 1] !== "\n") {
			const escape = readEscape(css, i + 1);
			value += escape.value;
			i = escape.end;
		} else if (/[A-Za-z0-9_-]/.test(char) || char.charCodeAt(0) >= 0x80) {
			value += char;
			i++;
		} else {
			break;
		}
	}
	return { value, end: i };
}

/** Reads a quoted string starting at its quote, decoding escapes. */
function readString(css: string, start: number): Read {
	const quote = css[start];
	let value = "";
	let i = start + 1;
	while (i < css.length) {
		const char = css[i]!;
		if (char === quote) return { value, end: i + 1 };
		if (char === "\n") return { value, end: i }; // a bad string ends at the line
		if (char === "\\") {
			if (css[i + 1] === "\n") {
				i += 2; // an escaped newline continues the string
				continue;
			}
			if (css[i + 1] === undefined) break;
			const escape = readEscape(css, i + 1);
			value += escape.value;
			i = escape.end;
		} else {
			value += char;
			i++;
		}
	}
	return { value, end: css.length };
}

/**
 * Reads what follows `url(`: an unquoted URL up to `)`, or nothing when the URL is quoted
 * (then the string is read like any other inside a function).
 */
function readUrl(css: string, start: number): { value: string | undefined; end: number } {
	let i = start;
	while (/\s/.test(css[i] ?? "")) i++;
	if (css[i] === '"' || css[i] === "'") return { value: undefined, end: i };
	let value = "";
	while (i < css.length && css[i] !== ")") {
		if (css[i] === "\\" && css[i + 1] !== undefined) {
			const escape = readEscape(css, i + 1);
			value += escape.value;
			i = escape.end;
		} else {
			value += css[i];
			i++;
		}
	}
	return { value: value.trim(), end: Math.min(i + 1, css.length) };
}

/** Decodes the escape after a backslash at `start - 1`: up to six hex digits, or one character. */
function readEscape(css: string, start: number): Read {
	const hex = /^[0-9A-Fa-f]{1,6}/.exec(css.slice(start, start + 6))?.[0];
	if (!hex) return { value: css[start] ?? "", end: start + 1 };
	let end = start + hex.length;
	if (/\s/.test(css[end] ?? "")) end++; // one space ends the escape
	const code = parseInt(hex, 16);
	const valid = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
	return { value: String.fromCodePoint(valid ? code : 0xfffd), end };
}
