/**
 * The website in headless Chromium, served over HTTP like on stylesmith.dev: what only a
 * browser can show, such as hover colors and the timing of the boot sequence.
 *
 * Run with: npm run test:browser
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { chromium, type Browser, type Page } from "playwright-core";
import { contrast } from "../color";

const SITE = path.join(__dirname, "..", "..", "site");
const TYPES: Record<string, string> = {
	".html": "text/html",
	".css": "text/css",
	".png": "image/png",
	".svg": "image/svg+xml"
};

let server: Server;
let browser: Browser;
let base: string;

before(async () => {
	server = createServer((request, response) => {
		const url = new URL(request.url ?? "/", "http://localhost").pathname;
		const file = path.join(SITE, path.normalize(url === "/" ? "/index.html" : url));
		readFile(file).then(
			body => {
				response.writeHead(200, {
					"content-type": TYPES[path.extname(file)] ?? "text/plain"
				});
				response.end(body);
			},
			() => {
				response.writeHead(404);
				response.end();
			}
		);
	});
	await new Promise<void>(resolve => server.listen(0, resolve));
	base = `http://localhost:${(server.address() as AddressInfo).port}/`;
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	server?.close();
});

/** "rgb(11, 13, 25)" or "rgba(…, 0)" as "#0b0d19"; undefined when transparent. */
function hex(color: string): string | undefined {
	const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
	const [r = 0, g = 0, b = 0, alpha = 1] = parts;
	if (alpha === 0) return undefined;
	return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

async function open(
	options: { reducedMotion?: boolean } = {}
): Promise<{ page: Page; problems: string[] }> {
	const page = await browser.newPage({
		reducedMotion: options.reducedMotion ? "reduce" : "no-preference"
	});
	const problems: string[] = [];
	page.on("console", message => {
		if (message.type() === "error") problems.push(message.text());
	});
	page.on("pageerror", error => problems.push(error.message));
	await page.goto(base, { waitUntil: "networkidle" });
	return { page, problems };
}

describe("website in the browser", () => {
	it("loads without errors or security policy violations", async () => {
		const { page, problems } = await open();
		assert.deepEqual(problems, []);
		await page.close();
	});

	it("keeps every button readable when hovered", async () => {
		const { page } = await open({ reducedMotion: true });
		const pageBackground = hex(
			await page.$eval("body", el => getComputedStyle(el).backgroundColor)
		);
		assert.ok(pageBackground);
		for (const button of await page.$$(".button")) {
			const label = (await button.textContent())?.trim();
			await button.hover();
			// Let the hover colors apply (there are no transitions, but be safe).
			await page.waitForTimeout(50);
			const style = await button.evaluate(el => {
				const s = getComputedStyle(el);
				return { color: s.color, background: s.backgroundColor };
			});
			const text = hex(style.color);
			const background = hex(style.background) ?? pageBackground;
			assert.ok(text);
			const ratio = contrast(text, background);
			assert.ok(
				ratio >= 4.5,
				`${label} when hovered: ${text} on ${background} is ${ratio.toFixed(2)}:1`
			);
		}
		await page.close();
	});

	it("types the boot log, then removes it, and never blocks clicks", async () => {
		const page = await browser.newPage();
		await page.goto(base); // not waiting for the network, to catch the start
		const boot = page.locator(".boot");
		await page.waitForTimeout(400);
		assert.equal(await boot.evaluate(el => getComputedStyle(el).opacity), "1", "showing");
		assert.equal(await boot.evaluate(el => getComputedStyle(el).pointerEvents), "none");
		const typed = await page.$$eval(".boot span", spans =>
			spans.map(s => s.getBoundingClientRect().width)
		);
		assert.ok(typed[0]! > 0 && typed[4] === 0, "the first line is typed, the last not yet");

		await page.click("a[href='#install']"); // works while the boot log shows
		assert.ok(page.url().endsWith("#install"));

		await page.waitForTimeout(1300); // 1.39 s in all
		assert.equal(await boot.evaluate(el => getComputedStyle(el).visibility), "hidden", "gone");
		await page.close();
	});

	it("types every line of the boot log in full", async () => {
		const page = await browser.newPage();
		await page.goto(base);
		const cut = await page.$$eval(".boot span", async spans => {
			await Promise.all(spans.flatMap(span => span.getAnimations().map(a => a.finished)));
			return spans
				.filter(span => span.clientWidth < span.scrollWidth - 1)
				.map(
					span =>
						`${span.textContent ?? ""}: ${span.clientWidth} of ${span.scrollWidth}px`
				);
		});
		assert.deepEqual(cut, []);
		await page.close();
	});

	it("doesn't show the boot log when the system asks for reduced motion", async () => {
		const { page } = await open({ reducedMotion: true });
		assert.equal(
			await page.locator(".boot").evaluate(el => getComputedStyle(el).display),
			"none"
		);
		await page.close();
	});
});
