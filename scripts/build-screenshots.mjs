// Takes the screenshots of each preset, of the Problem Lens, and of the Oh My Posh prompt in
// each preset, for the website (site/img/).
// Run with: npm run screenshots (after "npx @vscode/vsce package"; see vscode-session.mjs).

// The functions given to page.waitForFunction run in VS Code's window.
/* global document */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
	"monolith",
	"glass-lab",
	"vault",
	"simulation",
	"steel-and-rust",
	"brass",
	"tea-garden",
	"sunroom",
	"countdown",
	"overlay",
	"deep-desert",
	"haze",
	"grid",
	"daylight",
	"high-contrast",
	"problem-lens",
	"oh-my-posh"
];
const SIZE = { width: 1280, height: 760 };

// The Oh My Posh prompt (extras/oh-my-posh/stylesmith.omp.json) in PowerShell, in VS Code's
// terminal with each preset. The prompt uses the terminal's ANSI colors, which every Stylesmith
// theme defines. Needs PowerShell 7 (pwsh) and oh-my-posh on the PATH.
const OMP_PRESETS = ["night-city", "phosphor-terminal", "amber-monitor", "black-ice", "daylight"];
const OMP_CONFIG = join(ROOT, "extras", "oh-my-posh", "stylesmith.omp.json");
// Smaller than the other shots, with the same shape: the prompt is shown small on the website.
const OMP_SIZE = { width: 960, height: 570 };
const OMP_INIT =
	// The temporary folder is home, so the prompt shows ~\neon-server, not a real path.
	"$env:HOME = $env:USERPROFILE = Split-Path -Parent $PWD; " +
	// No inline suggestions from PSReadLine: they would show up in the picture.
	"Set-PSReadLineOption -PredictionSource None; " +
	`oh-my-posh init pwsh --config '${OMP_CONFIG}' | Invoke-Expression`;
// A clean tree, a slow command (the "took" segment) and a failing one (the error state), whose
// messages show no path of this computer.
const OMP_COMMANDS = ["git status --short", "Start-Sleep -Milliseconds 2200", "git push"];

/** Makes the sample project a git repository with a staged file and a changed one. */
function gitProject(project) {
	const git = (...args) =>
		execFileSync(
			"git",
			["-c", "user.name=Stylesmith", "-c", "user.email=shots@stylesmith.dev", ...args],
			{ cwd: project, stdio: "ignore" }
		);
	git("init", "-b", "main");
	git("add", ".");
	git("commit", "-m", "Neon server");
	writeFileSync(join(project, "src", "palette.ts"), 'export const neon = "#ff72d8";\n');
	git("add", "src/palette.ts");
	writeFileSync(join(project, "README.md"), "# Neon server\n\nServes the current palette.\n");
}

/** How many prompts the terminal shows: each one ends with ❯. */
const promptCount = () =>
	(document.querySelector(".terminal-wrapper .xterm-rows")?.textContent.match(/❯/g) ?? []).length;

async function shootOhMyPosh(vscode, preset) {
	const { page, project, close } = await openVSCode(vscode, preset, {
		size: OMP_SIZE,
		settings: {
			"terminal.integrated.profiles.windows": {
				"Oh My Posh": {
					path: "pwsh.exe",
					args: ["-NoLogo", "-NoProfile", "-NoExit", "-Command", OMP_INIT]
				}
			},
			"terminal.integrated.defaultProfile.windows": "Oh My Posh",
			"terminal.integrated.fontSize": 16,
			"terminal.integrated.gpuAcceleration": "off", // the text is in the page, to wait for
			"terminal.integrated.shellIntegration.enabled": false,
			"stylesmith.problems.statusBar": false // doesn't fit in this narrow window
		}
	});
	try {
		gitProject(project);
		await settle(page, `oh-my-posh ${preset.id}`);
		await page.keyboard.press("Control+B"); // no sidebar: the terminal gets the width
		await page.keyboard.press("Control+Backquote");
		await page.waitForFunction(promptCount, undefined, { timeout: 30_000 });
		await page.keyboard.press("F1");
		await page.keyboard.type("View: Toggle Maximized Panel");
		await page.waitForTimeout(400);
		await page.keyboard.press("Enter");
		await page.waitForTimeout(600);
		await page.click(".terminal-wrapper");
		for (const command of OMP_COMMANDS) {
			const before = await page.evaluate(promptCount);
			await page.keyboard.type(command, { delay: 15 });
			await page.keyboard.press("Enter");
			await page.waitForFunction(
				count =>
					(
						document
							.querySelector(".terminal-wrapper .xterm-rows")
							?.textContent.match(/❯/g) ?? []
					).length > count,
				before,
				{ timeout: 30_000 }
			);
			await page.waitForTimeout(300);
		}
		await hideClutter(page);
		await page.waitForTimeout(800);
		const file = join(OUT, `oh-my-posh-${preset.id}.png`);
		await page.screenshot({ path: file });
		console.log(`wrote ${file}`);
	} finally {
		await close();
	}
}

