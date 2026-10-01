/**
 * Runs the effect scripts in headless Chromium, inside a page patched by Stylesmith itself:
 * the same security policy as in VS Code, and a small fake workbench for the scripts to act
 * on. Checks that they work, that they cost nothing while idle, and that they keep their
 * canvases small.
 *
 * Run with: npm run test:browser (needs: npx playwright-core install chromium-headless-shell)
 */

import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, it } from "node:test";
import { chromium, type Browser, type Page } from "playwright-core";
import { EFFECTS } from "../effects";
import { patch, type Snippet } from "../patch";

const ROOT = path.join(__dirname, "..", "..");

// VS Code's own policy, as in its workbench.html: no inline scripts, Trusted Types required.
const WORKBENCH = `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta
			http-equiv="Content-Security-Policy"
			content="
				default-src 'none';
				script-src 'self' 'unsafe-eval';
				style-src 'self' 'unsafe-inline';
				require-trusted-types-for 'script';
		"/>
	</head>
	<body>
		<div class="monaco-workbench vs-dark modern-ui-tabs" id="workbench"><div class="part editor"><div class="editor-group-container">
			<div class="tab dirty" id="tab">main.ts</div>
			<div class="editor-container">
				<div class="monaco-editor focused" style="position:absolute;left:100px;top:100px;width:600px;height:400px">
					<div class="cursors-layer">
						<div class="cursor" id="cursor"
							style="position:absolute;left:10px;top:10px;width:2px;height:18px;background:#5fe0ff"></div>
					</div>
					<textarea id="input" style="position:absolute;left:0;top:0;opacity:0"></textarea>
					<div class="view-lines"><div class="view-line">
						<span class="mtk1" id="plain">let x = </span><span class="mtk6" id="keyword" style="color:#ff72d8">await</span>
					</div></div>
				</div>
			</div>
		</div></div>
		<div id="card" style="border-radius: var(--vscode-cornerRadius-large)"></div>
		<!-- Built like VS Code 1.140's terminal; the text is drawn on the unnamed canvas. -->
		<div class="terminal-wrapper active" id="terminal"><div class="terminal-xterm-host">
			<div class="terminal xterm focus" id="xterm"><div class="xterm-scrollable-element"><div class="xterm-screen">
				<canvas class="xterm-link-layer" id="links" width="40" height="20"></canvas>
				<canvas id="text" width="40" height="20"></canvas>
			</div></div></div>
		</div></div>
		<div id="badge" style="border-radius: var(--vscode-cornerRadius-circle)"></div>
		</div>
		<!-- VS Code defines its design tokens in a style that loads after Stylesmith's. -->
		<style>
			.monaco-workbench { --vscode-cornerRadius-large: 8px; --vscode-cornerRadius-circle: 9999px; --vscode-terminal-foreground: #7df2b8; --vscode-focusBorder: #5fe0ff; }
		</style>
	</body>
</html>
`;

// Installed before the page's own scripts: counts animation frames and records policy
// violations and errors.
const PROBE = `
	window.__frames = 0;
	window.__violations = [];
	const raf = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = callback => { window.__frames++; return raf(callback); };
	document.addEventListener("securitypolicyviolation", e =>
		window.__violations.push(e.violatedDirective + " " + e.blockedURI));
`;

let browser: Browser;
let pages = 0;
let dir: string;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function openWorkbench(ids: readonly string[], reducedMotion = false): Promise<Page> {
	const effects = EFFECTS.filter(effect => ids.includes(effect.setting.replace("effects.", "")));
	assert.equal(effects.length, ids.length, `unknown effect in ${ids.join(", ")}`);
	const snippets: Snippet[] = await Promise.all(
		effects
			.flatMap(effect => (effect.asset ? [effect.asset] : []))
			.map(async ({ file, kind }) => ({
				kind,
				source: await readFile(path.join(ROOT, file), "utf-8")
			}))
	);
	// A short name: one built from every effect's name can pass Windows' path length limit.
	const file = path.join(dir, `page-${++pages}.html`);
	await writeFile(file, patch(WORKBENCH, snippets));

	const page = await browser.newPage({
		reducedMotion: reducedMotion ? "reduce" : "no-preference"
	});
	const errors: string[] = [];
	page.on("pageerror", error => errors.push(error.message));
	page.on("console", message => {
		if (message.type() === "error") errors.push(message.text());
	});
	await page.addInitScript(PROBE);
	await page.goto(pathToFileURL(file).href);
	(page as Page & { errors: string[] }).errors = errors;
	return page;
}

const frames = (page: Page) =>
	page.evaluate(() => (window as unknown as { __frames: number }).__frames);
const errorsOf = (page: Page) => (page as Page & { errors: string[] }).errors;
const violationsOf = (page: Page) =>
	page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);

async function canvasSizes(page: Page): Promise<{ width: number; height: number }[]> {
	return page.$$eval("body > canvas", canvases =>
		canvases
			.filter(c => c instanceof HTMLCanvasElement)
			.map(c => ({ width: c.width, height: c.height }))
	);
}

