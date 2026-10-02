import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readJson } from "./files";

/**
 * The optional Oh My Posh theme in extras/. It must use only the terminal's named colors, so
 * it follows whichever Stylesmith theme is active, and only names whose contrast the theme
 * tests check. Black, white and lightWhite are left out: they're the background-like colors
 * of dark or light themes, which the theme tests skip.
 */
const SAFE_COLORS = new Set([
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"darkGray",
	"lightRed",
	"lightGreen",
	"lightYellow",
	"lightBlue",
	"lightMagenta",
	"lightCyan"
]);

interface Styled {
	type?: string;
	foreground?: string;
	background?: string;
	foreground_templates?: string[];
	background_templates?: string[];
	template?: string;
}

interface PromptTheme extends Styled {
	version: number;
	blocks: { segments: Styled[] }[];
	transient_prompt?: Styled;
	secondary_prompt?: Styled;
}

const theme = readJson<PromptTheme>("extras", "oh-my-posh", "stylesmith.omp.json");
const styled: Styled[] = [
	...theme.blocks.flatMap(block => block.segments),
	...[theme.transient_prompt, theme.secondary_prompt].filter(s => s !== undefined)
];

/** Every color a segment can show: its own, the ones its templates pick, and <color> tags. */
function colors(item: Styled): string[] {
	const fromTemplates = (item.foreground_templates ?? []).map(template => {
		const color = /\}\}\s*([^{}\s]+)\s*\{\{/.exec(template)?.[1];
		assert.ok(color, `a color in ${template}`);
		return color;
	});
	const tags = [...(item.template ?? "").matchAll(/<([^/>,]+)>/g)].map(([, tag]) => tag ?? "");
	return [item.foreground, ...fromTemplates, ...tags].filter(c => c !== undefined);
}

describe("Oh My Posh prompt theme", () => {
	it("uses the config format of Oh My Posh 29", () => {
		assert.equal(theme.version, 4);
	});

	for (const item of styled) {
		const label = item.type ?? "prompt";
		it(`colors its ${label} only with checked terminal colors`, () => {
			for (const color of colors(item)) {
				assert.ok(SAFE_COLORS.has(color), `${label}: "${color}" is not a checked color`);
			}
		});

		it(`gives its ${label} no background, which the theme tests don't check`, () => {
			assert.equal(item.background, undefined);
			assert.equal(item.background_templates, undefined);
		});
	}
});
