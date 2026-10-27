// Writes the Vim previews on the Vim page (site/vim.html): the Stylesmith Vim color scheme in
// every color theme, drawn in the theme's own terminal colors, as the scheme takes them
// (extras/vim/colors/stylesmith.vim uses ANSI color names). src/test/vimPreviews.test.ts checks
// the colors.
// Run with: npm run vim-previews

import { writeThemePreviews } from "./build-prompt-previews.mjs";

/** The Vim preview's roles and the ANSI color each takes (see extras/vim/colors/stylesmith.vim). */
export const ROLES = {
	bg: "terminal.background",
	fg: "terminal.foreground",
	chrome: "terminal.ansiBrightBlack",
	kw: "terminal.ansiMagenta",
	fn: "terminal.ansiCyan",
	str: "terminal.ansiYellow",
	num: "terminal.ansiBrightYellow"
};

writeThemePreviews({
	page: "vim.html",
	marker: "vim-previews",
	roles: ROLES,
	label: name => `Vim in ${name}`,
	body: '<span class="chrome">  1 </span><span class="chrome">// tally the night shift</span><br><span class="chrome">  2 </span><span class="kw">function</span> <span class="fn">total</span>(hours) {<br><span class="num">  3 </span>  <span class="kw">return</span> hours * <span class="num">1.5</span> + <span class="str">" h"</span>;<br><span class="chrome">  4 </span>}'
});
