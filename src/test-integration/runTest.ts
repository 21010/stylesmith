/**
 * Downloads VS Code (stable, or the version in VSCODE_VERSION) into .vscode-test/ and runs the
 * end-to-end tests in suite.ts inside it, on a clean installation, with Stylesmith loaded from
 * this folder.
 *
 * Run with: npm run test:integration
 */

import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
	const vscodeExecutablePath = await downloadAndUnzipVSCode(
		process.env.VSCODE_VERSION || "stable"
	);
	await run(vscodeExecutablePath, "suite");
}

/** Runs one test file in VS Code with a fresh, empty profile. */
async function run(vscodeExecutablePath: string, tests: string): Promise<void> {
	// Settings left by an interrupted run must not change what the test sees.
	const userData = await mkdtemp(path.join(os.tmpdir(), "stylesmith-e2e-"));
	try {
		await runTests({
			vscodeExecutablePath,
			extensionDevelopmentPath: path.join(__dirname, "..", ".."),
			extensionTestsPath: path.join(__dirname, tests),
			launchArgs: [
				// Under CI's virtual display the GPU process fails to start, and VS Code then
				// sometimes freezes at startup ("CodeWindow: detected unresponsive"). The tests
				// don't need the GPU.
				"--disable-gpu",
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

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
