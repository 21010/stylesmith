import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { FONT_RELEASE, FONTS, NERD_FONTS_LICENSE, type NerdFont, type PinnedFile } from "../fonts";
import {
	installFont,
	isInstalled,
	REGISTRY_KEY,
	removeFont,
	userFontDir,
	type System
} from "../fontInstall";
import { ROOT } from "./files";

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const pin = (name: string, data: Buffer): PinnedFile => ({
	name,
	size: data.length,
	sha256: sha256(data)
});

/** A font like the real ones, pinned to small test files. */
const regular = Buffer.from("regular font bytes");
const bold = Buffer.from("bold font bytes");
const license = Buffer.from("SIL Open Font License 1.1");
const FONT: NerdFont = {
	...FONTS[0],
	files: [
		pin(FONTS[0].files[0]!.name, regular),
		...(FONTS[0].files[1] ? [pin(FONTS[0].files[1].name, bold)] : [])
	],
	license: pin(FONTS[0].license.name, license)
};

let root: string;
let served: Map<string, Buffer>;
let commands: string[][];

function system(platform: NodeJS.Platform): System {
	return {
		platform,
		home: path.join(root, "home"),
		localAppData: path.join(root, "appdata"),
		windowsDir: path.join(root, "windows"),
		download: (url, maxBytes) => {
			const data = served.get(url);
			if (!data) return Promise.reject(new Error(`404 ${url}`));
			if (data.length > maxBytes) return Promise.reject(new Error("too large"));
			return Promise.resolve(data);
		},
		run: (command, args) => {
			commands.push([command, ...args]);
			return Promise.resolve();
		}
	};
}

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "stylesmith-fonts-"));
	commands = [];
	served = new Map([
		[FONT_RELEASE + FONT.files[0]!.name, regular],
		[FONT_RELEASE + FONT.license.name, license],
		// The website serves the same Nerd Fonts license file the release does.
		[
			FONT_RELEASE + NERD_FONTS_LICENSE.name,
			await readFile(path.join(ROOT, "site", "fonts", "licenses", "NerdFonts.txt"))
		]
	]);
	if (FONT.files[1]) served.set(FONT_RELEASE + FONT.files[1].name, bold);
});

afterEach(() => rm(root, { recursive: true, force: true }));

describe("installing a font", () => {
	for (const platform of ["win32", "darwin", "linux"] as const) {
		it(`installs for the current user on ${platform}, and records what to remove`, async () => {
			const sys = system(platform);
			const licenses = path.join(root, "licenses");
			const installed = await installFont(FONT, sys, licenses);

			const dir = userFontDir(sys);
			assert.deepEqual(
				installed.files,
				FONT.files.map(file => path.join(dir, file.name))
			);
			assert.deepEqual(await readFile(installed.files[0]!), regular);
			assert.deepEqual((await readdir(dir)).sort(), FONT.files.map(f => f.name).sort());
			assert.deepEqual(await readFile(path.join(licenses, FONT.license.name)), license);
			assert.ok(existsSync(path.join(licenses, NERD_FONTS_LICENSE.name)));

			if (platform === "win32") {
				assert.equal(installed.registry.length, FONT.files.length);
				assert.deepEqual(commands[0], [
					"reg",
					"add",
					REGISTRY_KEY,
					"/v",
					`${FONT.family} Regular (TrueType)`,
					"/t",
					"REG_SZ",
					"/d",
					installed.files[0],
					"/f"
				]);
			} else {
				assert.deepEqual(installed.registry, []);
			}
			if (platform === "linux") assert.deepEqual(commands.at(-1), ["fc-cache", "-f", dir]);
			if (platform === "darwin") assert.deepEqual(commands, []);

			assert.equal(await isInstalled(FONT, sys), true);
			assert.deepEqual(await removeFont(installed, sys), []);
			assert.deepEqual(await readdir(dir), []);
			assert.equal(await isInstalled(FONT, sys), false);
			if (platform === "win32") {
				assert.deepEqual(
					commands.filter(command => command[1] === "delete").map(command => command[4]),
					installed.registry
				);
			}
		});
	}

	it("refuses a file that doesn't match its pin, and writes nothing", async () => {
		served.set(FONT_RELEASE + FONT.files[0]!.name, Buffer.from("regular font bytez"));
		const sys = system("linux");
		await assert.rejects(
			installFont(FONT, sys, path.join(root, "licenses")),
			/doesn't match its pinned SHA-256/
		);
		assert.equal(existsSync(userFontDir(sys)), false);
		assert.deepEqual(commands, []);
	});

	it("refuses a download larger than the pinned size", async () => {
		served.set(FONT_RELEASE + FONT.files[0]!.name, Buffer.concat([regular, Buffer.from("!")]));
		await assert.rejects(installFont(FONT, system("darwin"), path.join(root, "licenses")));
	});

	it("finds a font someone else installed, by its file name", async () => {
		const sys = system("linux");
		const elsewhere = path.join(sys.home, ".local", "share", "fonts", "NerdFonts", "deep");
		await mkdir(elsewhere, { recursive: true });
		await writeFile(path.join(elsewhere, FONT.files[0]!.name), "x");
		assert.equal(await isInstalled(FONT, sys), true);
	});

	it("only removes pinned font files in the user's font folder, whatever the record says", async () => {
		const sys = system("darwin");
		const dir = userFontDir(sys);
		await mkdir(dir, { recursive: true });
		const font = path.join(dir, FONT.files[0]!.name);
		const unrelated = path.join(dir, "SomeoneElsesFont.ttf");
		const outside = path.join(sys.home, "notes.txt");
		for (const file of [font, unrelated, outside]) await writeFile(file, "x");

		await removeFont({ files: [font, unrelated, outside], registry: [] }, sys);
		assert.equal(existsSync(font), false);
		assert.equal(existsSync(unrelated), true, "not a pinned font file");
		assert.equal(existsSync(outside), true, "not in the font folder");
	});

	it("only deletes registry values Stylesmith would write", async () => {
		const sys = system("win32");
		await removeFont(
			{
				files: [],
				registry: [
					`${FONT.family} Regular (TrueType)`,
					"Segoe UI (TrueType)",
					`${FONT.family} Regular (TrueType) /f & calc`
				]
			},
			sys
		);
		assert.deepEqual(
			commands.map(command => command[4]),
			[`${FONT.family} Regular (TrueType)`]
		);
	});
});