/** Waits until no animation frame was requested for `quiet` ms; fails after `limit` ms. */
async function waitUntilIdle(page: Page, quiet = 300, limit = 5000): Promise<void> {
	const start = Date.now();
	let last = await frames(page);
	let since = Date.now();
	while (Date.now() - start < limit) {
		await sleep(50);
		const now = await frames(page);
		if (now !== last) {
			last = now;
			since = Date.now();
		} else if (Date.now() - since >= quiet) {
			return;
		}
	}
	assert.fail(`still animating after ${limit} ms`);
}

before(async () => {
	browser = await chromium.launch();
	dir = await mkdtemp(path.join(os.tmpdir(), "stylesmith-browser-"));
});

after(async () => {
	await browser?.close();
	await rm(dir, { recursive: true, force: true });
});

describe("effect scripts in the browser", () => {
	it("all run under VS Code's security policy, without errors", async () => {
		const page = await openWorkbench(
			EFFECTS.map(effect => effect.setting.replace("effects.", ""))
		);
		await sleep(500);
		assert.deepEqual(await violationsOf(page), [], "no security policy violations");
		assert.deepEqual(errorsOf(page), [], "no errors");
		await page.close();
	});

	it("are blocked if they are not the ones Stylesmith allowed (the hashes matter)", async () => {
		const file = path.join(dir, "tampered.html");
		const html = patch(WORKBENCH, [{ kind: "js", source: "window.__ran = true;" }]);
		await writeFile(file, html.replace("window.__ran = true;", "window.__ran = 'tampered';"));
		const page = await browser.newPage();
		await page.goto(pathToFileURL(file).href);
		assert.equal(
			await page.evaluate(() => (window as unknown as { __ran?: unknown }).__ran),
			undefined
		);
		await page.close();
	});

	it("cost nothing while idle", async () => {
		const page = await openWorkbench(
			EFFECTS.map(effect => effect.setting.replace("effects.", ""))
		);
		await waitUntilIdle(page, 300, 4000); // the boot sequence and the first caret frame
		const before = await frames(page);
		await sleep(1000);
		assert.equal(await frames(page), before, "no animation frames while nothing happens");
		await page.close();
	});
});

describe("caret animation", () => {
	it("draws the moved cursor on a small canvas, then stops", async () => {
		const page = await openWorkbench(["caretAnimation"]);
		await waitUntilIdle(page);
		await page.$eval("#cursor", el => ((el as HTMLElement).style.left = "300px"));
		await sleep(100);
		const [canvas] = await canvasSizes(page);
		assert.ok(canvas, "the caret animation has a canvas");
		assert.ok(canvas.width > 0 && canvas.height > 0, "something is drawn");
		const viewport = page.viewportSize()!;
		assert.ok(
			canvas.width < viewport.width && canvas.height < viewport.height / 2,
			"not full-window"
		);
		await waitUntilIdle(page);
		const pixel = await page.$eval("body > canvas", c => {
			if (!(c instanceof HTMLCanvasElement)) return false;
			const ctx = c.getContext("2d")!;
			return Array.from(ctx.getImageData(0, 0, c.width, c.height).data).some(
				value => value > 0
			);
		});
		assert.ok(pixel, "the last frame stays on the canvas");
		await page.close();
	});

	it("snaps without animating when reduced motion is on", async () => {
		const page = await openWorkbench(["caretAnimation"], true);
		await waitUntilIdle(page);
		const before = await frames(page);
		await page.$eval("#cursor", el => ((el as HTMLElement).style.left = "300px"));
		await sleep(300);
		assert.ok((await frames(page)) - before <= 2, "one frame to redraw, no animation");
		await page.close();
	});
});

describe("typing sparks", () => {
	it("bursts on typing, then frees the canvas", async () => {
		const page = await openWorkbench(["typingSparks"]);
		assert.deepEqual(
			await canvasSizes(page),
			[{ width: 0, height: 0 }],
			"no memory before typing"
		);
		await page.focus("#input");
		await page.keyboard.press("a");
		await sleep(80);
		assert.ok(((await canvasSizes(page))[0]?.width ?? 0) > 0, "sparks are drawn");
		await waitUntilIdle(page);
		assert.deepEqual(await canvasSizes(page), [{ width: 0, height: 0 }], "canvas freed");
		await page.close();
	});

	it("ignores shortcuts and keys outside the editor", async () => {
		const page = await openWorkbench(["typingSparks"]);
		await page.focus("#input");
		await page.keyboard.press("Control+s");
		await page.keyboard.press("ArrowLeft");
		await page.focus("body");
		await sleep(100);
		assert.deepEqual(await canvasSizes(page), [{ width: 0, height: 0 }]);
		await page.close();
	});

	it("caps the number of sparks when a key is held down", async () => {
		const page = await openWorkbench(["typingSparks"]);
		await page.focus("#input");
		for (let i = 0; i < 60; i++) await page.keyboard.press("x", { delay: 0 });
		await waitUntilIdle(page, 300, 8000);
		assert.deepEqual(errorsOf(page), []);
		await page.close();
	});
});

