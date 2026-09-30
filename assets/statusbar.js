// Runs inside the VS Code workbench page: Stylesmith status bar icon, shown while custom CSS/JS is active.
(function () {
	"use strict";

	const ID = "21010.stylesmith";

	function ensureIndicator() {
		if (document.getElementById(ID)) return;
		const host = document.querySelector(".right-items");
		if (!host) return;

		const item = document.createElement("div");
		item.id = ID;
		item.title = "Stylesmith: custom CSS/JS active";
		item.className = "statusbar-item right stylesmith-indicator";

		const label = document.createElement("a");
		label.tabIndex = -1;
		label.className = "statusbar-item-label";

		const icon = document.createElement("span");
		icon.className = "codicon codicon-paintcan";

		label.appendChild(icon);
		item.appendChild(label);
		host.appendChild(item);
	}

	// The status bar is rendered after startup and can be rebuilt later, so re-check occasionally.
	// Once the item exists, each check is a single getElementById lookup.
	ensureIndicator();
	setInterval(ensureIndicator, 5000);
})();
