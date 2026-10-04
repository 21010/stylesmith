// Takes the screenshots of each preset for the website (site/img/).
// Run with: npm run screenshots (after "npx @vscode/vsce package"; see vscode-session.mjs).

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	ROOT,
	PRESETS,
	prepareVSCode,
	openVSCode,
	settle,
	hideClutter
} from "./vscode-session.mjs";

const OUT = join(ROOT, "site", "img");

// SHOTS=daylight npm run screenshots takes just one.
const SHOTS = process.env.SHOTS?.split(",") ?? [
	"night-city",
	"phosphor-terminal",
	"amber-monitor",
	"black-ice",
	"daylight"
];
const SIZE = { width: 1280, height: 760 };
// The preset whose window is also used for the screenshot of the open menu.
const MENU_PRESET = "night-city";

/** The Stylesmith menu, opened from the paint-can button, for the README and the website. */
async function shootMenu(page) {
	const button = ".statusbar-item:has(.codicon-paintcan)";
	await page.click(button);
	// Outline the button in the theme's focus color, so the picture shows what opens the menu.
	await page.addStyleTag({
		content: `${button} { outline: 2px solid var(--vscode-focusBorder); outline-offset: -2px; }`
	});
	await page.waitForSelector(".quick-input-widget .monaco-list-row", { timeout: 10_000 });
	await page.mouse.move(5, 5); // no hover highlight or tooltip
	await page.waitForTimeout(600);
	for (const file of [join(OUT, "menu.png"), join(ROOT, "images", "menu.png")]) {
		await page.screenshot({ path: file });
		console.log(`wrote ${file}`);
	}
	await page.keyboard.press("Escape");
}

async function shoot(vscode, preset) {
	const { page, userData, close } = await openVSCode(vscode, preset, { size: SIZE });
	try {
		await settle(page, preset.id);
		// Put the cursor on the line with the error, so the status bar shows it too.
		await page.keyboard.press("Control+End");
		await page.keyboard.press("ArrowUp");
		await page.keyboard.press("End");
		await page.waitForTimeout(1200);
		await hideClutter(page);
		if (process.env.DEBUG_SHOTS) {
			console.log(readFileSync(join(userData, "User", "settings.json"), "utf-8"));
			console.log(await page.$eval(".monaco-workbench", el => el.className));
		}
		const file = join(OUT, `${preset.id}.png`);
		await page.screenshot({ path: file });
		console.log(`wrote ${file}`);
		if (preset.id === MENU_PRESET) await shootMenu(page);
	} finally {
		await close();
	}
}

const vscode = await prepareVSCode();
mkdirSync(OUT, { recursive: true });
for (const id of SHOTS) {
	const preset = PRESETS.find(candidate => candidate.id === id);
	if (!preset) throw new Error(`no preset ${id}`);
	await shoot(vscode, preset);
}
vscode.dispose();
