// Opens a temporary VS Code profile with a Stylesmith preset for screenshots.

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
export const { PRESETS } = require(join(ROOT, "out", "presets.js"));

const SAMPLE = {
	"src/server.ts": `import { createServer } from "node:http";
import { loadTheme } from "./theme";

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
	"package.json": `{
	"name": "neon-server",
	"version": "1.0.0"
}
`,
	"README.md": "# Neon server\n"
};

function installPackage(executable, marketplace) {
	const { version } = require(join(ROOT, "package.json"));
	const vsix = join(ROOT, `stylesmith-${version}.vsix`);
	if (!existsSync(vsix)) throw new Error(`${vsix} is missing: run vsce package first`);
	const extensions = mkdtempSync(join(tmpdir(), "stylesmith-shot-extensions-"));
	const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(executable);
	const all = [
		...args,
		"--extensions-dir",
		extensions,
		...[vsix, ...marketplace].flatMap(id => ["--install-extension", id])
	];
	if (process.platform === "win32")
		execSync([cli, ...all].map(part => `"${part}"`).join(" "), { stdio: "ignore" });
	else execFileSync(cli, all, { stdio: "ignore" });
	return extensions;
}

export async function prepareVSCode(marketplace = []) {
	const executable = await downloadAndUnzipVSCode("stable");
	const extensions = installPackage(executable, marketplace);
	return {
		executable,
		extensions,
		dispose: () => rmSync(extensions, { recursive: true, force: true, maxRetries: 5 })
	};
}

export async function openVSCode({ executable, extensions }, preset, options = {}) {
	const {
		size,
		effects: override = {},
		settings: extra = {},
		files = SAMPLE,
		open = "src/server.ts"
	} = options;
	const chosen = { ...preset.effects, ...override };
	const temp = mkdtempSync(join(tmpdir(), "stylesmith-shot-"));
	const project = join(temp, "neon-server");
	for (const [file, content] of Object.entries(files)) {
		mkdirSync(dirname(join(project, file)), { recursive: true });
		writeFileSync(join(project, file), content);
	}
	const userData = join(temp, "user-data");
	const user = join(userData, "User");
	mkdirSync(user, { recursive: true });
	const settings = {
		"workbench.colorTheme": preset.theme,
		"workbench.iconTheme": preset.iconTheme,
		...Object.fromEntries(Object.entries(chosen).map(([key, on]) => [`stylesmith.${key}`, on])),
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
	};
	writeFileSync(join(user, "settings.json"), JSON.stringify(settings, null, "\t"));
	const extensionState = join(user, "globalStorage", "21010.stylesmith");
	mkdirSync(extensionState, { recursive: true });
	writeFileSync(join(extensionState, "state.json"), JSON.stringify({ enabled: true }));

	let app;
	const close = async () => {
		await app?.close().catch(() => {});
		rmSync(temp, { recursive: true, force: true, maxRetries: 5 });
	};
	try {
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

export async function hideClutter(page) {
	await page.keyboard.press("Escape").catch(() => {});
}
