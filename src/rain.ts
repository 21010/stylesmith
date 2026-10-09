/**
 * The frame logic of Stylesmith: Digital Rain (#83), with no VS Code API, so it can be tested.
 * Each column has one falling drop: a bright head, a body, and a faint tail that is erased
 * behind it. A frame only redraws the few cells that changed, at most CELLS_PER_COLUMN per
 * column, so the work per frame is bounded by the terminal's width, never its area. Nothing
 * fills or clears the screen while it runs, so it can't flash (WCAG 2.3.1).
 */

/** Digits, Latin letters and symbols: no katakana, the signature of the film this evokes. */
export const GLYPHS =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz=+-*/<>|:;$#%&@";

/** About 18 frames a second. */
export const FRAME_MS = 55;

export type Shade = "head" | "body" | "tail" | "blank";

export interface Cell {
	x: number;
	y: number;
	glyph: string;
	shade: Shade;
}

/** The most cells one column changes in a frame: head, body, tail and the erased cell. */
export const CELLS_PER_COLUMN = 4;

interface Drop {
	/** The head's row, with a fraction: it moves `speed` rows a frame. */
	position: number;
	/** The row the head was last drawn on. */
	drawn: number;
	speed: number;
	length: number;
}

/** A small seeded generator (mulberry32): the same seed gives the same rain. */
export function seeded(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class Rain {
	private drops: Drop[] = [];
	private readonly random: () => number;

	constructor(
		private columns: number,
		private rows: number,
		seed = Date.now()
	) {
		this.random = seeded(seed);
		this.resize(columns, rows);
	}

	/** Starts over at a new size; the caller clears the screen. */
	resize(columns: number, rows: number): void {
		this.columns = Math.max(0, Math.floor(columns));
		this.rows = Math.max(0, Math.floor(rows));
		// Drops start above the screen at different heights, so they don't fall in a line.
		this.drops = Array.from({ length: this.columns }, () =>
			this.newDrop(-this.random() * this.rows)
		);
	}

	/** Moves every drop on by one frame, and returns the cells to redraw. */
	step(): Cell[] {
		const cells: Cell[] = [];
		for (let x = 0; x < this.columns; x++) {
			const drop = this.drops[x]!;
			drop.position += drop.speed;
			const row = Math.floor(drop.position);
			// Speeds are at most one row a frame, so the head moves at most one row.
			if (row === drop.drawn) continue;
			drop.drawn = row;
			this.put(cells, x, row, "head");
			this.put(cells, x, row - 1, "body");
			this.put(cells, x, row - drop.length + 1, "tail");
			this.put(cells, x, row - drop.length, "blank");
			// Once the tail has left the screen, a new drop starts above it after a pause.
			if (row - drop.length >= this.rows)
				this.drops[x] = this.newDrop(-this.random() * this.rows);
		}
		return cells;
	}

	private put(cells: Cell[], x: number, y: number, shade: Shade): void {
		if (y < 0 || y >= this.rows) return;
		const glyph = shade === "blank" ? " " : GLYPHS[Math.floor(this.random() * GLYPHS.length)]!;
		cells.push({ x, y, glyph, shade });
	}

	private newDrop(position: number): Drop {
		return {
			position,
			drawn: Math.floor(position),
			speed: 0.35 + this.random() * 0.65,
			length: 6 + Math.floor(this.random() * Math.max(1, this.rows * 0.6))
		};
	}
}

/**
 * ANSI colors from the terminal's own palette, so the rain follows the active theme: the head
 * in bright green, the body in green, the tail in faint green.
 */
const SGR: Record<Exclude<Shade, "blank">, string> = {
	head: "\x1b[0;1;92m",
	body: "\x1b[0;32m",
	tail: "\x1b[0;2;32m"
};

/** The escape sequences that draw these cells (rows and columns are 1-based in ANSI). */
export function render(cells: readonly Cell[]): string {
	let out = "";
	for (const { x, y, glyph, shade } of cells) {
		out += `\x1b[${y + 1};${x + 1}H${shade === "blank" ? "\x1b[0m" : SGR[shade]}${glyph}`;
	}
	return out;
}

/**
 * One still frame, for reduced motion: the rain as it looks after a while, drawn at once. Later
 * cells overwrite earlier ones, so it shows the end state of `frames` steps.
 */
export function stillFrame(columns: number, rows: number, seed: number, frames = rows * 2): Cell[] {
	const rain = new Rain(columns, rows, seed);
	const last = new Map<number, Cell>();
	for (let frame = 0; frame < frames; frame++) {
		for (const cell of rain.step()) last.set(cell.y * columns + cell.x, cell);
	}
	return [...last.values()].filter(cell => cell.shade !== "blank");
}

/** Whether VS Code asks for reduced motion: workbench.reduceMotion "on". */
export function reducesMotion(setting: unknown): boolean {
	return setting === "on";
}
