/** Finds VS Code's workbench file, so the end-to-end test can check Stylesmith never changes it. */

import { existsSync } from "node:fs";
import * as path from "node:path";

const WORKBENCH_DIRS = [
	// VS Code 1.102+
	["vs", "code", "electron-browser", "workbench"],
	["vs", "code", "electron-browser"],
	// Older releases
	["vs", "code", "electron-sandbox", "workbench"],
	["vs", "code", "electron-sandbox"]
];

const HTML_FILES = ["workbench-dev.html", "workbench.esm.html", "workbench.html"];

/** The workbench HTML file in VS Code's application folder (`vscode.env.appRoot`). */
export function locateWorkbench(appRoot: string): string | undefined {
	for (const segments of WORKBENCH_DIRS) {
		for (const file of HTML_FILES) {
			const htmlPath = path.join(appRoot, "out", ...segments, file);
			if (existsSync(htmlPath)) return htmlPath;
		}
	}
	return undefined;
}
