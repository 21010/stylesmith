" Stylesmith color scheme for Vim and Neovim.
" Uses only the terminal's named ANSI colors (no 24-bit colors), so in VS Code's
" integrated terminal it takes on the active Stylesmith theme's palette and
" follows when you switch themes. Every color is one that Stylesmith's theme
" tests check for contrast on the terminal background.

if exists("+termguicolors")
  set notermguicolors
endif
highlight clear
if exists("syntax_on")
  syntax reset
endif
let g:colors_name = "stylesmith"

" Text and editor chrome
highlight Normal ctermfg=NONE ctermbg=NONE cterm=NONE
highlight NonText ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight EndOfBuffer ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight SpecialKey ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight Whitespace ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight Conceal ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight LineNr ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight LineNrAbove ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight LineNrBelow ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight CursorLineNr ctermfg=LightYellow ctermbg=NONE cterm=bold
highlight CursorLine ctermfg=NONE ctermbg=NONE cterm=underline
highlight CursorColumn ctermfg=NONE ctermbg=NONE cterm=NONE
highlight ColorColumn ctermfg=NONE ctermbg=NONE cterm=reverse
highlight SignColumn ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight FoldColumn ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight Folded ctermfg=DarkGray ctermbg=NONE cterm=bold
highlight VertSplit ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight WinSeparator ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight Title ctermfg=LightMagenta ctermbg=NONE cterm=bold
highlight Directory ctermfg=Cyan ctermbg=NONE cterm=bold

" Selection, search and matching brackets
highlight Visual ctermfg=NONE ctermbg=NONE cterm=reverse
highlight VisualNOS ctermfg=NONE ctermbg=NONE cterm=reverse,underline
highlight Search ctermfg=Yellow ctermbg=NONE cterm=reverse
highlight IncSearch ctermfg=LightCyan ctermbg=NONE cterm=reverse,bold
highlight CurSearch ctermfg=LightCyan ctermbg=NONE cterm=reverse,bold
highlight MatchParen ctermfg=LightCyan ctermbg=NONE cterm=bold,underline

" Status line, tab line and popup menu
highlight StatusLine ctermfg=Cyan ctermbg=NONE cterm=reverse,bold
highlight StatusLineNC ctermfg=DarkGray ctermbg=NONE cterm=reverse
highlight WildMenu ctermfg=LightCyan ctermbg=NONE cterm=reverse,bold
highlight TabLine ctermfg=DarkGray ctermbg=NONE cterm=underline
highlight TabLineSel ctermfg=Cyan ctermbg=NONE cterm=bold
highlight TabLineFill ctermfg=DarkGray ctermbg=NONE cterm=underline
highlight Pmenu ctermfg=Cyan ctermbg=NONE cterm=reverse
highlight PmenuSel ctermfg=LightCyan ctermbg=NONE cterm=reverse,bold
highlight PmenuSbar ctermfg=DarkGray ctermbg=NONE cterm=reverse
highlight PmenuThumb ctermfg=Cyan ctermbg=NONE cterm=reverse
highlight QuickFixLine ctermfg=LightCyan ctermbg=NONE cterm=bold

" Messages and prompts
highlight ModeMsg ctermfg=LightGreen ctermbg=NONE cterm=bold
highlight MoreMsg ctermfg=Green ctermbg=NONE cterm=bold
highlight Question ctermfg=Green ctermbg=NONE cterm=bold
highlight WarningMsg ctermfg=Yellow ctermbg=NONE cterm=bold
highlight ErrorMsg ctermfg=Red ctermbg=NONE cterm=bold

