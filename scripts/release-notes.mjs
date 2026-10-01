// Prints the CHANGELOG.md section of one version, for the GitHub Release.
// Run with: node scripts/release-notes.mjs 1.14.2

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
	console.error("usage: node scripts/release-notes.mjs <version>");
	process.exit(2);
}

const changelog = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "..", "CHANGELOG.md"),
	"utf-8"
);
const start = changelog.indexOf(`\n## ${version} `);
if (start < 0) {
	console.error(`CHANGELOG.md has no section for ${version}`);
	process.exit(1);
}
const next = changelog.indexOf("\n## ", start + 1);
const section = changelog.slice(start, next < 0 ? undefined : next);
// Without the "## 1.14.2 (date)" heading: the release has its own title.
console.log(section.trim().split("\n").slice(1).join("\n").trim());
