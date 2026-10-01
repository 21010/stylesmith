/**
 * Downloads VS Code (stable, or the version in VSCODE_VERSION) into .vscode-test/ and runs
 * the end-to-end test in suite.ts inside it, with Stylesmith loaded from this folder.
 *
 * Run with: npm run test:integration
 */

import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
	await runTests({
		version: process.env.VSCODE_VERSION || "stable",
		extensionDevelopmentPath: path.join(__dirname, "..", ".."),
		extensionTestsPath: path.join(__dirname, "suite"),
		launchArgs: ["--disable-extensions", "--skip-welcome", "--skip-release-notes"]
	});
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
