import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { SettingsAccess } from "../managed";
import { KEPT, migrateOldSettings, REMOVED, RENAMED } from "../oldSettings";
import { manifest } from "./files";

const properties = manifest().contributes.configuration.properties;

let values: Map<string, unknown>;
const settings: SettingsAccess = {
	read: key => ({ user: values.get(key), default: undefined, known: true }),
	write: (key, value) => {
		if (value === undefined) values.delete(key);
		else values.set(key, value);
		return Promise.resolve();
	}
};

beforeEach(() => {
	values = new Map();
});

describe("settings from Stylesmith 1.x", () => {
	it("declares exactly the old settings as deprecated, so they can be removed", () => {
		const deprecated = Object.entries(properties)
			.filter(([, schema]) => schema.markdownDeprecationMessage !== undefined)
			.map(([key]) => key);
		const old = [...Object.keys(RENAMED), ...REMOVED, ...KEPT].map(key => `stylesmith.${key}`);
		assert.deepEqual(deprecated.sort(), old.sort());
		for (const key of old) assert.equal(properties[key]?.scope, "application", key);
	});

	it("moves a renamed effect to the current one", async () => {
		const current = Object.values(RENAMED);
		for (const target of current) assert.ok(properties[`stylesmith.${target}`], target);
		values.set("stylesmith.effects.classicLayout", true);
		values.set("stylesmith.effects.retroTerminalCursor", false);
		assert.deepEqual(await migrateOldSettings(settings), [
			"effects.classicLayout",
			"effects.retroTerminalCursor"
		]);
		assert.deepEqual(
			[...values],
			[
				["stylesmith.effects.compactLayout", true],
				["stylesmith.effects.blockTerminalCursor", false]
			]
		);
	});

	it("keeps a value the user already set for the current effect", async () => {
		values.set("stylesmith.effects.neonBlocks", false);
		values.set("stylesmith.effects.bracketGuides", true);
		await migrateOldSettings(settings);
		assert.deepEqual([...values], [["stylesmith.effects.bracketGuides", true]]);
	});

	it("removes old settings with nothing left to control", async () => {
		values.set("stylesmith.effects.matrixRain", true);
		values.set("stylesmith.silenceCorruptWarning", false);
		values.set("stylesmith.effects.smoothCursor", false);
		assert.deepEqual(await migrateOldSettings(settings), [
			"silenceCorruptWarning",
			"effects.matrixRain"
		]);
		assert.deepEqual([...values], [["stylesmith.effects.smoothCursor", false]]);
	});

	it("keeps the user's list of their own CSS and JavaScript files", async () => {
		values.set("stylesmith.imports", ["file:///home/me/custom.css"]);
		assert.deepEqual(await migrateOldSettings(settings), []);
		assert.deepEqual(values.get("stylesmith.imports"), ["file:///home/me/custom.css"]);
	});

	it("does nothing, and writes nothing, when there are no old settings", async () => {
		let writes = 0;
		const counting: SettingsAccess = {
			...settings,
			write: () => {
				writes++;
				return Promise.resolve();
			}
		};
		assert.deepEqual(await migrateOldSettings(counting), []);
		assert.equal(writes, 0);
	});
});
