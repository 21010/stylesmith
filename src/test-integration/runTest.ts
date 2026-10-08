/**
 * Downloads VS Code (stable, or the version in VSCODE_VERSION) into .vscode-test/ and runs the
 * end-to-end tests inside it, with Stylesmith loaded from this folder:
 *
 * - suite.ts, on a clean installation.
 * - upgrade.ts, on an installation left as Stylesmith 1.x leaves it.
 *
 * Run with: npm run test:integration
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import { computeChecksum, locateWorkbench } from "../legacyCleanup";
import { patch } from "./v1/patch";

async function main(): Promise<void> {
	const vscodeExecutablePath = await downloadAndUnzipVSCode(
		process.env.VSCODE_VERSION || "stable"
	);
	await run(vscodeExecutablePath, "suite");
	await runUpgrade(vscodeExecutablePath);
}

/** Runs one test file in VS Code with a fresh, empty profile, after `prepare` sets it up. */
async function run(
	vscodeExecutablePath: string,
	tests: string,
	prepare: (userData: string) => Promise<void> = async () => {},
	env: Record<string, string> = {}
): Promise<void> {
	// Settings left by an interrupted run must not change what the test sees.
	const userData = await mkdtemp(path.join(os.tmpdir(), "stylesmith-e2e-"));
	try {
		await prepare(userData);
		await runTests({
			vscodeExecutablePath,
			extensionDevelopmentPath: path.join(__dirname, "..", ".."),
			extensionTestsPath: path.join(__dirname, tests),
			extensionTestsEnv: env,
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

/**
 * Leaves VS Code as Stylesmith 1.18 left it, runs upgrade.ts, and then puts the downloaded
 * VS Code back in any case: CI caches it, so a failed run must not leave it patched.
 */
async function runUpgrade(vscodeExecutablePath: string): Promise<void> {
	const appRoot =
		process.platform === "darwin"
			? path.join(path.dirname(vscodeExecutablePath), "..", "Resources", "app")
			: path.join(path.dirname(vscodeExecutablePath), "resources", "app");
	const workbench = locateWorkbench(appRoot);
	if (!workbench) throw new Error(`no workbench file in ${appRoot}`);
	const productFile = path.join(appRoot, "product.json");
	const htmlBefore = await readFile(workbench.htmlPath);
	const productBefore = await readFile(productFile);
	const fonts = path.join(workbench.dir, "stylesmith-fonts");
	const scratch = await mkdtemp(path.join(os.tmpdir(), "stylesmith-upgrade-"));
	try {
		const original = path.join(scratch, "workbench.html");
		await writeFile(original, htmlBefore);

		// The patch 1.18 wrote, made by its own code, with a stylesheet and scripts.
		const patched = patch(
			htmlBefore.toString("utf-8"),
			[
				{ kind: "css", source: ".monaco-workbench { outline: 1px solid red; }" },
				{ kind: "js", source: "void 0;" }
			],
			[{ kind: "js", source: "void 0;" }]
		);
		await writeFile(workbench.htmlPath, patched);

		// 1.18 silenced VS Code's "corrupt installation" warning by default.
		const product = JSON.parse(productBefore.toString("utf-8")) as {
			checksums?: Record<string, string>;
		};
		const key = Object.keys(product.checksums ?? {}).find(
			candidate => path.join(appRoot, "out", ...candidate.split("/")) === workbench.htmlPath
		);
		const checksum = key && product.checksums?.[key];
		if (key && product.checksums) {
			product.checksums[key] = computeChecksum(patched);
			await writeFile(productFile, JSON.stringify(product, null, "\t"));
		}

		await mkdir(fonts);
		await writeFile(path.join(fonts, "JetBrainsMonoNerdFontMono-Regular.woff2"), "");

		await run(
			vscodeExecutablePath,
			"upgrade",
			async userData => {
				const user = path.join(userData, "User");
				await mkdir(path.join(user, "globalStorage", "21010.stylesmith"), {
					recursive: true
				});
				await writeFile(
					path.join(user, "settings.json"),
					JSON.stringify({
						"stylesmith.effects.classicLayout": true,
						"stylesmith.effects.matrixRain": true,
						"stylesmith.silenceCorruptWarning": true,
						"stylesmith.imports": ["file:///tmp/custom.css"]
					})
				);
				// The state 1.18 kept, with fields 2.0 no longer uses.
				await writeFile(
					path.join(user, "globalStorage", "21010.stylesmith", "state.json"),
					JSON.stringify({ enabled: true, vsCodeCommit: "1.18", reapplyAskedAt: 0 })
				);
			},
			{
				STYLESMITH_UPGRADE_ORIGINAL: original,
				STYLESMITH_UPGRADE_CHECKSUM: checksum ?? ""
			}
		);
	} finally {
		await writeFile(workbench.htmlPath, htmlBefore);
		await writeFile(productFile, productBefore);
		await rm(fonts, { recursive: true, force: true });
		await rm(scratch, { recursive: true, force: true });
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
