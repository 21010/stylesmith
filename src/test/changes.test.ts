import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SettingChanges, markingOwnChanges } from "../changes";
import type { Config } from "../config";

/** Like VS Code's event.affectsConfiguration, for a change to `changed`. */
const changeOf =
	(...changed: string[]) =>
	(section: string) =>
		changed.some(key => key === section || key.startsWith(`${section}.`));

describe("setting changes", () => {
	it("offers a reload for effects, fonts and imports changed by the user", () => {
		const changes = new SettingChanges();
		for (const key of [
			"stylesmith.effects.neonGlow",
			"stylesmith.fonts.family",
			"stylesmith.imports",
			"stylesmith.allowRemoteImports"
		]) {
			assert.equal(changes.needsReload(changeOf(key)), true, key);
		}
	});

	it("doesn't offer one for settings that apply live, or that aren't Stylesmith's", () => {
		const changes = new SettingChanges();
		for (const key of [
			"stylesmith.problems.enabled",
			"stylesmith.statusbar",
			"editor.fontSize"
		]) {
			assert.equal(changes.needsReload(changeOf(key)), false, key);
		}
	});

	it("doesn't offer one for Stylesmith's own change, but does for the user's next one", () => {
		const changes = new SettingChanges();
		changes.markOwn("stylesmith.effects.crtScanlines");
		assert.equal(changes.needsReload(changeOf("stylesmith.effects.crtScanlines")), false);
		assert.equal(changes.needsReload(changeOf("stylesmith.effects.crtScanlines")), true);
	});

	it("forgets an own change VS Code never reported (it changed nothing)", () => {
		let now = 0;
		const changes = new SettingChanges(() => now);
		changes.markOwn("stylesmith.effects.crtScanlines");
		now = 60_000;
		assert.equal(changes.needsReload(changeOf("stylesmith.effects.crtScanlines")), true);
	});

	it("marks every change made through the wrapped config as Stylesmith's own", async () => {
		const written: string[] = [];
		const config = {
			set: (key: string) => (written.push(key), Promise.resolve())
		} as unknown as Config;
		const changes = new SettingChanges();
		await markingOwnChanges(config, changes).set("effects.typingSparks", true);
		assert.deepEqual(written, ["effects.typingSparks"]);
		assert.equal(changes.needsReload(changeOf("stylesmith.effects.typingSparks")), false);
	});
});
