// @ts-check
// Stylesmith typing sparks, runs inside the VS Code workbench page.
//
// Each key you type in an editor throws a few small neon pixel sparks up from the cursor.
// They arc, fall and fade out in about half a second.
//
// Nothing runs while you're not typing: the canvas is only redrawn while sparks are alive.
//
// Colors: cyan, magenta and yellow by default. Override them in one of your own CSS imports:
//   :root { --stylesmith-spark-colors: #00f0ff, #ff2bd6; }
(function () {
	"use strict";

	const CURSOR_SELECTOR = ".monaco-editor.focused .cursors-layer .cursor";
	const DEFAULT_COLORS = ["#00f0ff", "#ff2bd6", "#f5ff00"];

	const SPARKS_PER_KEY = 7;
	const MAX_SPARKS = 160; // holding a key down never piles up more than this
	const LIFETIME = 0.45; // seconds
	const MIN_SPEED = 90; // pixels per second
	const MAX_SPEED = 240;
	const SPREAD = Math.PI / 2.4; // how far from straight up a spark can fly
	const GRAVITY = 900; // pixels per second squared
	const MAX_STEP = 1 / 30; // seconds; keeps motion stable after a slow frame

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	/** @type {{ x: number, y: number, vx: number, vy: number, age: number, size: number, color: string }[]} */
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

	// Without sparks the canvas has no size, so it takes no memory. A full-window canvas
	// would take tens of megabytes on a 4K screen.
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
			.getPropertyValue("--stylesmith-spark-colors")
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
			const angle = -Math.PI / 2 + (Math.random() * 2 - 1) * SPREAD;
			const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
			sparks.push({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				age: 0,
				size: Math.random() < 0.3 ? 3 : 2,
				color: colors[Math.floor(Math.random() * colors.length)]
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
		ctx.globalCompositeOperation = "lighter"; // overlapping sparks glow brighter

		let alive = 0;
		for (const spark of sparks) {
			spark.age += dt;
			if (spark.age >= LIFETIME) continue;
			spark.vy += GRAVITY * dt;
			spark.x += spark.vx * dt;
			spark.y += spark.vy * dt;

			ctx.globalAlpha = 1 - spark.age / LIFETIME;
			ctx.fillStyle = spark.color;
			// Whole pixels keep the sparks crisp and retro.
			ctx.fillRect(Math.round(spark.x), Math.round(spark.y), spark.size, spark.size);
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
