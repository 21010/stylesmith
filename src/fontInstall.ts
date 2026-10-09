/**
 * Installs a Nerd Font for the current user, after they confirm (issue #56): no administrator
 * rights, nothing outside the user's own font folder.
 *
 * Every file comes from the fonts-3.5.1-r2 release of this repository and must match the size and
 * SHA-256 pinned in fonts.ts; anything else is refused before a byte is written. What Stylesmith
 * installed is recorded, so it can be removed again.
 *
 * This and legacyCleanup.ts are the only files that touch anything outside VS Code's settings;
 * securityCopy.test.ts checks that no other source downloads or runs programs.
 *
 * Where VS Code sees a newly installed font (checked on all three systems by the prototype in
 * #56): on macOS right away; on Windows and Linux after quitting and reopening VS Code.
 */

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import * as https from "node:https";
import * as path from "node:path";
import { FONT_RELEASE, FONTS, NERD_FONTS_LICENSE, type NerdFont, type PinnedFile } from "./fonts";

/** What the installer needs from the operating system; tests pass in their own. */
export interface System {
	platform: NodeJS.Platform;
	home: string;
	/** %LOCALAPPDATA% on Windows. */
	localAppData?: string;
	/** %SystemRoot% on Windows. */
	windowsDir?: string;
	/** Downloads `url`, refusing more than `maxBytes`; `signal` cancels it. */
	download(url: string, maxBytes: number, signal?: AbortSignal): Promise<Buffer>;
	/** Runs a program (reg.exe, fc-cache) without a shell. */
	run(command: string, args: readonly string[]): Promise<void>;
}

/** A font Stylesmith installed, as recorded in its state: what to remove again. */
export interface InstalledFont {
	files: string[];
	/** Windows only: the values added under REGISTRY_KEY. */
	registry: string[];
}

export const REGISTRY_KEY = "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts";

/** Where fonts for the current user go. */
export function userFontDir(system: System): string {
	switch (system.platform) {
		case "win32":
			if (!system.localAppData) throw new Error("LOCALAPPDATA isn't set");
			return path.join(system.localAppData, "Microsoft", "Windows", "Fonts");
		case "darwin":
			return path.join(system.home, "Library", "Fonts");
		case "linux":
			return path.join(system.home, ".local", "share", "fonts", "stylesmith");
		default:
			throw new Error(`installing fonts isn't supported on ${system.platform}`);
	}
}

/** Folders where a font may be installed already, by the user or the system. */
function fontDirs(system: System): string[] {
	switch (system.platform) {
		case "win32":
			return [
				...(system.localAppData
					? [path.join(system.localAppData, "Microsoft", "Windows", "Fonts")]
					: []),
				path.join(system.windowsDir ?? "C:\\Windows", "Fonts")
			];
		case "darwin":
			return [path.join(system.home, "Library", "Fonts"), "/Library/Fonts"];
		default:
			return [
				path.join(system.home, ".local", "share", "fonts"),
				path.join(system.home, ".fonts"),
				"/usr/local/share/fonts",
				"/usr/share/fonts"
			];
	}
}

/**
 * Which of `fonts` look installed: their Regular file is in one of the font folders. VS Code has
 * no API to ask which fonts the system has; this finds the Nerd Fonts files whoever installed
 * them, by their file names. The folders are read once for all the fonts (Linux keeps fonts in
 * nested folders, which can hold thousands of files).
 */
export async function installedFontIds(
	fonts: readonly NerdFont[],
	system: System
): Promise<Set<string>> {
	const present = new Set<string>();
	for (const dir of fontDirs(system)) {
		if (!existsSync(dir)) continue;
		const names =
			system.platform === "linux"
				? await readdir(dir, { recursive: true }).catch(() => [])
				: await readdir(dir).catch(() => []);
		for (const name of names) present.add(path.basename(name));
	}
	return new Set(
		fonts.filter(font => font.files[0] && present.has(font.files[0].name)).map(font => font.id)
	);
}

