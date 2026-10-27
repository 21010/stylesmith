/**
 * The preset gallery's page (#84) in headless Chromium: the WCAG checks of axe-core, as for the
 * website, and that its Apply buttons send the right message.
 *
 * Run with: npm run test:browser
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import type * as Axe from "axe-core";
import { chromium, type Browser, type Page } from "playwright-core";
import { EFFECTS } from "../effects";
import { FONTS } from "../fonts";
import { galleryHtml, sampleColors } from "../gallery";
import { PRESETS } from "../presets";
import { PRESET_STORIES } from "../stories";

const ROOT = path.join(__dirname, "..", "..");
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf-8");
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf-8")) as {
	contributes: {
		themes: { id?: string; label: string; uiTheme?: string; path: string }[];
		iconThemes: { id: string; label: string }[];
	};
};

const html = galleryHtml(
	PRESETS.map((preset, i) => {
		const theme = pkg.contributes.themes.find(t => (t.id ?? t.label) === preset.theme)!;
		const iconTheme = pkg.contributes.iconThemes.find(t => t.id === preset.iconTheme);
		return {
			id: preset.id,
			label: preset.label,
			story: PRESET_STORIES[preset.label]!,
			themeLabel: theme.label,
			iconThemeLabel: iconTheme?.label,
			colors: sampleColors(
				JSON.parse(readFileSync(path.join(ROOT, theme.path), "utf-8")) as Parameters<
					typeof sampleColors
				>[0]
			),
			settingsOn: EFFECTS.filter(e => preset.effects[e.setting]).map(e => e.label),
			fontLabel: FONTS.find(f => f.id === preset.font)!.label,
			fontId: preset.font,
			fontInstalled: i > 0,
			current: i === 0,
			kind: theme.uiTheme?.startsWith("hc") ? "hc" : theme.uiTheme === "vs" ? "light" : "dark"
		};
	}),
	"Z2FsbGVyeS10ZXN0LW5vbmNlLTEyMzQ="
);

let browser: Browser;
let page: Page;
/** The same page with its own content security policy in force, as in VS Code. */
let strict: Page;
const violations: string[] = [];

/** A fresh load of the gallery, with a stand-in for VS Code's webview API that records messages. */
async function open(target = page): Promise<void> {
	await target.goto("https://gallery.test/");
}

async function prepare(target: Page): Promise<void> {
	await target.route("https://gallery.test/", route =>
		route.fulfill({ contentType: "text/html", body: html })
	);
	await target.addInitScript(() => {
		const sent: unknown[] = [];
		(window as unknown as { sent: unknown[] }).sent = sent;
		(window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
			postMessage: (message: unknown) => sent.push(message)
		});
	});
}

before(async () => {
	browser = await chromium.launch();
	// axe is injected as a script, which the page's own policy would block.
	const context = await browser.newContext({ bypassCSP: true });
	page = await context.newPage();
	await prepare(page);
	strict = await (await browser.newContext()).newPage();
	strict.on("console", message => {
		if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
	});
	strict.on("pageerror", error => violations.push(error.message));
	await prepare(strict);
});

after(async () => browser?.close());

describe("preset gallery in a browser", () => {
	it("passes axe-core's WCAG checks", async () => {
		await open();
		await page.addScriptTag({ content: AXE });
		const result = await page.evaluate(
			tags => (window as unknown as { axe: typeof Axe }).axe.run(document, { runOnly: tags }),
			WCAG
		);
		assert.deepEqual(
			result.violations.map(
				v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`
			),
			[]
		);
	});

	it("sends Apply with the preset's id, installFont, and Disable, under its own policy (#220)", async () => {
		await open(strict);
		await strict.getByRole("button", { name: "Apply Vault" }).click();
		const firstFont = FONTS.find(f => f.id === PRESETS[0]!.font)!;
		await strict.getByRole("button", { name: `Install ${firstFont.label}` }).click();
		await strict.getByRole("button", { name: "Disable Stylesmith" }).click();
		assert.deepEqual(violations, [], "no policy violations or script errors");
		assert.deepEqual(
			await strict.evaluate(() => (window as unknown as { sent: unknown[] }).sent),
			[
				{ type: "apply", id: "vault" },
				{ type: "installFont", id: firstFont.id },
				{ type: "disable" }
			]
		);
	});

	it("filters cards by kind and announces the count (#220)", async () => {
		await open(strict);
		await strict.getByRole("button", { name: /^Light \(/ }).click();
		const visible = await strict.locator("main li:not([hidden])").count();
		assert.equal(visible, 4);
		assert.equal(
			await strict.locator("#filter-status").textContent(),
			`Showing 4 of ${PRESETS.length} presets.`
		);
		await strict.getByRole("button", { name: /^All \(/ }).click();
		assert.equal(await strict.locator("main li:not([hidden])").count(), PRESETS.length);
	});

	it("can be used with the keyboard, including arrow keys across filter buttons (#224)", async () => {
		await open();
		await page.keyboard.press("Tab");
		assert.equal(
			await page.evaluate(() => document.activeElement?.textContent),
			"Disable Stylesmith"
		);
		await page.keyboard.press("Tab");
		assert.match(
			(await page.evaluate(() => document.activeElement?.textContent)) ?? "",
			/^All \(/
		);
		await page.keyboard.press("ArrowRight");
		assert.match(
			(await page.evaluate(() => document.activeElement?.textContent)) ?? "",
			/^Dark \(/
		);
		await page.keyboard.press("End");
		assert.match(
			(await page.evaluate(() => document.activeElement?.textContent)) ?? "",
			/^High contrast \(/
		);
		await page.keyboard.press("Home");
		assert.match(
			(await page.evaluate(() => document.activeElement?.textContent)) ?? "",
			/^All \(/
		);
		// Tab past the remaining 3 filter buttons (Dark, Light, High contrast) to the first Apply button.
		for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
		await page.keyboard.press("Enter");
		assert.deepEqual(
			await page.evaluate(() => (window as unknown as { sent: unknown[] }).sent),
			[{ type: "apply", id: PRESETS[0]!.id }]
		);
	});
});