describe("glitch on save", () => {
	it("glitches briefly when a tab is saved", async () => {
		const page = await openWorkbench(["glitchOnSave"]);
		await page.$eval("#tab", el => el.classList.remove("dirty"));
		await sleep(30);
		const group = ".editor-group-container";
		assert.ok(await page.$eval(group, el => el.classList.contains("stylesmith-glitch")));
		await sleep(400);
		assert.ok(!(await page.$eval(group, el => el.classList.contains("stylesmith-glitch"))));
		await page.close();
	});

	it("doesn't glitch with reduced motion", async () => {
		const page = await openWorkbench(["glitchOnSave"], true);
		await page.$eval("#tab", el => el.classList.remove("dirty"));
		await sleep(30);
		assert.ok(
			!(await page.$eval(".editor-group-container", el =>
				el.classList.contains("stylesmith-glitch")
			))
		);
		await page.close();
	});
});

describe("boot sequence", () => {
	it("shows the boot log and removes it completely", async () => {
		const page = await openWorkbench(["bootSequence"]);
		assert.equal(await page.locator("pre").count(), 1, "the log is shown");
		await page.waitForFunction(() => !document.querySelector("pre"), undefined, {
			timeout: 4000
		});
		await page.close();
	});

	it("is skipped by any key", async () => {
		const page = await openWorkbench(["bootSequence"]);
		await page.keyboard.press("Escape");
		await page.waitForFunction(() => !document.querySelector("pre"), undefined, {
			timeout: 1000
		});
		await page.close();
	});

	it("doesn't show with reduced motion", async () => {
		const page = await openWorkbench(["bootSequence"], true);
		assert.equal(await page.locator("pre").count(), 0);
		await page.close();
	});
});

describe("neon glow", () => {
	const shadow = (page: Page, selector: string) =>
		page.$eval(selector, el => getComputedStyle(el).textShadow);

	it("makes highlighted code glow in its own color, but not plain text", async () => {
		const page = await openWorkbench(["neonGlow"]);
		assert.match(
			await shadow(page, "#keyword"),
			/color\(srgb 1 0\.447\d* 0\.847\d* \/ 0\.6\)/,
			"glows in the keyword's color (#ff72d8, at 60%)"
		);
		assert.equal(await shadow(page, "#plain"), "none");
		await page.close();
	});

	it("doesn't glow in light and high contrast themes", async () => {
		const page = await openWorkbench(["neonGlow"]);
		for (const kind of ["vs", "hc-black", "hc-light"]) {
			await page.$eval(
				"#workbench",
				(el, k) => {
					el.setAttribute("class", `monaco-workbench ${k}`);
				},
				kind
			);
			assert.equal(await shadow(page, "#keyword"), "none", kind);
		}
		await page.close();
	});
});

describe("classic layout", () => {
	const radius = (page: Page, selector: string) =>
		page.$eval(selector, el => getComputedStyle(el).borderTopLeftRadius);

	it("squares VS Code's rounded corners, even though VS Code sets them later", async () => {
		const before = await openWorkbench([]);
		assert.equal(await radius(before, "#card"), "8px", "the fake workbench is rounded");
		await before.close();

		const page = await openWorkbench(["classicLayout"]);
		assert.equal(await radius(page, "#card"), "0px");
		assert.equal(await radius(page, "#badge"), "9999px", "circles stay round");
		await page.close();
	});
});

describe("neon terminal frame", () => {
	const frame = (page: Page) =>
		page.$eval("#terminal", el => getComputedStyle(el, "::after").boxShadow);

	it("frames the terminal you're typing in, and nothing else", async () => {
		const page = await openWorkbench(["neonTerminal"]);
		assert.match(await frame(page), /inset/, "a neon frame");
		await page.$eval("#xterm", el => el.classList.remove("focus"));
		assert.equal(await frame(page), "none", "not when the terminal isn't focused");
		await page.close();
	});
});

describe("terminal glow", () => {
	const filter = (page: Page, selector: string) =>
		page.$eval(selector, el => getComputedStyle(el).filter);

	it("makes the terminal text glow in the terminal text color, but not the link layer", async () => {
		const page = await openWorkbench(["terminalGlow"]);
		assert.match(
			await filter(page, "#text"),
			/drop-shadow\(.*0\.49\d* 0\.94\d* 0\.72\d*/,
			"#7df2b8"
		);
		assert.equal(await filter(page, "#links"), "none");
		await page.close();
	});

	it("doesn't glow in light and high contrast themes", async () => {
		const page = await openWorkbench(["terminalGlow"]);
		for (const kind of ["vs", "hc-black", "hc-light"]) {
			await page.$eval(
				"#workbench",
				(el, k) => {
					el.setAttribute("class", `monaco-workbench ${k}`);
				},
				kind
			);
			assert.equal(await filter(page, "#text"), "none", kind);
		}
		await page.close();
	});
});
