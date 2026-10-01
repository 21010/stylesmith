import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	EFFECT_GROUP,
	FONT_GROUP,
	ManagedSettings,
	fontWanted,
	planApply,
	planRestore,
	toggleWanted,
	type SettingsAccess
} from "../managed";
import { StateFile } from "../store";

const JB = "JetBrainsMono Nerd Font Mono";
const DEFAULT_FONT = "Consolas, 'Courier New', monospace";
// Like VS Code's own defaults: an empty terminal font follows the editor font.
const DEFAULTS: Record<string, unknown> = {
	"editor.fontFamily": DEFAULT_FONT,
	"terminal.integrated.fontFamily": ""
};
const guidesOn = (value: unknown) => value === true || value === "active";

describe("planning a font setting", () => {
	const wanted = fontWanted(JB, false);

	it("remembers that the setting wasn't set, and removes it again on restore", () => {
		const plan = planApply(undefined, DEFAULT_FONT, undefined, wanted, FONT_GROUP)!;
		assert.equal(plan.applied, `'${JB}', ${DEFAULT_FONT}`);
		assert.equal(planRestore(plan.applied, plan, FONT_GROUP), undefined);
	});

	it("restores the user's exact previous value", () => {
		const plan = planApply("Fira Code", DEFAULT_FONT, undefined, wanted, FONT_GROUP)!;
		assert.equal(plan.applied, `'${JB}', Fira Code`);
		assert.equal(planRestore(plan.applied, plan, FONT_GROUP), "Fira Code");
	});

	it("keeps the original value across repeated Enable/Reload, even with another font", () => {
		const first = planApply("Fira Code", DEFAULT_FONT, undefined, wanted, FONT_GROUP)!;
		const other = fontWanted("BlexMono Nerd Font Mono", false);
		const again = planApply(first.applied, DEFAULT_FONT, first, other, FONT_GROUP)!;
		assert.equal(again.applied, "'BlexMono Nerd Font Mono', Fira Code");
		assert.equal(planRestore(again.applied, again, FONT_GROUP), "Fira Code");
	});

	it("respects a font the user picked after Stylesmith changed it", () => {
		const plan = planApply("Fira Code", DEFAULT_FONT, undefined, wanted, FONT_GROUP)!;
		assert.equal(planRestore(`'${JB}', Hack`, plan, FONT_GROUP), "Hack");
		assert.equal(planRestore("Hack", plan, FONT_GROUP), "Hack");
	});

	it("leaves an empty terminal font alone, because it follows the editor font", () => {
		const terminal = fontWanted(JB, true);
		assert.equal(planApply(undefined, "", undefined, terminal, FONT_GROUP), undefined);
		assert.equal(
			planApply("Hack", "", undefined, terminal, FONT_GROUP)?.applied,
			`'${JB}', Hack`
		);
	});
});

describe("planning an effect setting", () => {
	const wanted = toggleWanted("active", guidesOn);

	it("turns a setting on and remembers that it wasn't set", () => {
		const plan = planApply(undefined, false, undefined, wanted, EFFECT_GROUP)!;
		assert.deepEqual(plan, { previous: undefined, applied: "active" });
		assert.equal(planRestore("active", plan, EFFECT_GROUP), undefined);
	});

	it("remembers an explicit 'off' and puts it back", () => {
		const plan = planApply(false, false, undefined, wanted, EFFECT_GROUP)!;
		assert.equal(planRestore("active", plan, EFFECT_GROUP), false);
	});

	it("leaves the setting alone when the user already has it on", () => {
		assert.equal(planApply(true, false, undefined, wanted, EFFECT_GROUP), undefined);
		assert.equal(planApply("active", false, undefined, wanted, EFFECT_GROUP), undefined);
	});

	it("keeps the user's own change when restoring", () => {
		const plan = planApply(undefined, false, undefined, wanted, EFFECT_GROUP)!;
		assert.equal(planRestore(true, plan, EFFECT_GROUP), true);
	});
});

