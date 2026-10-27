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

/**
 * A color in OKLCH (Björn Ottosson's Oklab, in polar form): perceived lightness L (0–1),
 * chroma C (0 is grey) and hue h in degrees. Used to check that a terminal color keeps its hue
 * family, and that it isn't more saturated than its theme.
 */
export function oklch(hex: string): { l: number; c: number; h: number } {
	const [r, g, b] = linear(hex);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const h = (Math.atan2(B, A) * 180) / Math.PI;
	return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

/** The sRGB hex color for an OKLCH color, or undefined when it's outside the sRGB gamut. */
export function fromOklch(l: number, c: number, h: number): string | undefined {
	const a = c * Math.cos((h * Math.PI) / 180);
	const b = c * Math.sin((h * Math.PI) / 180);
	const lms = [
		(l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
		(l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
		(l - 0.0894841775 * a - 1.291485548 * b) ** 3
	] as const;
	const rgb = [
		4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
		-1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
		-0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2]
	];
	if (rgb.some(v => v < -0.0005 || v > 1.0005)) return undefined;
	const encode = (v: number) => {
		const linear = Math.min(1, Math.max(0, v));
		const gamma = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
		return Math.round(gamma * 255)
			.toString(16)
			.padStart(2, "0");
	};
	return `#${rgb.map(encode).join("")}`;
}
