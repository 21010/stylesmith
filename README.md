<p align="center">
  <img src="images/logo.png" width="128" height="128" alt="Stylesmith logo">
</p>

<h1 align="center">Stylesmith</h1>

<p align="center">
  <strong>A safe way to customize VS Code:</strong> your own CSS and JS, with its security policy kept on.<br>
  <strong>A retro and cyberpunk style kit:</strong> themes, icons, fonts and effects.
</p>

> [!NOTE]
> Stylesmith is a fork of [Custom CSS and JS Loader](https://github.com/be5invis/vscode-custom-css) by Belleve Invis, which was based on work by Roberto Huertas. Thank you both for the idea and the years of work behind it.
> Stylesmith is a separate project. It has its own name, extension ID and settings, and it isn't connected to the original project.

## What it does

### A safe way to customize VS Code

VS Code doesn't let extensions change its interface with your own CSS. Stylesmith adds your CSS and JS files to VS Code's window, so you can change fonts, colors, spacing, or anything else you can reach with CSS.

Code in VS Code's window can see everything you open in VS Code, so this has to be done with security in mind. To make custom code run, tools like this usually switch off VS Code's security policy (its Content-Security-Policy) for as long as they're active. That doesn't just let your code in. It lets **any** script in.

Stylesmith keeps VS Code's security policy on:

- **Only your code runs.** Stylesmith allows exactly the scripts it adds, identified by a fingerprint (hash) of each one. Any other script trying to run in VS Code's window is still blocked, just as it would be without Stylesmith.
- **Only you decide what's added.** Stylesmith reads its settings from your user settings only. A project you open can't slip in its own code through its workspace settings.
- **Untrusted projects stay untrusted.** Imports that point into your workspace folder are skipped until you trust that workspace.
- **Local files by default.** Files from the web are off until you turn them on. `http://` is never allowed.

The [Security](#security) section has the details.

### A retro and cyberpunk style kit

Everything you need for a retro or cyberpunk VS Code, ready to use:

- **[Themes](#color-themes):** seven color themes (Neon Night, Phosphor, Amber, ICE, Daylight and two high contrast themes), all checked against the WCAG contrast rules and for color blindness.
- **[Icons](#pixel-icons):** Stylesmith Pixel, retro pixel-art icons for about 90 file types.
- **[Fonts](#fonts):** four Nerd Fonts for the editor and terminal, with thousands of icons for prompts and tools.
- **[Problem Lens](#problem-lens):** errors and warnings right on their line, with pixel gutter icons and terminal-style messages.
- **[Effects](#built-in-effects):** a gliding caret, neon highlights, neon code blocks, solid problem underlines, CRT scanlines, typing sparks, a boot sequence and a glitch on save.
- **[Presets](#presets):** a complete look in one step, such as Night City or Phosphor Terminal.

Each part works on its own. The effects follow any theme, including ones that aren't from Stylesmith, and the themes and icons work even without running **Stylesmith: Enable**.

## More about how it works

- **You can always undo it.** Stylesmith marks everything it adds. **Stylesmith: Disable** removes it and gives you back VS Code's original file.
- **It checks before it writes.** Stylesmith only saves the change if it knows it can undo it later. It writes to a temporary file first, so a failed save won't leave VS Code broken.
- **It stays out of your way.** At startup it only reads the beginning of one file, to show whether it's on and to notice VS Code updates. The effects do nothing while you're not typing or moving the cursor.
- **One bad file doesn't stop the rest.** If a file can't be loaded, you get a warning and the other files still apply.
- **It's written in TypeScript**, has no runtime dependencies, and has tests that run on every push.

## Before you start

Stylesmith changes VS Code's own files. Keep this in mind:

- VS Code may say its installation **"appears to be corrupt"**. This is expected, because one of its files has changed. Click **Don't Show Again**.
- **VS Code updates undo Stylesmith.** After an update, Stylesmith offers to apply your changes again.
- **The files you add run inside your editor with full access.** Only use files you trust, and prefer files on your own computer.

To go back to normal at any time, run **Stylesmith: Disable**.

## Install

Install **Stylesmith** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=21010.stylesmith): search for "Stylesmith" in the **Extensions** view, or run:

```sh
code --install-extension 21010.stylesmith
```

Each version is also attached to its [GitHub release](https://github.com/21010/stylesmith/releases) as a `.vsix` file, built by GitHub Actions with a signed build provenance. To check that a file was built from this repository, run `gh attestation verify stylesmith-<version>.vsix --repo 21010/stylesmith`. To install it, open the **Extensions** view, click **⋯**, choose **Install from VSIX…**, and pick the file.

## Quick start

1. Create a CSS file, for example `~/.vscode-styles/custom.css`:

    ```css
    .monaco-workbench .part.statusbar {
    	font-weight: 600;
    }
    ```

2. Add it to your `settings.json`:

    ```json
    "stylesmith.imports": [
    	"file://${userHome}/.vscode-styles/custom.css"
    ]
    ```

3. Open the Command Palette (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) and run **Stylesmith: Enable**.
4. Click **Reload Window** when asked.
5. After you edit your CSS file, run **Stylesmith: Reload**. When you change Stylesmith's settings, it offers to reload by itself.

A paint-can button appears in the status bar. Click it for the Stylesmith menu.

## Presets

A preset sets up a complete look in one step: a color theme, the pixel icons, a Nerd Font and a set of effects. Run **Stylesmith: Apply Preset…**, or pick **Apply a preset…** in the status bar menu.

| Preset                | Theme              | Font          | Extra effects                                                                     |
| --------------------- | ------------------ | ------------- | --------------------------------------------------------------------------------- |
| **Night City**        | Neon Night         | JetBrainsMono | neon glow, terminal glow and cursor, typing sparks, boot sequence, glitch on save |
| **Phosphor Terminal** | Phosphor           | DepartureMono | CRT scanlines, boot sequence, classic layout, terminal glow and cursor            |
| **Amber Monitor**     | Amber              | BlexMono      | CRT scanlines, classic layout, terminal glow and cursor                           |
| **Black ICE**         | ICE                | ShureTechMono | neon glow, CRT scanlines, boot sequence, terminal glow and cursor                 |
| **Daylight**          | Daylight           | JetBrainsMono | none                                                                              |
| **High Contrast**     | Neon High Contrast | JetBrainsMono | none, and no caret animation                                                      |

Every preset also turns on the subtle effects (neon current line, focus frame, selections and terminal frame). Afterwards you can still change anything on its own.

To switch presets with a keyboard shortcut, add a key binding (**Preferences: Open Keyboard Shortcuts (JSON)**) with the preset's id: `night-city`, `phosphor-terminal`, `amber-monitor`, `black-ice`, `daylight` or `high-contrast`:

```json
{ "key": "ctrl+alt+n", "command": "stylesmith.applyPreset", "args": "night-city" }
```

## Status bar menu

Click the paint-can button at the right end of the status bar to:

- apply a preset
- turn each effect on or off
- pick a font, or go back to your own
- reload, disable, or open Stylesmith's settings

![The Stylesmith menu, opened from the paint-can button in the status bar](images/menu.png)

The button shows **off** when Stylesmith isn't active. To hide it, set `"stylesmith.statusbar": false`.

## After VS Code updates

Every VS Code update replaces the file Stylesmith changes, so its changes disappear. When that happens, Stylesmith notices after VS Code starts and asks whether to re-apply them. One click, and the window reloads with your setup back. It only asks and never changes anything on its own. To stop the question, choose **Don't Ask Again** or set `"stylesmith.remindAfterUpdate": false`.

## Built-in effects

Stylesmith comes with effects you can use without writing any code. They're applied when you run **Stylesmith: Enable**, even if `stylesmith.imports` is empty. The subtle ones are on by default; the louder ones are waiting for you to turn them on.

| Effect                                                | Setting                                   | Default |
| ----------------------------------------------------- | ----------------------------------------- | ------- |
| [Caret animation](#caret-animation)                   | `stylesmith.effects.caretAnimation`       | on      |
| [Neon current line](#neon-current-line)               | `stylesmith.effects.neonCurrentLine`      | on      |
| [Neon focus frame](#neon-focus-frame)                 | `stylesmith.effects.neonFocusFrame`       | on      |
| [Neon selections](#neon-selections)                   | `stylesmith.effects.neonSelections`       | on      |
| [Neon code blocks](#neon-code-blocks)                 | `stylesmith.effects.neonBlocks`           | on      |
| [Solid problem underlines](#solid-problem-underlines) | `stylesmith.effects.diagnosticHighlights` | on      |
| [Neon glow on code](#neon-glow-on-code)               | `stylesmith.effects.neonGlow`             | off     |
| [Classic layout](#classic-layout)                     | `stylesmith.effects.classicLayout`        | off     |
| [Neon terminal frame](#neon-terminal-frame)           | `stylesmith.effects.neonTerminal`         | on      |
| [Terminal glow](#terminal-glow)                       | `stylesmith.effects.terminalGlow`         | off     |
| [Retro terminal cursor](#retro-terminal-cursor)       | `stylesmith.effects.retroTerminalCursor`  | off     |
| [CRT scanlines](#crt-scanlines)                       | `stylesmith.effects.crtScanlines`         | off     |
| [Typing sparks](#typing-sparks)                       | `stylesmith.effects.typingSparks`         | off     |
| [Boot sequence](#boot-sequence)                       | `stylesmith.effects.bootSequence`         | off     |
| [Glitch on save](#glitch-on-save)                     | `stylesmith.effects.glitchOnSave`         | off     |

When you change any of them in Settings, Stylesmith offers to reload so the change takes effect. None of the effects do any work while you're not typing or moving the cursor.

### Caret animation

On by default. When the text cursor moves, it glides to its new place and leaves a short trail behind it, so it's easier to follow your cursor as you jump around a file.

- It uses your theme's cursor color, with a soft glow, and blinks along with VS Code's cursor.
- It turns itself off if your system is set to reduce motion.
- It doesn't animate while you scroll.
- It does nothing while the cursor is still, so it doesn't use any CPU when you're not moving around.

To turn it off, set `"stylesmith.effects.caretAnimation": false` and choose **Reload** when Stylesmith asks.

The idea comes from [Neovide](https://github.com/neovide/neovide)'s cursor animation and [vscode-neovide-cursor](https://github.com/LengineerC/vscode-neovide-cursor). Stylesmith has its own version, written from scratch.

### Neon current line

On by default. The line with the cursor gets thin neon lines above and below and a faint gradient, like a lit line on a HUD. Its line number glows, with a neon marker in the gutter, so nothing is drawn over your code. Editors you're not typing in keep a dimmer marker, so you can still see where you left off.

### Neon focus frame

On by default. The editor you're typing in gets a soft neon frame, and its active tab gets a glowing underline and label.

### Neon selections

On by default. Selected text, search matches and matching brackets get a soft neon glow, so they're easy to spot.

### Neon code blocks

On by default. The code inside the brackets around your cursor (`()`, `[]` or `{}`) gets a glowing neon line on the left and a soft tint, so you can see at a glance which block you're in. Each nesting level uses its own color from your theme's bracket colors.

It builds on VS Code's bracket pair guides. While the effect is on, Stylesmith sets `"editor.guides.bracketPairs": "active"`, unless you already have bracket guides on. It remembers your own value and puts it back when you turn the effect off or run **Stylesmith: Disable**.

### Solid problem underlines

On by default. Replaces VS Code's squiggly underline under errors, warnings and info messages with a calm, solid underline in the same color. Together with the [Problem Lens](#problem-lens), which marks the whole line, you still see exactly where each problem is. An underline doesn't change the text's background, so code keeps its full contrast.

### Neon glow on code

Off by default. Highlighted code (keywords, strings, names and so on) glows softly in its own color, like a neon sign. Plain text doesn't glow, and a thin dark edge keeps every letter sharp. It only works in dark themes, because on a light background a glow just blurs the text. Change the strength and size under [Colors and strength](#colors-and-strength).

### Classic layout

Off by default. Since version 1.129, VS Code has a rounded "modern" look, with gaps between the panels and tabs that look like buttons. The classic layout brings back square corners, panels side by side, and tabs that look like tabs.

It uses VS Code's own compact layout density (`window.density.layout`) for the gaps, so Stylesmith turns that setting on while the effect is on and puts your setting back afterwards. In VS Code versions without the modern look, it changes nothing.

### Neon terminal frame

On by default. The terminal you're typing in gets a soft neon frame, like the editor's focus frame, in your theme's focus color.

### Terminal glow

Off by default. The terminal's text glows softly, like an old CRT. The terminal draws its text as one image, so the glow has one color: the theme's terminal text color, which suits the green and amber themes best. It only works in dark themes, and it costs nothing measurable, even while a command prints thousands of lines.

### Retro terminal cursor

Off by default. A blinking block cursor in the terminal, like an old console. It sets VS Code's `terminal.integrated.cursorStyle` and `terminal.integrated.cursorBlinking` while it's on, and puts your settings back afterwards.

### CRT scanlines

Off by default. Faint horizontal lines and slightly darker edges over the whole window, like an old monitor. It's a still image on its own GPU layer, so it doesn't use any CPU. On very large screens, blending it over the window costs a little GPU time while you scroll.

### Typing sparks

Off by default. Each key you type throws a few small neon pixel sparks up from the cursor. They arc, fall and fade out in about half a second. Like the caret animation, it turns itself off if your system is set to reduce motion.

### Boot sequence

Off by default. When VS Code starts, a short retro boot log (`> INIT NEURAL LINK ... OK`) types itself out over the window and fades away after about a second and a half. It never blocks your clicks, any key skips it, and it's skipped when your system is set to reduce motion.

### Glitch on save

Off by default. When you save a file, the editor glitches for a moment with a quick red and cyan split. It works for every kind of save: the keyboard, the menu and auto-save. It happens at most every 0.4 seconds, and it's skipped when your system is set to reduce motion.

### Colors and strength

The neon effects use your theme's focus color, so they match any theme. To change the look, add a CSS file to `stylesmith.imports` with any of these:

```css
:root {
	--stylesmith-neon: #ff2bd6; /* neon line and frame color */
	--stylesmith-spark-colors: #00f0ff, #ff2bd6, #f5ff00; /* spark colors */
	--stylesmith-scanlines: 0.2; /* scanline strength, 0.12 by default */
	--stylesmith-glow: 40%; /* neon glow strength, 60% by default */
	--stylesmith-glow-size: 4px; /* neon glow size, 6px by default */
	--stylesmith-terminal-glow-size: 3px; /* terminal glow size, 4px by default */
}
```

Your own files are added after the built-in effects, so your values always win.

## Problem Lens

Errors and warnings, shown right where they are, in the style of the "Error Lens" extension:

```
 ✖  4      const port: number = "2077";     ▸ ERR  Type 'string' is not assignable to type 'number'.
 ⚠  5      let unusedVar = deck.status;      ▸ WARN  'unusedVar' is declared but its value is never read.
 ✖  7      return deck.connect(prot);        ▸ ERR  Cannot find name 'prot'.  +1
```

- **The whole line** gets a soft tint in the theme's error or warning color.
- **A pixel icon in the gutter** shows the kind of problem by its shape: a bold X for errors, a bold ! for warnings, a bold i for info.
- **The message** appears at the end of the line, like a terminal log: `▸ ERR`, `▸ WARN` or `▸ INFO`, the message, and `+2` if the line has more problems.
- **The status bar** shows the problem on the cursor's line, right next to `Ln 12, Col 5`. Click it to open the Problems panel.

It works through VS Code's own API, so it updates live as you type, works with any theme, and doesn't need **Stylesmith: Enable**. Only the [solid problem underlines](#solid-problem-underlines) that replace the squiggly ones need Enable.

Settings, all on by default except info messages:

| Setting                               | What it does                                        |
| ------------------------------------- | --------------------------------------------------- |
| `stylesmith.problems.enabled`         | Turns the Problem Lens on or off.                   |
| `stylesmith.problems.minimumSeverity` | `"error"`, `"warning"` (default) or `"info"`.       |
| `stylesmith.problems.inlineMessages`  | The message at the end of the line.                 |
| `stylesmith.problems.gutterIcons`     | The pixel icon in the gutter.                       |
| `stylesmith.problems.statusBar`       | The problem on the cursor's line in the status bar. |

Made with accessibility in mind:

- **Never color alone.** Every problem also has a shape (the icon) and a word (ERR, WARN, INFO).
- **Readable.** Stylesmith's tests check every Stylesmith theme: code and the message stay readable on the tinted line (4.5:1, or 7:1 in high contrast themes), and the icons stand out from the background (3:1).
- **High contrast themes get no tint,** so text keeps its full contrast; the icon and the message mark the line.
- **Screen readers** hear the status bar item as a full sentence, such as "Error on line 12: Cannot find name 'prot'".

## Fonts

Stylesmith comes with four [Nerd Fonts](https://www.nerdfonts.com/): programming fonts with thousands of extra icons for file types, git, terminal prompts and more. When you run **Stylesmith: Enable**, it sets the editor and terminal to use the one you picked. This is on by default.

| `stylesmith.fonts.family` | Look                                                        | Weights       |
| ------------------------- | ----------------------------------------------------------- | ------------- |
| `JetBrainsMono` (default) | Modern and very readable, with ligatures (`=>` `!=` `===`)  | regular, bold |
| `BlexMono`                | Classic IBM terminal feel (based on IBM Plex Mono)          | regular, bold |
| `ShureTechMono`           | Sci-fi, cyberpunk HUD look (based on Share Tech Mono)       | regular       |
| `DepartureMono`           | Pixel-style retro terminal; sharpest at sizes like 11 or 22 | regular       |

How it works:

- **Nothing is installed on your system.** The font is built into Stylesmith. On **Stylesmith: Enable**, the selected font's files are copied into a `stylesmith-fonts` folder next to VS Code's main HTML file and loaded from there. **Stylesmith: Disable** removes the folder again.
- **Your fonts are kept.** Stylesmith puts the Nerd Font first in `editor.fontFamily` and `terminal.integrated.fontFamily` and keeps your current fonts after it, so if anything goes wrong, VS Code simply uses your old font. If your terminal font is empty, it already follows the editor font and is left alone.
- **You can always go back.** **Stylesmith: Disable** puts your font settings back exactly as they were. If you changed a font setting yourself in the meantime, your change is kept.

To use your own font instead, set `"stylesmith.fonts.enabled": false` and choose **Reload** when Stylesmith asks.

The fonts come from Nerd Fonts v3.5.1. The build downloads them from the official release and checks each file against the release's published SHA-256 checksums. All four are free fonts under the [SIL Open Font License](https://openfontlicense.org), and their licenses are included in `assets/fonts/licenses/`.

## Color themes

Stylesmith comes with seven themes: four dark ones in a retro and cyberpunk style, a light one, and two high contrast ones for low vision. Pick one with **Preferences: Color Theme** (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>T</kbd>). They work on their own, without running **Stylesmith: Enable**, and the neon effects pick up each theme's accent color automatically.

| Theme                                 | Style                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| **Stylesmith Neon Night**             | Cyberpunk: deep indigo night, cyan and magenta neon, yellow strings         |
| **Stylesmith Phosphor**               | Retro green CRT terminal, with amber numbers                                |
| **Stylesmith Amber**                  | Retro amber monochrome monitor                                              |
| **Stylesmith ICE**                    | Cold white phosphor and cyberpunk ICE: iced white, frost cyan and pale blue |
| **Stylesmith Daylight**               | Retro paper and ink for bright rooms, teal and magenta accents              |
| **Stylesmith Neon High Contrast**     | Maximum contrast on black for low vision, with neon accents                 |
| **Stylesmith Daylight High Contrast** | Maximum contrast on white for low vision                                    |

### Easy on the eyes

The themes are made for long sessions. Neon is used for accents, and text stays calm and very readable. Every theme is checked automatically against the [WCAG 2](https://www.w3.org/TR/WCAG22/) contrast rules on every change:

| What                                                             | Minimum contrast        |
| ---------------------------------------------------------------- | ----------------------- |
| Code text, active line number, tabs, sidebar, inputs             | 7:1 (AAA)               |
| Every syntax color (including comments), on the current line too | 4.5:1 (AA)              |
| Line numbers, status bar, buttons, badges, terminal colors       | 4.5:1 (AA)              |
| Cursor, focus outline, active markers, matching brackets         | 3:1 (non-text contrast) |

Code text also stays below 16:1 and never uses pure white on pure black, which can glare. Comments are at 6:1 or more in every theme, where many themes go well below 4.5:1.

The high contrast themes use VS Code's own high contrast mode, with a clear border around every part of the window. In them, all text reaches at least 7:1, and markers such as the cursor and focus outline at least 4.5:1.

Nested brackets are colored in six neon colors taken from each theme, and every one of them passes the same contrast checks as code text.

The [Problem Lens](#problem-lens) is checked too: on a problem's tinted line, every syntax color and the inline message stay readable, and the underline under the exact code stays visible.

### Color blindness

Colors that tell you something must stay apart for everyone. For each theme, a test simulates the three main kinds of color blindness (protanopia, deuteranopia and tritanopia) and checks that these pairs still look clearly different:

- added, modified and deleted lines (in the gutter and in git colors)
- errors and warnings
- red and green in the terminal

That's why the themes mark added lines in teal, modified lines in violet and deleted lines in orange-red, instead of the usual green and red.

## Pixel icons

**Stylesmith Pixel** is a file icon theme with retro 16×16 pixel icons: a page with a colored band and a short pixel label (`JS`, `TS`, `PY`, `</>` and so on), and pixel folders. It covers about 90 file types and common files like `package.json`, `Dockerfile` and `.gitignore`. Pick it with **Preferences: File Icon Theme**.

Each icon has a version for dark and for light themes, and every icon keeps at least 3:1 contrast on the side bar.

## Commands

| Command                       | What it does                                                  |
| ----------------------------- | ------------------------------------------------------------- |
| **Stylesmith: Enable**        | Adds the files from `stylesmith.imports` to VS Code.          |
| **Stylesmith: Reload**        | Does the same as Enable. Use it after you change your files.  |
| **Stylesmith: Disable**       | Removes everything Stylesmith added.                          |
| **Stylesmith: Apply Preset…** | Sets a complete look: theme, icons, font and effects.         |
| **Stylesmith: Show Menu**     | Opens the Stylesmith menu, the same as the status bar button. |

Reload the window (**Developer: Reload Window**) to see the change.

## Settings

| Setting                         | Default           | What it does                                                            |
| ------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `stylesmith.imports`            | `[]`              | A list of `.css` and `.js` files to add, in order.                      |
| `stylesmith.allowRemoteImports` | `false`           | Allows `https://` links in `stylesmith.imports`.                        |
| `stylesmith.effects.*`          | varies            | Turns each [built-in effect](#built-in-effects) on or off.              |
| `stylesmith.fonts.enabled`      | `true`            | Uses a bundled [Nerd Font](#fonts) in the editor and terminal.          |
| `stylesmith.fonts.family`       | `"JetBrainsMono"` | Which Nerd Font to use.                                                 |
| `stylesmith.problems.*`         | varies            | The [Problem Lens](#problem-lens): what it shows, and from which level. |
| `stylesmith.statusbar`          | `true`            | Shows the Stylesmith button in the status bar.                          |
| `stylesmith.remindAfterUpdate`  | `true`            | Offers to re-apply Stylesmith after a VS Code update.                   |

Stylesmith only reads these from your **user settings**. Values in a project's `.vscode/settings.json` are ignored.

### All settings in settings.json

You can also set everything in your `settings.json` (**Preferences: Open User Settings (JSON)**). Here is every Stylesmith setting with its default value:

```jsonc
{
	// Your own CSS and JS files, added in this order.
	"stylesmith.imports": [
		// "file://${userHome}/.vscode-styles/custom.css"
	],
	"stylesmith.allowRemoteImports": false, // allow https:// links in imports (off: only files on your computer)

	// Built-in effects
	"stylesmith.effects.caretAnimation": true, // the cursor glides to where it moves
	"stylesmith.effects.neonCurrentLine": true, // a neon edge on the cursor's line number
	"stylesmith.effects.neonFocusFrame": true, // a neon frame around the editor you're typing in
	"stylesmith.effects.neonSelections": true, // selections and matching brackets glow
	"stylesmith.effects.neonBlocks": true, // the code block around the cursor gets a neon line
	"stylesmith.effects.diagnosticHighlights": true, // solid problem underlines instead of squiggles
	"stylesmith.effects.neonGlow": false, // highlighted code glows (dark themes)
	"stylesmith.effects.classicLayout": false, // square corners instead of VS Code's rounded look
	"stylesmith.effects.neonTerminal": true, // a neon frame around the terminal you're typing in
	"stylesmith.effects.terminalGlow": false, // the terminal's text glows (dark themes)
	"stylesmith.effects.retroTerminalCursor": false, // a blinking block cursor in the terminal
	"stylesmith.effects.crtScanlines": false, // faint scanlines over the window, like an old monitor
	"stylesmith.effects.typingSparks": false, // neon sparks fly from the cursor as you type
	"stylesmith.effects.bootSequence": false, // a retro boot log when VS Code starts
	"stylesmith.effects.glitchOnSave": false, // the editor glitches for a moment when you save

	// Fonts
	"stylesmith.fonts.enabled": true, // use a bundled Nerd Font in the editor and terminal
	"stylesmith.fonts.family": "JetBrainsMono", // JetBrainsMono, BlexMono, ShureTechMono or DepartureMono

	// Problem Lens (applies right away, no reload needed)
	"stylesmith.problems.enabled": true, // show errors and warnings on their line
	"stylesmith.problems.minimumSeverity": "warning", // "error", "warning" or "info"
	"stylesmith.problems.inlineMessages": true, // the message at the end of the line
	"stylesmith.problems.gutterIcons": true, // the pixel icon next to the line number
	"stylesmith.problems.statusBar": true, // the problem on the cursor's line, in the status bar

	// Other
	"stylesmith.statusbar": true, // the paint-can button that opens the menu
	"stylesmith.remindAfterUpdate": true, // offer to re-apply after a VS Code update

	// Stylesmith's themes and icons (a preset sets these for you)
	"workbench.colorTheme": "Stylesmith Neon Night",
	"workbench.iconTheme": "stylesmith-pixel"
}
```

When you change an effect, the font or your imports, Stylesmith offers to reload so the change takes effect.

### Settings Stylesmith changes for you

Some effects need one of VS Code's own settings. Stylesmith turns it on while the effect is on, remembers your own value, and puts it back when you turn the effect off or run **Stylesmith: Disable**. You don't need to add these yourself:

| VS Code setting                                                         | Changed by                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| `editor.fontFamily`, `terminal.integrated.fontFamily`                   | `stylesmith.fonts.enabled` (the Nerd Font first) |
| `editor.guides.bracketPairs`                                            | `stylesmith.effects.neonBlocks`                  |
| `window.density.layout`                                                 | `stylesmith.effects.classicLayout`               |
| `terminal.integrated.cursorStyle`, `terminal.integrated.cursorBlinking` | `stylesmith.effects.retroTerminalCursor`         |

### File links

Each entry must be a **link (URL), not a plain file path**:

| System  | Example                                                                 |
| ------- | ----------------------------------------------------------------------- |
| Windows | `file:///C:/Users/me/styles/custom.css` (include the `C:/` part)        |
| macOS   | `file:///Users/me/styles/custom.css`                                    |
| Linux   | `file:///home/me/styles/custom.css`                                     |
| Web     | `https://example.com/theme.css` (needs `stylesmith.allowRemoteImports`) |

Only `.css` and `.js` files work, up to 5 MB each. They're added in the order you list them.

Web links are off by default because a file on a server can change at any time, and the new version would run in your editor the next time you reload. If you turn them on, only `https://` works: `http://` links and redirects to `http://` are refused. Network paths (`file://server/share/...`) are refused too.

#### Pinning a file

To make sure a file is exactly the one you checked, add its SHA-256 fingerprint to the end of the link, in the same format browsers use for Subresource Integrity:

```json
"stylesmith.imports": [
	"https://example.com/theme.css#sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="
]
```

If the file changes, Stylesmith refuses it and shows its new fingerprint, so you can check the change and update the pin. This works for local files too, and it's a good idea for every web link.

### Variables

You can use these in `file://` links:

| Variable                     | Becomes                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `${userHome}`                | Your home folder                                           |
| `${workspaceFolder}`         | The first folder open in VS Code (trusted workspaces only) |
| `${cwd}`                     | The current working folder (trusted workspaces only)       |
| `${execPath}`                | The path to the VS Code program                            |
| `${pathSeparator}` or `${/}` | `\` on Windows, `/` everywhere else                        |
| `${env:NAME}`                | The environment variable `NAME`, or nothing if unset       |
| `${env:NAME:default}`        | The environment variable `NAME`, or `default`              |

## Uninstalling

You don't have to run **Stylesmith: Disable** before uninstalling. When VS Code restarts after you uninstall Stylesmith, it puts VS Code's file back to the original and removes the font folder, so none of Stylesmith's changes keep running. Only your editor and terminal font settings stay as they are; they still list your own fonts after the Nerd Font, so VS Code falls back to them.

## Permissions

Stylesmith needs permission to change VS Code's files. If it can't, it shows what to do on your system, with the exact folder, and a **Copy Command** button when a terminal command fixes it. Stylesmith never runs these commands itself.

- **Windows:** the normal (per-user) install works as is. If VS Code is installed for all users (in `Program Files`), run it once as administrator, run **Stylesmith: Enable**, and then open VS Code normally again.
- **macOS:** allow Visual Studio Code under **System Settings > Privacy & Security > App Management** (macOS 13 and newer). If that's not enough, make yourself the owner of VS Code's workbench folder; Stylesmith shows the command. If you started VS Code from the Downloads folder, move it to Applications first.
- **Linux:** make yourself the owner of VS Code's workbench folder; Stylesmith shows the command, which changes only that folder. A VS Code update from your package manager may change the owner back.

Snap, Flatpak and AppImage installs can't be changed at all, so Stylesmith doesn't work with them. Install VS Code from [code.visualstudio.com](https://code.visualstudio.com) instead.

## Coming from Custom CSS and JS Loader

Your setup carries over:

1. Install Stylesmith, then turn off or uninstall Custom CSS and JS Loader. Both change the same file, so use only one.
2. In your settings, rename `vscode_custom_css.imports` to `stylesmith.imports`. Until you do, Stylesmith uses the old setting.
3. Run **Stylesmith: Enable**.

Stylesmith replaces the old extension's changes with its own and deletes the backup files it left behind. If VS Code's security policy line is missing after your earlier setup, the next VS Code update puts it back.

## How it works

1. Stylesmith finds VS Code's main HTML file (`workbench.html`). This works with older and newer VS Code versions, and with Cursor.
2. It loads your files and adds them to the page's `<head>` as `<style>` and `<script>` tags. Extra VS Code windows get them too.
3. It adds the fingerprint (SHA-256 hash) of each added script to VS Code's security policy, so those scripts, and only those, are allowed to run. It keeps a copy of the original policy so it can put it back.
4. Before saving, Stylesmith checks that removing its changes gives back the original file.

## Security

### What Stylesmith changes in VS Code's security policy

Stylesmith keeps VS Code's Content-Security-Policy and adds only this:

| Rule            | What's added                                         | Why                                                          |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `script-src`    | a hash of each script                                | Lets exactly Stylesmith's scripts run, and nothing else      |
| `font-src`      | `data:`                                              | Lets your CSS use fonts embedded in the CSS itself           |
| `style-src`     | `https:`, only with `stylesmith.allowRemoteImports`  | Lets your CSS load stylesheets from the web                  |
| `font-src`      | `https:`, only with `stylesmith.allowRemoteImports`  | Lets your CSS use web fonts                                  |
| `trusted-types` | `stylesmith`, only when you add your own `.js` files | Lets your scripts create HTML in an approved way (see below) |

Everything else stays exactly as VS Code set it. **Stylesmith: Disable** puts the original policy back.

### Notes for script authors

VS Code uses [Trusted Types](https://developer.mozilla.org/docs/Web/API/Trusted_Types_API), and Stylesmith leaves them on. This means you can't put a plain string into `innerHTML`, `outerHTML` or `insertAdjacentHTML`. Either build elements with `document.createElement`, which is what Stylesmith's own scripts do, or create a policy with the name Stylesmith allows:

```js
const policy = trustedTypes.createPolicy("stylesmith", { createHTML: html => html });
element.innerHTML = policy.createHTML("<b>Hello</b>");
```

A policy name can only be used once, so if you have several scripts, create the policy in one of them and share it.

Scripts can't load other scripts from the web. CSS can load images over `https://`, as VS Code itself allows. Fonts and stylesheets from the web need `stylesmith.allowRemoteImports`.

### Automatic checks

Every push and pull request runs:

- **Unit tests** (about 1,700 checks) for the parts that change VS Code: the security policy and script fingerprints, the checks on your files, writing and restoring VS Code's file, and restoring your settings. They also check every theme and icon for contrast (WCAG) and color blindness.
- **Browser tests**, which run the built-in effects in headless Chromium under VS Code's security policy. They check that the effects run without errors, that a changed script is blocked, and that the effects do no work while you're idle.
- **End-to-end test**, which runs Stylesmith inside a real VS Code (the oldest supported version and the current one). It checks that Enable keeps the security policy, that your own files load, and that Disable and uninstalling restore VS Code byte for byte.
- **Type checks and linting** of all code, including the effect scripts, with rules that catch promises that are never awaited and values without a type.
- **npm audit**, which checks dependencies for known security problems and verifies package signatures.
- **CodeQL**, GitHub's code scanner, with its extended security rules. It also runs weekly.

On top of that:

- **Dependency review** blocks pull requests that add a dependency with a known security problem.
- **OpenSSF Scorecard** checks the project's supply-chain practices on every push to `main` and weekly.
- **Dependabot** keeps dependencies and GitHub Actions up to date, and every GitHub Action is pinned to an exact version.

### Reporting a problem

Please report security problems privately. See [SECURITY.md](SECURITY.md).

## Development

You need Node.js 22 or newer.

```sh
npm install
npm run compile            # build TypeScript into out/
npm run watch              # rebuild when files change
npm test                   # build and run the unit tests
npm run test:browser       # run the effects in headless Chromium
npm run test:integration   # run Stylesmith inside a downloaded VS Code
npm run lint               # check the code with ESLint
npm run typecheck:effects  # type-check the effect scripts
npm run format             # format the code with Prettier
npm run themes             # rebuild the color themes
npm run icons              # rebuild the pixel icons
npm run fonts              # download, verify and rebuild the bundled Nerd Fonts
npm run screenshots        # retake the preset screenshots for the website
```

### Releasing

1. Update `version` in `package.json` and add the version to `CHANGELOG.md`.
2. Commit, then tag and push: `git tag v1.2.3 && git push origin main v1.2.3`.
3. The release workflow runs all of CI, builds the `.vsix` with a signed build provenance, and creates the GitHub release.
4. Download the `.vsix` from the release and upload it on the [Marketplace's publisher page](https://marketplace.visualstudio.com/manage): **⋯** next to Stylesmith → **Update**.

The browser tests need Chromium once: `npx playwright-core install chromium-headless-shell`. For the end-to-end test on the oldest supported VS Code, set `VSCODE_VERSION=1.93.0`.

```
src/
├── extension.ts    # starts Stylesmith: connects the parts and registers the commands
├── lifecycle.ts    # Enable, Disable, the check after VS Code updates, and the offer to reload
├── ui.ts           # notifications, the status bar button, the menu and pickers, permission help
├── changes.ts      # which setting changes need a reload, and which ones you made
├── permissions.ts  # the steps to fix a permission problem, for each system and install
├── config.ts       # reading and writing Stylesmith's settings
├── managed.ts      # changing VS Code settings for you and putting yours back
├── store.ts        # Stylesmith's own state file
├── patch.ts        # adding and removing changes in VS Code's HTML file
├── csp.ts          # extending VS Code's security policy
├── imports.ts      # reading your files, checking them, and filling in variables
├── workbench.ts    # finding and writing VS Code's HTML file and the font folder
├── uninstall.ts    # the cleanup that runs when Stylesmith is uninstalled
├── effects.ts      # the list of built-in effects and their settings
├── presets.ts      # the presets and what each one turns on
├── fonts.ts        # the bundled Nerd Fonts and font lists
├── problems.ts     # the Problem Lens: what to show for each problem
├── problemLens.ts  # the Problem Lens: showing it in the editor and status bar
├── color.ts        # contrast and color math, used by the tests and the icon generator
├── messages.ts     # text shown to you
├── test/              # unit tests
├── test-browser/      # browser tests of the effects
└── test-integration/  # the end-to-end test in a real VS Code
assets/
├── effects/        # built-in effects (CSS and JS)
└── fonts/          # bundled Nerd Fonts (WOFF2) and their licenses
scripts/            # generators for the themes, icons, fonts and website screenshots
└── data/           # the theme palettes and the pixel art of the icons
themes/             # color themes (generated)
icons/              # pixel icons (generated)
site/               # the website, stylesmith.dev (published by .github/workflows/pages.yml)
```

Only `extension.ts`, `ui.ts`, `config.ts` and `problemLens.ts` use the VS Code API. Everything else is plain TypeScript and is tested with Node.js alone.

## License

[MIT](LICENSE.txt). Copyright © 2026 Grzegorz Ziolo. Contains code from Custom CSS and JS Loader, © 2016 Belleve Invis and © 2016 Roberto Huertas, used under the MIT License.

The bundled fonts keep their own licenses (SIL Open Font License 1.1, plus the icon licenses listed by Nerd Fonts); see [assets/fonts/licenses](assets/fonts/licenses).
