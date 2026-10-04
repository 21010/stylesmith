// Records the short looping videos of the effects for the website (site/video/).
// Run with: npm run videos (after "npx @vscode/vsce package"; see vscode-session.mjs).
//
// Each clip runs the real effect in a real VS Code with a preset applied. The preset's other
// scripted effects are turned off, so only the one shown moves. Frames come from Chromium's
// screencast and are encoded to WebM with the ffmpeg that Playwright downloads
// (npx playwright-core install ffmpeg), at a constant frame rate.

// The functions given to page.evaluate run in VS Code's window.
/* global window, document, MutationObserver */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	ROOT,
	PRESETS,
	EFFECTS,
	prepareVSCode,
	openVSCode,
	settle,
	hideClutter
} from "./vscode-session.mjs";

const OUT = join(ROOT, "site", "video");
const WINDOW = { width: 1280, height: 720 };
const FPS = 30;

// No completions, hints or auto-closed brackets popping up while the scenes type code.
const QUIET_EDITOR = {
	"editor.quickSuggestions": { other: false, comments: false, strings: false },
	"editor.suggestOnTriggerCharacters": false,
	"editor.parameterHints.enabled": false,
	"editor.autoClosingBrackets": "never",
	"editor.autoClosingQuotes": "never",
	"editor.hover.enabled": false,
	"editor.lightbulb.enabled": "off",
	"files.autoSave": "off"
};
// The effect cards on the website are small: larger code, and no sidebar (see below).
const CLOSE_UP = { "editor.fontSize": 20 };

const SCRIPTED = EFFECTS.filter(effect => effect.asset?.kind === "js").map(e => e.setting);
/** Only `setting` among the scripted effects; the preset's stylesheets stay as they are. */
const only = setting => Object.fromEntries(SCRIPTED.map(other => [other, other === setting]));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Puts the cursor on a new line at the end of server.ts. */
async function newLineAtEnd(page) {
	await page.click(".monaco-editor .view-line");
	await page.keyboard.press("Control+End");
	await page.keyboard.press("Enter");
}

async function type(page, text, delay = 85) {
	await page.keyboard.type(text, { delay });
}

