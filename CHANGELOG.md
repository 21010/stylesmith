# Changelog

All notable changes to Stylesmith. Versions follow [Semantic Versioning](https://semver.org).

## Unreleased

### Added

- **Sunroom** (#73), a new color theme and preset: soft sunlight on pale walls: warm cream, muted grey-blue structure and peach accents, with unfocused editors dimmed.
- **Tea Garden** (#72), a new color theme and preset: a sunlit greenhouse: off-white with a hint of green, moss text, and leaf, sunflower and terracotta accents, with only a smooth cursor and the current line.
- **Brass** (#71), a new color theme and preset: brass and copper on dark bronze, with verdigris in the strings, and only the calm settings, for slow and careful thinking.
- **Four more fonts** in the font menu, which Stylesmith can install for you: MonaspiceXe (Monaspace Xenon, slab-serif), RecMonoCasual (Recursive's casual style), MartianMono and 3270 (the IBM 3270 terminal font, Regular only). They come from a new font release, `fonts-3.5.1-r2`, which holds the earlier seven fonts unchanged and the four new ones, each pinned by SHA-256.
- **Stylesmith Pixel product icon theme** (#67): VS Code's own interface icons in the pixel style of the file icons: the activity bar, the explorer's actions, the status bar, tabs and tree chevrons, 24 icons in all. Icons it doesn't draw stay VS Code's own. Choose it with **Preferences: Product Icon Theme**; every preset except High Contrast sets it, and **Disable** puts your own back.
- **Typography per theme** (#68): the retro terminal themes (Phosphor, Amber, ICE) use no italics or bold, as on the terminals of their era; markdown italics are underlined and bold is brighter. The film-inspired themes keep italic comments and parameters, and Neon Night, Vault and Steel and Rust set keywords in bold. Daylight keeps italic comments only, and the high-contrast themes use no italics. Colors and contrast are unchanged.
- **Readable terminal** (`stylesmith.effects.readableTerminal`, off by default, #69): raises VS Code's minimum terminal text contrast from 4.5:1 to 7:1 through `terminal.integrated.minimumContrastRatio`, so VS Code adjusts any terminal color below it, including colors programs choose. The High Contrast preset turns it on.
- **Stylesmith: Boot Sequence** (#82): a short boot log typed out in a terminal tab over about two seconds, with original text for each retro preset (a memory check, a self-test, a shelter console and more) and Stylesmith's own for the other themes. Any key closes it; with `workbench.reduceMotion` set to `on`, the whole log appears at once.
- **Stylesmith: Digital Rain** (#83): characters falling down a terminal tab, in the theme's terminal greens, until any key is pressed. It runs only on request, draws only while its tab is the active terminal in a focused window, and shows one still frame when `workbench.reduceMotion` is `on`.
- **Save receipt** (`stylesmith.saveReceipt`, off by default, #85): after a manual save, a note at the end of the cursor's line for two seconds, like a terminal log: `▸ saved 14:02:11`. Auto-saves get none, and a Problem Lens message on the line takes precedence. Themes can change its color with the new `stylesmith.saveReceiptForeground`.
- **Steel and Rust**, a new color theme and preset: cold blue-grey steel with rust accents, and unfocused editors dimmed. It's the real-world companion to Simulation.

### Changed

- **Digital Rain is now Simulation (#87):** a charcoal city with a faint green cast, greyed syntax, and only the keywords glowing code green. A warm red marks `return`, `break` and `throw`, and blue marks constants. Before, it looked almost the same as Phosphor. If you use it, your choice is kept: the theme keeps its earlier name as its id in your settings, and the preset id `digital-rain` still works in keyboard shortcuts.

### Security

- On Windows, the font installer runs `reg.exe` by its full path (`%SystemRoot%\System32\reg.exe`), so Windows can't run a different `reg` found in another folder first.

### Changed

- Problem Lens only counts errors across files while the error signal is on. Before, it counted on every diagnostics change for every user, although the signal is off by default.
- Installing a font can be cancelled from its progress notification, and a download that stalls ends after two minutes.
- The font menu looks through the font folders once, instead of once per font.
- Once nothing of Stylesmith 1.x is left in VS Code's installation, Stylesmith stops checking it at startup.

## 2.2.0 (2026-10-08)

### Added

- **Four new color themes, each with a preset:** Monolith (calm blue-grey with one deep blue), Glass Lab (warm concrete greys with a coral accent), Vault (navy and vault yellow, retro-futurist) and Digital Rain (layered greens). Monolith and Glass Lab dim unfocused editors; Vault and Digital Rain use a block terminal cursor. All four pass the same contrast and color-blindness checks as the other themes.
- **Block editor cursor** (`stylesmith.effects.blockCursor`, off by default): a terminal-style block cursor in the editor, through VS Code's native `editor.cursorStyle`.
- **Error signal** (`stylesmith.problems.errorSignal`, off by default): when the number of errors goes up, the status bar shows the new count for a moment, on the error background. It shows once, at most every two seconds, so it never flashes.
- **Undo highlight** (`stylesmith.undoHighlight`, off by default): after an undo, the lines it changed are tinted for a moment. Themes can change the tint with the new `stylesmith.undoHighlightBackground` color.
- After about a week of use, Stylesmith asks once what you use it for, with a link to a public GitHub poll. It sends nothing itself, and doesn't ask again whatever you choose.

### Changed

- **Disable now restores your own color theme and icon theme** after a preset changed them, unless you picked another theme yourself in the meantime. The theme and icons a preset chooses are managed settings, like the others.
- The README, Marketplace description and website now lead with what Stylesmith is for: one click for a complete look in VS Code and your terminal, and one click to undo it.
- **Retro terminals refined around their phosphor:** Phosphor's syntax colors now all stay within its green, told apart by brightness, and ICE's numbers and types are blue-white instead of lavender and aqua. Errors, warnings, git and terminal colors are unchanged. Amber was already within its amber.
- **Phosphor Terminal and Amber Monitor** now use block cursors in the editor and terminal that blink without the smooth animation, like the terminals they're modeled on.
- The Themes page groups the presets and themes into retro terminals, film-inspired themes and everyday themes.

## 2.1.0 (2026-10-08)

### Added

- **Dim unfocused editors** (`stylesmith.effects.dimUnfocused`, off by default): turns on VS Code's native `accessibility.dimUnfocused.enabled`, so the editor or terminal you're working in stands out. Like the other effects, **Stylesmith: Disable** puts your own value back.
- **Font installation, on request:** choosing a font that isn't installed, or running **Stylesmith: Install Font…**, offers to install it for your user account. After you confirm, Stylesmith downloads the Nerd Font files from this project's `fonts-3.5.1` release, checks each against a pinned SHA-256, and installs them without administrator rights. On Windows and Linux, quit and reopen VS Code to see the font. **Stylesmith: Remove Installed Fonts…** removes them again.
- Three more font choices: GeistMono, SpaceMono and AtkynsonMono Nerd Font (based on Atkinson Hyperlegible Mono, designed for readers with low vision). Stylesmith can install them for you, or the Fonts page links each download and explains how to install it yourself.
- Every theme now colors VS Code's inline git blame, readable on the editor background and on the current line.

### Changed

- The font menu shows whether each font is installed, instead of labeling every font "install separately".
- The Black ICE preset's description no longer calls its theme high-contrast: ICE is a regular dark theme. The two high-contrast themes are Neon High Contrast and Daylight High Contrast.

## 2.0.1 (2026-10-07)

The first release of Stylesmith 2. Version 2.0.0 was tagged but never released, because its release build stalled on a CI infrastructure problem; 2.0.1 contains the same extension.

Stylesmith now uses only VS Code's extension API. It no longer modifies VS Code's installation, so VS Code updates no longer undo it, and it no longer causes VS Code's "installation appears to be corrupt" warning.

### Breaking changes

- Removed the workbench CSS effects, canvas animations (including Matrix rain, CRT flicker, the boot sequence and typing sparks), custom CSS and JavaScript imports, and the bundled fonts. VS Code has no supported API for them.
- The remaining effects set native VS Code settings and apply without reloading the window: smooth cursor, current-line highlight, bracket pair guides, compact layout and block terminal cursor.
- Font selection now chooses a Nerd Font installed on your system, and is off by default. Install the font first; Stylesmith no longer ships font files.
- Presets set the color theme, icon theme and native settings; they no longer choose a font.

### Upgrading from 1.x

- On first start, Stylesmith removes the changes 1.x made to VS Code's installation: its workbench patch, its font folder, and a `product.json` checksum it had changed. It then asks you to reload the window. It only removes its own changes and never asks for administrator rights; if VS Code's installation isn't writable, it explains how to repair VS Code.
- Settings from 1.x that no longer do anything are removed from your user settings. `effects.neonBlocks`, `effects.classicLayout` and `effects.retroTerminalCursor` carry over to `effects.bracketGuides`, `effects.compactLayout` and `effects.blockTerminalCursor`. `stylesmith.imports` is kept, marked as deprecated, so you can move your custom files to another tool.

### Fixed

- Smooth cursor now also turns on VS Code's smooth caret animation (`editor.cursorSmoothCaretAnimation`), so the cursor actually glides.
- Switching fonts replaces the previously selected Stylesmith font instead of keeping it as a fallback.
- Re-applying settings at startup, or after a Stylesmith setting changes, keeps effect settings you changed yourself. Running **Stylesmith: Enable** still applies Stylesmith's values.
- Applying a preset re-applies settings once instead of once per setting.
- A state lock left by a crash no longer blocks Enable and Disable when its process ID is in use again after a restart.

## 1.18.2 (2026-10-03)

### Added

- **Matrix Rain Effect (`stylesmith.effects.matrixRain`):** A zero-idle-cost canvas overlay that drops fading matrix characters when you type.
- **CRT Flicker Effect (`stylesmith.effects.crtFlicker`):** Occasionally shakes and flickers the editor with slight CSS translations, mimicking a failing CRT monitor. Both new effects correctly respect OS-level reduced motion settings.
- **Automatic Checksum Fixer (`stylesmith.silenceCorruptWarning`):** Silences the VS Code `[Unsupported]` / "Installation appears corrupt" warning by automatically updating `product.json` with the exact SHA-256 hash of the known-good patched string. Includes a strict Commit Verification Lock to prevent automated re-patching if external file tampering is detected without a corresponding VS Code version update.

## 1.17.0 (2026-10-02)

### Added

- **Matching pixel icons for Phosphor, Amber and ICE:** three new file icon themes, Stylesmith Pixel Phosphor, Stylesmith Pixel Amber and Stylesmith Pixel ICE, drawn in each theme's own colors. Files are colored by kind (code, config and data, documents, media), and the labels still tell the file types apart. Every icon keeps at least 3:1 contrast on its theme's side bar, and every label 4.5:1 on its band. With a light theme, they show the regular Stylesmith Pixel icons.
- The Phosphor Terminal, Amber Monitor and Black ICE presets now pick their theme's matching icons. The other presets keep Stylesmith Pixel.
- An optional [Oh My Posh](https://ohmyposh.dev) prompt theme for PowerShell, bash, zsh and fish, in `extras/oh-my-posh/`. It uses the terminal's own colors, so in VS Code it follows the Stylesmith theme you picked. It isn't part of the extension, and Stylesmith never changes your shell profile; see the README for setup.

## 1.16.5 (2026-10-02)

### Tests

- The tests no longer leave a `.workbench-location.json` file in the project folder. Where Stylesmith remembers VS Code's location for the uninstall cleanup is now passed in like its other services, so the tests use their own temporary folder.

## 1.16.4 (2026-10-02)

### Changed

- Changed files in the Explorer, the gutter and diffs now use colors that belong to their theme, instead of the purple shared with Neon Night:
    - **Phosphor**: phosphor green for added, amber for modified, red for deleted.
    - **Amber**: yellow-green for added, a bright near-white amber for modified, red for deleted.
    - **ICE**: mint for added, frost blue for modified, and a warm coral for deleted.

    The new colors pass the same contrast and color blindness checks as the rest of the themes.

### Fixed

- A temporary file left behind by a crash while Stylesmith wrote VS Code's workbench file could make a later Enable fail.

## 1.16.3 (2026-10-01)

### Security

Fixes from a red-team review of Stylesmith:

- Remote imports (`stylesmith.allowRemoteImports`, off by default) followed a redirect through plain `http://` if the chain ended on `https://` again. Someone on the network could change that step and point the import to their own file. Redirects are now followed one at a time, and every step must use `https://`.
- A pinned stylesheet could load other files from the web with `@import` or `url()`, which the pin doesn't cover. Stylesmith now refuses that. Local and `data:` references are still fine.
- A problem's message can contain text from the file, and VS Code drew `$(…)` in it as icons in the Problem Lens status bar item, so a repository could show a fake badge there. The text is now shown as written.
- Saved settings in Stylesmith's state file are read into an object without a prototype, so a damaged or edited file can't change shared objects.

## 1.16.2 (2026-10-01)

### Documentation

- The README shows every Stylesmith setting in a `settings.json` example, with a short comment on each line, and lists the VS Code settings Stylesmith changes for you. A test keeps the example in step with the extension's settings.
- A screenshot of the Stylesmith menu, opened from the paint-can button in the status bar.

## 1.16.1 (2026-10-01)

### Changed

- Cleaner Problem Lens gutter icons: a bold X for errors, without the square around it, a bold ! for warnings, without the triangle, and a bold i for info, without the circle. The colors stay the same, and each kind of problem still has its own shape.
- Problem outlines are now **solid problem underlines**: a calm, solid underline under the exact code instead of a box around it, in the same colors. The setting stays `stylesmith.effects.diagnosticHighlights`.

## 1.16.0 (2026-10-01)

### Added

- **Stylesmith ICE**, a new dark theme: white phosphor on a cold night screen, and the glowing ICE of cyberpunk. Iced white text with frost cyan and pale blue, checked against the WCAG contrast rules and for color blindness like the other themes.
- **Black ICE**, a new preset: the ICE theme, ShureTechMono, glowing code and terminal, CRT scanlines, the boot sequence and the retro terminal cursor.

## 1.15.0 (2026-10-01)

### Added

- **Neon terminal frame**: the terminal you're typing in gets a soft neon frame, like the editor's. On by default and in every preset.
- **Terminal glow**: the terminal's text glows softly in the theme's terminal text color, in dark themes. Off by default; in the Night City, Phosphor Terminal and Amber Monitor presets. Measured in VS Code 1.140 while printing 20,000 lines: no measurable cost.
- **Retro terminal cursor**: a blinking block cursor in the terminal. It sets VS Code's terminal cursor settings while it's on and puts yours back afterwards. Off by default; in the same three presets.

## 1.14.4 (2026-10-01)

### Added

- A **Sponsor** button on Stylesmith's page in VS Code and on GitHub. Stylesmith stays free and open source; sponsoring is a way to support its development: [github.com/sponsors/21010](https://github.com/sponsors/21010).

## 1.14.3 (2026-10-01)

### Changed

- The Marketplace package is now the one built by the release workflow, with a signed build provenance. Version 1.14.2 on the Marketplace was uploaded from a local build with the same code. Nothing changes in how Stylesmith works.

## 1.14.2 (2026-10-01)

### Added

- Stylesmith is on the VS Code Marketplace.
- Every version is built by GitHub Actions with a signed build provenance and attached to its GitHub release.
- A website: [stylesmith.dev](https://stylesmith.dev).

### Changed

- No longer marked as a preview.

## 1.14.1 (2026-10-01)

### Changed

- One click instead of two: after you choose **Reload** when your settings changed, or **Re-apply** after a VS Code update, the window reloads right away instead of asking a second time.
- The button that reloads the window is now called **Reload Window**, which is what it does (it said "Restart Visual Studio Code").
- When Stylesmith has nothing to add, the message offers **Apply a Preset**.
- When Stylesmith isn't allowed to save a change outside VS Code's own files, the message says what failed instead of suggesting admin rights.

### Fixed

- Some settings were typed as always on (for example `stylesmith.fonts.enabled`), so TypeScript would have accepted code that ignored the "off" case. Nothing behaved differently, but the compiler now checks those cases.

### Tests

- Enable with the font turned off removes the font folder; a problem after answering the re-apply question is reported.

## 1.14.0 (2026-10-01)

### Added

- When you change an effect, the font or your imports in Settings, Stylesmith now offers to reload so the change takes effect. Before, nothing happened until you ran **Stylesmith: Reload** yourself. Changes made through Stylesmith's menu and presets reload by themselves, as before.

### Changed

- The code is reorganized so that Enable, Disable and the startup check don't depend on VS Code's API, and are now tested directly. All of Stylesmith's UI is in one place. Nothing changes in how Stylesmith works.
- Stricter TypeScript checks. They found no bugs in Stylesmith itself, but they did find a theme test that had silently stopped checking the terminal colors; it checks them again.

## 1.13.0 (2026-10-01)

### Added

- **Neon glow on code**: highlighted code glows softly in its own color, like a neon sign, in dark themes. Off by default and part of the Night City preset. Strength and size can be changed with `--stylesmith-glow` and `--stylesmith-glow-size`.
- **Classic layout**: square corners, panels side by side and tabs that look like tabs, instead of VS Code's rounded modern look (VS Code 1.129 and newer). It turns on VS Code's compact layout density while it's on and puts your setting back afterwards. Off by default and part of the Phosphor Terminal and Amber Monitor presets.
- **Help when VS Code's files can't be changed**: instead of "run as administrator", Stylesmith shows the steps for your system and install, with the exact folder, and can copy the command that fixes it. It recognizes Snap, Flatpak and AppImage installs, macOS's App Management permission, VS Code started from the Downloads folder on macOS, and installs for all users on Windows. Stylesmith never runs these commands itself.

### Fixed

- A setting an effect needs that doesn't exist in your VS Code version is now skipped, instead of making Enable fail.

## 1.12.1 (2026-10-01)

### Fixed

- Stylesmith's state file could lose its contents when two updates happened at the same time. Disable then couldn't put your font back. Updates now happen one after another.
- A damaged state file made Disable fail. Damaged entries are now skipped and everything else is still restored.
- In very large files (over 1,000 lines with problems), the Problem Lens status bar item showed nothing for problems further down. It now always shows the problem on the cursor's line.

### Tests

- New tests for the state file, the Problem Lens, writing VS Code's file without permission, settings saved by older versions, and more end-to-end steps: your own CSS and JS imports, a missing import, Enable with nothing turned on, and an unknown preset.

## 1.12.0 (2026-10-01)

### Fixed

- Glitch on save didn't glitch for a save in the first moment after VS Code opened.
- If VS Code can't draw on a canvas (for example when the graphics card runs out of memory), the caret animation and typing sparks now stay off instead of failing on every frame.

### Changed

- The code is reorganized into smaller parts, each doing one job. Nothing changes in how Stylesmith works.

### Tests

- The built-in effects are now tested in a headless browser, under VS Code's security policy: no errors, a changed script is blocked, no work while idle, small canvases, and reduced motion respected.
- The effect scripts are type-checked.
- New tests for remote (`https://`) imports: redirects to plain `http://`, error responses, the size limit, and `#sha256` pins.

## 1.11.1 (2026-10-01)

### Fixed

- Apply Preset never finished, so a second preset couldn't be applied and the menu stopped working. Presets now apply fully, one after another.

### Added

- Presets can be bound to keyboard shortcuts, for example with `"args": "night-city"`.

## 1.11.0 (2026-10-01)

### Added

- **Problem Lens**: errors and warnings are shown on their line, like Error Lens. The line gets a soft tint, a pixel icon in the gutter and a terminal-style message (`▸ ERR  message  +2`). The status bar shows the problem on the cursor's line, with a label for screen readers. It works without Enable and updates live. New settings: `stylesmith.problems.*`.

### Changed

- The error and warning highlights effect is now **Problem outlines**: a thin outline around the exact code instead of the squiggly underline.

## 1.10.0 (2026-10-01)

### Added

- Uninstalling Stylesmith now restores VS Code, even if you didn't run Disable first.
- Imports can be pinned with `#sha256-…`. If the file changes, it isn't loaded.

### Fixed

- On older VS Code versions (1.93), Disable could leave the bracket pair guides setting on. Stylesmith now keeps its state in its own file.

## 1.9.0 (2026-10-01)

### Added

- Error and warning highlights: code with errors gets a red tint and code with warnings an amber tint, in the theme's own colors.

## 1.8.0 (2026-10-01)

### Security

- `${cwd}` is only filled in for trusted workspaces, like `${workspaceFolder}`.
- Remote styles and fonts are only allowed when `stylesmith.allowRemoteImports` is on.
- `file://` imports must be on your own computer; network paths are refused.

### Performance

- The caret animation and typing sparks use much smaller canvases.
- Fonts are loaded from a folder next to VS Code's HTML file, which makes that file about 80 times smaller.
- The effects watch only the parts of the page they need.

## 1.7.0 (2026-10-01)

### Added

- Neon code blocks: the code inside the brackets around the cursor is highlighted with a neon line and a soft tint.

## 1.6.1 (2026-10-01)

### Fixed

- The neon current line no longer covers the first character of the line. The marker moved to the line numbers.

## 1.6.0 (2026-10-01)

### Added

- Presets: Night City, Phosphor Terminal, Amber Monitor, Daylight and High Contrast. Each sets the theme, icons, font and effects in one step.
- A status bar button with a menu for presets, effects, fonts, Reload, Disable and settings.
- After a VS Code update, Stylesmith offers to re-apply your changes.
- New effects: neon selections, boot sequence and glitch on save. The last two respect reduced motion.
- New themes: Daylight, Neon High Contrast and Daylight High Contrast.
- Stylesmith Pixel, a pixel-art file icon theme.
- Color blindness checks for every theme.

## 1.5.0 (2026-10-01)

### Added

- Bundled Nerd Fonts (JetBrainsMono, BlexMono, ShureTechMono and DepartureMono) for the editor and terminal. Your own fonts stay as fallbacks, and Disable puts your settings back.

## 1.4.0 (2026-10-01)

### Added

- Retro color themes: Neon Night, Phosphor and Amber, checked against WCAG contrast levels.

## 1.3.0 (2026-09-30)

### Added

- New effects: neon current line, neon focus frame, CRT scanlines and typing sparks.

## 1.2.1 (2026-09-30)

### Changed

- The caret animation feels closer to Neovide's cursor: a soft glow, and a trail that follows the direction of movement.

## 1.2.0 (2026-09-30)

### Security

- VS Code's security policy stays on. Only the exact scripts Stylesmith adds are allowed to run.
- Settings are read from your user settings only, so a project you open can't choose what gets added to VS Code.
- `http://` imports are refused. `https://` imports are off unless you turn them on.
- Imports are limited to 5 MB.

## 1.1.0 (2026-09-30)

### Added

- A built-in caret animation, on by default.

## 1.0.0 (2026-09-30)

First release of Stylesmith, a fork of [Custom CSS and JS Loader](https://github.com/be5invis/vscode-custom-css), rewritten in TypeScript.

- Enable, Disable and Reload restore VS Code's file exactly as it was.
- No runtime dependencies.
- Picks up the settings and leftover changes of Custom CSS and JS Loader.
