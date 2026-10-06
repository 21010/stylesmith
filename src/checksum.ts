/**
 * VS Code's own integrity check: product.json lists a checksum for the workbench HTML file,
 * and VS Code reports the installation as corrupt when the file doesn't match it.
 *
 * Stylesmith updates that checksum when it patches the workbench (if the user wants the
 * warning silenced) and puts the original back whenever it restores the file. The checksum is
 * always computed from the content Stylesmith itself wrote, never from whatever is on disk, so
 * a file changed by someone else is never made to look genuine.
 */

import * as crypto from "node:crypto";
import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { Workbench, writeFileAtomic } from "./workbench";

interface ProductJson {
	commit?: string;
	version?: string;
	checksums?: Record<string, string>;
}

/** A checksum in the format of product.json: SHA-256, base64, without padding. */
export function computeChecksum(content: string): string {
	return crypto.createHash("sha256").update(content).digest("base64").replace(/=+$/, "");
}

/**
 * Gets the commit hash (or version) from product.json to identify genuine VS Code updates.
 */
export async function getVsCodeCommit(appRoot: string): Promise<string | undefined> {
	try {
		const productJson = await readFile(path.join(appRoot, "product.json"), "utf-8");
		const data = JSON.parse(productJson) as ProductJson;
		return data.commit || data.version;
	} catch {
		return undefined;
	}
}

/** product.json and the key of the workbench's checksum in it, if it has one. */
interface Tracked {
	file: string;
	data: ProductJson & { checksums: Record<string, string> };
	key: string;
}

/**
 * Reads product.json and finds the workbench's checksum. Undefined when VS Code doesn't check
 * the workbench (no product.json, or no checksum for it); throws when product.json is damaged.
 */
async function readTracked(workbench: Workbench, appRoot: string): Promise<Tracked | undefined> {
	const file = path.join(appRoot, "product.json");
	let text: string;
	try {
		text = await readFile(file, "utf-8");
	} catch {
		return undefined;
	}
	const data = JSON.parse(text) as ProductJson;
	const checksums = data.checksums;
	if (typeof checksums !== "object" || checksums === null) return undefined;

	// Keys are paths relative to the out/ folder, with forward slashes, such as
	// "vs/code/electron-browser/workbench/workbench.html".
	const outDir = path.join(appRoot, "out");
	const key = Object.keys(checksums).find(
		key =>
			path.normalize(path.join(outDir, ...key.split("/"))) ===
			path.normalize(workbench.htmlPath)
	);
	return key === undefined ? undefined : { file, data: { ...data, checksums }, key };
}

/** What setChecksum did. */
export type ChecksumResult = "updated" | "unchanged" | "untracked";

/**
 * Makes product.json's checksum for the workbench match `content`, the HTML Stylesmith wrote.
 * Returns "untracked" when VS Code doesn't check the workbench; throws when product.json is
 * damaged or can't be written.
 */
export async function setChecksum(
	workbench: Workbench,
	appRoot: string,
	content: string
): Promise<ChecksumResult> {
	const tracked = await readTracked(workbench, appRoot);
	if (!tracked) return "untracked";
	const checksum = computeChecksum(content);
	if (tracked.data.checksums[tracked.key] === checksum) return "unchanged";
	tracked.data.checksums[tracked.key] = checksum;
	await writeFileAtomic(tracked.file, JSON.stringify(tracked.data, null, "\t"));
	return "updated";
}

/**
 * Whether `content` matches product.json's checksum for the workbench: true for VS Code's own
 * file (or one Stylesmith wrote), false for one changed by anything else, undefined when there
 * is nothing to compare with.
 */
export async function matchesChecksum(
	workbench: Workbench,
	appRoot: string,
	content: string
): Promise<boolean | undefined> {
	try {
		const tracked = await readTracked(workbench, appRoot);
		return tracked && tracked.data.checksums[tracked.key] === computeChecksum(content);
	} catch {
		return undefined;
	}
}
