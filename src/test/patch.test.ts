import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { getLegacySessionId, patch, unpatch, wrapImport } from "../patch";

const WORKBENCH = `<!-- Copyright (C) Microsoft Corporation. All rights reserved. -->
<!DOCTYPE html>
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
		<link rel="stylesheet" href="../../../workbench/workbench.desktop.main.css">
	</head>
	<body aria-label="">
	</body>
	<script src="./workbench.js" type="module"></script>
</html>
`;

describe("patch", () => {
	it("injects content into head and body", () => {
		const html = patch(WORKBENCH, "<style>a{}</style>\n", "<script>b()</script>\n");
		assert.ok(html.indexOf("<style>a{}</style>") < html.indexOf("</head>"));
		assert.ok(html.indexOf("<script>b()</script>") < html.indexOf("</body>"));
	});

	it("keeps the CSP and allows exactly the added scripts by hash", () => {
		const html = patch(WORKBENCH, "<script>a()</script>\n", "<script>b()</script>\n");
		const policy = activePolicy(html);
		const hash = (s: string) => `'sha256-${createHash("sha256").update(s).digest("base64")}'`;

		assert.match(policy, /default-src 'none'/);
		assert.match(policy, /require-trusted-types-for 'script'/);
		assert.equal(
			directive(policy, "script-src"),
			`script-src 'self' 'unsafe-eval' ${hash("a()")} ${hash("b()")}`
		);
		assert.doesNotMatch(policy, /unsafe-inline/);
	});

	it("allows web fonts and remote stylesheets but nothing else new", () => {
		const policy = activePolicy(patch(WORKBENCH, "<style>a{}</style>\n"));
		// Missing directives inherit default-src 'none', which is dropped once sources are added.
		assert.equal(directive(policy, "style-src"), "style-src https:");
		assert.equal(directive(policy, "font-src"), "font-src https: data:");
		assert.equal(directive(policy, "script-src"), "script-src 'self' 'unsafe-eval'");
	});

	it("allows the stylesmith Trusted Types policy name", () => {
		const withList = WORKBENCH.replace(
			"require-trusted-types-for 'script';",
			"$& trusted-types amdLoader;"
		);
		const policy = activePolicy(patch(withList, ""));
		assert.equal(directive(policy, "trusted-types"), "trusted-types amdLoader stylesmith");
	});

	it("refuses to patch a CSP it cannot read", () => {
		const unreadable = WORKBENCH.replace(/content="/, "content='").replace(`"/>`, `'/>`);
		assert.throws(() => patch(unreadable, "x"), /Content-Security-Policy/);
	});

	it("is exactly reversible", () => {
		const html = patch(WORKBENCH, "<style>a{}</style>\n", "<script>b()</script>\n");
		assert.equal(unpatch(html), WORKBENCH);
	});

	it("is exactly reversible with CRLF line endings", () => {
		const crlf = WORKBENCH.replace(/\n/g, "\r\n");
		assert.equal(unpatch(patch(crlf, "x", "y")), crlf);
	});

	it("keeps replacement patterns like $1 and $& literally", () => {
		const content = `<script>s.replace(/(a)/, "$1 $& $' $\`")</script>`;
		assert.ok(patch(WORKBENCH, content).includes(content));
	});

	it("omits the body block when there is no body content", () => {
		assert.doesNotMatch(patch(WORKBENCH, "x"), /INDICATOR-START/);
	});

	it("throws instead of writing unrecognisable HTML", () => {
		assert.throws(() => patch("<html></html>", "x"), /unexpected structure/);
	});

	it("refuses content that would break unpatching", () => {
		assert.throws(() => patch(WORKBENCH, "<!-- !! STYLESMITH-END !! -->"), /reversible/);
	});
});

describe("unpatch", () => {
	it("leaves unpatched HTML unchanged", () => {
		assert.equal(unpatch(WORKBENCH), WORKBENCH);
	});

	it("also understands the VSCODE-CUSTOM-CSS marker prefix", () => {
		const legacy = patch(WORKBENCH, "x", "y").replace(/STYLESMITH/g, "VSCODE-CUSTOM-CSS");
		assert.equal(unpatch(legacy), WORKBENCH);
	});

	it("removes patches written by Custom CSS and JS Loader 7.5.1", () => {
		const withoutCsp = WORKBENCH.replace(/<meta\s+http-equiv[\s\S]*?\/>/, "");
		const legacy = withoutCsp
			.replace(
				"</head>",
				"<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID 0f8fad5b-d9cb-469f-a165-70867728950e !! -->\n" +
					"<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n<style>a{}</style>" +
					"<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n</head>"
			)
			.replace(
				"</body>",
				"<script>/* eslint-env browser */\n(function () { __CUSTOM_CSS_JS_INDICATOR_CLS })();</script>\n</body>"
			);
		assert.equal(getLegacySessionId(legacy), "0f8fad5b-d9cb-469f-a165-70867728950e");
		assert.equal(unpatch(legacy), withoutCsp);
	});
});

describe("wrapImport", () => {
	it("wraps CSS and JS in inline tags", () => {
		assert.equal(wrapImport("css", "a{}"), "<style>a{}</style>\n");
		assert.equal(wrapImport("js", "b()"), "<script>b()</script>\n");
	});

	it("escapes closing tags inside the content", () => {
		assert.equal(wrapImport("js", 'x = "</SCRIPT>"'), '<script>x = "<\\/SCRIPT>"</script>\n');
		assert.equal(wrapImport("css", "/* </style> */"), "<style>/* <\\/style> */</style>\n");
	});

	it("strips a byte order mark", () => {
		const bom = String.fromCharCode(0xfeff);
		assert.equal(wrapImport("css", bom + "a{}"), "<style>a{}</style>\n");
	});
});

/** The policy VS Code will enforce: the one outside Stylesmith's backup comment. */
function activePolicy(html: string): string {
	const active = html.replace(/<!-- !! STYLESMITH-CSP [\s\S]*? !! -->/g, "");
	const metas = [
		...active.matchAll(/http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/g)
	];
	assert.equal(metas.length, 1, "exactly one active policy");
	return metas[0][1];
}

function directive(policy: string, name: string): string | undefined {
	return policy
		.split(";")
		.map(d => d.trim())
		.find(d => d.startsWith(name + " "));
}
