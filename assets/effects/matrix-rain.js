// @ts-check
// Stylesmith matrix rain, runs inside the VS Code workbench page.
//
// Each key you type in an editor drops matrix-style characters from the cursor.
//
// Colors: bright green by default. Override them in one of your own CSS imports:
//   :root { --stylesmith-matrix-colors: #00ff41, #008f11; }
(function () {
	"use strict";

	const CURSOR_SELECTOR = ".monaco-editor.focused .cursors-layer .cursor";
	const DEFAULT_COLORS = ["#00ff41", "#008f11", "#a3ffb4"];
	const CHARACTERS =
		"ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	const SPARKS_PER_KEY = 3;
	const MAX_SPARKS = 200;
	const LIFETIME = 1.0; // seconds
	const MIN_SPEED = 150; // pixels per second
	const MAX_SPEED = 300;
	const MAX_STEP = 1 / 30; // seconds; keeps motion stable after a slow frame

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	/** @type {{ x: number, y: number, vx: number, vy: number, age: number, size: number, color: string, char: string }[]} */
	const sparks = [];

	// Both are set by setUpCanvas(), before anything else uses them.
	/** @type {HTMLCanvasElement} */
	let canvas;
	/** @type {CanvasRenderingContext2D} */
	let ctx;
	let scheduled = false;
	/** @type {number | null} */
	let lastFrameTime = null; // null while no sparks are alive

	/** Returns false if the page can't draw on a canvas; the effect then stays off. */
	function setUpCanvas() {
		canvas = document.createElement("canvas");
		canvas.setAttribute("aria-hidden", "true");
		canvas.style.cssText =
			"position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9998";
		document.body.appendChild(canvas);
		const context = canvas.getContext("2d");
		if (!context) {
			canvas.remove();
			return false;
		}
		ctx = context;
		releaseCanvas();
		return true;
	}

	function releaseCanvas() {
		canvas.width = 0;
		canvas.height = 0;
	}

	function resizeCanvas() {
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(window.innerWidth * ratio);
		canvas.height = Math.round(window.innerHeight * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
	}

	// Colors are read at most once a second, not on every keystroke.
	/** @type {string[] | null} */
	let colorCache = null;
	let colorCacheTime = 0;

	function sparkColors() {
		const now = performance.now();
		if (colorCache && now - colorCacheTime < 1000) return colorCache;
		colorCacheTime = now;
		const custom = getComputedStyle(document.documentElement)
			.getPropertyValue("--stylesmith-matrix-colors")
			.split(",")
			.map(color => color.trim())
			.filter(Boolean);
		colorCache = custom.length > 0 ? custom : DEFAULT_COLORS;
		return colorCache;
	}

	/** @param {KeyboardEvent} event */
	function isTypingKey(event) {
		if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return false;
		return event.key.length === 1 || event.key === "Backspace" || event.key === "Enter";
	}

	function burst() {
		const cursor = document.querySelector(CURSOR_SELECTOR);
		if (!cursor) return;
		const rect = cursor.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;

		const colors = sparkColors();
		for (let i = 0; i < SPARKS_PER_KEY; i++) {
			const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
			const char = CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
			sparks.push({
				x: rect.left + rect.width / 2 + (Math.random() * 10 - 5),
				y: rect.top + rect.height, // start below cursor
				vx: 0,
				vy: speed,
				age: -(Math.random() * 0.2), // stagger starts
				size: Math.random() < 0.3 ? 14 : 12,
				color: colors[Math.floor(Math.random() * colors.length)],
				char: char
			});
		}
		if (sparks.length > MAX_SPARKS) sparks.splice(0, sparks.length - MAX_SPARKS);
		if (canvas.width === 0) resizeCanvas();
		schedule();
	}

	function schedule() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(frame);
	}

	/** @param {number} now */
	function frame(now) {
		scheduled = false;
		const dt =
			lastFrameTime === null
				? 1 / 60
				: Math.min(Math.max((now - lastFrameTime) / 1000, 0), MAX_STEP);
		lastFrameTime = now;

		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
		ctx.globalCompositeOperation = "source-over";

		let alive = 0;
		ctx.textBaseline = "top";
		ctx.textAlign = "center";

		for (const spark of sparks) {
			spark.age += dt;
			if (spark.age < 0) {
				sparks[alive++] = spark;
				continue;
			}
			if (spark.age >= LIFETIME) continue;

			spark.y += spark.vy * dt;

			ctx.globalAlpha = 1 - Math.pow(spark.age / LIFETIME, 2);
			ctx.fillStyle = spark.color;
			ctx.font = `${spark.size}px monospace`;

			if (Math.random() < 0.05) {
				spark.char = CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
			}

			ctx.fillText(spark.char, Math.round(spark.x), Math.round(spark.y));
			sparks[alive++] = spark;
		}
		sparks.length = alive;
		ctx.globalAlpha = 1;

		// When the last spark is gone the canvas is left empty and nothing runs.
		if (alive > 0) {
			schedule();
		} else {
			lastFrameTime = null;
			releaseCanvas();
		}
	}

	function start() {
		if (!setUpCanvas()) return;
		window.addEventListener("resize", () => {
			if (canvas.width > 0) resizeCanvas();
		});

		document.addEventListener(
			"keydown",
			event => {
				if (reducedMotion.matches || !isTypingKey(event)) return;
				if (!(event.target instanceof Element) || !event.target.closest(".monaco-editor")) {
					return;
				}
				// VS Code moves its cursor on the next frame, so wait for that before bursting.
				requestAnimationFrame(() => requestAnimationFrame(burst));
			},
			{ capture: true, passive: true }
		);
	}

	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
