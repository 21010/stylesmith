import assert from "node:assert/strict";
// The module itself, not a copy, so mock.method replaces what workbench.ts calls.
import fs from "node:fs/promises";
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
	appRootOf,
	cleanUp,
	isPatched,
	isPermissionError,
	removeFonts,
	locateWorkbench,
	readPristine,
	removeLegacyBackups,
	writeFileAtomic,
	writeFonts
} from "../workbench";
import { patch } from "../patch";

let root: string;

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "custom-css-"));
});

afterEach(async () => {
	mock.restoreAll();
	await rm(root, { recursive: true, force: true });
});

/** Makes the `call`-th call (counting from 1) of a file system function fail with `code`. */
function failCall(name: "copyFile" | "writeFile" | "rename", call: number, code: string): void {
	const original = fs[name] as (...args: unknown[]) => Promise<unknown>;
	let calls = 0;
	mock.method(fs, name, (...args: unknown[]) =>
		++calls === call
			? Promise.reject(Object.assign(new Error(`${name} failed`), { code }))
			: original(...args)
	);
}

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

describe("font folder", () => {
	it("holds exactly the selected font's files, and is removed on disable", async () => {
		const dir = path.join(root, "wb");
		await mkdir(dir);
		const workbench = { dir, htmlPath: path.join(dir, "workbench.html") };
		const source = path.join(root, "src");
		await mkdir(source);
		for (const name of ["A-Regular.woff2", "A-Bold.woff2", "B-Regular.woff2"]) {
			await writeFile(path.join(source, name), name);
		}

		await writeFonts(workbench, [
			path.join(source, "A-Regular.woff2"),
			path.join(source, "A-Bold.woff2")
		]);
		await writeFonts(workbench, [path.join(source, "B-Regular.woff2")]);
		assert.deepEqual(await readdir(path.join(dir, "stylesmith-fonts")), ["B-Regular.woff2"]);

		await removeFonts(workbench);
		assert.deepEqual(await readdir(dir), []);
		await removeFonts(workbench); // removing again is fine
	});

	it("doesn't copy the files again when they're already there", async () => {
		const dir = path.join(root, "wb");
		await mkdir(dir);
		const workbench = { dir, htmlPath: path.join(dir, "workbench.html") };
		const font = path.join(root, "A-Regular.woff2");
		await writeFile(font, "font");

		assert.equal(await writeFonts(workbench, [font]), true, "copied the first time");
		assert.equal(await writeFonts(workbench, [font]), false, "not copied again when unchanged");

		const copy = path.join(dir, "stylesmith-fonts", "A-Regular.woff2");
		await writeFile(font, "new font");
		assert.equal(await writeFonts(workbench, [font]), true, "copied again when changed");
		assert.equal(await readFile(copy, "utf-8"), "new font");

		await writeFile(font, "NEW FONT");
		assert.equal(await writeFonts(workbench, [font]), true, "copied again at the same size");
		assert.equal(await readFile(copy, "utf-8"), "NEW FONT");
	});
});

describe("replacing the font folder", () => {
	let dir: string;
	let workbench: { dir: string; htmlPath: string };
	let source: string;

	beforeEach(async () => {
		dir = path.join(root, "wb");
		await mkdir(dir);
		workbench = { dir, htmlPath: path.join(dir, "workbench.html") };
		source = path.join(root, "src");
		await mkdir(source);
		for (const name of ["A-Regular.woff2", "B-Regular.woff2", "B-Bold.woff2"]) {
			await writeFile(path.join(source, name), name);
		}
		await writeFonts(workbench, [path.join(source, "A-Regular.woff2")]);
	});

	const fonts = () => readdir(path.join(dir, "stylesmith-fonts"));

	it("keeps the fonts in use when a new file can't be copied", async () => {
		await assert.rejects(
			writeFonts(workbench, [
				path.join(source, "B-Regular.woff2"),
				path.join(source, "missing.woff2")
			]),
			{ code: "ENOENT" }
		);
		assert.deepEqual(await fonts(), ["A-Regular.woff2"]);
		assert.deepEqual(await readdir(dir), ["stylesmith-fonts"], "nothing left behind");
	});

	it("puts the fonts in use back when the new ones can't be moved in", async () => {
		failCall("rename", 2, "EPERM"); // the first moves the old folder aside
		await assert.rejects(writeFonts(workbench, [path.join(source, "B-Regular.woff2")]), {
			code: "EPERM"
		});
		mock.restoreAll();
		assert.deepEqual(await fonts(), ["A-Regular.woff2"]);
		assert.deepEqual(await readdir(dir), ["stylesmith-fonts"], "nothing left behind");
	});

	it("swaps in the complete new set", async () => {
		await writeFonts(workbench, [
			path.join(source, "B-Regular.woff2"),
			path.join(source, "B-Bold.woff2")
		]);
		assert.deepEqual((await fonts()).sort(), ["B-Bold.woff2", "B-Regular.woff2"]);
		assert.deepEqual(await readdir(dir), ["stylesmith-fonts"]);
	});

	it("removes folders an interrupted replacement left behind", async () => {
		const leftovers = [
			"stylesmith-fonts.0b9c6f1e-2a4d-4c8e-9f3a-1d2e3f4a5b6c.tmp",
			"stylesmith-fonts.0b9c6f1e-2a4d-4c8e-9f3a-1d2e3f4a5b6d.old"
		];
		for (const name of leftovers) await mkdir(path.join(dir, name));
		await writeFile(path.join(dir, "stylesmith-fonts.notes"), "not ours");
		await removeFonts(workbench);
		assert.deepEqual(await readdir(dir), ["stylesmith-fonts.notes"]);
	});
});

