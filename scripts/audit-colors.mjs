// Audits Stylesmith's color themes against the newest VS Code's theme colors (#108).
// Run with: npm run audit:colors [-- --vscode 1.141.0] [-- --report report.md] [-- --update-baseline]
//
// Downloads VS Code (stable by default) into .vscode-test/, reads every color it registers (in
// the workbench and in built-in extensions) and reports, for each theme:
// - colors the theme sets that VS Code doesn't know (misspelled, or removed from VS Code)
// - colors left to a stock default that is clearly off from every color of the theme
// It also lists the colors VS Code added or removed since the baseline in
// scripts/data/vscode-colors.json. It exits with 1 when a theme has an unknown or clearly off
// color, so the release workflow and the weekly check stop on them.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { downloadAndUnzipVSCode } from "@vscode/test-electron";
import {
	auditTheme,
	CLEARLY_OFF,
	clearlyOff,
	extensionColors,
	registry,
	workbenchColors
} from "../out/colorAudit.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = join(root, "scripts", "data", "vscode-colors.json");
const { values: args } = parseArgs({
	options: {
		vscode: { type: "string", default: "stable" },
		report: { type: "string" },
		"update-baseline": { type: "boolean", default: false }
	}
});

/** VS Code's app folder (resources/app), found from its downloaded executable. */
function appFolder(executable) {
	const workbench = join("out", "vs", "workbench", "workbench.desktop.main.js");
	const queue = [dirname(executable)];
	for (let depth = 0; depth < 6 && queue.length; depth++) {
		for (const dir of queue.splice(0)) {
			if (existsSync(join(dir, workbench))) return dir;
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				if (entry.isDirectory() && !entry.isSymbolicLink())
					queue.push(join(dir, entry.name));
			}
		}
	}
	throw new Error(`VS Code's workbench was not found near ${executable}`);
}

const app = appFolder(await downloadAndUnzipVSCode(args.vscode));
const version = JSON.parse(readFileSync(join(app, "package.json"), "utf-8")).version;
const extensions = join(app, "extensions");
const manifests = readdirSync(extensions)
	.map(name => join(extensions, name, "package.json"))
	.filter(file => existsSync(file))
	.map(file => JSON.parse(readFileSync(file, "utf-8")));
const colors = registry([
	...workbenchColors(
		readFileSync(join(app, "out", "vs", "workbench", "workbench.desktop.main.js"), "utf-8")
	),
	...extensionColors(manifests)
]);
// A sanity check on reading minified code: VS Code has registered over 900 colors since 2025.
if (colors.length < 500)
	throw new Error(`only ${colors.length} colors found in VS Code ${version}`);

const baseline = existsSync(baselineFile)
	? JSON.parse(readFileSync(baselineFile, "utf-8"))
	: { vscode: "none", colors: [] };
const ids = new Set(colors.map(c => c.id));
const added = colors.map(c => c.id).filter(id => !baseline.colors.includes(id));
const removed = baseline.colors.filter(id => !ids.has(id));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const rows = pkg.contributes.themes.map(entry => {
	const theme = JSON.parse(readFileSync(join(root, entry.path), "utf-8"));
	const audit = auditTheme(theme, colors);
	return { label: entry.label, audit, off: clearlyOff(audit) };
});

const lines = [
	`## Color audit: VS Code ${version}`,
	"",
	`VS Code registers **${colors.length}** theme colors (the baseline, VS Code ${baseline.vscode}, had ${baseline.colors.length}).`,
	"",
	`- **New since the baseline (${added.length}):** ${added.map(id => `\`${id}\``).join(", ") || "none"}`,
	`- **Removed since the baseline (${removed.length}):** ${removed.map(id => `\`${id}\``).join(", ") || "none"}`,
	"",
	`| Theme | sets | follow a set color | draw nothing | stock default | clearly off (ΔE > ${CLEARLY_OFF}) | unknown keys |`,
	"|---|---|---|---|---|---|---|",
	...rows.map(
		({ label, audit, off }) =>
			`| ${label} | ${audit.set} | ${audit.following} | ${audit.none} | ${audit.stock.length} | ${off.length} | ${audit.unknown.length} |`
	)
];
const problems = rows.filter(r => r.off.length || r.audit.unknown.length);
for (const { label, audit, off } of problems) {
	lines.push("", `### ${label}`);
	for (const id of audit.unknown) lines.push(`- unknown key \`${id}\``);
	for (const s of off) lines.push(`- \`${s.id}\`: stock ${s.value}, ΔE ${s.gap.toFixed(0)}`);
}
lines.push(
	"",
	problems.length
		? `**${problems.length} of ${rows.length} themes** need attention: set these colors from the palette in scripts/build-themes.mjs.`
		: `No theme has an unknown or clearly off color.`
);
const report = lines.join("\n") + "\n";
console.log(report);
if (args.report) writeFileSync(args.report, report);

if (args["update-baseline"]) {
	const sorted = [...ids].sort();
	writeFileSync(
		baselineFile,
		JSON.stringify({ vscode: version, colors: sorted }, null, "\t") + "\n"
	);
	console.log(`wrote ${baselineFile}`);
}
process.exitCode = problems.length ? 1 : 0;
