/**
 * Downloads VS Code (stable, or the version in VSCODE_VERSION) into .vscode-test/ and runs
 * the end-to-end test in suite.ts inside it, with Stylesmith loaded from this folder.
 *
 * Run with: npm run test:integration
 */

import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
	// A fresh, empty profile every run: settings left by an interrupted run must not change
	// what the test sees.
	const userData = await mkdtemp(path.join(os.tmpdir(), "stylesmith-e2e-"));
	try {
		await runTests({
			version: process.env.VSCODE_VERSION || "stable",
			extensionDevelopmentPath: path.join(__dirname, "..", ".."),
			extensionTestsPath: path.join(__dirname, "suite"),
			launchArgs: [
				"--disable-extensions",
				"--skip-welcome",
				"--skip-release-notes",
				`--user-data-dir=${userData}`
			]
		});
	} finally {
		await rm(userData, { recursive: true, force: true, maxRetries: 5 });
	}
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
