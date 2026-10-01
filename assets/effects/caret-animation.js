// @ts-check
// Stylesmith caret animation, runs inside the VS Code workbench page.
//
// Draws the text cursor on a canvas above the editor, with a soft glow. When the cursor
// moves, the drawn shape glides to the new position: corners at the front of the motion
// arrive almost at once and corners at the back follow, which stretches the shape into a
// short trail. The idea comes from Neovide's cursor animation; this is a separate
// implementation.
//
// Nothing runs while the editor is idle. The script only wakes when VS Code changes the
// page, and the canvas keeps showing the last frame without being redrawn.
(function () {
	"use strict";

	const CURSOR_SELECTOR = ".monaco-editor .cursors-layer .cursor";

	// Roughly how long (in seconds) the corners take to reach the new position.
	const TRAIL_TIME = 0.125; // corners at the back of the motion
	const SAME_LINE_TRAIL_TIME = 0.05; // shorter trail while typing along a line
	const LEAD_TIME = 0.02; // corners pointing in the direction of travel
	const LEAD_FACING = 0.5; // how directly a corner must point forward to lead
	const SAME_LINE_DISTANCE = 8; // in cursor widths
	const KEEP_SPEED_BELOW = 0.075; // quick moves keep their speed, so fast typing flows

	const GLOW_BLUR = 10; // pixels
	const MAX_TRAIL = 100; // in cursor sizes; stops huge jumps smearing across the screen
	const MAX_STEP = 1 / 30; // seconds; keeps motion stable after a slow frame
	const SETTLED = 0.25; // pixels
	const SCROLL_PAUSE = 150; // ms without animating after scrolling
	const FINDER_TIMEOUT = 10_000; // ms to look for the first editor while VS Code starts

	// Corner offsets from the cursor's center, as a fraction of its width and height.
	const CORNERS = [
		[-0.5, -0.5],
		[0.5, -0.5],
		[0.5, 0.5],
		[-0.5, 0.5]
	];

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const trails = new Map(); // cursor element -> Trail

	// Both are set by setUpCanvas(), before anything else uses them.
	/** @type {HTMLCanvasElement} */
	let canvas;
	/** @type {CanvasRenderingContext2D} */
	let ctx;
	/** @type {DOMRect | null} */
	let lastPosition = null; // where the most recently moved cursor ended up
	let scrollingUntil = 0;
	let scheduled = false;
	let dirty = false; // redraw even if no cursor changed (e.g. after a resize)
	/** @type {number | null} */
	let lastFrameTime = null; // null while no animation is running

	class Trail {
		/** @param {DOMRect} start */
		constructor(start) {
			this.rect = start;
			this.color = "";
			this.visible = true;
			this.corners = CORNERS.map(([dx, dy]) => ({
				dx,
				dy,
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				time: TRAIL_TIME
			}));
			this.snapTo(start);
		}

		/** @param {DOMRect} rect */
		snapTo(rect) {
			this.rect = rect;
			for (const corner of this.corners) {
				corner.x = rect.left + (corner.dx + 0.5) * rect.width;
				corner.y = rect.top + (corner.dy + 0.5) * rect.height;
				corner.vx = 0;
				corner.vy = 0;
			}
		}

		// Starts a move to `rect`. Each corner gets a time based on how much it points in
		// the direction of travel: forward corners lead, backward corners trail.
		/** @param {DOMRect} rect */
		moveTo(rect) {
			const moveX = centerX(rect) - centerX(this.rect);
			const moveY = centerY(rect) - centerY(this.rect);
			const distance = Math.hypot(moveX, moveY);
			const sameLine =
				Math.abs(moveY) < 1 && Math.abs(moveX) <= rect.width * SAME_LINE_DISTANCE;
			const trailTime = sameLine ? SAME_LINE_TRAIL_TIME : TRAIL_TIME;

			for (const corner of this.corners) {
				const facing =
					distance === 0
						? 0
						: (corner.dx * moveX + corner.dy * moveY) /
							(Math.hypot(corner.dx, corner.dy) * distance);

				if (facing > LEAD_FACING) {
					corner.time = Math.min(LEAD_TIME, trailTime);
				} else {
					// From the full trail time for a corner pointing straight back, down to
					// 30% of it for a corner that almost leads. Squaring keeps the back
					// corners close to the full time.
					const forward = (facing + 1) / (LEAD_FACING + 1);
					corner.time = trailTime * (1 - 0.7 * forward * forward);
				}

				// Keep momentum between quick moves; start fresh for slower, bigger ones.
				if (corner.time > KEEP_SPEED_BELOW) {
					corner.vx = 0;
					corner.vy = 0;
				}
			}
			this.rect = rect;
		}

		// Advances the animation by `dt` seconds. Returns true while still moving.
		/** @param {number} dt seconds since the last frame */
		step(dt) {
			const maxOffset = Math.max(this.rect.width, this.rect.height) * MAX_TRAIL;
			let moving = false;
			for (const corner of this.corners) {
				const targetX = this.rect.left + (corner.dx + 0.5) * this.rect.width;
				const targetY = this.rect.top + (corner.dy + 0.5) * this.rect.height;
				const speed = 4 / corner.time;
				[corner.x, corner.vx] = follow(corner.x, corner.vx, targetX, speed, dt, maxOffset);
				[corner.y, corner.vy] = follow(corner.y, corner.vy, targetY, speed, dt, maxOffset);

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
			ctx.shadowColor = this.color;
			ctx.shadowBlur = GLOW_BLUR;
			ctx.fill();
		}
	}

	// A critically damped spring: moves `position` towards `target` as fast as possible
	// without overshooting. Returns the new position and velocity after `dt` seconds.
	/** @param {number} position @param {number} velocity @param {number} target @param {number} speed @param {number} dt @param {number} maxOffset @returns {[number, number]} */
	function follow(position, velocity, target, speed, dt, maxOffset) {
		const offset = position - target;
		const k = velocity + speed * offset;
		const decay = Math.exp(-speed * dt);
		const next = clamp((offset + k * dt) * decay, -maxOffset, maxOffset);
		return [target + next, (velocity - speed * k * dt) * decay];
	}

	/** @param {number} value @param {number} min @param {number} max */
	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	/** @param {DOMRect} rect */
	function centerX(rect) {
		return rect.left + rect.width / 2;
	}

	/** @param {DOMRect} rect */
	function centerY(rect) {
		return rect.top + rect.height / 2;
	}

	/** @param {DOMRect} a @param {DOMRect} b */
	function sameRect(a, b) {
		return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
	}

	/** @param {Element} element @param {DOMRect} rect */
	function isVisible(element, rect) {
		if (rect.width === 0 || rect.height === 0) return false;
		const style = getComputedStyle(element);
		return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
	}

	/** @param {Element} element */
	function cursorColor(element) {
		const style = getComputedStyle(element);
		const background = style.backgroundColor;
		return background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent"
			? background
			: style.color;
	}

	// The canvas only covers the cursors and their trail, not the whole window, so it stays
	// small: a full-window canvas would take tens of megabytes on a 4K screen.
	const PADDING = GLOW_BLUR * 2 + 2; // room for the glow around the shape
	const GRID = 64; // canvas sizes snap to this, so it isn't resized on every frame
	let area = { x: 0, y: 0, width: 0, height: 0 };

	/** Returns false if the page can't draw on a canvas; the effect then stays off. */
	function setUpCanvas() {
		canvas = document.createElement("canvas");
		canvas.setAttribute("aria-hidden", "true");
		canvas.width = 0;
		canvas.height = 0;
		canvas.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:9999";
		document.body.appendChild(canvas);
		const context = canvas.getContext("2d");
		if (!context) {
			canvas.remove();
			return false;
		}
		ctx = context;
		return true;
	}

	// Moves and sizes the canvas to cover the visible trails, then clears it.
	function fitCanvas() {
		let left = Infinity,
			top = Infinity,
			right = -Infinity,
			bottom = -Infinity;
		for (const trail of trails.values()) {
			if (!trail.visible) continue;
			for (const corner of trail.corners) {
				left = Math.min(left, corner.x);
				top = Math.min(top, corner.y);
				right = Math.max(right, corner.x);
				bottom = Math.max(bottom, corner.y);
			}
		}
		const ratio = window.devicePixelRatio || 1;
		const next =
			left === Infinity
				? { x: 0, y: 0, width: 0, height: 0 }
				: {
						x: Math.floor(left - PADDING),
						y: Math.floor(top - PADDING),
						width: Math.ceil((right - left + PADDING * 2) / GRID) * GRID,
						height: Math.ceil((bottom - top + PADDING * 2) / GRID) * GRID
					};
		if (next.width !== area.width || next.height !== area.height) {
			canvas.width = Math.round(next.width * ratio);
			canvas.height = Math.round(next.height * ratio);
			canvas.style.width = next.width + "px";
			canvas.style.height = next.height + "px";
		}
		canvas.style.transform = `translate(${next.x}px, ${next.y}px)`;
		area = next;
		ctx.setTransform(ratio, 0, 0, ratio, -next.x * ratio, -next.y * ratio);
		ctx.clearRect(next.x, next.y, next.width, next.height);
	}

	// Looks at every cursor once. Returns true if anything needs to be redrawn.
	function check() {
		const animate = !reducedMotion.matches && performance.now() > scrollingUntil;
		const seen = new Set();
		let changed = false;

		for (const element of document.querySelectorAll(CURSOR_SELECTOR)) {
			seen.add(element);
			const rect = element.getBoundingClientRect();
			const visible = isVisible(element, rect);
			let trail = trails.get(element);

			if (!trail) {
				if (!visible) continue;
				// A new cursor (e.g. in an editor that was just opened) starts where the
				// last one was, so the move between editors is animated too.
				trail = new Trail(animate && lastPosition ? lastPosition : rect);
				trails.set(element, trail);
			} else if (visible !== trail.visible) {
				// Blinking, or the editor gaining or losing focus: show or hide in place.
				trail.visible = visible;
				changed = true;
				if (!visible || sameRect(trail.rect, rect)) continue;
			} else if (!visible || sameRect(trail.rect, rect)) {
				continue;
			}

			trail.color = cursorColor(element);
			trail.moveTo(rect);
			if (!animate) trail.snapTo(rect);
			lastPosition = rect;
			changed = true;
		}

		// Forget cursors that were removed from the page.
		for (const element of trails.keys()) {
			if (!seen.has(element)) {
				trails.delete(element);
				changed = true;
			}
		}

		return changed;
	}

	// Runs on the next frame. Called after DOM changes, and every frame while animating.
	function schedule() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(tick);
	}

	/** @param {number} now */
	function tick(now) {
		scheduled = false;

		// Checking and drawing in the same frame means a move shows up without delay.
		// While animating this also re-reads positions every frame, which keeps up with
		// VS Code's own smooth caret setting (a CSS transition that doesn't change the DOM).
		const changed = check() || dirty;
		dirty = false;
		if (!changed && lastFrameTime === null) return;

		const dt =
			lastFrameTime === null
				? 1 / 60
				: Math.min(Math.max((now - lastFrameTime) / 1000, 0), MAX_STEP);
		lastFrameTime = now;

		let moving = false;
		for (const trail of trails.values()) {
			if (trail.step(dt)) moving = true;
		}

		fitCanvas();
		for (const trail of trails.values()) {
			if (trail.visible) trail.draw();
		}

		// Once everything has settled, the last frame simply stays on the canvas.
		if (moving) schedule();
		else lastFrameTime = null;
	}

	function pauseWhileScrolling() {
		scrollingUntil = performance.now() + SCROLL_PAUSE;
	}

	// Watch only the editors' cursor layers, not the whole page: VS Code changes the rest of
	// the page all the time (lists, hovers, status bar), and none of that moves a cursor.
	const watchedLayers = new WeakSet();
	const watchedEditors = new WeakSet();
	const layerObserver = new MutationObserver(schedule);
	// An editor that changes size or moves (side bar toggled, panel resized) moves its cursor
	// without touching the cursor's own element.
	const editorObserver = new ResizeObserver(schedule);

	function watchEditors() {
		let found = false;
		for (const layer of document.querySelectorAll(".monaco-editor .cursors-layer")) {
			found = true;
			if (watchedLayers.has(layer)) continue;
			watchedLayers.add(layer);
			layerObserver.observe(layer, {
				subtree: true,
				childList: true,
				attributes: true,
				attributeFilter: ["style", "class"]
			});
			const editor = layer.closest(".monaco-editor");
			if (editor && !watchedEditors.has(editor)) {
				watchedEditors.add(editor);
				editorObserver.observe(editor);
			}
		}
		return found;
	}

	function start() {
		if (!setUpCanvas()) return;

		// VS Code builds its editors after this script runs. Look for them as the page is built,
		// and stop looking once the first one exists.
		if (!watchEditors()) {
			const finder = new MutationObserver(() => {
				if (watchEditors()) {
					finder.disconnect();
					schedule();
				}
			});
			finder.observe(document.body, { childList: true, subtree: true });
			// If no editor is open yet, stop looking after a while: editors opened later are
			// picked up when they get focus.
			setTimeout(() => finder.disconnect(), FINDER_TIMEOUT);
		}
		// Later editors (new tabs, splits, the settings editor) are picked up when they get focus.
		document.addEventListener(
			"focusin",
			() => {
				watchEditors();
				schedule();
			},
			true
		);

		window.addEventListener("resize", () => {
			area = { x: 0, y: 0, width: 0, height: 0 }; // the screen scale may have changed
			for (const [element, trail] of trails) {
				trail.snapTo(element.getBoundingClientRect());
			}
			dirty = true;
			schedule();
		});

		// Content moves under the cursor while scrolling; follow it instantly instead.
		const passive = { capture: true, passive: true };
		window.addEventListener("wheel", pauseWhileScrolling, passive);
		document.addEventListener("scroll", pauseWhileScrolling, passive);

		schedule();
	}

	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
