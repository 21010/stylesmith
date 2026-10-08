# Stylesmith

Stylesmith adds color themes, file icon themes, diagnostic decorations, presets, and a small set of visual options to Visual Studio Code. It uses VS Code's extension API and contribution points only. **It does not modify VS Code installation files: it never injects CSS or JavaScript into the workbench or alters `product.json`.** The one exception is a one-time cleanup that removes changes left by Stylesmith 1.x (see below).

## Features

- Seven color themes and four file icon themes contributed through the extension manifest.
- Problem Lens diagnostics shown with editor decorations, gutter icons, inline messages, and a status bar item.
- Presets that select a Stylesmith theme and icon theme, plus supported editor settings.
- Native VS Code settings for smooth caret animation, current-line highlighting, bracket guides, compact layout where supported, a block terminal cursor, and dimming unfocused editors.
- Optional font selection through VS Code's `editor.fontFamily` and `terminal.integrated.fontFamily` settings. The selected Nerd Font family must be installed on your system: install it yourself, or let Stylesmith install it for your user account after you confirm (see [Installing a font](#installing-a-font)).

CSS effects on workbench UI chrome, canvas animations, and fonts loaded directly from the extension have been removed because VS Code has no supported API for them.

## Security model

Stylesmith does not load workspace-provided or remote CSS/JavaScript. It does not inspect project files or settings to decide what code to run. The extension only changes global user settings through VS Code's configuration API and stores reversible setting state in its extension storage. Its color themes, icon themes, and decorations use documented extension contributions and APIs.

As with any extension, installing Stylesmith means trusting its published extension code. The reduced scope does not make all extension code risk-free; review [SECURITY.md](SECURITY.md) and the source before enterprise deployment.

### Upgrading from Stylesmith 1.x

Stylesmith 1.x patched VS Code's workbench file, copied fonts next to it, and could update the workbench checksum in `product.json`. Because VS Code updates extensions automatically, this version removes those changes when it first starts, and asks you to reload the window:

- It removes only the blocks marked as Stylesmith's from the workbench file, restoring it byte for byte. Changes made by other tools are left alone.
- It removes the `stylesmith-fonts` folder next to the workbench file.
- It puts back the original checksum in `product.json` only if Stylesmith had changed it to match its patched file.

It never asks for administrator rights. If VS Code is installed where your user can't write, Stylesmith tells you once; repair or reinstall VS Code to restore its files.

Settings from 1.x that no longer do anything are removed from your user settings. Three carry over to the current option that changes the same VS Code setting: `effects.neonBlocks` becomes `effects.bracketGuides`, `effects.classicLayout` becomes `effects.compactLayout`, and `effects.retroTerminalCursor` becomes `effects.blockTerminalCursor`. Your list of custom files in `stylesmith.imports` is kept, marked as deprecated, so you can move it to another tool; delete it when you no longer need it.

## Use

Choose a Stylesmith color theme or file icon theme from the normal VS Code selectors, or click the Stylesmith status-bar button to choose a preset. **Stylesmith: Enable** applies the selected native settings; **Stylesmith: Disable** restores settings Stylesmith previously managed. These operations do not require a window reload.

Problem Lens runs independently and updates as diagnostics change. Configure it under `stylesmith.problems`.

## Presets and themes

