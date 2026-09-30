import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { wrapImport, type ImportKind } from "./patch";

export interface Variables {
	cwd: string;
	userHome: string;
	workspaceFolder: string;
	execPath: string;
	pathSeparator: string;
	env: NodeJS.ProcessEnv;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Replaces `${name}` placeholders in `file:` URLs, e.g. `file://${userHome}/a.css`.
 * Unknown placeholders are left untouched; other URL schemes are returned unchanged.
 */
export function resolveVariables(url: string, vars: Variables): string {
	if (!/^file:/i.test(url)) return url;
	return url.replace(/\$\{([^{}]+)\}/g, (match, key: string) => {
		const value = lookupVariable(key, vars);
		// Characters with a special meaning in URLs must not come from a substituted path.
		return value === undefined ? match : value.replace(/[%#?]/g, encodeURIComponent);
	});
}

function lookupVariable(key: string, vars: Variables): string | undefined {
	if (key.startsWith("env:")) {
		// ${env:NAME} or ${env:NAME:fallback}; the fallback may itself contain colons.
		const [name, ...fallback] = key.slice("env:".length).split(":");
		return vars.env[name] ?? fallback.join(":");
	}
	switch (key) {
		case "cwd":
			return vars.cwd;
		case "userHome":
			return vars.userHome;
		case "workspaceFolder":
			return vars.workspaceFolder;
		case "execPath":
			return vars.execPath;
		case "pathSeparator":
		case "/":
			return vars.pathSeparator;
		default:
			return undefined;
	}
}

export function importKind(url: URL): ImportKind {
	const ext = path.posix.extname(url.pathname).toLowerCase();
	if (ext === ".css") return "css";
	if (ext === ".js") return "js";
	throw new Error(`Unsupported file type "${ext}", expected .css or .js`);
}

export async function fetchImport(url: URL, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
	switch (url.protocol) {
		case "file:":
			return readFile(fileURLToPath(url), "utf-8");
		case "http:":
		case "https:": {
			const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
			if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
			return response.text();
		}
		default:
			throw new Error(`Unsupported protocol "${url.protocol}"`);
	}
}

/**
 * Loads all imports concurrently and returns their inline tags in configuration order.
 * An entry that fails is reported through `onError` and skipped.
 */
export async function renderImports(
	entries: readonly unknown[],
	vars: Variables,
	onError: (entry: string, error: Error) => void
): Promise<string> {
	const rendered = await Promise.all(
		entries.map(async entry => {
			if (typeof entry !== "string" || entry.trim() === "") return "";
			const resolved = resolveVariables(entry, vars);
			try {
				const url = new URL(resolved);
				const kind = importKind(url);
				return wrapImport(kind, await fetchImport(url));
			} catch (error) {
				onError(resolved, error instanceof Error ? error : new Error(String(error)));
				return "";
			}
		})
	);
	return rendered.join("");
}
