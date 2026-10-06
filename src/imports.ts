/**
 * Loading the user's own CSS and JS files (stylesmith.imports), with the checks that keep it
 * safe: no http://, https:// only when allowed, no network paths, no files from untrusted
 * workspaces, a size limit, and optional #sha256 pins. A file that fails is reported and
 * skipped; it never stops the others.
 */

import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { networkReferences } from "./cssReferences";
import type { ImportKind, Snippet } from "./patch";

/** Values for the ${...} placeholders in file:// imports. */
export interface Variables {
	/**
	 * Undefined when the workspace isn't trusted: the working folder can be the folder VS Code
	 * was started from, which may be an untrusted project.
	 */
	cwd: string | undefined;
	userHome: string;
	/** Undefined when the workspace isn't trusted, so its files can't be injected. */
	workspaceFolder: string | undefined;
	execPath: string;
	pathSeparator: string;
	env: NodeJS.ProcessEnv;
}

/** How imports may be loaded. */
export interface LoadOptions {
	/** Whether https:// imports are allowed. http:// is never allowed. */
	allowRemote: boolean;
	timeoutMs?: number;
	maxBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;
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
		const [name = "", ...fallback] = key.slice("env:".length).split(":");
		return vars.env[name] ?? fallback.join(":");
	}
	switch (key) {
		case "cwd":
			return trusted("cwd", vars.cwd);
		case "userHome":
			return vars.userHome;
		case "workspaceFolder":
			return trusted("workspaceFolder", vars.workspaceFolder);
		case "execPath":
			return vars.execPath;
		case "pathSeparator":
		case "/":
			return vars.pathSeparator;
		default:
			return undefined;
	}
}

function trusted(name: string, value: string | undefined): string {
	if (value === undefined) {
		throw new Error("${" + name + "} can only be used in a trusted workspace");
	}
	return value;
}

/** Whether a file is CSS or JS, from its name; anything else is refused. */
export function importKind(url: URL): ImportKind {
	const ext = path.posix.extname(url.pathname).toLowerCase();
	if (ext === ".css") return "css";
	if (ext === ".js") return "js";
	throw new Error(`Unsupported file type "${ext}", expected .css or .js`);
}

// An optional pin at the end of an import's URL, in the same format as Subresource Integrity:
// file:///C:/styles/theme.css#sha256-<base64 hash>. A pinned file must match it exactly.
const PIN_PREFIX = "#sha256-";
const PIN_RE = /^#sha256-([A-Za-z0-9+/]{43}=)$/;

/**
 * Reads one import, from a local file or (if allowed) over https, within the size limit,
 * and checks its #sha256 pin if it has one. Throws with a clear reason when it can't.
 */
export async function fetchImport(url: URL, options: LoadOptions): Promise<string> {
	const bytes = await fetchBytes(url, options);
	if (url.hash.startsWith(PIN_PREFIX)) {
		const pin = PIN_RE.exec(url.hash)?.[1];
		if (!pin) throw new Error("the pin must look like #sha256-<base64 hash>");
		const actual = createHash("sha256").update(bytes).digest("base64");
		if (actual !== pin) {
			throw new Error(`the content doesn't match its pin (it is sha256-${actual})`);
		}
		// Checked whether or not remote imports are allowed: the pin is a promise about content.
		const remote = importKind(url) === "css" ? networkReferences(bytes.toString("utf-8")) : [];
		if (remote.length > 0) {
			throw new Error(
				`a pinned stylesheet can't load files from the network (it loads ${remote[0]}): the pin covers only this file's own content, not the files it loads`
			);
		}
	}
	return bytes.toString("utf-8");
}

/**
 * Fetches over https, following redirects one at a time. Every step must stay on https:
 * checking only where the chain ends isn't enough, because anyone on the network can change a
 * redirect that passes through plain http on the way.
 */
async function fetchHttps(url: URL, options: LoadOptions): Promise<Response> {
	const signal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	let current = url;
	for (let redirects = 0; ; redirects++) {
		const response = await fetch(current, { redirect: "manual", signal });
		const location = response.headers.get("location");
		if (response.status < 300 || response.status >= 400 || location === null) return response;
		await response.body?.cancel();
		if (redirects >= MAX_REDIRECTS) throw new Error(`more than ${MAX_REDIRECTS} redirects`);
		const next = new URL(location, current);
		if (next.protocol !== "https:") {
			throw new Error(`redirected to an insecure URL: ${next.href}`);
		}
		current = next;
	}
}

async function fetchBytes(url: URL, options: LoadOptions): Promise<Buffer> {
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	switch (url.protocol) {
		case "file:":
			// Only files on this computer. A network path (file://server/share/...) would make the
			// system connect to another machine and could send it your login credentials.
			if (url.hostname !== "" && url.hostname !== "localhost") {
				throw new Error("network paths are not allowed; use a file on this computer");
			}
			return readFileLimited(fileURLToPath(url), maxBytes);
		case "https:": {
			if (!options.allowRemote) {
				throw new Error(
					"remote imports are turned off; set stylesmith.allowRemoteImports to use https://"
				);
			}
			const response = await fetchHttps(url, options);
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
async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
	if (Number(response.headers.get("content-length")) > maxBytes) throw tooLarge(maxBytes);
	const reader: ReadableStreamDefaultReader<Uint8Array> | undefined = response.body?.getReader();
	if (!reader) return Buffer.alloc(0);

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
	return Buffer.concat(chunks);
}

/**
 * Reads a local file through a single open handle, giving up as soon as it grows past
 * `maxBytes`. Checking the size separately first could be out of date by the time we read.
 */
async function readFileLimited(file: string, maxBytes: number): Promise<Buffer> {
	const handle = await open(file, "r");
	try {
		const chunks: Buffer[] = [];
		let size = 0;
		for (;;) {
			const chunk = Buffer.alloc(64 * 1024);
			const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
			if (bytesRead === 0) break;
			size += bytesRead;
			if (size > maxBytes) throw tooLarge(maxBytes);
			chunks.push(chunk.subarray(0, bytesRead));
		}
		return Buffer.concat(chunks);
	} finally {
		await handle.close();
	}
}

function tooLarge(maxBytes: number): Error {
	return new Error(`file is larger than ${maxBytes / 1024 / 1024} MB`);
}

/**
 * Which import list to load, from the user's values of stylesmith.imports (`own`) and of
 * Custom CSS and JS Loader's vscode_custom_css.imports (`legacy`), undefined when not set.
 * Once stylesmith.imports is set it's the only list, even when empty: that is how to choose no
 * imports. The legacy list is read only while it isn't set, so moving over needs no change.
 */
export function chooseImports(own: unknown, legacy: unknown): readonly unknown[] {
	if (own !== undefined) return Array.isArray(own) ? own : [];
	return Array.isArray(legacy) ? legacy : [];
}

/**
 * Loads all imports concurrently and returns them in configuration order.
 * An entry that fails is reported through `onError` and skipped.
 */
export async function loadImports(
	entries: readonly unknown[],
	vars: Variables,
	options: LoadOptions,
	onError: (entry: string, error: Error) => void
): Promise<Snippet[]> {
	const loaded = await Promise.all(
		entries.map(async (entry): Promise<Snippet[]> => {
			if (typeof entry !== "string" || entry.trim() === "") return [];
			try {
				const url = new URL(resolveVariables(entry, vars));
				const kind = importKind(url);
				return [{ kind, source: await fetchImport(url, options) }];
			} catch (error) {
				onError(entry, error instanceof Error ? error : new Error(String(error)));
				return [];
			}
		})
	);
	return loaded.flat();
}
