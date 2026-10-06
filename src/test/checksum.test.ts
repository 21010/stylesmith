import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { computeChecksum, getVsCodeCommit, matchesChecksum, setChecksum } from "../checksum";
import type { Workbench } from "../workbench";

const KEY = "vs/code/electron-browser/workbench/workbench.html";

let appRoot: string;
let workbench: Workbench;

beforeEach(async () => {
	appRoot = await mkdtemp(path.join(os.tmpdir(), "stylesmith-checksum-"));
	const dir = path.join(appRoot, "out", ...KEY.split("/").slice(0, -1));
	await mkdir(dir, { recursive: true });
	workbench = { dir, htmlPath: path.join(dir, "workbench.html") };
});

afterEach(() => rm(appRoot, { recursive: true, force: true }));

const writeProduct = (data: unknown) =>
	writeFile(path.join(appRoot, "product.json"), JSON.stringify(data, null, "\t"));
const readProduct = async () =>
	JSON.parse(await readFile(path.join(appRoot, "product.json"), "utf-8")) as {
		commit: string;
		checksums: Record<string, string>;
	};

describe("computeChecksum", () => {
	it("is base64 SHA-256 without padding, as in product.json", () => {
		assert.equal(computeChecksum("abc"), "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0");
	});
});

describe("setChecksum", () => {
	it("updates only the workbench's checksum, keeping everything else", async () => {
		await writeProduct({ commit: "c1", checksums: { [KEY]: "old", "other.js": "x" } });
		assert.equal(await setChecksum(workbench, appRoot, "<html>"), "updated");
		assert.deepEqual(await readProduct(), {
			commit: "c1",
			checksums: { [KEY]: computeChecksum("<html>"), "other.js": "x" }
		});
	});

	it("doesn't write product.json when the checksum already matches", async () => {
		await writeProduct({ checksums: { [KEY]: computeChecksum("<html>") } });
		const before = await readFile(path.join(appRoot, "product.json"), "utf-8");
		assert.equal(await setChecksum(workbench, appRoot, "<html>"), "unchanged");
		assert.equal(await readFile(path.join(appRoot, "product.json"), "utf-8"), before);
	});

	it("does nothing when VS Code doesn't check the workbench", async () => {
		assert.equal(await setChecksum(workbench, appRoot, "<html>"), "untracked", "no file");
		await writeProduct({ commit: "c1" });
		assert.equal(await setChecksum(workbench, appRoot, "<html>"), "untracked", "no list");
		await writeProduct({ checksums: { "other.js": "x" } });
		assert.equal(await setChecksum(workbench, appRoot, "<html>"), "untracked", "no key");
	});

	it("fails on a damaged product.json instead of ignoring it", async () => {
		await writeFile(path.join(appRoot, "product.json"), "{ not json");
		await assert.rejects(setChecksum(workbench, appRoot, "<html>"), SyntaxError);
	});

	it("is not confused by a different workbench file", async () => {
		await writeProduct({
			checksums: { "vs/code/electron-sandbox/workbench/workbench.html": "x" }
		});
		assert.equal(await setChecksum(workbench, appRoot, "<html>"), "untracked");
	});
});

describe("matchesChecksum", () => {
	it("tells VS Code's own file from a changed one", async () => {
		await writeProduct({ checksums: { [KEY]: computeChecksum("<html>") } });
		assert.equal(await matchesChecksum(workbench, appRoot, "<html>"), true);
		assert.equal(await matchesChecksum(workbench, appRoot, "<html><script>"), false);
	});

	it("is undefined when there is nothing to compare with", async () => {
		assert.equal(await matchesChecksum(workbench, appRoot, "<html>"), undefined);
		await writeFile(path.join(appRoot, "product.json"), "{ not json");
		assert.equal(await matchesChecksum(workbench, appRoot, "<html>"), undefined);
	});
});

describe("getVsCodeCommit", () => {
	it("reads the commit, falling back to the version", async () => {
		assert.equal(await getVsCodeCommit(appRoot), undefined);
		await writeProduct({ commit: "c1", version: "1.100.0" });
		assert.equal(await getVsCodeCommit(appRoot), "c1");
		await writeProduct({ version: "1.100.0" });
		assert.equal(await getVsCodeCommit(appRoot), "1.100.0");
	});
});
