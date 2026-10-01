/**
 * End-to-end test that runs inside a real, freshly downloaded VS Code (see runTest.ts).
 * It checks the whole flow on VS Code's actual workbench file: Enable, Reload, Disable and
 * the uninstall cleanup.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { PRESETS } from "../presets";
import { uninstall } from "../uninstall";
import { locateWorkbench } from "../workbench";

const MARKER = "<!-- !! STYLESMITH-START !! -->";

function sha256(text: string): string {
	return `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;
}

/**
 * The contents of the inline script tags Stylesmith wrote. Stylesmith always writes them as
 * exactly "<script>" and "</script>" (VS Code's own tags have attributes), so plain text search
 * finds them reliably.
 */
function stylesmithScripts(html: string): string[] {
	const scripts: string[] = [];
	for (
		let start = html.indexOf("<script>");
		start >= 0;
		start = html.indexOf("<script>", start)
	) {
		const end = html.indexOf("</script>", start);
		assert.ok(end > start, "every script tag is closed");
		scripts.push(html.slice(start + "<script>".length, end));
		start = end;
	}
	return scripts;
}

/** The policy VS Code enforces: the one outside Stylesmith's backup comment. */
function activePolicy(html: string): string {
	const active = html.replace(/<!-- !! STYLESMITH-CSP [\s\S]*? !! -->/g, "");
	const policies = [
		...active.matchAll(/http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/g)
	];
	assert.equal(policies.length, 1, "exactly one active Content-Security-Policy");
	return policies[0][1];
}

function userValue(section: string, key: string): unknown {
	return vscode.workspace.getConfiguration(section).inspect(key)?.globalValue;
}

/** Fails instead of hanging if a command never finishes (for example, a deadlock). */
async function withTimeout(work: Thenable<unknown>, what: string, ms = 60_000): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error(`${what} didn't finish within ${ms / 1000} s`)),
			ms
		);
	});
	try {
		await Promise.race([work, timeout]);
	} finally {
		clearTimeout(timer);
	}
}

async function step(name: string, check: () => Promise<void>): Promise<void> {
	await check();
	console.log(`  ✔ ${name}`);
}

export async function run(): Promise<void> {
	const extension = vscode.extensions.getExtension("21010.stylesmith");
	assert.ok(extension, "Stylesmith is installed");
	await extension.activate();

	const workbench = locateWorkbench([path.join(vscode.env.appRoot, "out")]);
	assert.ok(workbench, "VS Code's workbench file was found");
	const fonts = path.join(workbench.dir, "stylesmith-fonts");
	const original = await readFile(workbench.htmlPath, "utf-8");
	assert.ok(!original.includes(MARKER), "VS Code starts unpatched");
	console.log(`VS Code ${vscode.version}: ${workbench.htmlPath}`);

	let patched = "";
	await step("Enable patches the workbench and keeps the security policy", async () => {
		await vscode.commands.executeCommand("stylesmith.enable");
		patched = await readFile(workbench.htmlPath, "utf-8");
		assert.ok(patched.includes(MARKER));

		const scriptSrc = activePolicy(patched)
			.split(";")
			.map(directive => directive.trim())
			.find(directive => directive.startsWith("script-src "));
		assert.ok(scriptSrc, "script-src is kept");
		assert.doesNotMatch(scriptSrc, /unsafe-inline/);

		const scripts = stylesmithScripts(patched);
		assert.ok(scripts.length > 0, "built-in effects were added");
		for (const script of scripts) {
			assert.ok(
				scriptSrc.includes(sha256(script)),
				"every added script is allowed by its hash"
			);
		}
	});

	await step("Enable puts the Nerd Font next to the workbench and in the settings", async () => {
		assert.ok(existsSync(path.join(fonts, "JetBrainsMonoNerdFontMono-Regular.woff2")));
		assert.match(
			String(userValue("editor", "fontFamily")),
			/^'JetBrainsMono Nerd Font Mono', /
		);
		assert.equal(userValue("editor.guides", "bracketPairs"), "active");
	});

	await step("Reload produces exactly the same workbench", async () => {
		await vscode.commands.executeCommand("stylesmith.reload");
		assert.equal(await readFile(workbench.htmlPath, "utf-8"), patched);
	});

	await step("Disable restores VS Code byte for byte, and the user's settings", async () => {
		await vscode.commands.executeCommand("stylesmith.disable");
		assert.equal(await readFile(workbench.htmlPath, "utf-8"), original);
		assert.ok(!existsSync(fonts), "the font folder is removed");
		assert.equal(userValue("editor", "fontFamily"), undefined);
		assert.equal(userValue("editor.guides", "bracketPairs"), undefined);
	});

	await step("Two presets in a row both apply fully (no deadlock)", async () => {
		await withTimeout(
			vscode.commands.executeCommand("stylesmith.applyPreset", "phosphor-terminal"),
			"the first preset"
		);
		assert.equal(userValue("workbench", "colorTheme"), "Stylesmith Phosphor");
		await withTimeout(
			vscode.commands.executeCommand("stylesmith.applyPreset", "night-city"),
			"the second preset"
		);
		assert.equal(userValue("workbench", "colorTheme"), "Stylesmith Neon Night");
		assert.equal(userValue("workbench", "iconTheme"), "stylesmith-pixel");
		assert.equal(userValue("stylesmith", "effects.typingSparks"), true);
		// The preset's Reload really ran: the second preset's font is the one in place.
		assert.ok((await readFile(workbench.htmlPath, "utf-8")).includes(MARKER));
		assert.ok(existsSync(path.join(fonts, "JetBrainsMonoNerdFontMono-Regular.woff2")));
		assert.ok(!existsSync(path.join(fonts, "DepartureMonoNerdFontMono-Regular.woff2")));

		await vscode.commands.executeCommand("stylesmith.disable");
		const reset = async (section: string, key: string) =>
			vscode.workspace.getConfiguration(section).update(key, undefined, true);
		await reset("workbench", "colorTheme");
		await reset("workbench", "iconTheme");
		for (const key of Object.keys(PRESETS[0].effects)) await reset("stylesmith", key);
		await reset("stylesmith", "fonts.enabled");
		await reset("stylesmith", "fonts.family");
	});

	await step("The uninstall cleanup restores VS Code without Disable", async () => {
		await vscode.commands.executeCommand("stylesmith.enable");
		assert.ok((await readFile(workbench.htmlPath, "utf-8")).includes(MARKER));
		assert.equal(await uninstall(), true);
		assert.equal(await readFile(workbench.htmlPath, "utf-8"), original);
		assert.ok(!existsSync(fonts));
		// Put the settings back too, as Disable would.
		await vscode.commands.executeCommand("stylesmith.disable");
	});
}
