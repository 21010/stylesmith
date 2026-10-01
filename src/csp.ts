import { createHash } from "node:crypto";

/**
 * Stylesmith keeps VS Code's Content-Security-Policy in place and only extends it:
 *
 * - `script-src` gets the SHA-256 hash of each script Stylesmith adds, so exactly those
 *   scripts can run, and no other inline or injected script can.
 * - `font-src` allows `data:` fonts, which can't load anything.
 * - Only with remote imports turned on: `style-src` and `font-src` allow `https:`, so
 *   custom CSS can use web fonts and remote stylesheets.
 * - Only when the user adds their own scripts: `trusted-types` allows one extra policy name,
 *   for scripts that need to set HTML.
 */

export const TRUSTED_TYPES_POLICY = "stylesmith";

export interface PolicyOptions {
	/** Whether remote imports are on; only then are https: styles and fonts allowed. */
	allowRemote: boolean;
	/** Whether the user's own scripts are added; only then is the Trusted Types name allowed. */
	userScripts: boolean;
}

const STRICT: PolicyOptions = { allowRemote: false, userScripts: false };

/** The CSP source expression that allows an inline script with this exact content. */
export function scriptHash(source: string): string {
	return `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;
}

/** Returns `policy` with Stylesmith's additions. Everything else is kept as it was. */
export function extendPolicy(
	policy: string,
	scriptHashes: readonly string[],
	options: PolicyOptions = STRICT
): string {
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
	addSources("style-src", options.allowRemote ? ["https:"] : []);
	addSources("font-src", options.allowRemote ? ["https:", "data:"] : ["data:"]);

	const trustedTypes = find("trusted-types");
	if (options.userScripts && trustedTypes && !trustedTypes.includes(TRUSTED_TYPES_POLICY)) {
		trustedTypes.push(TRUSTED_TYPES_POLICY);
	}

	return directives.map(tokens => tokens.join(" ")).join("; ");
}
