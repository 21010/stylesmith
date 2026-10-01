import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { StateFile } from "../store";

let root: string;
let file: string;

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "stylesmith-store-"));
	file = path.join(root, "storage", "state.json");
});

afterEach(() => rm(root, { recursive: true, force: true }));

describe("state file", () => {
	it("keeps every value through several quick updates in a row", async () => {
		const store = new StateFile(file);
		await store.update({
			fontSettings: { "editor.fontFamily": { previous: "Hack", applied: "x" } }
		});
		await store.update({
			effectSettings: {
				"editor.guides.bracketPairs": { previous: undefined, applied: "active" }
			}
		});
		await store.update({ enabled: true });
		const state = await store.read();
		assert.equal(state.enabled, true);
		assert.equal(state.fontSettings?.["editor.fontFamily"]?.previous, "Hack");
		assert.equal(state.effectSettings?.["editor.guides.bracketPairs"]?.applied, "active");
	});

	it("removes a value that is set to undefined", async () => {
		const store = new StateFile(file);
		await store.update({ enabled: true, reapplyAskedAt: 1 });
		await store.update({ reapplyAskedAt: undefined });
		assert.deepEqual(await store.read(), { enabled: true });
	});

	it("starts from the state of older versions until the file exists", async () => {
		const store = new StateFile(file, () => ({ enabled: true }));
		assert.deepEqual(await store.read(), { enabled: true });
		await store.update({ reapplyAskedAt: 5 });
		assert.deepEqual(await store.read(), { enabled: true, reapplyAskedAt: 5 });
	});

	it("treats a damaged file as empty", async () => {
		const store = new StateFile(file);
		await store.update({ enabled: true });
		await writeFile(file, "{ damaged");
		assert.deepEqual(await store.read(), {});
	});

	it("keeps every value when updates overlap, even from two StateFile objects", async () => {
		const first = new StateFile(file);
		const second = new StateFile(file);
		await Promise.all([
			first.update({ enabled: true }),
			second.update({ reapplyAskedAt: 1 }),
			first.update({
				fontSettings: { "editor.fontFamily": { previous: "Hack", applied: "x" } }
			})
		]);
		assert.deepEqual(await second.read(), {
			enabled: true,
			reapplyAskedAt: 1,
			fontSettings: { "editor.fontFamily": { previous: "Hack", applied: "x" } }
		});
		assert.deepEqual(await readdir(path.dirname(file)), ["state.json"], "no temporary files");
	});

	it("keeps working after an update fails", async () => {
		const store = new StateFile(file);
		// A folder where the state file should be: the update can't replace it.
		await mkdir(file, { recursive: true });
		await assert.rejects(store.update({ enabled: true }));
		await rm(file, { recursive: true });
		await store.update({ reapplyAskedAt: 2 });
		assert.deepEqual(await store.read(), { reapplyAskedAt: 2 });
		assert.deepEqual(await readdir(path.dirname(file)), ["state.json"], "no temporary files");
	});

	it("treats a file that isn't an object as empty", async () => {
		const store = new StateFile(file);
		await store.update({ enabled: true });
		for (const text of ["null", "42", '"text"']) {
			await writeFile(file, text);
			assert.deepEqual(await store.read(), {}, text);
		}
	});
});
