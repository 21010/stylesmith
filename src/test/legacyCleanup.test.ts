import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { computeChecksum, removeLegacyPatch, unpatch } from "../legacyCleanup";

// VS Code's workbench HTML, as it ships (shortened).
const PRISTINE = `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta
			http-equiv="Content-Security-Policy"
			content="
				default-src 'none';
				script-src 'self' 'unsafe-eval';
				require-trusted-types-for 'script';
		"/>
	</head>
	<body aria-label="">
	</body>
	<script src="./workbench.js" type="module"></script>
</html>
`;

// PRISTINE as Stylesmith 1.18 patched it, made with its own patch().
const PATCHED = `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<!-- !! STYLESMITH-CSP <meta
			http-equiv="Content-Security-Policy"
			content="
				default-src 'none';
				script-src 'self' 'unsafe-eval';
				require-trusted-types-for 'script';
		"/> !! --><meta http-equiv="Content-Security-Policy" data-stylesmith-csp content="default-src 'none'; script-src 'self' 'unsafe-eval' 'sha256-qVpDBgj7bpq5hMAcGp3AOc79J3Y1Z4HvySTwKrWDoy4=' 'sha256-cf242PFc/kb7xD0Qzhsmd9vvRkc+cWFmbi+k+YvtdKc='; require-trusted-types-for 'script'; font-src data:">
	<!-- !! STYLESMITH-START !! -->
<style>.a{}</style>
<script>a()</script>
<!-- !! STYLESMITH-END !! -->
</head>
	<body aria-label="">
	<!-- !! STYLESMITH-INDICATOR-START !! -->
<script>b()</script>
<!-- !! STYLESMITH-INDICATOR-END !! -->
</body>
	<script src="./workbench.js" type="module"></script>
</html>
`;

const KEY = "vs/code/electron-browser/workbench/workbench.html";

let appRoot: string;
let dir: string;
let html: string;
let product: string;

beforeEach(async () => {
	appRoot = await mkdtemp(path.join(os.tmpdir(), "stylesmith-legacy-"));
	dir = path.join(appRoot, "out", ...KEY.split("/").slice(0, -1));
	html = path.join(dir, "workbench.html");
	product = path.join(appRoot, "product.json");
	await mkdir(dir, { recursive: true });
});

afterEach(async () => {
	await chmod(dir, 0o755).catch(() => undefined);
	await rm(appRoot, { recursive: true, force: true });
});

const writeProduct = (checksum: string) =>
	writeFile(product, JSON.stringify({ commit: "abc", checksums: { [KEY]: checksum } }));
const checksum = async () =>
	(JSON.parse(await readFile(product, "utf-8")) as { checksums: Record<string, string> })
		.checksums[KEY];

describe("removing Stylesmith 1.x's workbench patch", () => {
	it("restores the original workbench byte for byte", () => {
		assert.equal(unpatch(PATCHED), PRISTINE);
	});

	it("leaves an unpatched workbench and product.json untouched", async () => {
		await writeFile(html, PRISTINE);
		await writeProduct(computeChecksum(PRISTINE));
		const productBefore = await readFile(product, "utf-8");
		assert.equal(await removeLegacyPatch(appRoot), "clean");
		assert.equal(await readFile(html, "utf-8"), PRISTINE);
		assert.equal(await readFile(product, "utf-8"), productBefore);
	});

	it("removes the patch and puts back the checksum Stylesmith had silenced", async () => {
		await writeFile(html, PATCHED);
		await writeProduct(computeChecksum(PATCHED));
		assert.equal(await removeLegacyPatch(appRoot), "removed");
		assert.equal(await readFile(html, "utf-8"), PRISTINE);
		assert.equal(await checksum(), computeChecksum(PRISTINE));
		assert.deepEqual(await readdir(dir), ["workbench.html"], "no temporary files");
	});

	it("doesn't change a checksum Stylesmith didn't set", async () => {
		await writeFile(html, PATCHED);
		await writeProduct("someone-else");
		assert.equal(await removeLegacyPatch(appRoot), "removed");
		assert.equal(await checksum(), "someone-else");
	});

	it("leaves blocks added by other tools in place", async () => {
		const other =
			"<!-- !! VSCODE-CUSTOM-CSS-START !! --><style>.b{}</style><!-- !! VSCODE-CUSTOM-CSS-END !! -->\n";
		await writeFile(html, PATCHED.replace("</head>", `${other}</head>`));
		assert.equal(await removeLegacyPatch(appRoot), "removed");
		assert.equal(await readFile(html, "utf-8"), PRISTINE.replace("</head>", `${other}</head>`));
	});

	it("removes the font folder and leftovers of an interrupted font copy", async () => {
		await writeFile(html, PRISTINE);
		await mkdir(path.join(dir, "stylesmith-fonts"));
		await writeFile(path.join(dir, "stylesmith-fonts", "Font.woff2"), "");
		await mkdir(path.join(dir, "stylesmith-fonts.0b6d1e5c-2f3a-4b7e-9c1d-3e5f7a9b1c2d.tmp"));
		assert.equal(await removeLegacyPatch(appRoot), "fontsRemoved");
		assert.deepEqual(await readdir(dir), ["workbench.html"]);
	});

	it("does nothing when there's no workbench file", async () => {
		assert.equal(await removeLegacyPatch(appRoot), "clean");
	});

	it(
		"reports an installation it isn't allowed to write to, and leaves it as it was",
		{ skip: process.platform === "win32" || process.getuid?.() === 0 },
		async () => {
			await writeFile(html, PATCHED);
			await chmod(dir, 0o555);
			assert.equal(await removeLegacyPatch(appRoot), "denied");
			assert.equal(await readFile(html, "utf-8"), PATCHED);
		}
	);
});