/** Whether one font looks installed (see installedFontIds). */
export async function isInstalled(font: NerdFont, system: System): Promise<boolean> {
	return (await installedFontIds([font], system)).has(font.id);
}

/** Downloads a pinned file and checks it; throws unless it matches exactly. */
async function fetchPinned(
	file: PinnedFile,
	system: System,
	signal?: AbortSignal
): Promise<Buffer> {
	const data = await system.download(FONT_RELEASE + file.name, file.size, signal);
	const hash = createHash("sha256").update(data).digest("hex");
	if (data.length !== file.size || hash !== file.sha256) {
		throw new Error(`${file.name} doesn't match its pinned SHA-256; nothing was installed`);
	}
	return data;
}

/** Writes via a temporary file and a rename, so a font file is never half written. */
async function writeAtomic(file: string, data: Buffer): Promise<void> {
	const temp = `${file}.${randomUUID()}.tmp`;
	try {
		await writeFile(temp, data, { flag: "wx" });
		await rename(temp, file);
	} catch (error) {
		await rm(temp, { force: true });
		throw error;
	}
}

/**
 * reg.exe by its full path. Run by bare name, Windows would search for it, possibly in the
 * current folder before System32, where a planted reg.exe or reg.com could run instead.
 */
export function regExe(system: System): string {
	return path.win32.join(system.windowsDir ?? "C:\\Windows", "System32", "reg.exe");
}

const style = (name: string) => (name.includes("-Bold.") ? "Bold" : "Regular");
const kind = (name: string) => (name.endsWith(".otf") ? "OpenType" : "TrueType");

/**
 * Downloads, checks and installs a font for the current user, and saves its licenses in
 * `licenseDir`. Every file is checked before any is written. Returns what to record.
 */
export async function installFont(
	font: NerdFont,
	system: System,
	licenseDir: string,
	signal?: AbortSignal
): Promise<InstalledFont> {
	const dir = userFontDir(system);
	const fonts = await Promise.all(font.files.map(file => fetchPinned(file, system, signal)));
	const licenses = await Promise.all(
		[font.license, NERD_FONTS_LICENSE].map(file => fetchPinned(file, system, signal))
	);

	// Cancelled while downloading: nothing has been written yet, so stop here.
	if (signal?.aborted)
		throw new Error("the font installation was cancelled; nothing was installed");
	await mkdir(dir, { recursive: true });
	await mkdir(licenseDir, { recursive: true });
	const installed: InstalledFont = { files: [], registry: [] };
	try {
		for (const [i, file] of font.files.entries()) {
			const target = path.join(dir, file.name);
			await writeAtomic(target, fonts[i]!);
			installed.files.push(target);
			if (system.platform === "win32") {
				// Per-user fonts (Windows 10 1809 and later) are registered under HKCU.
				const name = `${font.family} ${style(file.name)} (${kind(file.name)})`;
				await system.run(regExe(system), [
					"add",
					REGISTRY_KEY,
					"/v",
					name,
					"/t",
					"REG_SZ",
					"/d",
					target,
					"/f"
				]);
				installed.registry.push(name);
			}
		}
		for (const [i, file] of [font.license, NERD_FONTS_LICENSE].entries()) {
			await writeFile(path.join(licenseDir, file.name), licenses[i]!);
		}
	} catch (error) {
		// Undo a partial install, so nothing is left that isn't recorded.
		await removeFont(installed, system).catch(() => undefined);
		throw error;
	}
	if (system.platform === "linux") await refreshFontCache(system, dir);
	return installed;
}

/**
 * Removes a font Stylesmith installed. Returns the files it couldn't delete: on Windows a font
 * in use stays locked until the programs using it close.
 */
