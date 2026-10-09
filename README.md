# Stylesmith

**One click for a complete look in VS Code and your terminal: a color theme, pixel file icons and editor settings that belong together, with a matching Nerd Font if you want one. One click to undo it.**

Pick a preset, such as a green-phosphor terminal, a neon city at night or a calm blue-grey studio, and Stylesmith applies it through VS Code's own settings. It can install the matching Nerd Font for you after you confirm, and the optional Oh My Posh prompt gives your terminal the same colors. **Stylesmith: Disable** puts your own theme, icons and settings back.

Every theme is checked for contrast and color blindness: contrast for text, syntax and markers, and simulated color blindness for errors, warnings, git and terminal colors (see the [ergonomics page](https://stylesmith.dev/ergonomics.html) for exactly what is and isn't tested). By default, Problem Lens shows problems on their line with shapes and words, not color alone.

Stylesmith uses only VS Code's extension API. It does not modify VS Code installation files: it never injects CSS or JavaScript into the workbench or alters `product.json`. The one exception is a one-time cleanup that removes changes left by Stylesmith 1.x (see below). Glow, scanlines and other effects that need such changes aren't available.

## Features

- Nineteen color themes, four file icon themes and a pixel product icon theme, Stylesmith Pixel, for VS Code's own interface icons (the activity bar, view actions, the status bar), contributed through the extension manifest.
- Problem Lens diagnostics shown with editor decorations, gutter icons, inline messages, and a status bar item.
- Presets that select a Stylesmith theme and icon theme, plus supported editor settings.
- Native VS Code settings for smooth caret animation, current-line highlighting, bracket guides, compact layout where supported, block cursors in the editor and terminal, and dimming unfocused editors.
- Optional font selection through VS Code's `editor.fontFamily` and `terminal.integrated.fontFamily` settings. The selected Nerd Font family must be installed on your system: install it yourself, or let Stylesmith install it for your user account after you confirm (see [Installing a font](#installing-a-font)).

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

Choose a Stylesmith color theme, file icon theme or product icon theme from the normal VS Code selectors (**Preferences: Product Icon Theme** for the interface icons), or click the Stylesmith status-bar button to choose a preset. **Stylesmith: Enable** applies the selected native settings; **Stylesmith: Disable** restores the settings Stylesmith manages, including the color theme and icon themes a preset chose. These operations do not require a window reload.

Problem Lens runs independently and updates as diagnostics change. Configure it under `stylesmith.problems`. With `stylesmith.problems.errorSignal` on, the status bar briefly shows the new error count whenever it goes up.

With `stylesmith.undoHighlight` on, the lines an undo changed are tinted for a moment. Themes can change the tint with the `stylesmith.undoHighlightBackground` color.

With `stylesmith.saveReceipt` on, a manual save is noted at the end of the cursor's line for two seconds, like a terminal log: `▸ saved 14:02:11`. Auto-saves get no note, and a Problem Lens message on the line takes precedence. Themes can change its color with `stylesmith.saveReceiptForeground`.

Run **Stylesmith: Boot Sequence** to see a short boot log typed out in a terminal tab, in the style of the active theme's preset (a memory check for Phosphor Terminal, a self-test for Amber Monitor, a shelter console for Vault); any key closes it. With `workbench.reduceMotion` set to `on`, the whole log appears at once.

Run **Stylesmith: Digital Rain** to watch characters fall down a terminal tab, in your theme's terminal greens; any key closes it. It draws only while its tab is the active terminal in a focused window. With `workbench.reduceMotion` set to `on`, it shows one still frame. Stylesmith can't read the system's reduced-motion preference, so set that setting if you want no animation.

## Presets and themes

A preset sets a color theme, a file icon theme, a product icon theme for VS Code's own interface icons, and native VS Code settings. Every color theme also works on its own. The [Themes page](https://stylesmith.dev/themes.html) shows each one.

### Presets

- **Night City**: Neon pinks and cyans on deep indigo, the look of a city at night, with pixel file icons and a block cursor in the terminal.
- **Phosphor Terminal**: A late-1970s green-phosphor video terminal: green on near-black, pixel icons in the same greens, a dense, compact layout, and block cursors that blink without animation.
- **Amber Monitor**: An early-1980s amber monochrome monitor: warm amber tones, matching pixel icons, a compact layout, and block cursors that blink without animation.
- **Black ICE**: A cold white-phosphor screen with ice-blue accents and matching pixel icons, and only the calmer editor settings.
- **Monolith**: Blue-grey stone with one deep blue accent, and only the quiet editor settings. Editors you aren't working in are dimmed, so the one in use stands out.
- **Glass Lab**: Warm concrete greys, soft off-white text and one coral accent, with the quiet editor settings and dimmed unfocused editors.
- **Vault**: Deep navy and bright vault yellow, an optimistic 1950s vision of the future, with a block cursor in the terminal.
- **Simulation**: A greyed, green-cast city where only the code glows: a late-1990s film world, with a block cursor in the terminal.
- **Steel and Rust**: Cold blue-grey steel and dim light, with rust for what matters: the real world outside the simulation, with dimmed unfocused editors.
- **Brass**: Brass and copper on dark bronze, with verdigris in the strings, and only the calm settings, for slow and careful thinking.
- **Tea Garden**: A sunlit greenhouse: off-white with a hint of green, moss text, and leaf, sunflower and terracotta accents, with only a smooth cursor and the current line.
- **Sunroom**: Soft sunlight on pale walls: warm cream, muted grey-blue structure and peach accents, with unfocused editors dimmed.
- **Countdown**: Cold grey-black with faint cyan structure and every number in red, like a countdown, with unfocused editors dimmed.
- **Overlay**: A security unit's view of the world: cyan interface overlays and amber alerts on dark slate, with a block cursor in the terminal.
- **Deep Desert**: Sand and ochre under a harsh sun, on the black of rock interiors, with one deep blue for the moments that change the flow.
- **Haze**: Orange dust over cold concrete, with teal rain: a muted, modern noir, with unfocused editors dimmed.
- **Daylight**: Dark ink on a warm, paper-like background for well-lit rooms, with pixel file icons.
- **High Contrast**: The high-contrast theme with borders around every area, no smooth cursor animation, and clear bracket guides.

### Color themes

- **Stylesmith Neon Night**: Neon signs reflected on wet streets at night: hot pink and cyan accents and yellow strings on a deep indigo background.
- **Stylesmith Phosphor**: A late-1970s video terminal with green phosphor: one green range on near-black, with comments dimmed like a fading trace.
- **Stylesmith Amber**: An early-1980s monochrome monitor with amber phosphor: warm amber and orange tones on a dark brown-black background.
- **Stylesmith ICE**: A cold white-phosphor screen at night: blue-white text, accents and syntax on a dark blue-grey background.
- **Stylesmith Monolith**: Blue-grey stone and a single deep blue accent: a calm, minimal dark theme, with syntax in quiet greys and sage.
- **Stylesmith Glass Lab**: Warm concrete greys, soft off-white text and one coral accent. Errors lean magenta and deleted lines orange, so neither reads as the accent.
- **Stylesmith Vault**: A deep navy shelter with warm off-white text and a bright yellow accent: the upbeat look of a 1950s vision of the future.
- **Stylesmith Simulation**: A charcoal city with a faint green cast: greyed text and syntax, keywords in glowing code green, a warm red for return, break and throw, and blue for constants.
- **Stylesmith Steel and Rust**: Cold blue-grey steel and dim light: steel-blue keywords, rust for numbers and control flow, and muted brass strings.
- **Stylesmith Brass**: Dark bronze-brown with warm cream text: brass keywords, copper functions and numbers, and verdigris strings and types.
- **Stylesmith Tea Garden**: Light: warm off-white with a hint of green, dark moss text, leaf-green keywords, terracotta strings and sunflower numbers.
- **Stylesmith Sunroom**: Light: pale warm cream, grey-blue keywords and types, peach strings and soft sunlit numbers, low in saturation.
- **Stylesmith Countdown**: Neutral grey-black, pale steel text, faint cyan keywords and types, and one red: every number.
- **Stylesmith Overlay**: Dark slate with cyan keywords like interface overlays, and amber strings and numbers like alerts. Utilitarian, not neon.
- **Stylesmith Deep Desert**: Near-black brown with sand text, spice-orange keywords, ochre strings, and a deep blue for return, break and throw.
- **Stylesmith Haze**: Cold grey concrete with haze-orange keywords and teal strings; everything else muted.
- **Stylesmith Daylight**: Dark ink on a warm, paper-like background, with deep magenta, blue and brown accents. Made for well-lit rooms.
- **Stylesmith Neon High Contrast**: Neon Night's accents at full strength: white text on black, every text color at least 7:1, and borders around every area.
- **Stylesmith Daylight High Contrast**: Black text on white with dark, saturated accents, every text color at least 7:1, and borders around every area.

## Installing a font

Choosing a font that isn't installed in the Stylesmith menu, or running **Stylesmith: Install Font…**, offers to install it for your user account. Nothing is downloaded unless you choose **Install** in the confirmation dialog, which shows what is downloaded, from where, and where it goes.

- The files come from this repository's [fonts-3.5.1-r2 release](https://github.com/21010/stylesmith/releases/tag/fonts-3.5.1-r2): the Nerd Fonts 3.5.1 Mono Regular and Bold files, unchanged. Each file's size and SHA-256 are built into Stylesmith, and a file that doesn't match is refused before anything is written.
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
	"stylesmith.effects.blockCursor": false,
	"stylesmith.effects.blockTerminalCursor": false,
	"stylesmith.effects.dimUnfocused": false,
	"stylesmith.effects.readableTerminal": false,
	"stylesmith.problems.enabled": true,
	"stylesmith.problems.minimumSeverity": "warning",
	"stylesmith.problems.inlineMessages": true,
	"stylesmith.problems.gutterIcons": true,
	"stylesmith.problems.statusBar": true,
	"stylesmith.problems.errorSignal": false,
	"stylesmith.statusbar": true,
	"stylesmith.undoHighlight": false,
	"stylesmith.saveReceipt": false
}
```

### Settings Stylesmith changes for you

Stylesmith manages the following VS Code settings while enabled. Disable restores the saved value, unless the user changed that setting while Stylesmith was active; in that case, the newer user value is preserved. Stylesmith also keeps such a change when it re-applies its settings at startup or after a Stylesmith setting changes; running **Stylesmith: Enable** applies its values again.

| VS Code setting                                                             | Stylesmith option                                     |
| --------------------------------------------------------------------------- | ----------------------------------------------------- |
| `workbench.colorTheme`, `workbench.iconTheme`, `workbench.productIconTheme` | the preset you apply                                  |
| `editor.fontFamily`, `terminal.integrated.fontFamily`                       | `stylesmith.fonts.enabled`, `stylesmith.fonts.family` |
| `editor.cursorSmoothCaretAnimation`, `editor.cursorBlinking`                | `stylesmith.effects.smoothCursor`                     |
| `editor.renderLineHighlight`                                                | `stylesmith.effects.currentLine`                      |
| `editor.guides.bracketPairs`                                                | `stylesmith.effects.bracketGuides`                    |
| `window.density.layout`                                                     | `stylesmith.effects.compactLayout`                    |
| `editor.cursorStyle`                                                        | `stylesmith.effects.blockCursor`                      |
| `terminal.integrated.cursorStyle`, `terminal.integrated.cursorBlinking`     | `stylesmith.effects.blockTerminalCursor`              |
| `accessibility.dimUnfocused.enabled`                                        | `stylesmith.effects.dimUnfocused`                     |
| `terminal.integrated.minimumContrastRatio`                                  | `stylesmith.effects.readableTerminal`                 |

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
