// Stylesmith caret animation, runs inside the VS Code workbench page.
//
// When the text cursor moves, a shape glides from the old position to the new one. The
// corners at the front of the motion arrive quickly and the ones at the back follow more
// slowly, which stretches the shape into a short trail. The idea comes from Neovide's
// cursor animation; this is a separate implementation.
//
// Nothing runs while the editor is idle: the script only wakes when VS Code changes the
// page, and it stops drawing as soon as every cursor has settled.
(function () {
	"use strict";

	const CURSOR_SELECTOR = ".monaco-editor .cursors-layer .cursor";

	// Roughly how long (in seconds) corners take to reach the new position.
	const FRONT_TIME = 0.03;
	const BACK_TIME = 0.12;
	const SAME_LINE_BACK_TIME = 0.05; // shorter trail while typing along a line
	const SAME_LINE_DISTANCE = 4; // in cursor heights

	const MAX_STEP = 1 / 30; // seconds; keeps motion stable after a slow frame
	const SETTLED = 0.25; // pixels
	const SCROLL_PAUSE = 150; // ms without animating after a wheel event

	// Corner offsets from the cursor's center, as a fraction of its width and height.
	const CORNERS = [
		[-0.5, -0.5],
		[0.5, -0.5],
		[0.5, 0.5],
		[-0.5, 0.5]
	];

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const trails = new Map(); // cursor element -> Trail

	let canvas = null;
	let ctx = null;
	let lastPosition = null; // where the most recently moved cursor ended up
	let scrollingUntil = 0;
	let checkQueued = false;
	let frameQueued = false;
	let lastFrameTime = null; // null while no animation is running

	class Trail {
		constructor(start) {
			this.rect = start;
			this.color = "";
			this.corners = CORNERS.map(([dx, dy]) => ({
				dx,
				dy,
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				time: 0
			}));
			this.snapTo(start);
		}

		snapTo(rect) {
			for (const corner of this.corners) {
				corner.x = rect.left + (corner.dx + 0.5) * rect.width;
				corner.y = rect.top + (corner.dy + 0.5) * rect.height;
				corner.vx = 0;
				corner.vy = 0;
			}
		}

		// Starts a move to `rect`. Corners that face the direction of travel get a short
		// time and lead; corners facing away get a long time and trail behind.
		moveTo(rect) {
			const moveX = centerX(rect) - centerX(this.rect);
			const moveY = centerY(rect) - centerY(this.rect);
			const distance = Math.hypot(moveX, moveY);
			const sameLine =
				Math.abs(moveY) < 1 && Math.abs(moveX) < rect.height * SAME_LINE_DISTANCE;
			const backTime = sameLine ? SAME_LINE_BACK_TIME : BACK_TIME;

			for (const corner of this.corners) {
				const facing =
					distance === 0
						? 0
						: (corner.dx * moveX + corner.dy * moveY) /
							(Math.hypot(corner.dx, corner.dy) * distance);
				const front = (facing + 1) / 2; // 0 at the back, 1 at the front
				corner.time = backTime + (FRONT_TIME - backTime) * front;
			}
			this.rect = rect;
		}

		// Advances the animation by `dt` seconds. Returns true while still moving.
		step(dt) {
			let moving = false;
			for (const corner of this.corners) {
				const targetX = this.rect.left + (corner.dx + 0.5) * this.rect.width;
				const targetY = this.rect.top + (corner.dy + 0.5) * this.rect.height;
				const speed = 6 / corner.time;
				[corner.x, corner.vx] = follow(corner.x, corner.vx, targetX, speed, dt);
				[corner.y, corner.vy] = follow(corner.y, corner.vy, targetY, speed, dt);

				if (
					Math.abs(corner.x - targetX) < SETTLED &&
					Math.abs(corner.y - targetY) < SETTLED
				) {
					corner.x = targetX;
					corner.y = targetY;
					corner.vx = 0;
					corner.vy = 0;
				} else {
					moving = true;
				}
			}
			return moving;
		}

		draw() {
			ctx.beginPath();
			ctx.moveTo(this.corners[0].x, this.corners[0].y);
			for (let i = 1; i < this.corners.length; i++) {
				ctx.lineTo(this.corners[i].x, this.corners[i].y);
			}
			ctx.closePath();
			ctx.fillStyle = this.color;
			ctx.fill();
		}
	}

	// A critically damped spring: moves `position` towards `target` as fast as possible
	// without overshooting. Returns the new position and velocity after `dt` seconds.
	function follow(position, velocity, target, speed, dt) {
		const offset = position - target;
		const k = velocity + speed * offset;
		const decay = Math.exp(-speed * dt);
		return [target + (offset + k * dt) * decay, (velocity - speed * k * dt) * decay];
	}

	function centerX(rect) {
		return rect.left + rect.width / 2;
	}

	function centerY(rect) {
		return rect.top + rect.height / 2;
	}

	function sameRect(a, b) {
		return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
	}

	function cursorColor(element) {
		const style = getComputedStyle(element);
		const background = style.backgroundColor;
		return background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent"
			? background
			: style.color;
	}

	function setUpCanvas() {
		canvas = document.createElement("canvas");
		canvas.setAttribute("aria-hidden", "true");
		canvas.style.cssText =
			"position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
		document.body.appendChild(canvas);
		ctx = canvas.getContext("2d");
		resizeCanvas();
	}

	function resizeCanvas() {
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(window.innerWidth * ratio);
		canvas.height = Math.round(window.innerHeight * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
	}

	// Looks at every visible cursor once. Called after DOM changes, at most once per frame.
	function check() {
		checkQueued = false;
		const animate = !reducedMotion.matches && performance.now() > scrollingUntil;
		const seen = new Set();

		for (const element of document.querySelectorAll(CURSOR_SELECTOR)) {
			const rect = element.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) continue;
			if (getComputedStyle(element).visibility === "hidden") continue;
			seen.add(element);

			let trail = trails.get(element);
			if (!trail) {
				// A cursor that just appeared (e.g. after switching editors) starts where
				// the last one was, so the move between editors is animated too.
				trail = new Trail(animate && lastPosition ? lastPosition : rect);
				trails.set(element, trail);
			} else if (sameRect(trail.rect, rect)) {
				continue;
			}

			trail.color = cursorColor(element);
			trail.moveTo(rect);
			if (!animate) trail.snapTo(rect);
			lastPosition = rect;
			requestFrame();
		}

		for (const element of trails.keys()) {
			if (!seen.has(element)) trails.delete(element);
		}
	}

	function queueCheck() {
		if (checkQueued) return;
		checkQueued = true;
		requestAnimationFrame(check);
	}

	function requestFrame() {
		if (frameQueued) return;
		frameQueued = true;
		requestAnimationFrame(frame);
	}

	function frame(now) {
		frameQueued = false;
		const dt =
			lastFrameTime === null
				? 1 / 60
				: Math.min(Math.max((now - lastFrameTime) / 1000, 0), MAX_STEP);
		lastFrameTime = now;

		// VS Code's own smooth caret setting moves the cursor with a CSS transition, which
		// doesn't change the DOM on every frame, so re-read positions while animating.
		check();

		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
		let moving = false;
		for (const trail of trails.values()) {
			if (trail.step(dt)) {
				trail.draw();
				moving = true;
			}
		}

		// Once everything has settled the canvas stays empty and VS Code's own cursor shows.
		if (moving) requestFrame();
		else lastFrameTime = null;
	}

	function start() {
		setUpCanvas();

		new MutationObserver(queueCheck).observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["style", "class"]
		});

		window.addEventListener("resize", () => {
			resizeCanvas();
			for (const [element, trail] of trails) {
				const rect = element.getBoundingClientRect();
				trail.rect = rect;
				trail.snapTo(rect);
			}
		});

		// Content moves under the cursor while scrolling; follow it instantly instead.
		window.addEventListener(
			"wheel",
			() => {
				scrollingUntil = performance.now() + SCROLL_PAUSE;
			},
			{ capture: true, passive: true }
		);

		queueCheck();
	}

	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
