# Changelog

All notable changes to Stylesmith. Versions follow [Semantic Versioning](https://semver.org).

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
