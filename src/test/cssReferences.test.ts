import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { networkReferences } from "../cssReferences";

describe("networkReferences", () => {
	it("finds @import and url() in their usual forms", () => {
		for (const [css, found] of [
			['@import "https://cdn.example/a.css";', "https://cdn.example/a.css"],
			["@import 'http://cdn.example/a.css' screen;", "http://cdn.example/a.css"],
			['@import url("https://cdn.example/a.css");', "https://cdn.example/a.css"],
			["@import url(https://cdn.example/a.css);", "https://cdn.example/a.css"],
			[".a { background: url( http://x.example/y.png ) }", "http://x.example/y.png"],
			[".a { background: url('//x.example/y.png') }", "//x.example/y.png"]
		] as const) {
			assert.deepEqual(networkReferences(css), [found], css);
		}
	});

	it("sees through comments between tokens", () => {
		assert.deepEqual(networkReferences("@import/**/url(https://h.example/x.css);"), [
			"https://h.example/x.css"
		]);
		assert.deepEqual(networkReferences('@import/* a */"https://h.example/x.css";'), [
			"https://h.example/x.css"
		]);
		assert.deepEqual(networkReferences(".a{background:url/**/(x)}"), [], "not a url()");
	});

	it("decodes escapes in names and URLs", () => {
		for (const css of [
			".a { background: u\\72l(https://h.example/y.png) }",
			".a { background: \\75 \\72 \\6c (https://h.example/y.png) }",
			".a { background: url(\\68 ttps://h.example/y.png) }",
			'.a { background: url("\\68ttps://h.example/y.png") }',
			"@\\69mport 'https://h.example/y.css';"
		]) {
			assert.equal(networkReferences(css).length, 1, css);
		}
	});

	it("ignores case, and the URL parser's leniency", () => {
		for (const css of [
			".a { background: URL(HTTPS://h.example/y.png) }",
			"@IMPORT 'Https://h.example/y.css';",
			'.a { background: url("ht\\9 tps://h.example/y.png") }', // a tab is dropped
			'.a { background: url(" https://h.example/y.png") }',
			'.a { background: url("\\\\\\\\h.example\\\\y.png") }' // \\h.example\y.png
		]) {
			assert.equal(networkReferences(css).length, 1, css);
		}
	});

	it("counts strings in any function, such as image-set() and src()", () => {
		for (const css of [
			'.a { background-image: image-set("https://h.example/a.png" 1x) }',
			'.a { background-image: -webkit-image-set("//h.example/a.png" 1x) }',
			'@font-face { font-family: x; src: src("https://h.example/a.woff2") }'
		]) {
			assert.equal(networkReferences(css).length, 1, css);
		}
	});

	it("allows local, relative and data: references, and plain strings", () => {
		const css = [
			'@import url("./base.css");',
			"@import 'theme/dark.css';",
			".a { background: url(data:image/png;base64,AA) }",
			'.b { background: url("file:///C:/img/a.png") }',
			'@font-face { font-family: x; src: local("X"), url(x.woff2) format("woff2") }',
			'.c::after { content: "see https://example.com" }',
			"/* @import 'https://commented.example/out.css'; */",
			'.d { background: url(/**/https://h.example/a.png) }' // a relative path, oddly named
		].join("\n");
		assert.deepEqual(networkReferences(css), []);
	});

	it("finds every reference, in order", () => {
		const css = "@import 'https://a.example/1.css'; .x { background: url(//b.example/2.png) }";
		assert.deepEqual(networkReferences(css), [
			"https://a.example/1.css",
			"//b.example/2.png"
		]);
	});

	it("doesn't stop at unfinished input", () => {
		assert.deepEqual(networkReferences('.a { background: url("https://h.example'), [
			"https://h.example"
		]);
		assert.deepEqual(networkReferences("/* never closed @import 'https://x'"), []);
		assert.deepEqual(networkReferences(".a { background: url(https://h.example/x"), [
			"https://h.example/x"
		]);
	});
});
