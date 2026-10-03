import * as crypto from "node:crypto";
import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { Workbench, writeFileAtomic } from "./workbench";

interface ProductJson {
	commit?: string;
	version?: string;
	checksums?: Record<string, string>;
}

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

/**
 * Updates VS Code's product.json with the checksum of the given content.
 * Assumes product.json is in the appRoot.
 */
export async function fixChecksum(
	workbench: Workbench,
	appRoot: string,
	content: string
): Promise<void> {
	const productJsonPath = path.join(appRoot, "product.json");
	let productJson: string;
	try {
		productJson = await readFile(productJsonPath, "utf-8");
	} catch {
		// No product.json found, skip silently
		return;
	}

	let data: ProductJson;
	try {
		data = JSON.parse(productJson) as ProductJson;
	} catch {
		return;
	}

	if (!data.checksums || typeof data.checksums !== "object") return;

	// The key in checksums is the relative path from the out/ folder.
	// We need to figure out which key matches workbench.htmlPath.
	// workbench.htmlPath is something like .../resources/app/out/vs/code/electron-sandbox/workbench/workbench.html
	// so we find the key that when path.join(appRoot, "out", key) matches workbench.htmlPath.

	const outDir = path.join(appRoot, "out");
	let matchedKey: string | undefined;

	for (const key of Object.keys(data.checksums)) {
		if (key.endsWith("workbench.html")) {
			const absolutePath = path.join(outDir, ...key.split("/"));
			if (
				absolutePath === workbench.htmlPath ||
				absolutePath === workbench.htmlPath.replace(/\\/g, "/")
			) {
				matchedKey = key;
				break;
			}

			// Also just try path.normalize matching
			if (path.normalize(absolutePath) === path.normalize(workbench.htmlPath)) {
				matchedKey = key;
				break;
			}
		}
	}

	if (!matchedKey) return;

	const newChecksum = computeChecksum(content);
	if (data.checksums[matchedKey] === newChecksum) {
		return; // Already up to date
	}

	data.checksums[matchedKey] = newChecksum;

	// Keep it pretty
	const newProductJson = JSON.stringify(data, null, "\t");

	try {
		await writeFileAtomic(productJsonPath, newProductJson);
	} catch {
		// Ignore write errors (e.g., read-only file system)
	}
}
