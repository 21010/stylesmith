import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FEEDBACK_DELAY, FEEDBACK_URL, feedbackStep } from "../feedback";

describe("the one-time feedback question", () => {
	const day = 24 * 60 * 60 * 1000;

	it("only records the first run, without asking", () => {
		assert.deepEqual(feedbackStep({}, 1000), { change: { firstRunAt: 1000 }, ask: false });
	});

	it("waits a week", () => {
		assert.deepEqual(feedbackStep({ firstRunAt: 0 }, 6 * day), { change: {}, ask: false });
		assert.equal(FEEDBACK_DELAY, 7 * day);
	});

	it("asks after a week, and records that it asked", () => {
		assert.deepEqual(feedbackStep({ firstRunAt: 0 }, 7 * day), {
			change: { feedbackAsked: true },
			ask: true
		});
	});

	it("never asks twice", () => {
		assert.deepEqual(feedbackStep({ firstRunAt: 0, feedbackAsked: true }, 30 * day), {
			change: {},
			ask: false
		});
	});

	it("treats a damaged first-run time as a first run", () => {
		assert.deepEqual(feedbackStep({ firstRunAt: "yesterday" as unknown as number }, 5), {
			change: { firstRunAt: 5 },
			ask: false
		});
	});

	it("leads to the project's public polls", () => {
		assert.equal(new URL(FEEDBACK_URL).protocol, "https:");
		assert.equal(new URL(FEEDBACK_URL).host, "github.com");
	});
});
