/**
 * Runs when Stylesmith is uninstalled: VS Code's "vscode:uninstall" hook, which VS Code runs
 * with Node.js after the restart that follows uninstalling. It puts VS Code back to normal,
 * even if Stylesmith wasn't disabled first, so none of its changes keep running.
 *
 * The hook can't use VS Code's API, so the extension remembers where VS Code's workbench
 * file is, in a small file next to this one, whenever it starts, enables or disables.
 */

import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { setChecksum } from "./checksum";
import { appRootOf, cleanUp, isWorkbenchLocation, type Workbench } from "./workbench";

/** Lives in the extension's own folder, one level above the compiled code. */
export const LOCATION_FILE = path.join(__dirname, "..", ".workbench-location.json");

/** Remembers where VS Code's workbench file is, for the uninstall cleanup. */
export async function rememberWorkbench(
	workbench: Workbench,
	locationFile = LOCATION_FILE
): Promise<void> {
	await writeFile(
		locationFile,
		JSON.stringify({ dir: workbench.dir, htmlPath: workbench.htmlPath })
	);
}

/**
 * Undoes Stylesmith's changes at the remembered location, and puts VS Code's checksum for the
 * restored file back so VS Code doesn't report its installation as corrupt. Does nothing if
 * there's no remembered location.
 */
export async function uninstall(locationFile = LOCATION_FILE): Promise<boolean> {
	let location: unknown;
	try {
		location = JSON.parse(await readFile(locationFile, "utf-8"));
	} catch {
		return false; // Stylesmith never ran, or the file is gone.
	}
	if (!isWorkbenchLocation(location)) return false;
	const cleaned = await cleanUp(location);
	const appRoot = appRootOf(location);
	if (cleaned && appRoot) {
		await setChecksum(location, appRoot, await readFile(location.htmlPath, "utf-8"));
	}
	return cleaned;
}

if (require.main === module) {
	uninstall().catch((error: unknown) => {
		// An uninstall must never fail because of this; the next VS Code update cleans up too.
		console.error("stylesmith: cleanup after uninstall failed", error);
	});
}
