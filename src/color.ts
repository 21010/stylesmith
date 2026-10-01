/**
 * Color math shared by the tests and the theme and icon generators: WCAG contrast, CSS color
 * mixing, and color differences as seen with color blindness. Colors are "#rrggbb" strings
 * (an alpha part, "#rrggbbaa", is ignored).
 */

/** Red, green and blue. */
type Rgb = readonly [number, number, number];

/** A 3×3 matrix applied to an Rgb color, one row per output channel. */
export type Matrix = readonly [Rgb, Rgb, Rgb];

function channels(hex: string): Rgb {
	const at = (i: number) => parseInt(hex.slice(i, i + 2), 16);
	return [at(1), at(3), at(5)];
}

function toLinear(channel: number): number {
	const v = channel / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linear(hex: string): Rgb {
	const [r, g, b] = channels(hex);
	return [toLinear(r), toLinear(g), toLinear(b)];
}

/** WCAG 2 relative luminance. */
export function luminance(hex: string): number {
	const [r, g, b] = linear(hex);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, from 1 to 21. */
export function contrast(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)];
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** CSS color-mix(in srgb, color p%, background): `color` laid over `background` at `percent`. */
export function mix(color: string, background: string, percent: number): string {
	const [a, b] = [channels(color), channels(background)];
	const t = percent / 100;
	const blend = (i: 0 | 1 | 2) =>
		Math.round(a[i] * t + b[i] * (1 - t))
			.toString(16)
			.padStart(2, "0");
	return `#${blend(0)}${blend(1)}${blend(2)}`;
}

/**
 * Machado, Oliveira & Fernandes (2009): full-severity simulations of the three kinds of
 * dichromacy, applied in linear RGB.
 */
export const VISION = {
	"normal vision": [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	],
	protanopia: [
		[0.152286, 1.052583, -0.204868],
		[0.114503, 0.786281, 0.099216],
		[-0.003882, -0.048116, 1.051998]
	],
	deuteranopia: [
		[0.367322, 0.860646, -0.227968],
		[0.280085, 0.672501, 0.047413],
		[-0.01182, 0.04294, 0.968881]
	],
	tritanopia: [
		[1.255528, -0.076749, -0.178779],
		[-0.078411, 0.930809, 0.147602],
		[0.004733, 0.691367, 0.3039]
	]
} as const satisfies Record<string, Matrix>;

function simulate(hex: string, [row1, row2, row3]: Matrix): Rgb {
	const c = linear(hex);
	const apply = ([x, y, z]: Rgb) => Math.min(1, Math.max(0, x * c[0] + y * c[1] + z * c[2]));
	return [apply(row1), apply(row2), apply(row3)];
}

function lab([r, g, b]: Rgb): Rgb {
	const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
	const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
	const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
	const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
	return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/**
 * How different two colors look (CIE76 ΔE) with the given kind of vision. About 2 is barely
 * noticeable; 15 and more is clearly different at a glance.
 */
export function colorDifference(a: string, b: string, vision: Matrix): number {
	const [p, q] = [lab(simulate(a, vision)), lab(simulate(b, vision))];
	return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
