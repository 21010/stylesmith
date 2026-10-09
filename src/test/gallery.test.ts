import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { galleryHtml, parseMessage, sampleColors, type GalleryCard } from "../gallery";
import { PRESETS } from "../presets";
import { ROOT, manifest } from "./files";

/** The preset gallery (#84): what its page may load, and what it may ask for. */

const ids = PRESETS.map(preset => preset.id);
const NONCE = "c3R5bGVzbWl0aC10ZXN0LW5vbmNl";
const colors = sampleColors(
	JSON.parse(
		readFileSync(path.join(ROOT, manifest().contributes.themes[0]!.path), "utf-8")
	) as Parameters<typeof sampleColors>[0]
);
const card = (over: Partial<GalleryCard> = {}): GalleryCard => ({
	id: "night-city",
	label: "Night City",
	story: "Neon on indigo.",
	themeLabel: "Stylesmith Neon Night",
	colors,
	settingsOn: ["Smooth cursor"],
	fontLabel: "JetBrainsMono Nerd Font",
	current: false,
	...over
});

describe("preset gallery messages", () => {
	it("accepts Apply for every known preset, and Disable", () => {
		for (const id of ids)
			assert.deepEqual(parseMessage({ type: "apply", id }, ids), { type: "apply", id });
		assert.deepEqual(parseMessage({ type: "disable" }, ids), { type: "disable" });
	});

	it("ignores anything else", () => {
		for (const message of [
			undefined,
			null,
			"apply",
			42,
			[],
			{},
			{ type: "apply" },
			{ type: "apply", id: "no-such-preset" },
			{ type: "apply", id: ["night-city"] },
			{ type: "apply", id: "__proto__" },
			{ type: "apply", id: "constructor" },
			{ type: "run", command: "workbench.action.terminal.new" },
			{ type: "Apply", id: "night-city" }
		]) {
			assert.equal(parseMessage(message, ids), undefined, JSON.stringify(message));
		}
	});

	it("passes on only the type and id", () => {
		assert.deepEqual(parseMessage({ type: "disable", extra: "x" }, ids), { type: "disable" });
		assert.deepEqual(parseMessage({ type: "apply", id: "vault", extra: "x" }, ids), {
			type: "apply",
			id: "vault"
		});
	});
});

describe("preset gallery page", () => {
	const html = galleryHtml(
		PRESETS.map((preset, i) => card({ id: preset.id, label: preset.label, current: i === 0 })),
		NONCE
	);

	it("allows no remote content, and only its own nonce'd style and script", () => {
		const policy = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(
			html
		)?.[1];
		assert.equal(
			policy,
			`default-src 'none'; style-src 'nonce-${NONCE}'; script-src 'nonce-${NONCE}';`
		);
		assert.doesNotMatch(html, /https?:\/\//, "no URLs");
		assert.doesNotMatch(html, /\s(src|href)=/, "loads nothing");
		for (const [tag] of html.matchAll(/<(script|style)\b[^>]*>/g)) {
			assert.ok(tag.includes(`nonce="${NONCE}"`), tag);
		}
		assert.equal([...html.matchAll(/<script\b/g)].length, 1);
		assert.doesNotMatch(html, /\sstyle=/, "no style attributes, which the policy blocks");
		assert.doesNotMatch(html, /\son[a-z]+=/i, "no inline event handlers");
	});

	it("has an Apply button for every preset, and Disable", () => {
		for (const preset of PRESETS) {
			assert.ok(
				html.includes(
					`<button type="button" data-preset="${preset.id}">Apply ${preset.label}</button>`
				),
				preset.id
			);
		}
		assert.match(html, /<button type="button" class="secondary" data-action="disable">/);
	});

	it("marks the preset in use", () => {
		assert.equal([...html.matchAll(/class="badge">In use</g)].length, 1);
	});

	it("escapes every text, and refuses anything but hex colors", () => {
		const page = galleryHtml([card({ label: "<b>x</b>", story: `"a" & 'b' <script>` })], NONCE);
		assert.ok(page.includes("&lt;b&gt;x&lt;/b&gt;"));
		assert.ok(page.includes("&quot;a&quot; &amp; &#39;b&#39; &lt;script&gt;"));
		assert.throws(() =>
			galleryHtml([card({ colors: { ...colors, bg: "red;} body{display:none" } })], NONCE)
		);
	});

	it("needs a random nonce", () => {
		assert.throws(() => galleryHtml([card()], "x"));
		assert.throws(() => galleryHtml([card()], `${NONCE}'; script-src *`));
	});
});
