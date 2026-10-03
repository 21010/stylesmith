import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Config } from "../config";
import { findFont } from "../fonts";
import {
	ReloadOffer,
	checkAfterStartup,
	disable,
	enable,
	type Services,
	type Ui
} from "../lifecycle";
import { ManagedSettings, type SettingsAccess } from "../managed";
import { messages } from "../messages";
import { PATCH_MARKER } from "../patch";
import { PermissionDeniedError } from "../permissions";
import { StateFile } from "../store";
import { FONT_FOLDER, type Workbench } from "../workbench";
import { ROOT } from "./files";

const PRISTINE = `<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self';"/>
	</head>
	<body></body>
</html>
`;

/** A Ui that records what it shows, and answers questions from a list. */
class FakeUi implements Ui {
	readonly shown: string[] = [];
	readonly ran: string[] = [];
	answers: (string | undefined)[] = [];

	info(message: string): void {
		this.shown.push(`info: ${message}`);
	}
	warn(message: string): void {
		this.shown.push(`warn: ${message}`);
	}
	error(message: string): void {
		this.shown.push(`error: ${message}`);
	}
	ask(message: string): Promise<string | undefined> {
		this.shown.push(`ask: ${message}`);
		return Promise.resolve(this.answers.shift());
	}
	offerRestart(message: string): void {
		this.shown.push(`restart: ${message}`);
	}
	restartNow(): Promise<void> {
		this.shown.push("restarted");
		return Promise.resolve();
	}
	run(command: string, ...args: unknown[]): Promise<void> {
		this.ran.push(args.length > 0 ? `${command} ${JSON.stringify(args)}` : command);
		return Promise.resolve();
	}
}

let root: string;
let workbench: Workbench;
let ui: FakeUi;
let settings: Map<string, unknown>;
let options: { effects: Set<string>; font: string | undefined; imports: string[] };
let services: Services;

function fakeConfig(): Config {
	return {
		get: <T>(key: string, fallback: T) => (settings.get(`stylesmith.${key}`) as T) ?? fallback,
		set: (key, value) => {
			settings.set(`stylesmith.${key}`, value);
			return Promise.resolve();
		},
		imports: () => options.imports,
		isOn: effect => options.effects.has(effect.setting),
		font: () => (options.font ? findFont(options.font) : undefined),
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
			userHome: os.homedir(),
			workspaceFolder: undefined,
			execPath: process.execPath,
			pathSeparator: path.sep,
			env: {}
		}),
		setThemes: () => Promise.resolve()
	};
}

const access: SettingsAccess = {
	read: key => ({
		user: settings.get(key),
		default:
			key === "editor.fontFamily"
				? "Consolas, monospace"
				: key.endsWith("fontFamily")
					? ""
					: false,
		known: true
	}),
	write: (key, value) => {
		if (value === undefined) settings.delete(key);
		else settings.set(key, value);
		return Promise.resolve();
	}
};

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "stylesmith-lifecycle-"));
	workbench = { dir: root, htmlPath: path.join(root, "workbench.html") };
	await writeFile(workbench.htmlPath, PRISTINE);
	ui = new FakeUi();
	settings = new Map();
	options = { effects: new Set(["effects.neonCurrentLine"]), font: "JetBrainsMono", imports: [] };
	const store = new StateFile(path.join(root, "storage", "state.json"));
	services = {
		config: fakeConfig(),
		managed: new ManagedSettings(access, store),
		store,
		ui,
		findWorkbench: () => workbench,
		asAbsolutePath: relativePath => path.join(ROOT, relativePath),
		// In the test folder: the real location file is in the project, next to out/.
		locationFile: path.join(root, ".workbench-location.json"),
		appRoot: root
	};
});

afterEach(async () => {
	await chmod(root, 0o755).catch(() => undefined);
	await rm(root, { recursive: true, force: true });
});

const html = () => readFile(workbench.htmlPath, "utf-8");
/** Lets work that runs after a question is answered finish. */
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

