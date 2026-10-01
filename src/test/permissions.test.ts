import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";
import { PermissionDeniedError, permissionHelp, shellQuote } from "../permissions";

const LINUX_DIR = "/usr/share/code/resources/app/out/vs/code/electron-browser/workbench";
const MAC_DIR =
	"/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench";

describe("permission help", () => {
	it("gives Linux users a command that changes only VS Code's workbench folder", () => {
		const help = permissionHelp("linux", LINUX_DIR);
		assert.equal(help.command, `sudo chown -R "$(whoami)" '${LINUX_DIR}'`);
		assert.ok(help.summary.includes(LINUX_DIR));
		assert.ok(help.steps.some(step => step.includes("Stylesmith: Enable")));
	});

	it("explains that Snap, Flatpak and AppImage installs can't be changed", () => {
		for (const [folder, kind] of [
			[
				"/snap/code/180/usr/share/code/resources/app/out/vs/code/electron-browser/workbench",
				"Snap"
			],
			[
				"/var/lib/flatpak/app/com.visualstudio.code/current/active/files/extra/vscode",
				"Flatpak"
			],
			[
				`${process.env.HOME ?? "/home/me"}/.local/share/flatpak/app/com.visualstudio.code`,
				"Flatpak"
			],
			["/tmp/.mount_CodeXyz/resources/app/out", "AppImage"]
		] as const) {
			const help = permissionHelp("linux", folder);
			assert.equal(help.command, undefined, `${kind}: no command can fix it`);
			assert.ok(help.steps[0]?.includes(kind), kind);
		}
	});

	it("asks macOS users for the App Management permission first", () => {
		const help = permissionHelp("darwin", MAC_DIR);
		assert.match(help.steps[0] ?? "", /App Management/);
		assert.equal(help.command, `sudo chown -R "$(whoami)" '${MAC_DIR}'`);
	});

	it("tells macOS users to move VS Code out of Downloads when it runs translocated", () => {
		const help = permissionHelp(
			"darwin",
			"/private/var/folders/xy/T/AppTranslocation/1234/d/Visual Studio Code.app/Contents/Resources/app/out"
		);
		assert.equal(help.command, undefined);
		assert.ok(help.steps.some(step => step.includes("Applications folder")));
	});

	it("tells Windows users to run as administrator, with no command", () => {
		const help = permissionHelp(
			"win32",
			String.raw`C:\Program Files\Microsoft VS Code\resources\app\out\vs\code\electron-browser\workbench`
		);
		assert.equal(help.command, undefined);
		assert.match(help.steps[0] ?? "", /installed for all users/);
		assert.ok(help.steps.some(step => step.includes("Run as administrator")));
	});

	it("carries the folder in the error", () => {
		const cause = Object.assign(new Error("EACCES"), { code: "EACCES" });
		const error = new PermissionDeniedError(LINUX_DIR, { cause });
		assert.equal(error.folder, LINUX_DIR);
		assert.equal(error.cause, cause);
	});
});

describe("shellQuote", () => {
	const tricky = [
		"/opt/VS Code/workbench",
		"/opt/it's/workbench",
		"/opt/$(touch pwned)/workbench",
		"/opt/`touch pwned`/workbench",
		'/opt/"quoted"/work;bench && rm -rf ~',
		"/opt/new\nline"
	];

	it("wraps text in single quotes and escapes single quotes", () => {
		assert.equal(shellQuote("/a b"), "'/a b'");
		assert.equal(shellQuote("it's"), `'it'\\''s'`);
	});

	it(
		"passes any folder name to the shell as one plain argument",
		{ skip: process.platform === "win32" },
		() => {
			for (const folder of tricky) {
				const out = execFileSync("sh", ["-c", `printf '%s' ${shellQuote(folder)}`], {
					encoding: "utf-8"
				});
				assert.equal(out, folder);
			}
		}
	);
});
