# Stylesmith

Stylesmith adds color themes, file icon themes, diagnostic decorations, presets, and a small set of visual options to Visual Studio Code. It uses VS Code's extension API and contribution points only. **It does not modify VS Code installation files: it never injects CSS or JavaScript into the workbench or alters `product.json`.** The one exception is a one-time cleanup that removes changes left by Stylesmith 1.x (see below).

## Features

- Seven color themes and four file icon themes contributed through the extension manifest.
- Problem Lens diagnostics shown with editor decorations, gutter icons, inline messages, and a status bar item.
- Presets that select a Stylesmith theme and icon theme, plus supported editor settings.
- Native VS Code settings for smooth caret animation, current-line highlighting, bracket guides, compact layout where supported, and a block terminal cursor.
- Optional font selection through VS Code's `editor.fontFamily` and `terminal.integrated.fontFamily` settings. The selected Nerd Font family must already be installed on your system; Stylesmith does not install or bundle fonts.

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

## Settings

All Stylesmith settings are global user settings. The font settings select a family name; that font must be installed by the user.

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
