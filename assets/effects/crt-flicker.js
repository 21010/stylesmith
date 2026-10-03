// @ts-check
// Stylesmith CRT flicker effect, runs inside the VS Code workbench page.
//
// Occasionally applies a brief sub-pixel CSS translation and opacity drop to simulate a dying CRT.
(function () {
	"use strict";

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

	function getRandomDelay() {
		// Random delay between 2 to 10 seconds between flickers
		return Math.random() * 8000 + 2000;
	}

	function triggerFlicker() {
		if (reducedMotion.matches) return;

		/** @type {HTMLElement | null} */
		const workbench = document.querySelector(".monaco-workbench");
		if (!workbench) {
			scheduleNext();
			return;
		}

		// Apply jitter and opacity flicker
		const jitterX = (Math.random() * 4 - 2).toFixed(1);
		const jitterY = (Math.random() * 2 - 1).toFixed(1);

		workbench.style.transform = `translate3d(${jitterX}px, ${jitterY}px, 0)`;
		workbench.style.opacity = (Math.random() * 0.15 + 0.85).toFixed(2);

		// Restore quickly
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				workbench.style.transform = "";
				workbench.style.opacity = "";
			});
		});

		// Sometimes do a double flicker (15% chance)
		if (Math.random() < 0.15) {
			setTimeout(() => {
				workbench.style.transform = `translate3d(${(Math.random() * 4 - 2).toFixed(1)}px, ${(Math.random() * 2 - 1).toFixed(1)}px, 0)`;
				workbench.style.opacity = "0.9";
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						workbench.style.transform = "";
						workbench.style.opacity = "";
					});
				});
			}, 50);
		}

		scheduleNext();
	}

	/** @type {number | undefined} */
	let timeoutId;
	function scheduleNext() {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(triggerFlicker, getRandomDelay());
	}

	function start() {
		if (reducedMotion.matches) return;
		scheduleNext();

		reducedMotion.addEventListener("change", e => {
			if (e.matches) {
				clearTimeout(timeoutId);
			} else {
				scheduleNext();
			}
		});
	}

	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