A preset sets a color theme, a file icon theme and native VS Code settings. Every color theme also works on its own. The [Themes page](https://stylesmith.dev/themes.html) shows each one.

### Presets

- **Night City**: Neon pinks and cyans on deep indigo, the look of a city at night, with pixel file icons and a block cursor in the terminal.
- **Phosphor Terminal**: A late-1970s green-phosphor video terminal: green on near-black, pixel icons in the same greens, and a dense, compact layout.
- **Amber Monitor**: An early-1980s amber monochrome monitor: warm amber tones, matching pixel icons and a compact layout.
- **Black ICE**: A cold white-phosphor screen with ice-blue accents and matching pixel icons, and only the calmer editor settings.
- **Daylight**: Dark ink on a warm, paper-like background for well-lit rooms, with pixel file icons.
- **High Contrast**: The high-contrast theme with borders around every area, no smooth cursor animation, and clear bracket guides.

### Color themes

- **Stylesmith Neon Night**: Neon signs reflected on wet streets at night: hot pink and cyan accents and yellow strings on a deep indigo background.
- **Stylesmith Phosphor**: A late-1970s video terminal with green phosphor: one green range on near-black, with comments dimmed like a fading trace.
- **Stylesmith Amber**: An early-1980s monochrome monitor with amber phosphor: warm amber and orange tones on a dark brown-black background.
- **Stylesmith ICE**: A cold white-phosphor screen at night: pale ice-blue text and accents on a dark blue-grey background.
- **Stylesmith Daylight**: Dark ink on a warm, paper-like background, with deep magenta, blue and brown accents. Made for well-lit rooms.
- **Stylesmith Neon High Contrast**: Neon Night's accents at full strength: white text on black, every text color at least 7:1, and borders around every area.
- **Stylesmith Daylight High Contrast**: Black text on white with dark, saturated accents, every text color at least 7:1, and borders around every area.

## Installing a font

Choosing a font that isn't installed in the Stylesmith menu, or running **Stylesmith: Install Font…**, offers to install it for your user account. Nothing is downloaded unless you choose **Install** in the confirmation dialog, which shows what is downloaded, from where, and where it goes.

- The files come from this repository's [fonts-3.5.1 release](https://github.com/21010/stylesmith/releases/tag/fonts-3.5.1): the Nerd Fonts 3.5.1 Mono Regular and Bold files, unchanged. Each file's size and SHA-256 are built into Stylesmith, and a file that doesn't match is refused before anything is written.
- They go to your own font folder, without administrator rights: `%LOCALAPPDATA%\Microsoft\Windows\Fonts` on Windows (registered under `HKCU`), `~/Library/Fonts` on macOS, and `~/.local/share/fonts/stylesmith` on Linux.
- On macOS the font works right away. On Windows and Linux, quit and reopen VS Code: only then does VS Code see a new font.
- The fonts are under the SIL Open Font License; each font's license is saved in Stylesmith's own storage.
- **Stylesmith: Remove Installed Fonts…** removes the fonts Stylesmith installed, and nothing else.

## Settings

All Stylesmith settings are global user settings. The font settings select a family name; that font must be installed on your system.

### All settings in settings.json

```jsonc
{
	"stylesmith.fonts.enabled": false,
	"stylesmith.fonts.family": "JetBrainsMono",
	"stylesmith.effects.smoothCursor": true,
	"stylesmith.effects.currentLine": true,
	"stylesmith.effects.bracketGuides": true,
	"stylesmith.effects.compactLayout": false,
	"stylesmith.effects.blockTerminalCursor": false,
	"stylesmith.effects.dimUnfocused": false,
	"stylesmith.problems.enabled": true,
	"stylesmith.problems.minimumSeverity": "warning",
	"stylesmith.problems.inlineMessages": true,
	"stylesmith.problems.gutterIcons": true,
	"stylesmith.problems.statusBar": true,
	"stylesmith.statusbar": true
}
```

### Settings Stylesmith changes for you

Stylesmith manages the following VS Code settings while enabled. Disable restores the saved value, unless the user changed that setting while Stylesmith was active; in that case, the newer user value is preserved. Stylesmith also keeps such a change when it re-applies its settings at startup or after a Stylesmith setting changes; running **Stylesmith: Enable** applies its values again.

| VS Code setting                                                         | Stylesmith option                                     |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `editor.fontFamily`, `terminal.integrated.fontFamily`                   | `stylesmith.fonts.enabled`, `stylesmith.fonts.family` |
| `editor.cursorSmoothCaretAnimation`, `editor.cursorBlinking`            | `stylesmith.effects.smoothCursor`                     |
| `editor.renderLineHighlight`                                            | `stylesmith.effects.currentLine`                      |
| `editor.guides.bracketPairs`                                            | `stylesmith.effects.bracketGuides`                    |
| `window.density.layout`                                                 | `stylesmith.effects.compactLayout`                    |
| `terminal.integrated.cursorStyle`, `terminal.integrated.cursorBlinking` | `stylesmith.effects.blockTerminalCursor`              |
| `accessibility.dimUnfocused.enabled`                                    | `stylesmith.effects.dimUnfocused`                     |

Settings that are not available in the installed VS Code version are skipped. Stylesmith writes user (global) settings only, so a workspace or folder value for the same setting takes precedence in that workspace.

Run **Stylesmith: Disable** before uninstalling Stylesmith. VS Code gives an uninstalled extension no way to change settings, so values it applied otherwise stay in your user settings.

## Development

```sh
npm install
npm run compile
npm test
npm run lint
```

See [SECURITY.md](SECURITY.md) for the security boundary and recovery notes.

## Credits

Stylesmith began as a fork of [Custom CSS and JS Loader](https://github.com/be5invis/vscode-custom-css) by Belleve Invis, whose MIT license also carries Roberto Huertas's copyright. Both notices are kept in [LICENSE.txt](LICENSE.txt).

Visual Studio Code is a trademark of Microsoft. Stylesmith is not affiliated with Microsoft. Theme and preset names and stories describe their inspiration in our own words and don't refer to any film, game or product.
