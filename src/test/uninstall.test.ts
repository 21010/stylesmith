import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { computeChecksum } from "../checksum";
import { patch } from "../patch";
import { rememberWorkbench, uninstall } from "../uninstall";

const PRISTINE = `<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self';"/>
	</head>
	<body></body>
</html>
`;

let root: string;
let locationFile: string;

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "stylesmith-uninstall-"));
	locationFile = path.join(root, ".workbench-location.json");
});

afterEach(() => rm(root, { recursive: true, force: true }));

async function patchedWorkbench() {
	const dir = path.join(root, "app", "out", "vs", "code", "electron-browser", "workbench");
	await mkdir(path.join(dir, "stylesmith-fonts"), { recursive: true });
	await writeFile(path.join(dir, "stylesmith-fonts", "A.woff2"), "font");
	const htmlPath = path.join(dir, "workbench.html");
	await writeFile(htmlPath, patch(PRISTINE, [{ kind: "js", source: "run()" }]));
	return { dir, htmlPath };
}

describe("uninstall cleanup", () => {
	it("restores VS Code even when Stylesmith wasn't disabled first", async () => {
		const workbench = await patchedWorkbench();
		await rememberWorkbench(workbench, locationFile);

		assert.equal(await uninstall(locationFile), true);
		assert.equal(await readFile(workbench.htmlPath, "utf-8"), PRISTINE);
		assert.deepEqual(await readdir(workbench.dir), ["workbench.html"]);
	});

	it("puts VS Code's checksum for the restored file back", async () => {
		const workbench = await patchedWorkbench();
		const key = "vs/code/electron-browser/workbench/workbench.html";
		const product = path.join(root, "app", "product.json");
		const patched = await readFile(workbench.htmlPath, "utf-8");
		await writeFile(
			product,
			JSON.stringify({ checksums: { [key]: computeChecksum(patched) } })
		);
		await rememberWorkbench(workbench, locationFile);

		await uninstall(locationFile);
		const { checksums } = JSON.parse(await readFile(product, "utf-8")) as {
			checksums: Record<string, string>;
		};
		assert.equal(checksums[key], computeChecksum(PRISTINE));
	});

	it("does nothing when Stylesmith never remembered a location", async () => {
		assert.equal(await uninstall(locationFile), false);
	});

	it("refuses a location that isn't a VS Code workbench file", async () => {
		const other = path.join(root, "notes.txt");
		await writeFile(other, "important");
		await writeFile(locationFile, JSON.stringify({ dir: root, htmlPath: other }));

		assert.equal(await uninstall(locationFile), false);
		assert.equal(await readFile(other, "utf-8"), "important");
	});

	it("refuses a broken location file", async () => {
		await writeFile(locationFile, "{ not json");
		assert.equal(await uninstall(locationFile), false);
	});
});
