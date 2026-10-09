/**
 * One-time cleanup after Stylesmith 1.x, which patched VS Code's workbench HTML file, copied
 * fonts next to it and could update product.json's checksum for it. VS Code updates extensions
 * automatically, so most users get this version without running Disable in the old one first.
 *
 * This is the only code that touches VS Code's installation, and only to undo Stylesmith's own
 * changes: it removes its marked blocks (leaving any other tool's alone), its font folder, and
 * puts back the checksum only if Stylesmith had set it for the patched file. It never asks for
 * elevated permissions; if the installation can't be written, the user is told how to repair it.
 */

import * as crypto from "node:crypto";
import { constants, existsSync } from "node:fs";
import { copyFile, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";

/** Where VS Code's workbench HTML file is. */
export interface Workbench {
	dir: string;
	htmlPath: string;
}

/** What the cleanup did. */
export type CleanupResult =
	| "clean" // nothing of Stylesmith 1.x was found
	| "removed" // the patch was removed; a window reload finishes it
	| "fontsRemoved" // only the font folder was left, and is gone now
	| "denied"; // the installation can't be written to

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

/** Found near the top of every workbench file Stylesmith 1.x patched. */
export const PATCH_MARKER = "<!-- !! STYLESMITH-START !! -->";

// Only Stylesmith's own markers: blocks from other tools, such as Custom CSS and JS Loader,
// are theirs to remove.
const HEAD_BLOCK_RE = /<!-- !! STYLESMITH-START !! -->[\s\S]*?<!-- !! STYLESMITH-END !! -->\n?/g;
const BODY_BLOCK_RE =
	/<!-- !! STYLESMITH-INDICATOR-START !! -->[\s\S]*?<!-- !! STYLESMITH-INDICATOR-END !! -->\n?/g;
// VS Code's original policy, kept in a comment, followed by the extended policy that replaced it.
const CSP_COMMENT_RE =
	/<!-- !! STYLESMITH-CSP ([\s\S]*?) !! -->(?:<meta http-equiv="Content-Security-Policy" data-stylesmith-csp [^>]*>)?/g;

const FONT_FOLDER = "stylesmith-fonts";
// Folders an interrupted font copy left behind.
const FONT_LEFTOVER_RE = new RegExp(
	`^${FONT_FOLDER}\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:tmp|old)$`
);

/**
 * Whether a cleanup result means there's nothing left of Stylesmith 1.x: then Stylesmith records
 * it and never looks at VS Code's installation again. A denied cleanup keeps being retried,
 * so it finishes once VS Code is repaired or its folder becomes writable.
 */
export function cleanupFinished(result: CleanupResult): boolean {
	return result !== "denied";
}

/** Finds the workbench HTML file in VS Code's application folder (`vscode.env.appRoot`). */
export function locateWorkbench(appRoot: string): Workbench | undefined {
	for (const segments of WORKBENCH_DIRS) {
		const dir = path.join(appRoot, "out", ...segments);
		for (const file of HTML_FILES) {
			const htmlPath = path.join(dir, file);
			if (existsSync(htmlPath)) return { dir, htmlPath };
		}
	}
	return undefined;
}

/** Removes everything Stylesmith 1.x added to the workbench HTML, restoring it byte for byte. */
export function unpatch(html: string): string {
	return html
		.replace(HEAD_BLOCK_RE, "")
		.replace(BODY_BLOCK_RE, "")
		.replace(CSP_COMMENT_RE, (_, meta: string) => meta);
}

/** Removes a patch, fonts and checksum change left by Stylesmith 1.x, if there are any. */
export async function removeLegacyPatch(appRoot: string): Promise<CleanupResult> {
	const workbench = locateWorkbench(appRoot);
	if (!workbench) return "clean";
	try {
		const current = await readFile(workbench.htmlPath, "utf-8");
		const pristine = current.includes(PATCH_MARKER) ? unpatch(current) : current;
		if (pristine !== current) {
			await writeFileAtomic(workbench.htmlPath, pristine);
			await restoreChecksum(workbench, appRoot, current, pristine);
		}
		const hadFonts = await removeFonts(workbench);
		if (pristine !== current) return "removed";
		return hadFonts ? "fontsRemoved" : "clean";
	} catch (error) {
		if (isPermissionError(error)) return "denied";
		throw error;
	}
}

/** A checksum in the format of product.json: SHA-256, base64, without padding. */
export function computeChecksum(content: string): string {
	return crypto.createHash("sha256").update(content).digest("base64").replace(/=+$/, "");
}

/**
 * Puts back product.json's checksum for the restored workbench, but only if Stylesmith had set
 * it to match its patched file. Otherwise it's left as it is, so a file changed by anything
 * else is never made to look genuine.
 */
async function restoreChecksum(
	workbench: Workbench,
	appRoot: string,
	patched: string,
	pristine: string
): Promise<void> {
	const file = path.join(appRoot, "product.json");
	let data: { checksums?: unknown };
	try {
		data = JSON.parse(await readFile(file, "utf-8")) as { checksums?: unknown };
	} catch {
		return; // no product.json, or one we can't read: nothing to restore
	}
	const checksums = data.checksums;
	if (typeof checksums !== "object" || checksums === null) return;
	// Keys are paths relative to out/, with forward slashes.
	const outDir = path.join(appRoot, "out");
	const key = Object.keys(checksums).find(
		candidate =>
			path.normalize(path.join(outDir, ...candidate.split("/"))) ===
			path.normalize(workbench.htmlPath)
	);
	const entries = checksums as Record<string, unknown>;
	if (key === undefined || entries[key] !== computeChecksum(patched)) return;
	entries[key] = computeChecksum(pristine);
	await writeFileAtomic(file, JSON.stringify(data, null, "\t"));
}

/** Removes the font folder and its leftovers. True if there was anything to remove. */
async function removeFonts(workbench: Workbench): Promise<boolean> {
	const names = (await readdir(workbench.dir)).filter(
		name => name === FONT_FOLDER || FONT_LEFTOVER_RE.test(name)
	);
	for (const name of names) {
		await rm(path.join(workbench.dir, name), { recursive: true, force: true });
	}
	return names.length > 0;
}

/**
 * Replaces `file` via a temporary file and a rename, so an interrupted write can never leave
 * VS Code with half a file. Copying first keeps the original's permissions, and COPYFILE_EXCL
 * never writes through something planted at the temporary name.
 */
async function writeFileAtomic(file: string, data: string): Promise<void> {
	const temp = `${file}.${crypto.randomUUID()}.tmp`;
	let createdTemp = false;
	try {
		await copyFile(file, temp, constants.COPYFILE_EXCL);
		createdTemp = true;
		await writeFile(temp, data, "utf-8");
		await rename(temp, file);
	} catch (error) {
		if (createdTemp) await rm(temp, { force: true }).catch(() => undefined);
		throw error;
	}
}

function isPermissionError(error: unknown): boolean {
	const code = (error as NodeJS.ErrnoException | undefined)?.code;
	return code === "EACCES" || code === "EPERM";
}