" Syntax
highlight Comment ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight Constant ctermfg=LightYellow ctermbg=NONE cterm=NONE
highlight String ctermfg=Yellow ctermbg=NONE cterm=NONE
highlight Character ctermfg=Yellow ctermbg=NONE cterm=NONE
highlight Number ctermfg=LightYellow ctermbg=NONE cterm=NONE
highlight Boolean ctermfg=LightYellow ctermbg=NONE cterm=NONE
highlight Float ctermfg=LightYellow ctermbg=NONE cterm=NONE
highlight Identifier ctermfg=NONE ctermbg=NONE cterm=NONE
highlight Function ctermfg=Cyan ctermbg=NONE cterm=NONE
highlight Statement ctermfg=Magenta ctermbg=NONE cterm=bold
highlight Conditional ctermfg=Magenta ctermbg=NONE cterm=bold
highlight Repeat ctermfg=Magenta ctermbg=NONE cterm=bold
highlight Label ctermfg=Magenta ctermbg=NONE cterm=bold
highlight Operator ctermfg=LightBlue ctermbg=NONE cterm=NONE
highlight Keyword ctermfg=Magenta ctermbg=NONE cterm=bold
highlight Exception ctermfg=LightRed ctermbg=NONE cterm=bold
highlight PreProc ctermfg=LightMagenta ctermbg=NONE cterm=NONE
highlight Include ctermfg=LightMagenta ctermbg=NONE cterm=NONE
highlight Define ctermfg=LightMagenta ctermbg=NONE cterm=NONE
highlight Macro ctermfg=LightMagenta ctermbg=NONE cterm=NONE
highlight PreCondit ctermfg=LightMagenta ctermbg=NONE cterm=NONE
highlight Type ctermfg=Blue ctermbg=NONE cterm=NONE
highlight StorageClass ctermfg=Magenta ctermbg=NONE cterm=bold
highlight Structure ctermfg=Blue ctermbg=NONE cterm=NONE
highlight Typedef ctermfg=Blue ctermbg=NONE cterm=NONE
highlight Special ctermfg=LightCyan ctermbg=NONE cterm=NONE
highlight SpecialChar ctermfg=LightCyan ctermbg=NONE cterm=NONE
highlight Tag ctermfg=Magenta ctermbg=NONE cterm=NONE
highlight Delimiter ctermfg=NONE ctermbg=NONE cterm=NONE
highlight SpecialComment ctermfg=DarkGray ctermbg=NONE cterm=bold
highlight Debug ctermfg=Yellow ctermbg=NONE cterm=NONE
highlight Underlined ctermfg=Cyan ctermbg=NONE cterm=underline
highlight Ignore ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight Error ctermfg=Red ctermbg=NONE cterm=bold,underline
highlight Todo ctermfg=LightYellow ctermbg=NONE cterm=bold,underline

" Diffs and spelling
highlight DiffAdd ctermfg=Green ctermbg=NONE cterm=NONE
highlight DiffChange ctermfg=Yellow ctermbg=NONE cterm=NONE
highlight DiffDelete ctermfg=Red ctermbg=NONE cterm=NONE
highlight DiffText ctermfg=LightYellow ctermbg=NONE cterm=bold,underline
highlight Added ctermfg=Green ctermbg=NONE cterm=NONE
highlight Changed ctermfg=Yellow ctermbg=NONE cterm=NONE
highlight Removed ctermfg=Red ctermbg=NONE cterm=NONE
highlight SpellBad ctermfg=Red ctermbg=NONE cterm=underline
highlight SpellCap ctermfg=Yellow ctermbg=NONE cterm=underline
highlight SpellRare ctermfg=Magenta ctermbg=NONE cterm=underline
highlight SpellLocal ctermfg=Cyan ctermbg=NONE cterm=underline

" Diagnostics (Neovim and LSP)
highlight DiagnosticError ctermfg=Red ctermbg=NONE cterm=NONE
highlight DiagnosticWarn ctermfg=Yellow ctermbg=NONE cterm=NONE
highlight DiagnosticInfo ctermfg=Cyan ctermbg=NONE cterm=NONE
highlight DiagnosticHint ctermfg=DarkGray ctermbg=NONE cterm=NONE
highlight DiagnosticOk ctermfg=Green ctermbg=NONE cterm=NONE
highlight DiagnosticUnderlineError ctermfg=Red ctermbg=NONE cterm=underline
highlight DiagnosticUnderlineWarn ctermfg=Yellow ctermbg=NONE cterm=underline
highlight DiagnosticUnderlineInfo ctermfg=Cyan ctermbg=NONE cterm=underline
highlight DiagnosticUnderlineHint ctermfg=DarkGray ctermbg=NONE cterm=underline
highlight DiagnosticUnderlineOk ctermfg=Green ctermbg=NONE cterm=underline
