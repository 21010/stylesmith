import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
		assert.equal(state.fontSettings?.["editor.fontFamily"].previous, "Hack");
		assert.equal(state.effectSettings?.["editor.guides.bracketPairs"].applied, "active");
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
});
