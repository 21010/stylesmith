// The small part of opentype.js the icon tests read (a dev dependency without types).
declare module "opentype.js" {
	type Command = { type: string; x?: number; y?: number };
	interface Glyph {
		index: number;
		path: { commands: Command[] };
		getBoundingBox(): { x1: number; y1: number; x2: number; y2: number };
	}
	interface Font {
		unitsPerEm: number;
		ascender: number;
		descender: number;
		charToGlyph(char: string): Glyph;
	}
	export function parse(buffer: ArrayBuffer): Font;
}
