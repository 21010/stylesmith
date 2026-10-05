// The website's only script. Every page loads it; each part below runs only on the pages
// that have its elements. The security policy allows this file and nothing inline.
"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

// The theme carousel: thumbnails carry the title and description, the arrow keys step
// through them, and it advances by itself every 3 seconds unless motion is reduced.
const thumbs = [...document.querySelectorAll(".carousel-thumbnails .thumb")];
if (thumbs.length) {
	const image = document.getElementById("mainImage");
	const title = document.getElementById("mainTitle");
	const description = document.getElementById("mainDesc");
	let current = 0;
	let timer;

	const show = index => {
		current = (index + thumbs.length) % thumbs.length;
		const thumb = thumbs[current];
		const picture = thumb.querySelector("img");
		image.style.opacity = "0";
		setTimeout(() => {
			image.src = picture.getAttribute("src");
			image.alt = picture.alt;
			title.textContent = thumb.dataset.title;
			description.textContent = thumb.dataset.desc;
			image.style.opacity = "1";
		}, 150);
		thumbs.forEach((other, i) => other.classList.toggle("active", i === current));
		restart();
	};
	const restart = () => {
		clearInterval(timer);
		if (!reducedMotion.matches) timer = setInterval(() => show(current + 1), 3000);
	};

	thumbs.forEach((thumb, i) => thumb.addEventListener("click", () => show(i)));
	document.addEventListener("keydown", event => {
		if (event.key === "ArrowRight") show(current + 1);
		else if (event.key === "ArrowLeft") show(current - 1);
	});
	restart();
}

// The effect videos loop by themselves, except when the system asks for reduced motion:
// then they stay paused on their first frame, with controls to play them on request.
const videos = document.querySelectorAll("video[autoplay]");
const applyMotion = () => {
	for (const video of videos) {
		video.controls = reducedMotion.matches;
		if (reducedMotion.matches) video.pause();
		else video.play().catch(() => {});
	}
};
if (videos.length) {
	applyMotion();
	reducedMotion.addEventListener("change", applyMotion);
}
