# Changelog

All notable changes to Stylesmith. Versions follow [Semantic Versioning](https://semver.org).

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
