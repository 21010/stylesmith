// Takes the screenshots of each preset, and of the Problem Lens, for the website (site/img/).
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
	"daylight",
	"problem-lens"
];
const SIZE = { width: 1280, height: 760 };

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
		effects: { "effects.bootSequence": false },
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

const vscode = await prepareVSCode(SHOTS.includes("problem-lens") ? [SPELL_CHECKER] : []);
mkdirSync(OUT, { recursive: true });
for (const id of SHOTS) {
	if (id === "problem-lens") {
		await shootProblemLens(vscode);
		continue;
	}
	const preset = PRESETS.find(candidate => candidate.id === id);
	if (!preset) throw new Error(`no preset ${id}`);
	await shoot(vscode, preset);
}
vscode.dispose();
