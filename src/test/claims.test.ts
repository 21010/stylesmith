import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { VISION } from "../color";
import { LEVELS, MAX_BODY_CONTRAST, MIN_COLOR_DIFFERENCE } from "../readability";
import { ROOT } from "./files";

/**
 * The website states the readability checks with numbers (issue #37: "Quantitative claims
 * match checks that exist in the repository"). These tests read the numbers from the same
 * module the theme tests use, so changing a threshold without the website fails here.
 */

const text = (page: string) =>
	readFileSync(path.join(ROOT, "site", page), "utf-8")
		.replace(/<[^>]+>/g, " ")
		.replace(/&rsquo;/g, "’")
		.replace(/&Delta;/g, "Δ")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ");
const ratio = (n: number) => `${n}:1`;
const simulated = Object.keys(VISION).filter(kind => kind !== "normal vision");

describe("readability claims on the website", () => {
	const ergonomics = text("ergonomics.html");
	const home = text("index.html");

	it("states the contrast levels the theme tests require", () => {
		const { normal, high } = LEVELS;
		for (const claim of [
			`key interface text, such as the active tab, the side bar, inputs, suggestions and the selected list item, need at least ${ratio(normal.strong)}`,
			`Every syntax color needs at least ${ratio(normal.text)}`,
			`git gutter bars need at least ${ratio(normal.nonText)}`,
			`all text needs ${ratio(high.text)} and markers ${ratio(high.nonText)}`
		]) {
			assert.ok(ergonomics.includes(claim), claim);
		}
		const homeClaim = `at least ${ratio(normal.strong)} for editor text and ${ratio(normal.text)} for every syntax color`;
		assert.ok(home.includes(homeClaim), homeClaim);
	});

	it("states the glare cap the theme tests apply", () => {
		const capClaim = `cap the contrast of editor text at ${ratio(MAX_BODY_CONTRAST)}`;
		assert.ok(ergonomics.includes(capClaim), capClaim);
		const homeClaim = `at or below ${ratio(MAX_BODY_CONTRAST)}`;
		assert.ok(home.includes(homeClaim), homeClaim);
	});

	it("names exactly the kinds of color blindness the tests simulate, and their threshold", () => {
		const names = simulated.join(", ").replace(/, ([^,]+)$/, " and $1");
		assert.ok(ergonomics.includes(`simulate full ${names}`), names);
		assert.ok(home.includes(`simulated ${names}`), names);
		const differenceClaim = `color difference of at least ${MIN_COLOR_DIFFERENCE}`;
		assert.ok(ergonomics.includes(differenceClaim), differenceClaim);
	});

	it("makes no medical or universal promises", () => {
		for (const page of ["index.html", "ergonomics.html", "themes.html", "fonts.html"]) {
			const copy = text(page).toLowerCase();
			for (const phrase of [
				"prevents eye strain",
				"prevent eye strain.",
				"eliminates glare",
				"eliminates visual glare",
				"protect your eyes",
				"perfectly readable",
				"regardless of ambient lighting",
				"guarantees legibility"
			]) {
				assert.ok(!copy.includes(phrase), `${page}: "${phrase}"`);
			}
		}
	});
});
