// @ts-check
// Stylesmith glitch on save, runs inside the VS Code workbench page.
//
// When a file is saved, the editor glitches for a moment: a quick red/cyan split and a small
// jitter, about 180 ms. A save is noticed when an editor tab stops being "dirty" (unsaved),
// so saving from the keyboard, the menu or auto-save all count.
//
// Nothing runs between saves; the script only watches class changes in the editor area.
(function () {
	"use strict";

	const DURATION = 180; // ms
	const MIN_GAP = 400; // ms between glitches, so auto-save can't make it flicker
	const CLASS = "stylesmith-glitch";
	const EDITOR_AREA = ".monaco-workbench .part.editor";

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	let lastGlitch = -Infinity; // so a save right after startup glitches too

	const STYLE = `
@keyframes stylesmith-glitch {
	0%, 100% { transform: none; filter: none; }
	25% {
		transform: translate(-2px, 1px);
		filter: drop-shadow(2px 0 0 rgb(255 0 90 / 0.8)) drop-shadow(-2px 0 0 rgb(0 240 255 / 0.8));
	}
	50% {
		transform: translate(2px, -1px);
		filter: drop-shadow(-3px 0 0 rgb(255 0 90 / 0.8)) drop-shadow(3px 0 0 rgb(0 240 255 / 0.8));
	}
	75% { transform: translate(-1px, 0); }
}
.${CLASS} > .editor-container {
	animation: stylesmith-glitch ${DURATION}ms steps(3, end) 1;
}`;

	/** @param {Element} tab */
	function glitch(tab) {
		const now = performance.now();
		if (reducedMotion.matches || now - lastGlitch < MIN_GAP) return;
		lastGlitch = now;
		const group = tab.closest(".editor-group-container");
		if (!group) return;
		group.classList.add(CLASS);
		setTimeout(() => group.classList.remove(CLASS), DURATION);
	}

	function start() {
		const style = document.createElement("style");
		style.textContent = STYLE;
		document.head.appendChild(style);

		// Tabs only exist in the editor area, so watch only that, not the whole page. VS Code
		// builds it after this script runs: look for it as the page is built, then stop looking.
		const area = document.querySelector(EDITOR_AREA);
		if (area) {
			watch(area);
			return;
		}
		const finder = new MutationObserver(() => {
			const found = document.querySelector(EDITOR_AREA);
			if (found) {
				finder.disconnect();
				watch(found);
			}
		});
		finder.observe(document.body, { childList: true, subtree: true });
	}

	/** @param {Element} area */
	function watch(area) {
		new MutationObserver(mutations => {
			for (const m of mutations) {
				const tab = m.target;
				if (
					tab instanceof Element &&
					tab.classList.contains("tab") &&
					/\bdirty\b/.test(m.oldValue || "") &&
					!tab.classList.contains("dirty")
				) {
					glitch(tab);
					return;
				}
			}
		}).observe(area, {
			subtree: true,
			attributes: true,
			attributeFilter: ["class"],
			attributeOldValue: true
		});
	}

	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
