// Builds the Nerd Fonts bundled with Stylesmith into assets/fonts/.
// Run with: npm run fonts
//
// Each archive is downloaded from a pinned Nerd Fonts release and checked against the
// SHA-256 published in that release's SHA-256.txt, so a changed or tampered download is
// refused. The fonts are then compressed to WOFF2, and each font's license is copied along.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compress } from "wawoff2";

const RELEASE = "v3.5.1";
const BASE_URL = `https://github.com/ryanoasis/nerd-fonts/releases/download/${RELEASE}`;

// The "Mono" variants keep every icon exactly one character wide, as editors and terminals need.
const FONTS = [
	{
		archive: "JetBrainsMono.tar.xz",
		sha256: "04d5e8f903693f9dd13e16f867e994834e681eb3c72c0d337a770dcda09010cf",
		license: "OFL.txt",
		files: {
			"JetBrainsMonoNerdFontMono-Regular.ttf": "JetBrainsMonoNerdFontMono-Regular.woff2",
			"JetBrainsMonoNerdFontMono-Bold.ttf": "JetBrainsMonoNerdFontMono-Bold.woff2"
		}
	},
	{
		archive: "IBMPlexMono.tar.xz",
		sha256: "3d226683be9fc35f98683837568497f300307bc9b7aefc1617a368f190ef963a",
		license: "LICENSE.txt",
		files: {
			"BlexMonoNerdFontMono-Regular.ttf": "BlexMonoNerdFontMono-Regular.woff2",
			"BlexMonoNerdFontMono-Bold.ttf": "BlexMonoNerdFontMono-Bold.woff2"
		}
	},
	{
		archive: "ShareTechMono.tar.xz",
		sha256: "002de1c65aa0b1d61e71ff91ec3afc45a88cfeed26433796f00c8d264be66ffa",
		license: "OFL.txt",
		files: {
			"ShureTechMonoNerdFontMono-Regular.ttf": "ShureTechMonoNerdFontMono-Regular.woff2"
		}
	},
	{
		archive: "DepartureMono.tar.xz",
		sha256: "7d2d86db20730e26ee4fc926e3c64429d6f9da6fce91e74c325fe1c5ee74d9ee",
		license: "LICENSE",
		files: {
			"DepartureMonoNerdFontMono-Regular.otf": "DepartureMonoNerdFontMono-Regular.woff2"
		}
	}
];

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");
const licenseDir = join(outDir, "licenses");
mkdirSync(licenseDir, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "stylesmith-fonts-"));

try {
	for (const font of FONTS) {
		const response = await fetch(`${BASE_URL}/${font.archive}`);
		if (!response.ok) throw new Error(`${font.archive}: HTTP ${response.status}`);
		const archive = Buffer.from(await response.arrayBuffer());

		const actual = createHash("sha256").update(archive).digest("hex");
		if (actual !== font.sha256) {
			throw new Error(`${font.archive}: SHA-256 is ${actual}, expected ${font.sha256}`);
		}

		// The verified archive goes straight to tar in memory; the download itself is never saved.
		const folder = join(work, font.archive.replace(".tar.xz", ""));
		mkdirSync(folder);
		execFileSync("tar", ["-xJf", "-", ...Object.keys(font.files), font.license], {
			cwd: folder,
			input: archive
		});

		for (const [source, target] of Object.entries(font.files)) {
			const woff2 = await compress(readFileSync(join(folder, source)));
			writeFileSync(join(outDir, target), woff2);
			console.log(`${target}: ${(woff2.length / 1024).toFixed(0)} KB`);
		}
		const licenseName = font.archive.replace(".tar.xz", ".txt");
		writeFileSync(join(licenseDir, licenseName), readFileSync(join(folder, font.license)));
	}
	// assets/fonts/licenses/NerdFonts.txt is Nerd Fonts' own LICENSE file from the release
	// above. It isn't in the checksummed archives, so it's kept in the repository instead of
	// being downloaded unverified. Update it by hand when changing RELEASE.
} finally {
	rmSync(work, { recursive: true, force: true });
}