describe("enable", () => {
	it("patches VS Code, copies the font, sets the font settings and offers a restart", async () => {
		assert.equal(await enable(services), true);
		assert.ok((await html()).includes(PATCH_MARKER));
		assert.ok((await readdir(path.join(root, FONT_FOLDER))).length > 0);
		assert.match(
			String(settings.get("editor.fontFamily")),
			/^'JetBrainsMono Nerd Font Mono', /
		);
		assert.equal((await services.store.read()).enabled, true);
		assert.deepEqual(ui.shown, [`restart: ${messages.enabled}`]);
	});

	it("remembers the workbench's location in the given file", async () => {
		await enable(services);
		// Remembering isn't awaited by Enable, so give it a moment.
		let text: string | undefined;
		for (let i = 0; i < 50 && text === undefined; i++) {
			text = await readFile(services.locationFile, "utf-8").catch(() => undefined);
			if (text === undefined) await settle();
		}
		assert.deepEqual(JSON.parse(text ?? "null"), workbench);
	});

	it("does nothing, and says so, when nothing is turned on", async () => {
		options = { effects: new Set(), font: undefined, imports: [] };
		assert.equal(await enable(services), false);
		assert.equal(await html(), PRISTINE);
		assert.deepEqual(ui.shown, [`ask: ${messages.notConfigured}`]);
	});

	it("offers a preset when nothing is turned on", async () => {
		options = { effects: new Set(), font: undefined, imports: [] };
		ui.answers = [messages.applyPreset];
		await enable(services);
		await settle();
		assert.deepEqual(ui.ran, ["stylesmith.applyPreset"]);
	});

	it("removes the font folder when the font is turned off", async () => {
		await enable(services);
		assert.ok((await readdir(root)).includes(FONT_FOLDER));
		options.font = undefined;
		await enable(services);
		assert.ok(!(await readdir(root)).includes(FONT_FOLDER));
		assert.equal(settings.has("editor.fontFamily"), false, "the font setting is put back");
	});

	it("reloads the window right away when the user already agreed to it", async () => {
		await enable(services, { restartNow: true });
		assert.deepEqual(ui.shown, ["restarted"]);
	});

	it("reports an import it can't load, and still applies the rest", async () => {
		const missing = pathToFileURL(path.join(root, "missing.css")).href;
		const own = path.join(root, "own.css");
		await writeFile(own, ".own{color:red}");
		options.imports = [missing, pathToFileURL(own).href];
		assert.equal(await enable(services), true);
		assert.ok((await html()).includes(".own{color:red}"));
		assert.equal(ui.shown.filter(line => line.startsWith("warn:")).length, 1);
	});

	it("says when it can't find VS Code, without changing anything", async () => {
		services = { ...services, findWorkbench: () => undefined };
		assert.equal(await enable(services), false);
		assert.deepEqual(ui.shown, [`error: ${messages.unableToLocateVsCodeInstallationPath}`]);
		assert.equal((await services.store.read()).enabled, undefined);
	});

	it(
		"turns a permission problem into one that names VS Code's folder",
		{
			skip: process.platform === "win32" || process.getuid?.() === 0
		},
		async () => {
			await chmod(workbench.htmlPath, 0o444);
			await chmod(root, 0o555);
			await assert.rejects(enable(services), (error: unknown) => {
				assert.ok(error instanceof PermissionDeniedError);
				assert.equal(error.folder, root);
				return true;
			});
			assert.equal(await html(), PRISTINE, "VS Code's file is unchanged");
		}
	);
});

describe("disable", () => {
	it("restores VS Code and the user's settings, then offers a restart", async () => {
		settings.set("editor.fontFamily", "Hack");
		await enable(services);
		ui.shown.length = 0;
		await disable(services);
		assert.equal(await html(), PRISTINE);
		assert.equal(settings.get("editor.fontFamily"), "Hack");
		assert.equal((await services.store.read()).enabled, false);
		assert.deepEqual(ui.shown, [`restart: ${messages.disabled}`]);
	});

	it("says when Stylesmith is already off", async () => {
		await disable(services);
		assert.deepEqual(ui.shown, [`info: ${messages.alreadyDisabled}`]);
	});
});

describe("after startup", () => {
	it("reports whether VS Code is patched, and asks nothing when all is well", async () => {
		assert.equal(await checkAfterStartup(services), false);
		await enable(services);
		ui.shown.length = 0;
		assert.equal(await checkAfterStartup(services), true);
		assert.deepEqual(ui.shown, []);
	});

	it("offers to re-apply after an update removed the changes, once per minute", async () => {
		await enable(services);
		await writeFile(workbench.htmlPath, PRISTINE); // what a VS Code update does
		ui.shown.length = 0;
		ui.answers = [messages.reapplyNow];
		assert.equal(await checkAfterStartup(services), false);
		await settle();
		assert.deepEqual(ui.shown, [`ask: ${messages.reapply}`]);
		assert.deepEqual(ui.ran, ['stylesmith.reload [{"restartNow":true}]'], "no second question");

		await checkAfterStartup(services); // another window, right after
		await settle();
		assert.equal(ui.shown.length, 1, "asked only once");
	});

	it("reports a problem that happens after the user answered", async () => {
		await enable(services);
		await writeFile(workbench.htmlPath, PRISTINE);
		ui.shown.length = 0;
		ui.answers = [messages.reapplyNow];
		ui.run = () => Promise.reject(new Error("boom"));
		await checkAfterStartup(services);
		await settle();
		assert.deepEqual(ui.shown, [
			`ask: ${messages.reapply}`,
			`error: ${messages.somethingWrong}boom`
		]);
	});

	it("stops asking after Don't Ask Again", async () => {
		await enable(services);
		await writeFile(workbench.htmlPath, PRISTINE);
		ui.answers = [messages.dontAskAgain];
		await checkAfterStartup(services);
		await settle();
		assert.equal(settings.get("stylesmith.remindAfterUpdate"), false);
		await services.store.update({ reapplyAskedAt: undefined });
		ui.shown.length = 0;
		await checkAfterStartup(services);
		assert.deepEqual(ui.shown, []);
	});
});

describe("reload offer", () => {
	it("offers to reload while Stylesmith is enabled, and reloads on request", async () => {
		const offer = new ReloadOffer(services);
		await offer.offer();
		assert.deepEqual(ui.shown, [], "not while Stylesmith is off");

		await services.store.update({ enabled: true });
		ui.answers = [messages.reloadNow];
		await offer.offer();
		assert.deepEqual(ui.shown, [`ask: ${messages.settingsChanged}`]);
		assert.deepEqual(ui.ran, ['stylesmith.reload [{"restartNow":true}]'], "no second question");
	});

	it("asks one question at a time", async () => {
		await services.store.update({ enabled: true });
		let answer: (choice: string | undefined) => void = () => undefined;
		ui.ask = message => {
			ui.shown.push(`ask: ${message}`);
			return new Promise(resolve => (answer = resolve));
		};
		const offer = new ReloadOffer(services);
		const first = offer.offer();
		await new Promise(resolve => setTimeout(resolve, 20));
		await offer.offer(); // a second change while the first question is open
		answer(undefined);
		await first;
		assert.equal(ui.shown.length, 1);
		assert.deepEqual(ui.ran, [], "nothing runs when the user closes the question");
	});
});
