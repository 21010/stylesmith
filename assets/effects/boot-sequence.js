// Stylesmith boot sequence, runs inside the VS Code workbench page.
//
// When VS Code starts, a short retro terminal boot log types itself out over the window and
// fades away after about a second and a half. It never blocks clicks, and any key skips it.
// Once it's gone, nothing of it keeps running.
//
// Color: set --stylesmith-neon in one of your own CSS imports.
(function () {
	"use strict";

	const LINES = [
		"STYLESMITH BIOS v1.6",
		"> INIT NEURAL LINK ......... OK",
		"> LOAD NEON DRIVERS ........ OK",
		"> CALIBRATE PHOSPHOR ....... OK",
		"> JACK IN"
	];
	const CHAR_DELAY = 6; // ms per character
	const HOLD = 350; // ms to show the finished log
	const FADE = 300; // ms

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	function start() {
		const overlay = document.createElement("div");
		overlay.setAttribute("aria-hidden", "true");
		overlay.style.cssText =
			"position:fixed;inset:0;z-index:2147483600;pointer-events:none;" +
			"display:flex;align-items:center;justify-content:center;" +
			"background:rgb(5 6 12 / 0.92);transition:opacity " +
			FADE +
			"ms ease-out;" +
			"font:15px/1.6 'JetBrainsMono Nerd Font Mono',Consolas,'Courier New',monospace;" +
			"color:var(--stylesmith-neon,#5fe0ff);text-shadow:0 0 6px var(--stylesmith-neon,#5fe0ff)";
		const log = document.createElement("pre");
		log.style.cssText = "margin:0;min-width:34ch;white-space:pre";
		overlay.appendChild(log);
		document.body.appendChild(overlay);

		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			document.removeEventListener("keydown", finish, true);
			overlay.style.opacity = "0";
			setTimeout(() => overlay.remove(), FADE);
		};
		document.addEventListener("keydown", finish, true);

		const text = LINES.join("\n") + " _";
		let shown = 0;
		const type = () => {
			if (finished) return;
			shown = Math.min(text.length, shown + 2);
			log.textContent = text.slice(0, shown);
			if (shown < text.length) setTimeout(type, CHAR_DELAY * 2);
			else setTimeout(finish, HOLD);
		};
		type();
	}

	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
