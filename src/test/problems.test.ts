import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	accessibleLabel,
	documentProblems,
	inlineText,
	lineDecorations,
	statusItem,
	statusText,
	summarize,
	type ProblemLensOptions,
	type Problem
} from "../problems";

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

// vscode.DiagnosticSeverity values.
const ERROR = 0,
	WARNING = 1,
	INFO = 2,
	HINT = 3;
const ALL_ON: ProblemLensOptions = {
	enabled: true,
	minimumSeverity: "info",
	inlineMessages: true,
	gutterIcons: true,
	statusBar: true
};

describe("documentProblems", () => {
	it("maps VS Code's severities and leaves hints to VS Code", () => {
		const problems = documentProblems(
			[
				{ line: 0, severity: ERROR, message: "e" },
				{ line: 1, severity: WARNING, message: "w" },
				{ line: 2, severity: INFO, message: "i" },
				{ line: 3, severity: HINT, message: "h" }
			],
			10,
			"info"
		);
		assert.deepEqual(
			problems.map(p => [p.line, p.severity]),
			[
				[0, "error"],
				[1, "warning"],
				[2, "info"]
			]
		);
	});

	it("skips problems past the end of the document (reported for an older version)", () => {
		const diagnostics = [
			{ line: 4, severity: ERROR, message: "last line" },
			{ line: 5, severity: ERROR, message: "gone" },
			{ line: -1, severity: ERROR, message: "invalid" }
		];
		assert.deepEqual(
			documentProblems(diagnostics, 5, "info").map(p => p.line),
			[4]
		);
	});

	it("handles an empty document and no diagnostics", () => {
		assert.deepEqual(documentProblems([], 0, "info"), []);
		assert.deepEqual(
			documentProblems([{ line: 0, severity: ERROR, message: "x" }], 0, "info"),
			[]
		);
	});

	it("ignores unknown severities", () => {
		assert.deepEqual(documentProblems([{ line: 0, severity: 7, message: "x" }], 1, "info"), []);
	});
});

describe("lineDecorations", () => {
	const problems = summarize(
		[
			{ line: 1, severity: "error", message: "boom" },
			{ line: 2, severity: "warning", message: "hmm" }
		],
		"info"
	);

	it("decorates each line under its severity, with the inline message", () => {
		const lines = lineDecorations(problems, ALL_ON);
		assert.deepEqual(lines.error, [{ line: 1, text: "▸ ERR  boom" }]);
		assert.deepEqual(lines.warning, [{ line: 2, text: "▸ WARN  hmm" }]);
		assert.deepEqual(lines.info, []);
	});

	it("leaves out the message when inline messages are off", () => {
		const lines = lineDecorations(problems, { ...ALL_ON, inlineMessages: false });
		assert.deepEqual(lines.error, [{ line: 1, text: undefined }]);
	});

	it("clears every severity when the lens is turned off", () => {
		assert.deepEqual(lineDecorations(problems, { ...ALL_ON, enabled: false }), {
			error: [],
			warning: [],
			info: []
		});
	});

	it("clears every severity when all problems are fixed", () => {
		assert.deepEqual(lineDecorations([], ALL_ON), { error: [], warning: [], info: [] });
	});
});

describe("statusItem", () => {
	const problems = summarize(
		[
			{ line: 3, severity: "warning", message: "first\nsecond line" },
			{ line: 3, severity: "info", message: "also" }
		],
		"info"
	);

	it("shows the cursor line's problem, with a screen reader label", () => {
		assert.deepEqual(statusItem(problems, 3, ALL_ON), {
			severity: "warning",
			text: "WARN first +1",
			label: "Warning on line 4: first, and 1 more"
		});
	});

	it("hides on a line without problems", () => {
		assert.equal(statusItem(problems, 2, ALL_ON), undefined);
		assert.equal(statusItem(problems, -1, ALL_ON), undefined, "no active editor");
	});

	it("hides when the lens or its status item is turned off", () => {
		assert.equal(statusItem(problems, 3, { ...ALL_ON, enabled: false }), undefined);
		assert.equal(statusItem(problems, 3, { ...ALL_ON, statusBar: false }), undefined);
	});

	it("finds a problem far down a huge file, past the cap on decorated lines", () => {
		const many = Array.from({ length: 1500 }, (_, line) => ({
			line,
			severity: ERROR,
			message: `problem ${line}`
		}));
		const onLine = many.filter(d => d.line === 1400);
		const item = statusItem(documentProblems(onLine, 1500, "info"), 1400, ALL_ON);
		assert.equal(item?.text, "ERR problem 1400");
		assert.equal(documentProblems(many, 1500, "info").length, 1000, "decorations stay capped");
	});
});
