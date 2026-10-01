import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accessibleLabel, inlineText, statusText, summarize, type Problem } from "../problems";

const error = (line: number, message = "Cannot find name 'x'."): Problem => ({
	line,
	severity: "error",
	message
});
const warning = (line: number, message = "'y' is never read."): Problem => ({
	line,
	severity: "warning",
	message
});
const info = (line: number): Problem => ({ line, severity: "info", message: "Did you mean 'z'?" });

describe("summarize", () => {
	it("shows the most severe problem per line and counts the rest", () => {
		const lines = summarize(
			[warning(3), error(3, "first error"), error(3, "second"), warning(7)],
			"warning"
		);
		assert.deepEqual(
			lines.map(l => [l.line, l.severity, l.message, l.more]),
			[
				[3, "error", "first error", 2],
				[7, "warning", "'y' is never read.", 0]
			]
		);
	});

	it("leaves out problems below the minimum severity", () => {
		assert.deepEqual(
			summarize([info(1), warning(2)], "warning").map(l => l.line),
			[2]
		);
		assert.deepEqual(summarize([info(1), warning(2)], "error"), []);
		assert.deepEqual(
			summarize([info(1)], "info").map(l => l.severity),
			["info"]
		);
	});

	it("caps the number of lines, so huge files stay fast", () => {
		const many = Array.from({ length: 50 }, (_, i) => error(i));
		assert.equal(summarize(many, "error", 10).length, 10);
	});
});

describe("messages", () => {
	it("look like a terminal log line, with a word for the severity", () => {
		assert.equal(inlineText({ ...error(0), more: 0 }), "▸ ERR  Cannot find name 'x'.");
		assert.equal(inlineText({ ...warning(0), more: 2 }), "▸ WARN  'y' is never read.  +2");
	});

	it("use only the first line of long, multi-line messages, and shorten them", () => {
		const long = { ...error(0, `Type error:\n  details ${"x".repeat(200)}`), more: 0 };
		assert.equal(inlineText(long), "▸ ERR  Type error:");
		const wide = { ...error(0, "y".repeat(200)), more: 0 };
		assert.ok(statusText(wide).endsWith("…"));
		assert.ok(statusText(wide).length <= 64);
	});

	it("give screen readers a full sentence", () => {
		assert.equal(
			accessibleLabel({ ...warning(11), more: 1 }),
			"Warning on line 12: 'y' is never read., and 1 more"
		);
	});
});
