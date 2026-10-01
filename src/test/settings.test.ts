import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planReset, planSet } from "../settings";

const guidesOn = (value: unknown) => value === true || value === "active";

describe("effect settings", () => {
	it("turn a setting on and remember that it wasn't set", () => {
		const saved = planSet(undefined, "active", guidesOn, undefined)!;
		assert.deepEqual(saved, { previous: undefined, applied: "active" });
		assert.equal(planReset("active", saved), undefined);
	});

	it("remember an explicit 'off' and put it back", () => {
		const saved = planSet(false, "active", guidesOn, undefined)!;
		assert.equal(planReset("active", saved), false);
	});

	it("leave the setting alone when the user already has it on", () => {
		assert.equal(planSet(true, "active", guidesOn, undefined), undefined);
		assert.equal(planSet("active", "active", guidesOn, undefined), undefined);
	});

	it("don't change it again on Reload", () => {
		const saved = planSet(undefined, "active", guidesOn, undefined)!;
		assert.equal(planSet("active", "active", guidesOn, saved), undefined);
	});

	it("keep the user's own change when restoring", () => {
		const saved = planSet(undefined, "active", guidesOn, undefined)!;
		assert.equal(planReset(true, saved), true);
	});
});
