import { describeThemePreviews } from "./promptPreviews.test";

/**
 * The Vim previews on the Vim page: one per color theme, in the colors the color scheme takes
 * from that theme. They're written by scripts/build-vim-previews.mjs.
 */

// The preview's roles, and the ANSI color the Vim color scheme gives each.
const ROLES: Record<string, [string, string]> = {
	chrome: ["terminal.ansiBrightBlack", "highlight Comment ctermfg=DarkGray"],
	kw: ["terminal.ansiMagenta", "highlight Keyword ctermfg=Magenta"],
	fn: ["terminal.ansiCyan", "highlight Function ctermfg=Cyan"],
	str: ["terminal.ansiYellow", "highlight String ctermfg=Yellow"],
	num: ["terminal.ansiBrightYellow", "highlight Number ctermfg=LightYellow"]
};

describeThemePreviews(
	"Vim color scheme previews",
	"site/vim.html",
	"extras/vim/colors/stylesmith.vim",
	"Vim color scheme",
	ROLES
);