export async function removeFont(installed: InstalledFont, system: System): Promise<string[]> {
	const locked: string[] = [];
	// The record comes from a state file that could be damaged or edited: only ever touch a
	// pinned font file in the user's font folder, and a registry value Stylesmith would write.
	const dir = userFontDir(system);
	const pinned = new Set(FONTS.flatMap(font => font.files.map(file => file.name)));
	const families = FONTS.map(font => font.family);
	const files = installed.files.filter(
		file => path.dirname(file) === dir && pinned.has(path.basename(file))
	);
	const registry = installed.registry.filter(name =>
		families.some(
			family =>
				/^ (Regular|Bold) \((TrueType|OpenType)\)$/.test(name.slice(family.length)) &&
				name.startsWith(family)
		)
	);
	for (const name of registry) {
		await system
			.run(regExe(system), ["delete", REGISTRY_KEY, "/v", name, "/f"])
			.catch(() => undefined); // already gone
	}
	for (const file of files) {
		await rm(file, { force: true }).catch(() => locked.push(file));
	}
	if (system.platform === "linux") await refreshFontCache(system);
	return locked;
}

/** fc-cache is part of every desktop Linux; without it, fonts appear after the next login. */
async function refreshFontCache(system: System, dir?: string): Promise<void> {
	await system.run("fc-cache", dir ? ["-f", dir] : ["-f"]).catch((error: unknown) => {
		console.warn("stylesmith: fc-cache failed", error);
	});
}

/** Follows at most this many redirects (GitHub sends release downloads to its file host). */
const MAX_REDIRECTS = 5;
/** No data for this long ends a download. */
const TIMEOUT_MS = 60_000;
/** A download, redirects included, must finish within this, however slowly data trickles in. */
const DEADLINE_MS = 120_000;

/**
 * Downloads over HTTPS only, following redirects, and stops as soon as the response is larger
 * than `maxBytes`. Uses node:https, which VS Code routes through its proxy settings.
 */
export function download(
	url: string,
	maxBytes: number,
	signal?: AbortSignal,
	deadline = Date.now() + DEADLINE_MS,
	redirects = 0
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error("the download was cancelled"));
			return;
		}
		if (new URL(url).protocol !== "https:") {
			reject(new Error(`refusing to download over ${new URL(url).protocol}`));
			return;
		}
		const request = https.get(url, { timeout: TIMEOUT_MS, signal }, response => {
			const { statusCode = 0, headers } = response;
			if (statusCode >= 300 && statusCode < 400 && headers.location) {
				response.resume();
				if (redirects >= MAX_REDIRECTS) {
					clearTimeout(overall);
					reject(new Error("too many redirects"));
					return;
				}
				clearTimeout(overall);
				download(
					new URL(headers.location, url).toString(),
					maxBytes,
					signal,
					deadline,
					redirects + 1
				).then(resolve, reject);
				return;
			}
			if (statusCode !== 200) {
				response.resume();
				clearTimeout(overall);
				reject(new Error(`download failed: HTTP ${statusCode}`));
				return;
			}
			const chunks: Buffer[] = [];
			let size = 0;
			response.on("data", (chunk: Buffer) => {
				size += chunk.length;
				if (size > maxBytes) {
					request.destroy(new Error("the download is larger than expected"));
					return;
				}
				chunks.push(chunk);
			});
			response.on("end", () => {
				clearTimeout(overall);
				resolve(Buffer.concat(chunks));
			});
			response.on("error", reject);
		});
		const overall = setTimeout(
			() => request.destroy(new Error("the download took too long")),
			Math.max(0, deadline - Date.now())
		);
		request.on("timeout", () => request.destroy(new Error("the download timed out")));
		request.on("error", error => {
			clearTimeout(overall);
			reject(signal?.aborted ? new Error("the download was cancelled") : error);
		});
	});
}

/** The real operating system. */
export const nodeSystem = (): System => ({
	platform: process.platform,
	home: process.env.HOME ?? process.env.USERPROFILE ?? "",
	localAppData: process.env.LOCALAPPDATA,
	windowsDir: process.env.SystemRoot ?? process.env.WINDIR,
	download,
	run: (command, args) =>
		new Promise((resolve, reject) => {
			execFile(command, [...args], { windowsHide: true }, error =>
				error ? reject(error) : resolve()
			);
		})
});
