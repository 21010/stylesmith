import { readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { renderImports, type Variables } from "./imports";
import { messages } from "./messages";
import { patch, wrapImport } from "./patch";
import {
	isPermissionError,
	locateWorkbench,
	readPristine,
	removeLegacyBackups,
	writeFileAtomic,
	type Workbench
} from "./workbench";

const CONFIG_SECTION = "stylesmith";
// Settings of the original Custom CSS and JS Loader, used until Stylesmith is configured.
const LEGACY_CONFIG_SECTION = "vscode_custom_css";

// Built-in effects: each one is a script in assets/ that is turned on by a boolean setting.
const EFFECTS = [
	{ setting: "effects.caretAnimation", script: "assets/effects/caret-animation.js" }
] as const;
const STATUSBAR_SCRIPT = "assets/statusbar.js";

export function activate(context: vscode.ExtensionContext): void {
	// Every command rewrites the same file, so run them one at a time.
	let queue = Promise.resolve();
	const register = (command: string, task: () => Promise<void>) => {
		const disposable = vscode.commands.registerCommand(command, () => {
			queue = queue.then(() => reportErrors(task));
			return queue;
		});
		context.subscriptions.push(disposable);
	};

	// Enabling always starts from the pristine file, so it doubles as "reload".
	register("stylesmith.enable", () => enable(context));
	register("stylesmith.reload", () => enable(context));
	register("stylesmith.disable", disable);
}

export function deactivate(): void {}

async function enable(context: vscode.ExtensionContext): Promise<void> {
	const workbench = findWorkbench();
	if (!workbench) return;

	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const imports = getImports(config);
	const effects = EFFECTS.filter(effect => config.get<boolean>(effect.setting) === true);
	if (imports.length === 0 && effects.length === 0) {
		void vscode.window.showInformationMessage(messages.notConfigured);
		return;
	}

	const current = await readFile(workbench.htmlPath, "utf-8");
	const [pristine, effectContent, importContent, bodyContent] = await Promise.all([
		readPristine(workbench, current),
		readScripts(
			context,
			effects.map(effect => effect.script)
		),
		renderImports(imports, getVariables(), (entry, error) => {
			console.error(`stylesmith: cannot load ${entry}`, error);
			void vscode.window.showWarningMessage(messages.cannotLoad(entry, error.message));
		}),
		config.get<boolean>("statusbar", true) ? readScripts(context, [STATUSBAR_SCRIPT]) : ""
	]);

	// Effects come first so that the user's own files can override them.
	const patched = patch(pristine, effectContent + importContent, bodyContent);
	if (patched !== current) await writeFileAtomic(workbench.htmlPath, patched);
	await removeLegacyBackups(workbench);
	void promptRestart(messages.enabled);
}

async function disable(): Promise<void> {
	const workbench = findWorkbench();
	if (!workbench) return;

	const current = await readFile(workbench.htmlPath, "utf-8");
	const pristine = await readPristine(workbench, current);
	if (pristine !== current) await writeFileAtomic(workbench.htmlPath, pristine);
	await removeLegacyBackups(workbench);
	void (pristine === current
		? vscode.window.showInformationMessage(messages.alreadyDisabled)
		: promptRestart(messages.disabled));
}

function findWorkbench(): Workbench | undefined {
	const appDirs = [
		require.main && path.dirname(require.main.filename),
		(globalThis as { _VSCODE_FILE_ROOT?: string })._VSCODE_FILE_ROOT,
		path.join(vscode.env.appRoot, "out")
	].filter((dir): dir is string => Boolean(dir));

	const workbench = locateWorkbench(appDirs);
	if (!workbench) {
		void vscode.window.showErrorMessage(messages.unableToLocateVsCodeInstallationPath);
	}
	return workbench;
}

function getImports(config: vscode.WorkspaceConfiguration): readonly unknown[] {
	const own = config.get<unknown>("imports");
	if (Array.isArray(own) && own.length > 0) return own;
	const legacy = vscode.workspace.getConfiguration(LEGACY_CONFIG_SECTION).get<unknown>("imports");
	return Array.isArray(legacy) ? legacy : [];
}

function getVariables(): Variables {
	return {
		cwd: process.cwd(),
		userHome: os.homedir(),
		workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "",
		execPath: process.env.VSCODE_EXEC_PATH ?? process.execPath,
		pathSeparator: path.sep,
		env: process.env
	};
}

/** Reads scripts bundled with the extension and wraps each in a `<script>` tag. */
async function readScripts(
	context: vscode.ExtensionContext,
	scripts: readonly string[]
): Promise<string> {
	const sources = await Promise.all(
		scripts.map(script => readFile(context.asAbsolutePath(script), "utf-8"))
	);
	return sources.map(source => wrapImport("js", source)).join("");
}

async function promptRestart(message: string): Promise<void> {
	const choice = await vscode.window.showInformationMessage(message, messages.restartIde);
	if (choice === messages.restartIde) {
		await vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
}

async function reportErrors(task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch (error) {
		console.error("stylesmith:", error);
		void vscode.window.showErrorMessage(
			isPermissionError(error)
				? messages.admin
				: messages.somethingWrong + (error instanceof Error ? error.message : String(error))
		);
	}
}
