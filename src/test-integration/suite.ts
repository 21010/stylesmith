/** End-to-end tests of Stylesmith's documented VS Code API contributions. */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { EFFECTS } from "../effects";
import { locateWorkbench } from "../legacyCleanup";
import { PRESETS } from "../presets";
import { sleep, step, userValue, withTimeout } from "./helpers";

export async function run(): Promise<void> {
	const extension = vscode.extensions.getExtension("21010.stylesmith");
	assert.ok(extension, "Stylesmith is installed");
	await extension.activate();

	// The same lookup the 1.x cleanup uses, so this also checks it finds the file in this version.
	const workbench = locateWorkbench(vscode.env.appRoot)?.htmlPath;
	assert.ok(workbench, "test can find the workbench to verify it remains unchanged");
	const workbenchBefore = readFileSync(workbench);
	const product = path.join(vscode.env.appRoot, "product.json");
	const productBefore = existsSync(product) ? readFileSync(product) : undefined;

	await step("Enable applies supported settings through the VS Code API", async () => {
		await vscode.workspace.getConfiguration("stylesmith").update("fonts.enabled", true, true);
		await withTimeout(vscode.commands.executeCommand("stylesmith.enable"), "Enable");
		assert.match(String(userValue("editor", "fontFamily")), /^'JetBrainsMono Nerd Font Mono',/);
		assert.equal(userValue("editor", "cursorBlinking"), "smooth");
		assert.equal(userValue("editor", "cursorSmoothCaretAnimation"), "on");
		assert.equal(userValue("editor", "renderLineHighlight"), "all");
		assert.equal(userValue("editor.guides", "bracketPairs"), "active");
	});

	await step(
		"presets change themes and native settings without editing the installation",
		async () => {
			await withTimeout(
				vscode.commands.executeCommand("stylesmith.applyPreset", "phosphor-terminal"),
				"Apply preset"
			);
			assert.equal(userValue("workbench", "colorTheme"), "Stylesmith Phosphor");
			assert.equal(userValue("workbench", "iconTheme"), "stylesmith-pixel-phosphor");
			const hasDensity =
				vscode.workspace.getConfiguration("window").inspect("density.layout")
					?.defaultValue !== undefined;
			assert.equal(userValue("window", "density.layout"), hasDensity ? "compact" : undefined);
			await withTimeout(
				vscode.commands.executeCommand("stylesmith.applyPreset", "night-city"),
				"second preset"
			);
			assert.equal(userValue("workbench", "colorTheme"), "Stylesmith Neon Night");
			assert.equal(userValue("window", "density.layout"), undefined);
		}
	);

	await step("Disable restores managed user settings", async () => {
		await withTimeout(vscode.commands.executeCommand("stylesmith.disable"), "Disable");
		assert.equal(userValue("editor", "cursorBlinking"), undefined);
		assert.equal(userValue("editor", "cursorSmoothCaretAnimation"), undefined);
		assert.equal(userValue("editor", "renderLineHighlight"), undefined);
		assert.equal(userValue("editor.guides", "bracketPairs"), undefined);
		assert.equal(userValue("editor", "fontFamily"), undefined);
	});

	await step("Problem Lens follows diagnostics and its settings", async () => {
		const document = await vscode.workspace.openTextDocument({ content: "a\nb\nc\n" });
		const editor = await vscode.window.showTextDocument(document);
		const diagnostics = vscode.languages.createDiagnosticCollection("stylesmith-test");
		const at = (line: number) => new vscode.Range(line, 0, line, 1);
		diagnostics.set(document.uri, [
			new vscode.Diagnostic(at(0), "an error", vscode.DiagnosticSeverity.Error),
			new vscode.Diagnostic(at(1), "a warning", vscode.DiagnosticSeverity.Warning)
		]);
		editor.selection = new vscode.Selection(0, 0, 0, 0);
		await sleep(250);
		await vscode.workspace
			.getConfiguration("stylesmith")
			.update("problems.enabled", false, true);
		await sleep(150);
		await vscode.workspace
			.getConfiguration("stylesmith")
			.update("problems.enabled", undefined, true);
		diagnostics.dispose();
		await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
		assert.ok(extension.isActive);
	});

	// The website says VS Code's own gutter marks tell modified lines apart from added ones by a
	// striped pattern, not by color alone (issue #20). Check that default in every tested version.
	await step("VS Code marks modified lines with a pattern by default", () => {
		const pattern = vscode.workspace
			.getConfiguration("scm")
			.inspect<{ added?: boolean; modified?: boolean }>(
				"diffDecorationsGutterPattern"
			)?.defaultValue;
		assert.deepEqual(pattern, { added: false, modified: true });
	});

	await step("no command modifies workbench.html or product.json", () => {
		assert.deepEqual(readFileSync(workbench), workbenchBefore);
		if (productBefore) assert.deepEqual(readFileSync(product), productBefore);
		assert.equal(PRESETS.length > 0, true);
		assert.ok(EFFECTS.every(effect => effect.editorSettings?.length));
	});

	await vscode.commands.executeCommand("stylesmith.disable");
}
