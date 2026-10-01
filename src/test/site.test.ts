import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { contrast } from "../color";
import { ROOT } from "./files";

const SITE = path.join(ROOT, "site");
const css = readFileSync(path.join(SITE, "style.css"), "utf-8");
const pages = readdirSync(SITE).filter(file => file.endsWith(".html"));

/** A color defined on :root in style.css, like --text. */
function color(name: string): string {
	const value = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, "i").exec(css)?.[1];
	assert.ok(value, `style.css defines --${name}`);
	return value;
}

describe("website", () => {
	// [text, background, minimum contrast]: AAA for body text, AA for the rest.
	const pairs: [string, string, number][] = [
		["text", "bg", 7],
		["text", "raised", 7],
		["muted", "bg", 4.5],
		["muted", "raised", 4.5],
		["cyan", "bg", 4.5],
		["cyan", "raised", 4.5],
		["pink", "bg", 4.5],
		["yellow", "bg-deep", 4.5],
		["on-accent", "cyan", 4.5],
		["on-accent", "pink", 4.5],
		["on-accent", "yellow", 4.5]
	];
	for (const [text, background, minimum] of pairs) {
		it(`has readable --${text} on --${background}`, () => {
			const ratio = contrast(color(text), color(background));
			assert.ok(ratio >= minimum, `${ratio.toFixed(2)}:1, needs ${minimum}:1`);
		});
	}

	for (const page of pages) {
		describe(page, () => {
			const html = readFileSync(path.join(SITE, page), "utf-8");

			it("has a strict security policy and no scripts", () => {
				assert.match(
					html,
					/http-equiv="Content-Security-Policy"[\s\S]*?default-src 'none'/
				);
				assert.doesNotMatch(html, /<script/i);
				assert.doesNotMatch(html, /\son[a-z]+=/i, "no inline event handlers");
			});

			it("declares its language", () => {
				assert.match(html, /<html lang="en">/);
			});

			it("links only to files that exist", () => {
				for (const [, url] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
					if (!url || /^[a-z]+:/i.test(url)) continue; // https:, mailto: and so on
					const file =
						url === "./" || url === "/" ? "index.html" : url.replace(/^\//, "");
					assert.ok(existsSync(path.join(SITE, file)), `${url} exists`);
				}
			});

			it("gives every image a description and a fixed size", () => {
				for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
					assert.match(img, /\salt="/, img);
					assert.match(img, /\swidth="\d+"/, img);
					assert.match(img, /\sheight="\d+"/, img);
				}
			});
		});
	}
});
