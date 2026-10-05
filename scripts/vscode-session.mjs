// A real VS Code with a Stylesmith preset applied, for the website's screenshots and videos
// (build-screenshots.mjs, record-effects.mjs).
//
// It installs the packaged extension (stylesmith-<version>.vsix, made with
// "npx @vscode/vsce package") into the VS Code copy downloaded for the end-to-end test, applies
// a preset the way Stylesmith itself does (lifecycle.enable), and opens a small sample project.
// Closing restores VS Code's file with lifecycle.disable. The installed package is used rather
// than --extensionDevelopmentPath, because a development extension doesn't get the color theme
// from settings. Needs a desktop session (or xvfb on Linux).

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, execSync } from "node:child_process";
import {
	downloadAndUnzipVSCode,
	resolveCliArgsFromVSCodeExecutablePath
} from "@vscode/test-electron";
import { _electron } from "playwright-core";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { enable, disable } = require(join(ROOT, "out", "lifecycle.js"));
const { ManagedSettings } = require(join(ROOT, "out", "managed.js"));
const { StateFile } = require(join(ROOT, "out", "store.js"));
const { findFont } = require(join(ROOT, "out", "fonts.js"));
const { locateWorkbench } = require(join(ROOT, "out", "workbench.js"));
export const { PRESETS } = require(join(ROOT, "out", "presets.js"));
export const { EFFECTS } = require(join(ROOT, "out", "effects.js"));

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

/**
 * Installs the packaged extension, and the given Marketplace extensions, into a new extensions
 * folder; returns the folder.
 */
function installPackage(executable, marketplace) {
	const { version } = require(join(ROOT, "package.json"));
	const vsix = join(ROOT, `stylesmith-${version}.vsix`);
	if (!existsSync(vsix))
		throw new Error(`${vsix} is missing: run "npx @vscode/vsce package" first`);
	const extensions = mkdtempSync(join(tmpdir(), "stylesmith-shot-extensions-"));
	const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(executable);
	const all = [
		...args,
		"--extensions-dir",
		extensions,
		...[vsix, ...marketplace].flatMap(id => ["--install-extension", id])
	];
	if (process.platform === "win32") {
		// code.cmd only runs through a shell, so build one command with every part quoted.
		execSync([cli, ...all].map(part => `"${part}"`).join(" "), { stdio: "ignore" });
	} else {
		execFileSync(cli, all, { stdio: "ignore" });
	}
	return extensions;
}

/**
 * Downloads VS Code and installs the package, plus `marketplace` extensions by id. Call
 * `dispose` when done with every session.
 */
export async function prepareVSCode(marketplace = []) {
	const executable = await downloadAndUnzipVSCode("stable");
	const extensions = installPackage(executable, marketplace);
	const workbench = locateWorkbench(appDirs(executable));
	if (!workbench) throw new Error(`can't find VS Code's workbench in ${dirname(executable)}`);
	return {
		executable,
		workbench,
		extensions,
		dispose: () => rmSync(extensions, { recursive: true, force: true, maxRetries: 5 })
	};
}

/**
 * Starts VS Code with `preset` applied, showing `open` (src/server.ts) of the sample project
 * `files` in a window of `size`.
 * `effects` overrides the preset's effects ({ "effects.matrixRain": true, ... }), and
 * `settings` adds VS Code settings.
 * Returns the window's page and a `close` that undoes everything.
 */
export async function openVSCode({ executable, workbench, extensions }, preset, options = {}) {
	const {
		size,
		effects: override = {},
		settings: extra = {},
		files = SAMPLE,
		open = "src/server.ts"
	} = options;
	const chosen = { ...preset.effects, ...override };
	const temp = mkdtempSync(join(tmpdir(), "stylesmith-shot-"));
	const settings = new Map();
	const effects = new Set(
		Object.entries(chosen)
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
		asAbsolutePath: relativePath => join(ROOT, relativePath),
		locationFile: join(temp, ".workbench-location.json"),
		// Where product.json is, whose checksum of the workbench Stylesmith keeps up to date.
		appRoot: workbench.htmlPath.slice(0, workbench.htmlPath.lastIndexOf(`${sep}out${sep}`))
	};

	const project = join(temp, "neon-server");
	for (const [file, content] of Object.entries(files)) {
		mkdirSync(dirname(join(project, file)), { recursive: true });
		writeFileSync(join(project, file), content);
	}
	const userData = join(temp, "user-data");
	mkdirSync(join(userData, "User"), { recursive: true });

	let app;
	const close = async () => {
		await app?.close().catch(() => {});
		await disable(services);
		rmSync(temp, { recursive: true, force: true, maxRetries: 5 });
	};
	try {
		await enable(services);
		writeFileSync(
			join(userData, "User", "settings.json"),
			JSON.stringify({
				"workbench.colorTheme": preset.theme,
				"workbench.iconTheme": preset.iconTheme,
				// The chosen effects, as Apply Preset writes them, so the menu shows them.
				...Object.fromEntries(
					Object.entries(chosen).map(([key, on]) => [`stylesmith.${key}`, on])
				),
				"stylesmith.fonts.family": preset.font,
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
				"security.workspace.trust.enabled": false,
				...extra
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
				join(project, open)
			]
		});
		const page = await app.firstWindow();
		await page.waitForSelector(".monaco-editor .view-line", { timeout: 60_000 });
		if (size) {
			const window = await app.browserWindow(page);
			await window.evaluate((win, s) => win.setContentSize(s.width, s.height), size);
		}
		return { app, page, userData, project, close };
	} catch (error) {
		await close();
		throw error;
	}
}

/**
 * Waits for TypeScript's diagnostics (the Problem Lens), for the boot sequence to end and for
 * the status bar to stop saying "Activating Extensions...", which would end up in the picture.
 */
export async function settle(page, label) {
	await page
		.waitForSelector(".monaco-editor .squiggly-error", { timeout: 30_000 })
		.catch(() => console.warn(`  ${label}: no diagnostics shown`));
	await page.waitForTimeout(3000);
	await page
		.locator(".statusbar", { hasText: "Activating" })
		.waitFor({ state: "hidden", timeout: 30_000 })
		.catch(() => console.warn(`  ${label}: extensions still activating`));
}

/**
 * Hides what would only clutter a picture: pop-up notifications (like the expected
 * "installation appears to be corrupt"; they stay in the notification center) and a scrollbar
 * still fading out after the cursor moved.
 */
export async function hideClutter(page) {
	await page.addStyleTag({
		content:
			".notifications-toasts, .monaco-editor .scrollbar.horizontal { display: none !important; }"
	});
}
