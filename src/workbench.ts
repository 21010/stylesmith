import { existsSync } from "node:fs";
import { readdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { getLegacySessionId, unpatch } from "./patch";

export interface Workbench {
	dir: string;
	htmlPath: string;
}

const WORKBENCH_DIRS = [
	// VS Code 1.102+
	["vs", "code", "electron-browser", "workbench"],
	["vs", "code", "electron-browser"],
	// Older releases
	["vs", "code", "electron-sandbox", "workbench"],
	["vs", "code", "electron-sandbox"]
];

const HTML_FILES = [
	"workbench-dev.html", // VS Code dev build
	"workbench.esm.html", // VS Code ESM build
	"workbench.html", // VS Code
	"workbench-apc-extension.html" // Cursor
];

const LEGACY_BACKUP_SUFFIX = ".bak-custom-css";

/** Finds the workbench HTML under the first application directory that has one. */
export function locateWorkbench(appDirs: readonly string[]): Workbench | undefined {
	for (const appDir of appDirs) {
		for (const segments of WORKBENCH_DIRS) {
			const dir = path.join(appDir, ...segments);
			for (const file of HTML_FILES) {
				const htmlPath = path.join(dir, file);
				if (existsSync(htmlPath)) return { dir, htmlPath };
			}
		}
	}
	return undefined;
}

/** Returns the workbench HTML as it was before this extension touched it. */
export async function readPristine(workbench: Workbench, html: string): Promise<string> {
	const sessionId = getLegacySessionId(html);
	if (sessionId) {
		// Custom CSS and JS Loader <= 7.5.1 deleted the CSP, so prefer the backup it kept.
		const backup = path.join(workbench.dir, `workbench.${sessionId}${LEGACY_BACKUP_SUFFIX}`);
		try {
			return unpatch(await readFile(backup, "utf-8"));
		} catch (error) {
			if (errorCode(error) !== "ENOENT") throw error;
		}
	}
	return unpatch(html);
}

/** Deletes backup files made by Custom CSS and JS Loader <= 7.5.1. Best effort: failures are only logged. */
export async function removeLegacyBackups(workbench: Workbench): Promise<void> {
	try {
		const backups = (await readdir(workbench.dir)).filter(f =>
			f.endsWith(LEGACY_BACKUP_SUFFIX)
		);
		await Promise.all(backups.map(f => unlink(path.join(workbench.dir, f))));
	} catch (error) {
		console.warn("stylesmith: could not remove legacy backups", error);
	}
}

/**
 * Replaces `file` via a temporary file and a rename, so an interrupted write can never
 * leave VS Code with a truncated workbench.
 */
export async function writeFileAtomic(file: string, data: string): Promise<void> {
	const { mode } = await stat(file);
	const temp = `${file}.${process.pid}.tmp`;
	try {
		await writeFile(temp, data, { encoding: "utf-8", mode: mode & 0o777 });
		await rename(temp, file);
	} catch (error) {
		await rm(temp, { force: true }).catch(() => undefined);
		if (!isPermissionError(error)) throw error;
		// The directory may be read-only while the file itself is writable.
		await writeFile(file, data, "utf-8");
	}
}

export function isPermissionError(error: unknown): boolean {
	const code = errorCode(error);
	return code === "EACCES" || code === "EPERM";
}

function errorCode(error: unknown): string | undefined {
	return (error as NodeJS.ErrnoException | undefined)?.code;
}
