// Stylesmith glitch on save, runs inside the VS Code workbench page.
//
// When a file is saved, the editor glitches for a moment: a quick red/cyan split and a small
// jitter, about 180 ms. A save is noticed when an editor tab stops being "dirty" (unsaved),
// so saving from the keyboard, the menu or auto-save all count.
//
// Nothing runs between saves; the script only reacts to VS Code changing a tab's class.
(function () {
	"use strict";

	const DURATION = 180; // ms
	const MIN_GAP = 400; // ms between glitches, so auto-save can't make it flicker
	const CLASS = "stylesmith-glitch";

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	let lastGlitch = 0;

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
		}).observe(document.body, {
			subtree: true,
			attributes: true,
			attributeFilter: ["class"],
			attributeOldValue: true
		});
	}

	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
