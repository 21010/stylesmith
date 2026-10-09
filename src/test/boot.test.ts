import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOT_DURATION, bootLogFor, bootSchedule, renderBootLine } from "../boot";
import { PRESETS } from "../presets";
import { BOOT_LOGS, DEFAULT_BOOT_LOG } from "../stories";

const RETRO = [
	"Night City",
	"Phosphor Terminal",
	"Amber Monitor",
	"Black ICE",
	"Vault",
	"Simulation",
	"Steel and Rust"
];

// Built from strings: the lint rule forbids control characters in regex literals.
const ESC = "\u001b";
/** Text without ANSI escape sequences. */
const plain = (text: string) => text.replace(new RegExp(`${ESC}\\[[0-9;?]*[A-Za-z]`, "g"), "");

describe("boot sequence", () => {
	it("has a log for every retro preset, and only for presets that exist", () => {
		assert.deepEqual(Object.keys(BOOT_LOGS).sort(), [...RETRO].sort());
		for (const label of Object.keys(BOOT_LOGS)) {
			assert.ok(
				PRESETS.some(preset => preset.label === label),
				label
			);
		}
	});

	for (const [label, log] of [
		...Object.entries(BOOT_LOGS),
		["default", DEFAULT_BOOT_LOG] as const
	]) {
		it(`${label}: a title, statuses, and a closing line, short enough to read`, () => {
			assert.ok(log.lines.length >= 4 && log.lines.length <= 8, "4 to 8 lines");
			assert.equal(log.lines[0]!.status, undefined, "the first line is a title");
			assert.equal(log.lines.at(-1)!.status, undefined, "the last line has no status");
			assert.ok(
				log.lines.some(line => line.status),
				"some lines have a status"
			);
			for (const line of log.lines) assert.ok(line.text.length <= 50, line.text);
		});
	}

	it("picks the log by the active color theme's preset, else the default", () => {
		assert.equal(bootLogFor("Stylesmith Amber", PRESETS), BOOT_LOGS["Amber Monitor"]);
		// Simulation's theme keeps its earlier name as the id in settings.
		assert.equal(bootLogFor("Stylesmith Digital Rain", PRESETS), BOOT_LOGS["Simulation"]);
		assert.equal(bootLogFor("Stylesmith Monolith", PRESETS), DEFAULT_BOOT_LOG);
		assert.equal(bootLogFor("Default Dark Modern", PRESETS), DEFAULT_BOOT_LOG);
		assert.equal(bootLogFor(undefined, PRESETS), DEFAULT_BOOT_LOG);
	});

	it("types the log over about two seconds, then shows the prompt", () => {
		const times = bootSchedule(7, false);
		assert.equal(times.length, 8);
		assert.equal(times[0], 0);
		assert.equal(times[6], BOOT_DURATION);
		assert.ok(times[7]! > times[6] && times[7]! <= BOOT_DURATION + 500);
		for (let i = 1; i < times.length; i++) assert.ok(times[i]! > times[i - 1]!);
	});

	it("shows everything at once with reduced motion", () => {
		assert.deepEqual(bootSchedule(7, true), [0, 0, 0, 0, 0, 0, 0, 0]);
	});

	it("handles a one-line log", () => {
		assert.deepEqual(bootSchedule(1, false), [0, 300]);
	});

	it("lines statuses up after dots, in the terminal's green and yellow", () => {
		const ok = renderBootLine({ text: "MEMORY", status: "ok" }, false, "green", 80);
		const warn = renderBootLine({ text: "CLOCK NOT SET", status: "warn" }, false, "green", 80);
		assert.ok(ok.endsWith(`${ESC}[32mOK${ESC}[0m\r\n`));
		assert.ok(warn.endsWith(`${ESC}[33mWARN${ESC}[0m\r\n`));
		assert.equal(plain(ok).indexOf("OK"), 40);
		assert.equal(plain(warn).indexOf("WARN"), 40);
	});

	it("draws the title in the log's bright color", () => {
		assert.equal(
			renderBootLine({ text: "POWER-ON SELF-TEST" }, true, "yellow", 80),
			"\u001b[1;93mPOWER-ON SELF-TEST\u001b[0m\r\n"
		);
	});

	it("fits a narrow terminal: drops the status, then cuts the text", () => {
		assert.equal(
			plain(renderBootLine({ text: "MEMORY CHECK", status: "ok" }, false, "green", 20)),
			"MEMORY CHECK\r\n"
		);
		assert.equal(plain(renderBootLine({ text: "READY." }, false, "green", 3)), "REA\r\n");
	});

	it("never clears the screen, so nothing flashes", () => {
		for (const log of [...Object.values(BOOT_LOGS), DEFAULT_BOOT_LOG]) {
			log.lines.forEach((line, i) => {
				assert.doesNotMatch(
					renderBootLine(line, i === 0, log.color, 80),
					new RegExp(`${ESC}\\[[0-9;]*[JK]`)
				);
			});
		}
	});
});
