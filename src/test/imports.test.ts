import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
	fetchImport,
	importKind,
	loadImports,
	resolveVariables,
	type LoadOptions,
	type Variables
} from "../imports";

const VARS: Variables = {
	cwd: "/cwd",
	userHome: "/home/me",
	workspaceFolder: "/ws",
	execPath: "/bin/code",
	pathSeparator: "/",
	env: { THEME: "dark" }
};

describe("resolveVariables", () => {
	it("replaces known variables in file URLs", () => {
		assert.equal(
			resolveVariables("file://${userHome}${/}${workspaceFolder}/a.css", VARS),
			"file:///home/me//ws/a.css"
		);
	});

	it("supports env variables with fallbacks that contain colons", () => {
		assert.equal(resolveVariables("file:///${env:THEME}.css", VARS), "file:///dark.css");
		assert.equal(resolveVariables("file:///${env:NOPE:C:/x}.css", VARS), "file:///C:/x.css");
		assert.equal(resolveVariables("file:///${env:NOPE}a.css", VARS), "file:///a.css");
	});

	it("keeps unknown variables and ignores non-file URLs", () => {
		assert.equal(resolveVariables("file:///${nope}.css", VARS), "file:///${nope}.css");
		assert.equal(
			resolveVariables("https://x/${userHome}.css", VARS),
			"https://x/${userHome}.css"
		);
	});

	it("percent-encodes URL-significant characters in substituted values", () => {
		const vars = { ...VARS, userHome: "/home/a#b?c%d" };
		assert.equal(
			resolveVariables("file://${userHome}/a.css", vars),
			"file:///home/a%23b%3Fc%25d/a.css"
		);
	});
});

describe("importKind", () => {
	it("detects CSS and JS regardless of case, query or hash", () => {
		assert.equal(importKind(new URL("https://x/a.CSS?v=1#h")), "css");
		assert.equal(importKind(new URL("file:///a.js")), "js");
	});

	it("rejects other file types", () => {
		assert.throws(() => importKind(new URL("file:///a.txt")), /Unsupported file type/);
	});
});

describe("loadImports", () => {
	let dir: string;

	before(async () => {
		dir = await mkdtemp(path.join(os.tmpdir(), "custom-css-"));
		await writeFile(path.join(dir, "a.css"), "a{}");
		await writeFile(path.join(dir, "b.js"), "b()");
	});

	after(() => rm(dir, { recursive: true, force: true }));

	it("loads a file that is exactly at the size limit", async () => {
		const file = path.join(dir, "limit.css");
		await writeFile(file, "a".repeat(1024));
		const snippets = await loadImports(
			[pathToFileURL(file).href],
			VARS,
			{ allowRemote: false, maxBytes: 1024 },
			() => assert.fail("should load")
		);
		assert.equal(snippets[0].source.length, 1024);
	});

	it("loads entries in order and reports failures without aborting", async () => {
		const errors: string[] = [];
		const snippets = await loadImports(
			[
				pathToFileURL(path.join(dir, "b.js")).href,
				"not a url",
				42,
				pathToFileURL(path.join(dir, "missing.css")).href,
				pathToFileURL(path.join(dir, "a.css")).href,
				"ftp://x/a.css"
			],
			VARS,
			{ allowRemote: false },
			entry => errors.push(entry)
		);
		assert.deepEqual(snippets, [
			{ kind: "js", source: "b()" },
			{ kind: "css", source: "a{}" }
		]);
		assert.equal(errors.length, 3);
	});
});

