import { createHash } from "node:crypto";

/**
 * Stylesmith keeps VS Code's Content-Security-Policy in place and only extends it:
 *
 * - `script-src` gets the SHA-256 hash of each script Stylesmith adds, so exactly those
 *   scripts can run, and no other inline or injected script can.
 * - `style-src` and `font-src` allow `https:` (and `data:` fonts), so custom CSS can use
 *   web fonts and remote stylesheets. Neither can run code.
 * - `trusted-types` allows one extra policy name, for user scripts that need to set HTML.
 */

export const TRUSTED_TYPES_POLICY = "stylesmith";

const STYLE_SOURCES = ["https:"];
const FONT_SOURCES = ["https:", "data:"];

/** The CSP source expression that allows an inline script with this exact content. */
export function scriptHash(source: string): string {
	return `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;
}

/** Returns `policy` with Stylesmith's additions. Everything else is kept as it was. */
export function extendPolicy(policy: string, scriptHashes: readonly string[]): string {
	const directives = policy
		.split(";")
		.map(directive => directive.trim().split(/\s+/).filter(Boolean))
		.filter(tokens => tokens.length > 0);

	const find = (name: string) => directives.find(tokens => tokens[0].toLowerCase() === name);

	const addSources = (name: string, sources: readonly string[]) => {
		if (sources.length === 0) return;
		let directive = find(name);
		if (!directive) {
			// A missing directive falls back to default-src, so start from its sources.
			directive = [name, ...(find("default-src")?.slice(1) ?? [])];
			directives.push(directive);
		}
		for (const source of sources) {
			if (!directive.includes(source)) directive.push(source);
		}
		// 'none' is only valid on its own.
		const none = directive.indexOf("'none'");
		if (none > 0) directive.splice(none, 1);
	};

	addSources("script-src", scriptHashes);
	addSources("style-src", STYLE_SOURCES);
	addSources("font-src", FONT_SOURCES);

	const trustedTypes = find("trusted-types");
	if (trustedTypes && !trustedTypes.includes(TRUSTED_TYPES_POLICY)) {
		trustedTypes.push(TRUSTED_TYPES_POLICY);
	}

	return directives.map(tokens => tokens.join(" ")).join("; ");
}