describe("appRootOf", () => {
	it("finds the folder with product.json above out/", () => {
		const appRoot = path.join(root, "resources", "app");
		for (const segments of [
			["vs", "code", "electron-browser", "workbench"],
			["vs", "code", "electron-sandbox"]
		]) {
			const dir = path.join(appRoot, "out", ...segments);
			assert.equal(appRootOf({ dir, htmlPath: path.join(dir, "workbench.html") }), appRoot);
		}
	});

	it("is undefined for a workbench outside an out/ folder", () => {
		const dir = path.join(root, "build", "vs", "code", "electron-browser", "workbench");
		assert.equal(appRootOf({ dir, htmlPath: path.join(dir, "workbench.html") }), undefined);
		assert.equal(
			appRootOf({ dir: root, htmlPath: path.join(root, "workbench.html") }),
			undefined
		);
	});
});

describe("isPatched", () => {
	it("finds the marker near the start of a large patched file", async () => {
		const htmlPath = path.join(root, "workbench.html");
		const head = "<html><head><meta charset='utf-8'>" + "x".repeat(4000);
		const injected = "y".repeat(3 * 1024 * 1024);
		await writeFile(
			htmlPath,
			`${head}<!-- !! STYLESMITH-START !! -->\n${injected}</head></html>`
		);
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

	it("is not blocked by, and leaves alone, a temporary file left behind earlier", async () => {
		const file = path.join(root, "workbench.html");
		const leftover = `${file}.${process.pid}.tmp`;
		await writeFile(file, "old");
		await writeFile(leftover, "leftover");
		await writeFileAtomic(file, "new");
		assert.equal(await readFile(file, "utf-8"), "new");
		assert.equal(await readFile(leftover, "utf-8"), "leftover");
		assert.deepEqual((await readdir(root)).sort(), ["workbench.html", path.basename(leftover)]);
	});

	for (const [step, name, call] of [
		["creating the temporary file", "copyFile", 1],
		["writing the temporary file", "writeFile", 1],
		["renaming it over the file", "rename", 1]
	] as const) {
		it(`leaves the file as it was when ${step} fails`, async () => {
			const file = path.join(root, "workbench.html");
			await writeFile(file, "old");
			failCall(name, call, "EPERM");
			await assert.rejects(writeFileAtomic(file, "new"), { code: "EPERM" });
			mock.restoreAll();
			assert.equal(await readFile(file, "utf-8"), "old");
			assert.deepEqual(await readdir(root), ["workbench.html"], "no temporary file left");
		});
	}

	it("fails when the target does not exist", async () => {
		await assert.rejects(writeFileAtomic(path.join(root, "missing.html"), "x"), {
			code: "ENOENT"
		});
	});
});

// Folder permissions only work this way on Unix, and root ignores them.
const noUnixPermissions = process.platform === "win32" || process.getuid?.() === 0;

describe("writing VS Code's file without full permissions", () => {
	afterEach(() => chmod(root, 0o755));

	it("recognizes permission errors, and only those", () => {
		for (const code of ["EACCES", "EPERM"]) {
			assert.ok(isPermissionError(Object.assign(new Error(code), { code })));
		}
		for (const error of [
			Object.assign(new Error(), { code: "ENOENT" }),
			new Error(),
			"EACCES",
			undefined
		]) {
			assert.ok(!isPermissionError(error));
		}
	});

	it(
		"doesn't write in place when only the folder is read-only",
		{ skip: noUnixPermissions },
		async () => {
			const file = path.join(root, "workbench.html");
			await writeFile(file, "old");
			await chmod(root, 0o555);
			await assert.rejects(writeFileAtomic(file, "new"), error => isPermissionError(error));
			assert.equal(await readFile(file, "utf-8"), "old");
			assert.deepEqual(await readdir(root), ["workbench.html"]);
		}
	);

	it(
		"fails with a permission error and leaves VS Code's file intact",
		{ skip: noUnixPermissions },
		async () => {
			const file = path.join(root, "workbench.html");
			await writeFile(file, "original");
			await chmod(file, 0o444);
			await chmod(root, 0o555);
			await assert.rejects(writeFileAtomic(file, "new"), error => isPermissionError(error));
			assert.equal(await readFile(file, "utf-8"), "original");
			assert.deepEqual(await readdir(root), ["workbench.html"], "no temporary file left");
		}
	);

	it(
		"Disable reports a permission error without changing anything",
		{ skip: noUnixPermissions },
		async () => {
			const html = path.join(root, "workbench.html");
			const pristine =
				`<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none';"/>` +
				"</head><body></body></html>";
			await writeFile(html, patch(pristine, [{ kind: "css", source: "a{}" }]));
			const before = await readFile(html, "utf-8");
			await chmod(html, 0o444);
			await chmod(root, 0o555);
			const workbench = { dir: root, htmlPath: html };
			await assert.rejects(cleanUp(workbench), error => isPermissionError(error));
			assert.equal(await readFile(html, "utf-8"), before);
		}
	);
});
