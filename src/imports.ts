import { readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { wrapImport, type ImportKind } from "./patch";

export interface Variables {
	cwd: string;
	userHome: string;
	/** Undefined when the workspace isn't trusted, so its files can't be injected. */
	workspaceFolder: string | undefined;
	execPath: string;
	pathSeparator: string;
	env: NodeJS.ProcessEnv;
}

export interface LoadOptions {
	/** Whether https:// imports are allowed. http:// is never allowed. */
	allowRemote: boolean;
	timeoutMs?: number;
	maxBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

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
			if (vars.workspaceFolder === undefined) {
				throw new Error("${workspaceFolder} can only be used in a trusted workspace");
			}
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

export async function fetchImport(url: URL, options: LoadOptions): Promise<string> {
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	switch (url.protocol) {
		case "file:": {
			const file = fileURLToPath(url);
			if ((await stat(file)).size > maxBytes) throw tooLarge(maxBytes);
			return readFile(file, "utf-8");
		}
		case "https:": {
			if (!options.allowRemote) {
				throw new Error(
					"remote imports are turned off; set stylesmith.allowRemoteImports to use https://"
				);
			}
			const response = await fetch(url, {
				signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
			});
			// A redirect must not downgrade the connection to plain http.
			if (new URL(response.url).protocol !== "https:") {
				throw new Error(`redirected to an insecure URL: ${response.url}`);
			}
			if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
			return readLimited(response, maxBytes);
		}
		case "http:":
			throw new Error("http:// is not allowed because it can be tampered with; use https://");
		default:
			throw new Error(`Unsupported protocol "${url.protocol}"`);
	}
}

/** Reads a response body, giving up as soon as it grows past `maxBytes`. */
async function readLimited(response: Response, maxBytes: number): Promise<string> {
	if (Number(response.headers.get("content-length")) > maxBytes) throw tooLarge(maxBytes);
	const reader = response.body?.getReader();
	if (!reader) return "";

	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > maxBytes) {
			await reader.cancel();
			throw tooLarge(maxBytes);
		}
		chunks.push(value);
	}
	return Buffer.concat(chunks).toString("utf-8");
}

function tooLarge(maxBytes: number): Error {
	return new Error(`file is larger than ${maxBytes / 1024 / 1024} MB`);
}

/**
 * Loads all imports concurrently and returns their inline tags in configuration order.
 * An entry that fails is reported through `onError` and skipped.
 */
export async function renderImports(
	entries: readonly unknown[],
	vars: Variables,
	options: LoadOptions,
	onError: (entry: string, error: Error) => void
): Promise<string> {
	const rendered = await Promise.all(
		entries.map(async entry => {
			if (typeof entry !== "string" || entry.trim() === "") return "";
			try {
				const url = new URL(resolveVariables(entry, vars));
				const kind = importKind(url);
				return wrapImport(kind, await fetchImport(url, options));
			} catch (error) {
				onError(entry, error instanceof Error ? error : new Error(String(error)));
				return "";
			}
		})
	);
	return rendered.join("");
}
