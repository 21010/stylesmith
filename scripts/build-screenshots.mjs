// Takes the screenshots of each preset for the website (site/img/).
// Run with: npm run screenshots
//
// It installs the packaged extension (stylesmith-<version>.vsix, made with
// "npx @vscode/vsce package") into the VS Code copy downloaded for the end-to-end test, applies
// a preset the way Stylesmith itself does (lifecycle.enable), opens a small sample project,
// takes a screenshot, and restores VS Code's file with lifecycle.disable. The installed
// package is used rather than --extensionDevelopmentPath, because a development extension
// doesn't get the color theme from settings. Needs a desktop session (or xvfb on Linux).

import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, execSync } from "node:child_process";
import {
	downloadAndUnzipVSCode,
	resolveCliArgsFromVSCodeExecutablePath
} from "@vscode/test-electron";
import { _electron } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "site", "img");
const require = createRequire(import.meta.url);
const { enable, disable } = require(join(ROOT, "out", "lifecycle.js"));
const { ManagedSettings } = require(join(ROOT, "out", "managed.js"));
const { StateFile } = require(join(ROOT, "out", "store.js"));
const { findFont } = require(join(ROOT, "out", "fonts.js"));
const { PRESETS, ICON_THEME } = require(join(ROOT, "out", "presets.js"));
const { locateWorkbench } = require(join(ROOT, "out", "workbench.js"));

// SHOTS=daylight npm run screenshots takes just one.
const SHOTS = process.env.SHOTS?.split(",") ?? [
	"night-city",
	"phosphor-terminal",
	"amber-monitor",
	"black-ice",
	"daylight"
];
const SIZE = { width: 1280, height: 760 };

const SAMPLE = {
	"src/server.ts": `import { createServer } from "node:http";
import { loadTheme } from "./theme";

// A tiny server that answers with the current neon palette.
export function start(port: number = 8080) {
	const server = createServer(async (request, response) => {
		const theme = await loadTheme(request.url ?? "/");
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify(theme));
	});
	server.listen(port);
	return server;
}

const retries: number = "three";
`,
	"src/theme.ts": `export async function loadTheme(path: string) {
	return { path, neon: "#5fe0ff", glow: true };
}
`,
	"styles/custom.css": `.monaco-workbench .part.statusbar {\n\tfont-weight: 600;\n}\n`,
	"package.json": `{\n\t"name": "neon-server",\n\t"version": "1.0.0"\n}\n`,
	"README.md": "# Neon server\n"
};

/** VS Code's application folder ("out") inside a downloaded copy. */
function appDirs(executable) {
	const dir = dirname(executable);
	return [dir, ...readdirSync(dir).map(name => join(dir, name))]
		.map(base => join(base, "resources", "app", "out"))
		.filter(existsSync);
}

/** Installs the packaged extension into a new extensions folder; returns the folder. */
function installPackage(executable) {
	const { version } = require(join(ROOT, "package.json"));
	const vsix = join(ROOT, `stylesmith-${version}.vsix`);
	if (!existsSync(vsix))
		throw new Error(`${vsix} is missing: run "npx @vscode/vsce package" first`);
	const extensions = mkdtempSync(join(tmpdir(), "stylesmith-shot-extensions-"));
	const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(executable);
	const all = [...args, "--extensions-dir", extensions, "--install-extension", vsix];
	if (process.platform === "win32") {
		// code.cmd only runs through a shell, so build one command with every part quoted.
		execSync([cli, ...all].map(part => `"${part}"`).join(" "), { stdio: "ignore" });
	} else {
		execFileSync(cli, all, { stdio: "ignore" });
	}
	return extensions;
}