const CLIPS = {
	"matrix-rain": {
		preset: "phosphor-terminal",
		effects: only("effects.matrixRain"),
		async scene(page, rec) {
			await newLineAtEnd(page);
			await rec.start();
			await sleep(500);
			await type(page, "export const rain = await loadTheme(");
			await sleep(700);
			await type(page, '"/matrix");');
			await sleep(1600);
		}
	},
	"crt-flicker": {
		preset: "amber-monitor",
		effects: only("effects.crtFlicker"),
		async scene(page, rec) {
			// The flicker comes at random, every 2 to 10 seconds: record until it has shown a few
			// times, counting each change of the workbench's transform.
			await page.evaluate(() => {
				window.__flickers = 0;
				const workbench = document.querySelector(".monaco-workbench");
				new MutationObserver(() => {
					if (workbench.style.transform) window.__flickers++;
				}).observe(workbench, { attributes: true, attributeFilter: ["style"] });
			});
			await rec.start();
			const started = Date.now();
			while (Date.now() - started < 30_000) {
				await sleep(250);
				const flickers = await page.evaluate(() => window.__flickers);
				if (flickers >= 3 && Date.now() - started > 8000) break;
			}
			await sleep(800);
		}
	},
	"caret-animation": {
		preset: "night-city",
		effects: only("effects.caretAnimation"),
		async scene(page, rec) {
			await page.click(".monaco-editor .view-line");
			await page.keyboard.press("Control+Home");
			await rec.start();
			await sleep(700);
			for (const keys of [
				["Control+End"],
				["Control+Home"],
				["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "End"],
				["Home"],
				["Control+ArrowRight", "Control+ArrowRight", "Control+ArrowRight"],
				["PageDown"],
				["Control+Home"]
			]) {
				for (const key of keys) {
					await page.keyboard.press(key);
					await sleep(keys.length > 1 ? 160 : 0);
				}
				await sleep(650);
			}
		}
	},
	"typing-sparks": {
		preset: "night-city",
		effects: only("effects.typingSparks"),
		async scene(page, rec) {
			await newLineAtEnd(page);
			await rec.start();
			await sleep(500);
			await type(page, "const neon = { glow: true, color: ");
			await sleep(500);
			await type(page, '"#ff72d8" };');
			await sleep(1500);
		}
	},
	"glitch-on-save": {
		preset: "night-city",
		effects: only("effects.glitchOnSave"),
		async scene(page, rec) {
			await newLineAtEnd(page);
			await rec.start();
			await sleep(400);
			for (const line of ["start(3000);", " // saved", " // and again"]) {
				await type(page, line, 60);
				await sleep(350);
				await page.keyboard.press("Control+S");
				await sleep(1300);
			}
		}
	},
	"boot-sequence": {
		preset: "night-city",
		effects: only("effects.bootSequence"),
		// The boot log is drawn at a fixed size: zoom in, or it's unreadable on the website.
		settings: { "window.zoomLevel": 3 },
		async scene(page, rec) {
			// Reloading the window starts the workbench, and so the boot log, again.
			await page.keyboard.press("Control+Shift+P");
			await page.keyboard.type("Developer: Reload Window");
			await sleep(300);
			await page.keyboard.press("Enter");
			await rec.start();
			await sleep(1000); // the old window is still there for a moment
			await page.waitForSelector(".monaco-editor .view-line", { timeout: 60_000 });
			await hideClutter(page);
			await sleep(1800);
		}
	},
	// Not an effect: the whole Night City preset, for the top of the home page.
	"night-city": {
		preset: "night-city",
		effects: { "effects.bootSequence": false },
		async scene(page, rec) {
			await newLineAtEnd(page);
			await rec.start();
			await sleep(600);
			await type(page, "const glow = await loadTheme(");
			await sleep(400);
			await type(page, '"/night-city");');
			await sleep(500);
			await page.keyboard.press("Control+S");
			await sleep(900);
			for (const key of ["Control+Home", "ArrowDown", "ArrowDown", "ArrowDown", "End"]) {
				await page.keyboard.press(key);
				await sleep(380);
			}
			await sleep(1200);
		}
	}
};

/** The ffmpeg that Playwright installs, in its browser folder. */
function findFfmpeg() {
	const base =
		process.env.PLAYWRIGHT_BROWSERS_PATH ??
		{
			win32: join(homedir(), "AppData", "Local", "ms-playwright"),
			darwin: join(homedir(), "Library", "Caches", "ms-playwright")
		}[process.platform] ??
		join(homedir(), ".cache", "ms-playwright");
	const dir = existsSync(base)
		? readdirSync(base)
				.filter(name => name.startsWith("ffmpeg-"))
				.sort()
				.pop()
		: undefined;
	const file =
		dir && readdirSync(join(base, dir)).find(name => /^ffmpeg-(linux|mac|win64)/.test(name));
	if (!file) throw new Error(`no ffmpeg in ${base}: run "npx playwright-core install ffmpeg"`);
	return join(base, dir, file);
}

/** Collects screencast frames from `page`; `start` begins, `stop` encodes them to `file`. */
function recorder(page, file, width) {
	const frames = []; // [milliseconds since start, jpeg]
	let cdp;
	let started;
	return {
		async start() {
			cdp = await page.context().newCDPSession(page);
			cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
				frames.push([Date.now() - started, Buffer.from(data, "base64")]);
				cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
			});
			started = Date.now();
			await cdp.send("Page.startScreencast", {
				format: "jpeg",
				quality: 92,
				maxWidth: WINDOW.width,
				maxHeight: WINDOW.height,
				everyNthFrame: 1
			});
		},
		async stop() {
			const duration = Date.now() - started;
			await cdp.send("Page.stopScreencast");
			await cdp.detach();
			if (!frames.length) throw new Error(`${file}: no frames`);
			// The screencast sends a frame only when the picture changes: repeat each one until
			// the next, for a constant frame rate.
			const ffmpeg = spawn(
				findFfmpeg(),
				[
					...["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", FPS],
					...["-c:v", "mjpeg", "-i", "pipe:0", "-an"],
					...["-vf", `scale=${width}:-2:flags=lanczos,format=yuv420p`],
					...["-c:v", "vp8", "-crf", "10", "-b:v", "1500k", "-qmin", "0", "-qmax", "40"],
					...["-deadline", "good", "-cpu-used", "1", "-auto-alt-ref", "0"],
					file
				].map(String),
				{ stdio: ["pipe", "inherit", "inherit"] }
			);
			const done = new Promise((resolve, reject) => {
				ffmpeg.on("error", reject);
				ffmpeg.on("close", code =>
					code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))
				);
			});
			// A failed ffmpeg ends with an exit code; that's the error to report, not the pipe's.
			ffmpeg.stdin.on("error", () => {});
			let next = 0;
			for (let time = 0; time < duration; time += 1000 / FPS) {
				while (next + 1 < frames.length && frames[next + 1][0] <= time) next++;
				if (!ffmpeg.stdin.write(frames[next][1])) {
					await Promise.race([
						new Promise(resolve => ffmpeg.stdin.once("drain", resolve)),
						done
					]);
				}
			}
			ffmpeg.stdin.end();
			await done;
			const size = (statSync(file).size / 1024).toFixed(0);
			console.log(`wrote ${file} (${(duration / 1000).toFixed(1)} s, ${size} KB)`);
		}
	};
}

// CLIPS=matrix-rain,crt-flicker npm run videos records just those.
const chosen = process.env.CLIPS?.split(",") ?? Object.keys(CLIPS);
for (const id of chosen) if (!CLIPS[id]) throw new Error(`no clip ${id}`);

const vscode = await prepareVSCode();
mkdirSync(OUT, { recursive: true });
for (const id of chosen) {
	const clip = CLIPS[id];
	const preset = PRESETS.find(candidate => candidate.id === clip.preset);
	const { page, close } = await openVSCode(vscode, preset, {
		size: WINDOW,
		effects: clip.effects,
		settings: { ...QUIET_EDITOR, ...(id === "night-city" ? {} : CLOSE_UP), ...clip.settings }
	});
	try {
		await settle(page, id);
		await hideClutter(page);
		if (id !== "night-city") await page.keyboard.press("Control+B"); // hides the sidebar
		// The hero video on the home page is shown larger than the effect cards.
		const rec = recorder(page, join(OUT, `${id}.webm`), id === "night-city" ? 1280 : 960);
		await clip.scene(page, rec);
		await rec.stop();
	} finally {
		await close();
	}
}
vscode.dispose();
