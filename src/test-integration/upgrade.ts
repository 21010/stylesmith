/**
 * End-to-end test of the upgrade from Stylesmith 1.x. runTest.ts starts VS Code with its
 * workbench patched by 1.18.2's own patch(), a matching product.json checksum, the font folder,
 * and 1.x settings and state; this checks that Stylesmith 2.0 undoes all of it on its own.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { locateWorkbench } from "../legacyCleanup";
import { step, until, userValue } from "./helpers";

export async function run(): Promise<void> {
	const original = readFileSync(process.env.STYLESMITH_UPGRADE_ORIGINAL ?? "");
	const checksum = process.env.STYLESMITH_UPGRADE_CHECKSUM;
	const workbench = locateWorkbench(vscode.env.appRoot);
	assert.ok(workbench, "test can find the workbench");

	// No command: the cleanup and the settings migration run when Stylesmith starts.
	await step("removes the 1.x workbench patch on startup, restoring the file exactly", () =>
		until(() => readFileSync(workbench.htmlPath).equals(original), "the patch is removed")
	);

	await step("puts back the product.json checksum that 1.x had changed", () => {
		if (!checksum) return; // this VS Code doesn't check the workbench
		const product = JSON.parse(
			readFileSync(path.join(vscode.env.appRoot, "product.json"), "utf-8")
		) as { checksums: Record<string, string> };
		assert.ok(Object.values(product.checksums).includes(checksum));
	});

	await step("removes the 1.x font folder", () => {
		assert.ok(!existsSync(path.join(workbench.dir, "stylesmith-fonts")));
	});

	await step("moves and removes 1.x settings, keeping the user's imports", async () => {
		await until(
			() => userValue("stylesmith", "effects.compactLayout") === true,
			"classicLayout moves to compactLayout"
		);
		assert.equal(userValue("stylesmith", "effects.classicLayout"), undefined);
		assert.equal(userValue("stylesmith", "effects.matrixRain"), undefined);
		assert.equal(userValue("stylesmith", "silenceCorruptWarning"), undefined);
		assert.deepEqual(userValue("stylesmith", "imports"), ["file:///tmp/custom.css"]);
	});

	await step("re-applies the moved setting, since 1.x was enabled", async () => {
		const hasDensity =
			vscode.workspace.getConfiguration("window").inspect("density.layout")?.defaultValue !==
			undefined;
		if (!hasDensity) return; // window.density.layout is newer than this VS Code
		await until(
			() => userValue("window", "density.layout") === "compact",
			"compact layout is applied"
		);
	});

	await vscode.commands.executeCommand("stylesmith.disable");
}
