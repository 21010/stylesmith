import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	isPatched,
	locateWorkbench,
	readPristine,
	removeLegacyBackups,
	writeFileAtomic
} from "../workbench";

let root: string;

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "custom-css-"));
});

afterEach(() => rm(root, { recursive: true, force: true }));

async function touch(...segments: string[]): Promise<string> {
	const file = path.join(root, ...segments);
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, "<html><head></head><body></body></html>");
	return file;
}

describe("locateWorkbench", () => {
	it("prefers the VS Code 1.102+ layout over the old one", async () => {
		await touch("vs/code/electron-sandbox/workbench/workbench.html");
		const html = await touch("vs/code/electron-browser/workbench/workbench.html");
		assert.equal(locateWorkbench([root])?.htmlPath, html);
	});

	it("tries each application directory in order", async () => {
		const html = await touch("vs/code/electron-sandbox/workbench.esm.html");
		assert.equal(locateWorkbench([path.join(root, "missing"), root])?.htmlPath, html);
	});

	it("returns undefined when nothing is found", () => {
		assert.equal(locateWorkbench([root]), undefined);
	});
});

describe("readPristine", () => {
	it("restores a Custom CSS and JS Loader 7.5.1 patch from its backup file", async () => {
		const dir = path.join(root, "wb");
		await mkdir(dir);
		await writeFile(path.join(dir, "workbench.abc-1.bak-custom-css"), "<original/>");
		const patched = "<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID abc-1 !! -->\n<patched/>";
		assert.equal(await readPristine({ dir, htmlPath: "" }, patched), "<original/>");
	});

	it("falls back to stripping markers when the backup is gone", async () => {
		const patched = "<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID abc-1 !! -->\n<patched/>";
		assert.equal(await readPristine({ dir: root, htmlPath: "" }, patched), "<patched/>");
	});
});

describe("removeLegacyBackups", () => {
	it("deletes only backup files", async () => {
		await writeFile(path.join(root, "workbench.x.bak-custom-css"), "");
		await writeFile(path.join(root, "workbench.html"), "");
		await removeLegacyBackups({ dir: root, htmlPath: "" });
		assert.deepEqual(await readdir(root), ["workbench.html"]);
	});
});

describe("isPatched", () => {
	it("finds the marker near the start of a large patched file", async () => {
		const htmlPath = path.join(root, "workbench.html");
		const head = "<html><head><meta charset='utf-8'>" + "x".repeat(4000);
		const fonts = "y".repeat(3 * 1024 * 1024);
		await writeFile(htmlPath, `${head}<!-- !! STYLESMITH-START !! -->\n${fonts}</head></html>`);
		assert.equal(await isPatched({ dir: root, htmlPath }), true);
	});

	it("reports an unpatched file", async () => {
		const htmlPath = await touch("workbench.html");
		assert.equal(await isPatched({ dir: root, htmlPath }), false);
	});
});

describe("writeFileAtomic", () => {
	it("replaces the file without leaving temporary files", async () => {
		const file = path.join(root, "workbench.html");
		await writeFile(file, "old");
		await writeFileAtomic(file, "new");
		assert.equal(await readFile(file, "utf-8"), "new");
		assert.deepEqual(await readdir(root), ["workbench.html"]);
	});

	it("does not write through a file planted at the temporary path", async () => {
		const file = path.join(root, "workbench.html");
		const planted = `${file}.${process.pid}.tmp`;
		await writeFile(file, "old");
		await writeFile(planted, "planted");
		await assert.rejects(writeFileAtomic(file, "new"), { code: "EEXIST" });
		assert.equal(await readFile(file, "utf-8"), "old");
		assert.equal(await readFile(planted, "utf-8"), "planted");
	});

	it("fails when the target does not exist", async () => {
		await assert.rejects(writeFileAtomic(path.join(root, "missing.html"), "x"), {
			code: "ENOENT"
		});
	});
});
