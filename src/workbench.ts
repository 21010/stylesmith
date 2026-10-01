import { constants, existsSync } from "node:fs";
import {
	copyFile,
	mkdir,
	open,
	readdir,
	readFile,
	rename,
	rm,
	unlink,
	writeFile
} from "node:fs/promises";
import * as path from "node:path";
import { FONT_FOLDER } from "./fonts";
import { getLegacySessionId, PATCH_MARKER, unpatch } from "./patch";

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
	const temp = `${file}.${process.pid}.tmp`;
	let createdTemp = false;
	try {
		// Copying keeps the original's permissions. COPYFILE_EXCL refuses to reuse an existing
		// path, so nothing planted at the temp name (such as a symlink) is written through.
		await copyFile(file, temp, constants.COPYFILE_EXCL);
		createdTemp = true;
		await writeFile(temp, data, "utf-8");
		await rename(temp, file);
	} catch (error) {
		// Only clean up a temp file we made; never delete someone else's file.
		if (createdTemp) await rm(temp, { force: true }).catch(() => undefined);
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

/**
 * Undoes everything Stylesmith changed in VS Code's installation: restores the original
 * workbench file and removes the font folder and old backups. Returns true if the workbench
 * file was patched.
 */
export async function cleanUp(workbench: Workbench): Promise<boolean> {
	const current = await readFile(workbench.htmlPath, "utf-8");
	const pristine = await readPristine(workbench, current);
	if (pristine !== current) await writeFileAtomic(workbench.htmlPath, pristine);
	await removeFonts(workbench);
	await removeLegacyBackups(workbench);
	return pristine !== current;
}

/**
 * Whether a remembered location really is a VS Code workbench file, so the uninstall
 * cleanup never touches anything else.
 */
export function isWorkbenchLocation(value: unknown): value is Workbench {
	if (typeof value !== "object" || value === null) return false;
	const { dir, htmlPath } = value as Record<string, unknown>;
	if (typeof dir !== "string" || typeof htmlPath !== "string") return false;
	if (path.dirname(htmlPath) !== dir || !HTML_FILES.includes(path.basename(htmlPath)))
		return false;
	return WORKBENCH_DIRS.some(segments => dir.endsWith(path.join(...segments)));
}

/**
 * Puts the given font files in the font folder next to the workbench HTML file, replacing any
 * that were there. The workbench loads them from there, which VS Code's security policy allows.
 */
export async function writeFonts(workbench: Workbench, files: readonly string[]): Promise<void> {
	if (await hasFonts(workbench, files)) return; // already there, nothing to copy
	await removeFonts(workbench);
	const folder = path.join(workbench.dir, FONT_FOLDER);
	await mkdir(folder);
	for (const file of files) {
		await copyFile(file, path.join(folder, path.basename(file)), constants.COPYFILE_EXCL);
	}
}

/** Whether the font folder holds exactly these files, with the same content. */
async function hasFonts(workbench: Workbench, files: readonly string[]): Promise<boolean> {
	const folder = path.join(workbench.dir, FONT_FOLDER);
	try {
		const present = (await readdir(folder)).sort();
		const wanted = files.map(file => path.basename(file)).sort();
		if (present.join("/") !== wanted.join("/")) return false;
		for (const file of files) {
			const [a, b] = await Promise.all([
				readFile(file),
				readFile(path.join(folder, path.basename(file)))
			]);
			if (!a.equals(b)) return false;
		}
		return true;
	} catch {
		return false;
	}
}

/** Removes the font folder next to the workbench HTML file, if there is one. */
export async function removeFonts(workbench: Workbench): Promise<void> {
	await rm(path.join(workbench.dir, FONT_FOLDER), { recursive: true, force: true });
}

/**
 * Whether the workbench is patched by Stylesmith. Only the start of the file is read: the
 * marker comes right after VS Code's own few kilobytes of head, before any embedded fonts.
 */
export async function isPatched(workbench: Workbench, bytes = 64 * 1024): Promise<boolean> {
	const handle = await open(workbench.htmlPath, "r");
	try {
		const buffer = Buffer.alloc(bytes);
		const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
		return buffer.toString("utf-8", 0, bytesRead).includes(PATCH_MARKER);
	} finally {
		await handle.close();
	}
}