describe("import security", () => {
	let dir: string;

	before(async () => {
		dir = await mkdtemp(path.join(os.tmpdir(), "custom-css-"));
		await writeFile(path.join(dir, "big.css"), "a".repeat(2048));
	});

	after(() => rm(dir, { recursive: true, force: true }));

	async function loadError(
		entry: string,
		options: LoadOptions = { allowRemote: false },
		vars = VARS
	) {
		let message = "";
		const snippets = await loadImports([entry], vars, options, (_, error) => {
			message = error.message;
		});
		assert.deepEqual(snippets, [], "nothing should be injected");
		return message;
	}

	it("never loads http://", async () => {
		assert.match(
			await loadError("http://example.com/a.css", { allowRemote: true }),
			/http:\/\//
		);
	});

	it("does not load https:// unless remote imports are allowed", async () => {
		assert.match(await loadError("https://example.com/a.css"), /allowRemoteImports/);
	});

	it("refuses ${workspaceFolder} and ${cwd} in an untrusted workspace", async () => {
		const untrusted = { ...VARS, workspaceFolder: undefined, cwd: undefined };
		for (const variable of ["${workspaceFolder}", "${cwd}"]) {
			assert.match(
				await loadError(`file://${variable}/a.css`, undefined, untrusted),
				/trusted workspace/
			);
		}
	});

	it("loads a pinned file whose content matches its pin", async () => {
		const file = path.join(dir, "pinned.css");
		await writeFile(file, "a{}");
		const pin = createHash("sha256").update("a{}").digest("base64");
		const snippets = await loadImports(
			[`${pathToFileURL(file).href}#sha256-${pin}`],
			VARS,
			{ allowRemote: false },
			() => assert.fail("should load")
		);
		assert.deepEqual(snippets, [{ kind: "css", source: "a{}" }]);
	});

	it("refuses a pinned file whose content changed, and shows the actual pin", async () => {
		const file = path.join(dir, "changed.css");
		await writeFile(file, "a{color:red}");
		const oldPin = createHash("sha256").update("a{}").digest("base64");
		const newPin = createHash("sha256").update("a{color:red}").digest("base64");
		const message = await loadError(`${pathToFileURL(file).href}#sha256-${oldPin}`);
		assert.match(message, /doesn't match its pin/);
		assert.ok(message.includes(`sha256-${newPin}`));
	});

	it("refuses a malformed pin", async () => {
		const file = path.join(dir, "big.css");
		assert.match(
			await loadError(`${pathToFileURL(file).href}#sha256-nope`),
			/pin must look like/
		);
	});

	it("refuses network paths in file:// imports", async () => {
		assert.match(await loadError("file://server/share/a.css"), /network paths/);
	});

	it("refuses files over the size limit", async () => {
		const big = pathToFileURL(path.join(dir, "big.css")).href;
		assert.match(await loadError(big, { allowRemote: false, maxBytes: 1024 }), /larger/);
	});
});

describe("remote imports (https)", () => {
	const realFetch = globalThis.fetch;
	const remote = { allowRemote: true, maxBytes: 1024 };
	let requests: { url: string; signal?: AbortSignal | null }[];

	/** Makes fetch answer with `body`, as if it came from `finalUrl` (after any redirects). */
	function serve(
		body: ConstructorParameters<typeof Response>[0],
		init: ResponseInit = {},
		finalUrl?: string
	): void {
		globalThis.fetch = (input, options) => {
			const url = String(input);
			requests.push({ url, signal: options?.signal });
			const response = new Response(body, init);
			Object.defineProperty(response, "url", { value: finalUrl ?? url });
			return Promise.resolve(response);
		};
	}

	before(() => (requests = []));
	after(() => (globalThis.fetch = realFetch));

	it("loads an https import when remote imports are allowed, with a timeout", async () => {
		serve("a{color:red}");
		const text = await fetchImport(new URL("https://example.com/a.css"), remote);
		assert.equal(text, "a{color:red}");
		assert.ok(requests.at(-1)?.signal, "the request can time out");
	});

	it("refuses a redirect to plain http", async () => {
		serve("a{}", {}, "http://evil.example/a.css");
		await assert.rejects(
			fetchImport(new URL("https://example.com/a.css"), remote),
			/insecure URL/
		);
	});

	it("reports an HTTP error status", async () => {
		serve("missing", { status: 404, statusText: "Not Found" });
		await assert.rejects(fetchImport(new URL("https://example.com/a.css"), remote), /404/);
	});

	it("refuses a file that says it's too large, before reading it", async () => {
		serve("small", { headers: { "content-length": "999999" } });
		await assert.rejects(fetchImport(new URL("https://example.com/a.css"), remote), /larger/);
	});

	it("stops reading a stream that grows too large, even without a size", async () => {
		let pulled = 0;
		const endless = new ReadableStream<Uint8Array>({
			pull(controller) {
				pulled++;
				controller.enqueue(new Uint8Array(512));
			}
		});
		serve(endless);
		await assert.rejects(fetchImport(new URL("https://example.com/a.css"), remote), /larger/);
		assert.ok(pulled < 10, `stopped early (read ${pulled} chunks)`);
	});

	it("accepts a file of exactly the size limit", async () => {
		serve("x".repeat(1024));
		assert.equal(
			(await fetchImport(new URL("https://example.com/a.css"), remote)).length,
			1024
		);
	});

	it("checks a sha256 pin on remote files too", async () => {
		serve("a{}");
		const errors: string[] = [];
		const pinned = `https://example.com/a.css#sha256-${createHash("sha256").update("other").digest("base64")}`;
		const snippets = await loadImports([pinned], VARS, remote, (_entry, error) =>
			errors.push(error.message)
		);
		assert.deepEqual(snippets, []);
		assert.equal(errors.length, 1);
	});
});