describe("ManagedSettings", () => {
	let root: string;
	let settings: Map<string, unknown>;
	let writes: number;
	let managed: ManagedSettings;

	beforeEach(async () => {
		root = await mkdtemp(path.join(os.tmpdir(), "stylesmith-managed-"));
		settings = new Map();
		writes = 0;
		const access: SettingsAccess = {
			read: key => ({
				user: settings.get(key),
				default: DEFAULTS[key] ?? false
			}),
			write: async (key, value) => {
				writes++;
				if (value === undefined) settings.delete(key);
				else settings.set(key, value);
			}
		};
		managed = new ManagedSettings(access, new StateFile(path.join(root, "state.json")));
	});

	afterEach(() => rm(root, { recursive: true, force: true }));

	it("applies, survives a reload without writing, and restores everything", async () => {
		settings.set("editor.fontFamily", "Fira Code");
		const fonts = new Map([
			["editor.fontFamily", fontWanted(JB, false)],
			["terminal.integrated.fontFamily", fontWanted(JB, true)]
		]);
		await managed.update(FONT_GROUP, fonts);
		assert.equal(settings.get("editor.fontFamily"), `'${JB}', Fira Code`);
		assert.equal(
			settings.has("terminal.integrated.fontFamily"),
			false,
			"empty terminal font left alone"
		);

		const before = writes;
		await managed.update(FONT_GROUP, fonts);
		assert.equal(writes, before, "a reload with the same font writes nothing");

		await managed.update(FONT_GROUP, new Map());
		assert.equal(settings.get("editor.fontFamily"), "Fira Code");
	});

	it("keeps the two groups apart", async () => {
		await managed.update(FONT_GROUP, new Map([["editor.fontFamily", fontWanted(JB, false)]]));
		await managed.update(
			EFFECT_GROUP,
			new Map([["editor.guides.bracketPairs", toggleWanted("active", guidesOn)]])
		);
		await managed.update(EFFECT_GROUP, new Map());
		assert.equal(settings.has("editor.guides.bracketPairs"), false, "effect setting restored");
		assert.match(String(settings.get("editor.fontFamily")), /JetBrainsMono/, "font untouched");
	});

	it("puts a setting back when it's no longer wanted", async () => {
		const guides = new Map([["editor.guides.bracketPairs", toggleWanted("active", guidesOn)]]);
		await managed.update(EFFECT_GROUP, guides);
		assert.equal(settings.get("editor.guides.bracketPairs"), "active");
		await managed.update(EFFECT_GROUP, new Map());
		assert.equal(settings.has("editor.guides.bracketPairs"), false);
	});

	it("puts a setting back once the user turned it on themselves", async () => {
		const guides = new Map([["editor.guides.bracketPairs", toggleWanted("active", guidesOn)]]);
		await managed.update(EFFECT_GROUP, guides);
		settings.set("editor.guides.bracketPairs", true); // the user's own choice
		await managed.update(EFFECT_GROUP, guides);
		assert.equal(settings.get("editor.guides.bracketPairs"), true, "the user's value is kept");
		await managed.update(EFFECT_GROUP, new Map());
		assert.equal(settings.get("editor.guides.bracketPairs"), true, "and not reset on Disable");
	});

	it("restores state saved by older versions, where JSON dropped an unset 'previous'", async () => {
		const applied = `'${JB}', ${DEFAULT_FONT}`;
		settings.set("editor.fontFamily", applied);
		await writeFile(
			path.join(root, "state.json"),
			JSON.stringify({ fontSettings: { "editor.fontFamily": { applied } } })
		);
		await managed.update(FONT_GROUP, new Map());
		assert.equal(settings.has("editor.fontFamily"), false, "the setting is removed again");
	});

	it("keeps a setting the user removed after Stylesmith changed it", async () => {
		const fonts = new Map([["editor.fontFamily", fontWanted(JB, false)]]);
		settings.set("editor.fontFamily", "Hack");
		await managed.update(FONT_GROUP, fonts);
		settings.delete("editor.fontFamily");
		await managed.update(FONT_GROUP, new Map());
		assert.equal(settings.has("editor.fontFamily"), false, "not brought back");
	});

	it("removes a font list that holds only Stylesmith's font", async () => {
		const fonts = new Map([["editor.fontFamily", fontWanted(JB, false)]]);
		settings.set("editor.fontFamily", "Hack");
		await managed.update(FONT_GROUP, fonts);
		settings.set("editor.fontFamily", `'${JB}'`); // the user deleted their own fonts
		await managed.update(FONT_GROUP, new Map());
		assert.equal(settings.has("editor.fontFamily"), false, "no empty font list is left");
	});

	it("skips damaged entries in the state file instead of failing Disable", async () => {
		settings.set("editor.fontFamily", "Hack");
		await writeFile(
			path.join(root, "state.json"),
			JSON.stringify({
				fontSettings: { "editor.fontFamily": null, "terminal.integrated.fontFamily": "x" },
				effectSettings: ["not", "an", "object"]
			})
		);
		await managed.update(FONT_GROUP, new Map());
		await managed.update(EFFECT_GROUP, new Map());
		assert.equal(settings.get("editor.fontFamily"), "Hack", "the user's setting is untouched");
	});
});