async function shoot(executable, workbench, extensions, preset) {
	const temp = mkdtempSync(join(tmpdir(), "stylesmith-shot-"));
	const settings = new Map();
	const effects = new Set(
		Object.entries(preset.effects)
			.filter(([, on]) => on)
			.map(([key]) => key)
	);
	const ui = {
		info() {},
		warn() {},
		error() {},
		ask: async () => undefined,
		offerRestart() {},
		restartNow: async () => {},
		run: async () => {}
	};
	const access = {
		read: key => ({
			user: settings.get(key),
			default: key.endsWith("fontFamily") ? "" : false,
			known: true
		}),
		write: async (key, value) =>
			void (value === undefined ? settings.delete(key) : settings.set(key, value))
	};
	const store = new StateFile(join(temp, "state.json"));
	const services = {
		config: {
			get: (_key, fallback) => fallback,
			set: async () => {},
			imports: () => [],
			isOn: effect => effects.has(effect.setting),
			font: () => findFont(preset.font),
			allowRemoteImports: () => false,
			problemLens: () => ({
				enabled: true,
				minimumSeverity: "warning",
				inlineMessages: true,
				gutterIcons: true,
				statusBar: true
			}),
			variables: () => ({
				cwd: undefined,
				userHome: tmpdir(),
				workspaceFolder: undefined,
				execPath: executable,
				pathSeparator: "/",
				env: {}
			}),
			setThemes: async () => {}
		},
		managed: new ManagedSettings(access, store),
		store,
		ui,
		findWorkbench: () => workbench,
		asAbsolutePath: relativePath => join(ROOT, relativePath)
	};

	const project = join(temp, "neon-server");
	for (const [file, content] of Object.entries(SAMPLE)) {
		mkdirSync(dirname(join(project, file)), { recursive: true });
		writeFileSync(join(project, file), content);
	}
	const userData = join(temp, "user-data");
	mkdirSync(join(userData, "User"), { recursive: true });

	let app;
	try {
		await enable(services);
		writeFileSync(
			join(userData, "User", "settings.json"),
			JSON.stringify({
				"workbench.colorTheme": preset.theme,
				"workbench.iconTheme": ICON_THEME,
				...Object.fromEntries(settings),
				"editor.fontSize": 14,
				"editor.minimap.enabled": false,
				"workbench.startupEditor": "none",
				"workbench.tips.enabled": false,
				"window.restoreWindows": "none",
				"update.mode": "none",
				"telemetry.telemetryLevel": "off",
				"chat.disableAIFeatures": true,
				"workbench.secondarySideBar.defaultVisibility": "hidden",
				"security.workspace.trust.enabled": false
			})
		);
		app = await _electron.launch({
			executablePath: executable,
			args: [
				`--user-data-dir=${userData}`,
				`--extensions-dir=${extensions}`,
				"--skip-welcome",
				"--skip-release-notes",
				project,
				join(project, "src", "server.ts")
			]
		});
		const page = await app.firstWindow();
		await page.waitForSelector(".monaco-editor .view-line", { timeout: 60_000 });
		const window = await app.browserWindow(page);
		await window.evaluate((win, size) => win.setContentSize(size.width, size.height), SIZE);
		// Wait for TypeScript's diagnostics (the Problem Lens), and for the boot sequence to end.
		await page
			.waitForSelector(".monaco-editor .squiggly-error", { timeout: 30_000 })
			.catch(() => console.warn(`  ${preset.id}: no diagnostics shown`));
		await page.waitForTimeout(3000);
		// Put the cursor on the line with the error, so the status bar shows it too.
		await page.keyboard.press("Control+End");
		await page.keyboard.press("ArrowUp");
		await page.keyboard.press("End");
		await page.waitForTimeout(1200);
		// Pop-up notifications (like the expected "installation appears to be corrupt") would
		// cover the editor; they're still in the notification center.
		await page.addStyleTag({ content: ".notifications-toasts { display: none !important; }" });
		if (process.env.DEBUG_SHOTS) {
			console.log(readFileSync(join(userData, "User", "settings.json"), "utf-8"));
			console.log(await page.$eval(".monaco-workbench", el => el.className));
		}
		const file = join(OUT, `${preset.id}.png`);
		await page.screenshot({ path: file });
		console.log(`wrote ${file}`);
	} finally {
		await app?.close().catch(() => {});
		await disable(services);
		rmSync(temp, { recursive: true, force: true, maxRetries: 5 });
	}
}

const executable = await downloadAndUnzipVSCode("stable");
const extensions = installPackage(executable);
const workbench = locateWorkbench(appDirs(executable));
if (!workbench) throw new Error(`can't find VS Code's workbench in ${dirname(executable)}`);
mkdirSync(OUT, { recursive: true });
for (const id of SHOTS) {
	const preset = PRESETS.find(candidate => candidate.id === id);
	if (!preset) throw new Error(`no preset ${id}`);
	await shoot(executable, workbench, extensions, preset);
}
rmSync(extensions, { recursive: true, force: true, maxRetries: 5 });
