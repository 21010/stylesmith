// The website's only script. Every page loads it; each part below runs only on the pages
// that have its elements. The security policy allows this file and nothing inline.
"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Motion: the carousels and blinking caret move by themselves. The header's
// pause button stops all of them (WCAG 2.2.2). It starts paused when the system asks for
// reduced motion, and remembers the visitor's choice from page to page.
const MOTION_KEY = "stylesmith-motion";
const savedMotion = () => {
	try {
		return localStorage.getItem(MOTION_KEY);
	} catch {
		return null; // storage blocked: follow the system
	}
};
let motionPaused = savedMotion() ? savedMotion() === "paused" : reducedMotion.matches;
const motionButton = document.querySelector(".motion-toggle");
const motionListeners = [];
const applyMotion = () => {
	document.documentElement.classList.toggle("motion-paused", motionPaused);
	motionButton?.setAttribute("aria-pressed", String(motionPaused));
	if (motionButton) motionButton.title = motionPaused ? "Play animations" : "Pause animations";
	for (const video of document.querySelectorAll("video[autoplay]")) {
		if (motionPaused) video.pause();
		else video.play().catch(() => {});
	}
	motionListeners.forEach(listener => listener());
};
if (motionButton) {
	motionButton.hidden = false;
	motionButton.addEventListener("click", () => {
		motionPaused = !motionPaused;
		try {
			localStorage.setItem(MOTION_KEY, motionPaused ? "paused" : "playing");
		} catch {
			// not remembered; this page still follows the button
		}
		applyMotion();
	});
}
reducedMotion.addEventListener("change", () => {
	if (savedMotion()) return; // the visitor's own choice wins
	motionPaused = reducedMotion.matches;
	applyMotion();
});
applyMotion();

// The header: on narrow screens a menu button shows and hides the nav. The nav's dropdowns
// open on hover, and also on click, for touch screens and the phone menu.
const header = document.querySelector("header.top");
const menuButton = header?.querySelector(".menu-toggle");
const dropdowns = [...document.querySelectorAll(".top .dropdown")];

const setDropdown = (dropdown, open) => {
	dropdown.classList.toggle("open", open);
	dropdown.querySelector(".dropbtn").setAttribute("aria-expanded", String(open));
};
const setMenu = open => {
	header.classList.toggle("open", open);
	menuButton.setAttribute("aria-expanded", String(open));
	if (!open) dropdowns.forEach(dropdown => setDropdown(dropdown, false));
};

if (menuButton) {
	menuButton.hidden = false;
	header.classList.add("has-menu");
	menuButton.addEventListener("click", () => setMenu(!header.classList.contains("open")));
	// Following a link (like #install, on the same page) closes the menu.
	header.querySelector("nav").addEventListener("click", event => {
		if (event.target.closest("a")) setMenu(false);
	});
}
for (const dropdown of dropdowns) {
	dropdown.querySelector(".dropbtn").addEventListener("click", () => {
		const open = !dropdown.classList.contains("open");
		dropdowns.forEach(other => setDropdown(other, other === dropdown && open));
	});
}
document.addEventListener("click", event => {
	if (!event.target.closest(".top .dropdown")) {
		dropdowns.forEach(dropdown => setDropdown(dropdown, false));
	}
});
document.addEventListener("keydown", event => {
	if (event.key !== "Escape") return;
	dropdowns.forEach(dropdown => setDropdown(dropdown, false));
	if (header?.classList.contains("open")) {
		setMenu(false);
		menuButton.focus();
	}
});

// Copy buttons: <button data-copy="text to copy">, marked "copied" for two seconds.
for (const button of document.querySelectorAll("button[data-copy]")) {
	button.addEventListener("click", () => {
		const text = button.dataset.copy;
		const done = () => {
			button.classList.add("copied");
			setTimeout(() => button.classList.remove("copied"), 2000);
		};
		// The clipboard API needs HTTPS (or localhost); fall back to a hidden input elsewhere.
		const fallback = () => {
			const input = document.createElement("input");
			input.value = text;
			document.body.appendChild(input);
			input.select();
			document.execCommand("copy");
			input.remove();
			done();
		};
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(text).then(done, fallback);
		} else {
			fallback();
		}
	});
}

// Scroll-spy for the side navigation of the ergonomics and security pages.
const sideNav = document.querySelectorAll(".ergo-nav a");
if (sideNav.length) {
	const observer = new IntersectionObserver(
		entries => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				for (const link of sideNav) {
					link.classList.toggle(
						"active",
						link.getAttribute("href") === "#" + entry.target.id
					);
				}
			}
		},
		{ rootMargin: "-20% 0px -70% 0px" }
	);
	for (const section of document.querySelectorAll(".ergo-section")) observer.observe(section);
}

// The theme carousel: thumbnails are buttons that carry the title and description. The arrow
// keys step through them while one has focus. It advances by itself every 3 seconds, unless
// motion is paused or the keyboard is in the carousel; only a choice the visitor made is
// announced to screen readers.
const thumbs = [...document.querySelectorAll(".carousel-thumbnails .thumb")];
if (thumbs.length) {
	const image = document.getElementById("mainImage");
	const title = document.getElementById("mainTitle");
	const description = document.getElementById("mainDesc");
	const info = document.getElementById("mainInfo");
	const group = document.querySelector(".carousel-thumbnails");
	let current = 0;
	let timer;
	let focused = false;

	const show = (index, chosen) => {
		current = (index + thumbs.length) % thumbs.length;
		const thumb = thumbs[current];
		const picture = thumb.querySelector("img");
		info.setAttribute("aria-live", chosen ? "polite" : "off");
		image.style.opacity = "0";
		setTimeout(() => {
			image.src = picture.getAttribute("src");
			image.alt = thumb.dataset.title + " theme";
			title.textContent = thumb.dataset.title;
			description.textContent = thumb.dataset.desc;
			image.style.opacity = "1";
		}, 150);
		thumbs.forEach((other, i) => other.setAttribute("aria-pressed", String(i === current)));
		restart();
	};
	const restart = () => {
		clearInterval(timer);
		if (!motionPaused && !focused) timer = setInterval(() => show(current + 1, false), 3000);
	};
	motionListeners.push(restart);

	thumbs.forEach((thumb, i) => thumb.addEventListener("click", () => show(i, true)));
	group.addEventListener("keydown", event => {
		const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
		if (!step) return;
		event.preventDefault(); // don't scroll the page
		show(current + step, true);
		thumbs[current].focus();
	});
	group.addEventListener("focusin", () => {
		focused = true;
		restart();
	});
	group.addEventListener("focusout", event => {
		focused = group.contains(event.relatedTarget);
		restart();
	});
	restart();
}
