/**
 * The website in headless Chromium, served over HTTP like on stylesmith.dev: what only a
 * browser can show, such as hover colors and the timing of the boot sequence.
 *
 * Run with: npm run test:browser
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import type * as Axe from "axe-core";
import { chromium, type Browser, type Page } from "playwright-core";
import { contrast } from "../color";
import { PRESETS } from "../presets";

const SITE = path.join(__dirname, "..", "..", "site");
const PAGES = readdirSync(SITE).filter(file => file.endsWith(".html"));
const TYPES: Record<string, string> = {
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".webm": "video/webm",
	".png": "image/png",
	".svg": "image/svg+xml"
};
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf-8");
// The automated checks of WCAG 2.0, 2.1 and 2.2, levels A and AA.
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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
	options: { reducedMotion?: boolean; page?: string } = {}
): Promise<{ page: Page; problems: string[] }> {
	const page = await browser.newPage({
		reducedMotion: options.reducedMotion ? "reduce" : "no-preference"
	});
	const problems: string[] = [];
	page.on("console", message => {
		if (message.type() === "error") problems.push(message.text());
	});
	page.on("pageerror", error => problems.push(error.message));
	await page.goto(base + (options.page ?? ""), { waitUntil: "networkidle" });
	return { page, problems };
}

describe("website in the browser", () => {
	for (const name of PAGES) {
		it(`loads ${name} without errors or security policy violations`, async () => {
			const { page, problems } = await open({ page: name });
			assert.deepEqual(problems, []);
			await page.close();
		});
	}

	// On a wide screen and a phone, where the header, grids and code blocks change.
	for (const [width, height] of [
		[1280, 900],
		[375, 812]
	] as const) {
		for (const name of PAGES) {
			it(`${name} passes the WCAG 2.2 AA checks of axe-core at ${width}px`, async () => {
				const page = await browser.newPage({
					viewport: { width, height },
					reducedMotion: "reduce" // no boot log or playing video halfway through
				});
				await page.goto(base + name, { waitUntil: "networkidle" });
				// evaluate() runs outside the page's security policy, which allows only app.js.
				await page.evaluate(AXE);
				const violations = await page.evaluate(async tags => {
					const { axe } = window as unknown as { axe: typeof Axe };
					const results = await axe.run(document, {
						runOnly: { type: "tag", values: tags }
					});
					return results.violations.map(
						v =>
							`${v.id}: ${v.help} (${v.nodes.map(n => n.target.join(" ")).join(", ")})`
					);
				}, WCAG);
				assert.deepEqual(violations, []);
				await page.close();
			});
		}
	}

	it("keeps every button readable when hovered", async () => {
		for (const name of PAGES) {
			await checkHoverContrast(name);
		}
	});

	async function checkHoverContrast(name: string): Promise<void> {
		const { page } = await open({ reducedMotion: true, page: name });
		const pageBackground = hex(
			await page.$eval("body", el => getComputedStyle(el).backgroundColor)
		);
		assert.ok(pageBackground);
		for (const button of await page.$$(".button")) {
			if (!(await button.isVisible())) continue;
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
				`${name}: ${label} when hovered: ${text} on ${background} is ${ratio.toFixed(2)}:1`
			);
		}
		await page.close();
	}

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

	it("folds the nav into a menu on phones, which links and Escape close", async () => {
		const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
		await page.goto(base);
		const menu = page.locator(".menu-toggle");
		const nav = page.locator("#site-nav");
		assert.ok(!(await nav.isVisible()), "folded");

		await menu.click();
		assert.equal(await menu.getAttribute("aria-expanded"), "true");
		const group = page.locator(".dropbtn").first();
		await group.click();
		assert.equal(await group.getAttribute("aria-expanded"), "true");
		assert.ok(await page.locator(".dropdown-content a").first().isVisible(), "group open");

		await page.keyboard.press("Escape");
		assert.ok(!(await nav.isVisible()), "Escape closes it");
		assert.equal(await menu.getAttribute("aria-expanded"), "false");

		await menu.click();
		await page.click(".nav-install");
		assert.ok(!(await nav.isVisible()), "following a link closes it");
		await page.close();
	});

	it("has the phone menu on every page with a header", async () => {
		const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
		for (const name of PAGES) {
			await page.goto(base + name);
			if (!(await page.locator("header.top").count())) continue; // 404.html
			assert.ok(await page.locator(".menu-toggle").isVisible(), `${name}: menu button`);
			assert.ok(!(await page.locator("#site-nav").isVisible()), `${name}: nav folded`);
		}
		await page.close();
	});

	it("pauses everything that moves with one button, and remembers it (WCAG 2.2.2)", async () => {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
		await page.goto(base, { waitUntil: "networkidle" });
		const pause = page.locator(".motion-toggle");
		assert.equal(await pause.getAttribute("aria-pressed"), "false");
		assert.equal(await page.locator("video[autoplay]").count(), 0, "no product demo video");

		await pause.click();
		assert.equal(await pause.getAttribute("aria-pressed"), "true");
		const animations = await page.evaluate(() => ({
			caret: getComputedStyle(document.querySelector(".caret")!).animationName,
			carousel: getComputedStyle(document.querySelector(".carousel img")!).animationPlayState
		}));
		assert.deepEqual(animations, { caret: "none", carousel: "paused" });

		// On the next page it's still paused.
		await page.goto(base + "themes.html");
		assert.equal(await pause.getAttribute("aria-pressed"), "true", "remembered");
		await page.close();
	});

	it("lets the keyboard choose a preset in the carousel (WCAG 2.1.1)", async () => {
		const { page } = await open();
		const first = page.locator("#slide1");
		await first.focus();
		assert.equal((await first.ariaSnapshot()).trim(), '- radio "Night City"');
		await page.keyboard.press("ArrowRight");
		assert.equal(await page.locator("input[name=slider]:checked").getAttribute("id"), "slide2");
		await page.waitForTimeout(600); // the slides fade in 0.5 s
		const shown = await page.$$eval(".carousel img", images =>
			images.map(image => getComputedStyle(image).opacity)
		);
		assert.deepEqual(shown, ["0", "1", "0", "0", "0"], "the second preset is shown");
		const ring = await page.$eval(
			'label[for="slide2"]',
			label => getComputedStyle(label).outlineStyle
		);
		assert.equal(ring, "solid", "its dot shows the focus");
		await page.close();
	});

	it("shows every preset and theme on the Themes page, with nothing that moves", async () => {
		const { page, problems } = await open({ page: "themes.html" });
		const themes = (
			JSON.parse(readFileSync(path.join(SITE, "..", "package.json"), "utf-8")) as {
				contributes: { themes: unknown[] };
			}
		).contributes.themes;
		assert.equal(await page.locator(".preset-card").count(), PRESETS.length);
		assert.equal(await page.locator(".theme-card").count(), themes.length);
		const highContrast = await page
			.locator(".theme-card.high-contrast .theme-kind")
			.allTextContents();
		assert.deepEqual(highContrast, ["High contrast, dark", "High contrast, light"]);

		// Nothing to operate and nothing that moves: no buttons or animations in the content.
		assert.equal(await page.locator("main button, main [tabindex]").count(), 0);
		const moving = await page.evaluate(
			() =>
				[...document.querySelectorAll("main *")].filter(
					element => getComputedStyle(element).animationName !== "none"
				).length
		);
		assert.equal(moving, 0);
		assert.deepEqual(problems, []);
		await page.close();
	});

	it("keeps the Themes page within a 320 px wide screen, at 200% text size (WCAG 1.4.4, 1.4.10)", async () => {
		const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
		await page.goto(base + "themes.html", { waitUntil: "networkidle" });
		await page.addStyleTag({ content: "html { font-size: 200%; }" });
		// The elements that stick out on the right, so a failure says what to fix.
		const wide = await page.evaluate(() => {
			const width = document.documentElement.clientWidth;
			return [...document.querySelectorAll("body *")]
				.filter(element => element.getBoundingClientRect().right > width + 0.5)
				.map(element => {
					const name = element.tagName.toLowerCase();
					const id = element.id ? `#${element.id}` : "";
					const classes = [...element.classList].map(c => `.${c}`).join("");
					return `${name}${id}${classes} (${Math.round(element.getBoundingClientRect().right)}px)`;
				})
				.slice(0, 10);
		});
		assert.deepEqual(wide, [], "no sideways scrolling");
		await page.close();
	});

	it("starts paused when the system asks for reduced motion", async () => {
		const { page } = await open({ reducedMotion: true });
		assert.equal(await page.locator(".motion-toggle").getAttribute("aria-pressed"), "true");
		assert.equal(await page.locator("video[autoplay]").count(), 0);
		await page.close();
	});

	it("keeps the plain nav, without a menu button, on wide screens", async () => {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
		await page.goto(base);
		assert.ok(!(await page.locator(".menu-toggle").isVisible()));
		assert.ok(await page.locator("#site-nav").isVisible());
		await page.close();
	});
});