// The Problem Lens with one problem of each kind: errors from TypeScript, warnings from its
// style checks (which VS Code reports as warnings), and info from Code Spell Checker.
const SPELL_CHECKER = "streetsidesoftware.code-spell-checker";
const LENS_SIZE = { width: 1280, height: 720 };
const LENS_PROJECT = {
	"tsconfig.json": JSON.stringify(
		{
			compilerOptions: {
				target: "es2022",
				module: "es2022",
				strict: true,
				noUnusedLocals: true,
				noImplicitReturns: true
			},
			include: ["src"]
		},
		null,
		"\t"
	),
	"package.json": '{\n\t"name": "neon-shop",\n\t"version": "1.0.0"\n}\n',
	"src/cart.ts": `export interface Item {
	name: string;
	price: number;
	quantity: number;
}

// Adds up the cart, with the discount code applied.
export function calculateTotal(items: Item[], discount?: string) {
	const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const shipping = 4.99;
	if (discount === "NEON10") {
		return total * 0.9;
	}
	reutrn total;
}

// Recieve the price from the checkout servise, with two decimals.
export function formatPrice(price: number): string {
	return "$" + price.toFixed("2");
}
`
};

async function shootProblemLens(vscode) {
	const preset = PRESETS.find(candidate => candidate.id === "night-city");
	const { page, close } = await openVSCode(vscode, preset, {
		size: LENS_SIZE,
		files: LENS_PROJECT,
		open: "src/cart.ts",
		settings: {
			"stylesmith.problems.minimumSeverity": "info",
			"editor.fontSize": 16,
			"cSpell.diagnosticLevel": "Information"
		}
	});
	try {
		await settle(page, "problem-lens");
		await page.keyboard.press("Control+B"); // hides the sidebar: the code is what matters
		// Wait until each kind of problem is in the gutter.
		for (const kind of ["error", "warning", "info"]) {
			await page
				.waitForSelector(`.monaco-editor .squiggly-${kind}`, { timeout: 30_000 })
				.catch(() => console.warn(`  problem-lens: no ${kind} shown`));
		}
		// The cursor on the line with the typo, so the status bar shows it too.
		await page.keyboard.press("Control+G");
		await page.keyboard.type("14");
		await page.keyboard.press("Enter");
		await page.keyboard.press("End");
		await page.waitForTimeout(1200);
		await hideClutter(page);
		const file = join(OUT, "problem-lens.png");
		await page.screenshot({ path: file });
		console.log(`wrote ${file}`);
	} finally {
		await close();
	}
}
// The preset whose window is also used for the screenshot of the open menu.
const MENU_PRESET = "night-city";

/** The Stylesmith menu, opened from the paint-can button, for the README and the website. */
async function shootMenu(page) {
	const button = ".statusbar-item:has(.codicon-paintcan)";
	await page.click(button);
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

const vscode = await prepareVSCode(SHOTS.includes("problem-lens") ? [SPELL_CHECKER] : []);
mkdirSync(OUT, { recursive: true });
for (const id of SHOTS) {
	if (id === "problem-lens") {
		await shootProblemLens(vscode);
		continue;
	}
	if (id === "oh-my-posh") {
		for (const presetId of OMP_PRESETS) {
			await shootOhMyPosh(
				vscode,
				PRESETS.find(candidate => candidate.id === presetId)
			);
		}
		continue;
	}
	const preset = PRESETS.find(candidate => candidate.id === id);
	if (!preset) throw new Error(`no preset ${id}`);
	await shoot(vscode, preset);
}
vscode.dispose();
