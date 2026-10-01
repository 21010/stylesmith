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

- **[Themes](#color-themes):** six color themes (Neon Night, Phosphor, Amber, Daylight and two high contrast themes), all checked against the WCAG contrast rules and for color blindness.
- **[Icons](#pixel-icons):** Stylesmith Pixel, retro pixel-art icons for about 90 file types.
- **[Fonts](#fonts):** four Nerd Fonts for the editor and terminal, with thousands of icons for prompts and tools.
- **[Effects](#built-in-effects):** a gliding caret, neon highlights, neon code blocks, error and warning highlights, CRT scanlines, typing sparks, a boot sequence and a glitch on save.
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
- **VS Code updates undo Stylesmith.** After each update, run **Stylesmith: Enable** again.
- **The files you add run inside your editor with full access.** Only use files you trust, and prefer files on your own computer.

To go back to normal at any time, run **Stylesmith: Disable**.

## Install

Stylesmith isn't on the Marketplace yet, so you build it yourself:

```sh
git clone https://github.com/21010/stylesmith.git
cd stylesmith
npm install
npx @vscode/vsce package --no-dependencies
code --install-extension stylesmith-1.9.0.vsix
```

You can also install the `.vsix` file from VS Code: open the **Extensions** view, click **⋯**, choose **Install from VSIX…**, and pick the file.

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
4. Click **Restart Visual Studio Code** when asked.

A paint-can button appears in the status bar. Click it for the Stylesmith menu.

## Presets

A preset sets up a complete look in one step: a color theme, the pixel icons, a Nerd Font and a set of effects. Run **Stylesmith: Apply Preset…**, or pick **Apply a preset…** in the status bar menu.

| Preset                | Theme                 | Font           | Extra effects                               |
| --------------------- | --------------------- | -------------- | ------------------------------------------- |
| **Night City**        | Neon Night            | JetBrainsMono  | typing sparks, boot sequence, glitch on save |
| **Phosphor Terminal** | Phosphor              | DepartureMono  | CRT scanlines, boot sequence                |
| **Amber Monitor**     | Amber                 | BlexMono       | CRT scanlines                               |
| **Daylight**          | Daylight              | JetBrainsMono  | none                                        |
| **High Contrast**     | Neon High Contrast    | JetBrainsMono  | none, and no caret animation                |

Every preset also turns on the subtle effects (neon current line, focus frame and selections). Afterwards you can still change anything on its own.

## Status bar menu

Click the paint-can button (`$(paintcan)`) in the status bar to:

- apply a preset
- turn each effect on or off
- pick a font, or go back to your own
- reload, disable, or open Stylesmith's settings

The button shows **off** when Stylesmith isn't active. To hide it, set `"stylesmith.statusbar": false`.

## After VS Code updates

Every VS Code update replaces the file Stylesmith changes, so its changes disappear. When that happens, Stylesmith notices after VS Code starts and asks whether to re-apply them. One click, and VS Code restarts with your setup back. It only asks and never changes anything on its own. To stop the question, choose **Don't Ask Again** or set `"stylesmith.remindAfterUpdate": false`.

## Built-in effects

Stylesmith comes with effects you can use without writing any code. They're applied when you run **Stylesmith: Enable**, even if `stylesmith.imports` is empty. The subtle ones are on by default; the louder ones are waiting for you to turn them on.

| Effect                                    | Setting                             | Default |
| ----------------------------------------- | ----------------------------------- | ------- |
| [Caret animation](#caret-animation)       | `stylesmith.effects.caretAnimation`  | on      |
| [Neon current line](#neon-current-line)   | `stylesmith.effects.neonCurrentLine` | on      |
| [Neon focus frame](#neon-focus-frame)     | `stylesmith.effects.neonFocusFrame`  | on      |
| [Neon selections](#neon-selections)       | `stylesmith.effects.neonSelections`  | on      |
| [Neon code blocks](#neon-code-blocks)     | `stylesmith.effects.neonBlocks`      | on      |
| [Error and warning highlights](#error-and-warning-highlights) | `stylesmith.effects.diagnosticHighlights` | on |
| [CRT scanlines](#crt-scanlines)           | `stylesmith.effects.crtScanlines`    | off     |
| [Typing sparks](#typing-sparks)           | `stylesmith.effects.typingSparks`    | off     |
| [Boot sequence](#boot-sequence)           | `stylesmith.effects.bootSequence`    | off     |
| [Glitch on save](#glitch-on-save)         | `stylesmith.effects.glitchOnSave`    | off     |

After changing any of them, run **Stylesmith: Reload**. None of the effects do any work while you're not typing or moving the cursor.

### Caret animation

On by default. When the text cursor moves, it glides to its new place and leaves a short trail behind it, so it's easier to follow your cursor as you jump around a file.

- It uses your theme's cursor color, with a soft glow, and blinks along with VS Code's cursor.
- It turns itself off if your system is set to reduce motion.
- It doesn't animate while you scroll.
- It does nothing while the cursor is still, so it doesn't use any CPU when you're not moving around.

To turn it off, set `"stylesmith.effects.caretAnimation": false` and run **Stylesmith: Reload**.

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

### Error and warning highlights

On by default. Code with an error gets a soft red-ish background, and code with a warning a soft amber-ish one, on top of VS Code's usual squiggly underline. That makes problems easy to spot when you scroll through a file.

- The colors come from your theme's error and warning colors, so it works with any theme.
- The tint is lighter in light themes. High contrast light themes get a thin outline instead, so text keeps its full contrast.
- Stylesmith's tests check that code stays readable on the highlights in every Stylesmith theme.

### CRT scanlines

Off by default. Faint horizontal lines and slightly darker edges over the whole window, like an old monitor. It's a still image, so it doesn't use any CPU.

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
}
```

Your own files are added after the built-in effects, so your values always win.

## Fonts

Stylesmith comes with four [Nerd Fonts](https://www.nerdfonts.com/): programming fonts with thousands of extra icons for file types, git, terminal prompts and more. When you run **Stylesmith: Enable**, it sets the editor and terminal to use the one you picked. This is on by default.

| `stylesmith.fonts.family`    | Look                                                        | Weights         |
| ---------------------------- | ----------------------------------------------------------- | --------------- |
| `JetBrainsMono` (default)    | Modern and very readable, with ligatures (`=>` `!=` `===`)  | regular, bold   |
| `BlexMono`                   | Classic IBM terminal feel (based on IBM Plex Mono)          | regular, bold   |
| `ShureTechMono`              | Sci-fi, cyberpunk HUD look (based on Share Tech Mono)       | regular         |
| `DepartureMono`              | Pixel-style retro terminal; sharpest at sizes like 11 or 22 | regular         |

How it works:

- **Nothing is installed on your system.** The font is built into Stylesmith. On **Stylesmith: Enable**, the selected font's files are copied into a `stylesmith-fonts` folder next to VS Code's main HTML file and loaded from there. **Stylesmith: Disable** removes the folder again.
- **Your fonts are kept.** Stylesmith puts the Nerd Font first in `editor.fontFamily` and `terminal.integrated.fontFamily` and keeps your current fonts after it, so if anything goes wrong, VS Code simply uses your old font. If your terminal font is empty, it already follows the editor font and is left alone.
- **You can always go back.** **Stylesmith: Disable** puts your font settings back exactly as they were. If you changed a font setting yourself in the meantime, your change is kept.

To use your own font instead, set `"stylesmith.fonts.enabled": false` and run **Stylesmith: Reload**.

The fonts come from Nerd Fonts v3.5.1. The build downloads them from the official release and checks each file against the release's published SHA-256 checksums. All four are free fonts under the [SIL Open Font License](https://openfontlicense.org), and their licenses are included in `assets/fonts/licenses/`.

## Color themes

Stylesmith comes with three dark themes in a retro and cyberpunk style. Pick one with **Preferences: Color Theme** (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>T</kbd>). They work on their own, without running **Stylesmith: Enable**, and the neon effects pick up each theme's accent color automatically.

| Theme                     | Style                                                               |
| ------------------------- | ------------------------------------------------------------------- |
| **Stylesmith Neon Night** | Cyberpunk: deep indigo night, cyan and magenta neon, yellow strings |
| **Stylesmith Phosphor**   | Retro green CRT terminal, with amber numbers                        |
| **Stylesmith Amber**      | Retro amber monochrome monitor                                      |
| **Stylesmith Daylight**   | Retro paper and ink for bright rooms, teal and magenta accents      |
| **Stylesmith Neon High Contrast** | Maximum contrast on black for low vision, with neon accents |
| **Stylesmith Daylight High Contrast** | Maximum contrast on white for low vision                |

### Easy on the eyes

The themes are made for long sessions. Neon is used for accents, and text stays calm and very readable. Every theme is checked automatically against the [WCAG 2](https://www.w3.org/TR/WCAG22/) contrast rules on every change:

| What                                                          | Minimum contrast            |
| ------------------------------------------------------------- | --------------------------- |
| Code text, active line number, tabs, sidebar, inputs          | 7:1 (AAA)                   |
| Every syntax color (including comments), on the current line too | 4.5:1 (AA)               |
| Line numbers, status bar, buttons, badges, terminal colors    | 4.5:1 (AA)                  |
| Cursor, focus outline, active markers, matching brackets      | 3:1 (non-text contrast)     |

Code text also stays below 16:1 and never uses pure white on pure black, which can glare. Comments are at 6:1 or more in every theme, where many themes go well below 4.5:1.

The high contrast themes use VS Code's own high contrast mode, with a clear border around every part of the window. In them, all text reaches at least 7:1, and markers such as the cursor and focus outline at least 4.5:1.

Nested brackets are colored in six neon colors taken from each theme, and every one of them passes the same contrast checks as code text.

The [error and warning highlights](#error-and-warning-highlights) are checked too: every syntax color stays readable on them.

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

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| **Stylesmith: Enable**  | Adds the files from `stylesmith.imports` to VS Code.            |
| **Stylesmith: Reload**  | Does the same as Enable. Use it after you change your files.    |
| **Stylesmith: Disable** | Removes everything Stylesmith added.                            |
| **Stylesmith: Apply Preset…** | Sets a complete look: theme, icons, font and effects.     |
| **Stylesmith: Show Menu** | Opens the Stylesmith menu, the same as the status bar button. |

Restart VS Code to see the change.

## Settings

| Setting                             | Default | What it does                                              |
| ----------------------------------- | ------- | --------------------------------------------------------- |
| `stylesmith.imports`                | `[]`    | A list of `.css` and `.js` files to add, in order.        |
| `stylesmith.allowRemoteImports`     | `false` | Allows `https://` links in `stylesmith.imports`.          |
| `stylesmith.effects.*`              | varies  | Turns each [built-in effect](#built-in-effects) on or off. |
| `stylesmith.fonts.enabled`          | `true`  | Uses a bundled [Nerd Font](#fonts) in the editor and terminal. |
| `stylesmith.fonts.family`           | `"JetBrainsMono"` | Which Nerd Font to use.                     |
| `stylesmith.statusbar`              | `true`  | Shows the Stylesmith button in the status bar.           |
| `stylesmith.remindAfterUpdate`      | `true`  | Offers to re-apply Stylesmith after a VS Code update.     |

Stylesmith only reads these from your **user settings**. Values in a project's `.vscode/settings.json` are ignored.

### File links

Each entry must be a **link (URL), not a plain file path**:

| System  | Example                                                           |
| ------- | ----------------------------------------------------------------- |
| Windows | `file:///C:/Users/me/styles/custom.css` (include the `C:/` part)  |
| macOS   | `file:///Users/me/styles/custom.css`                              |
| Linux   | `file:///home/me/styles/custom.css`                               |
| Web     | `https://example.com/theme.css` (needs `stylesmith.allowRemoteImports`) |

Only `.css` and `.js` files work, up to 5 MB each. They're added in the order you list them.

Web links are off by default because a file on a server can change at any time, and the new version would run in your editor the next time you reload. If you turn them on, only `https://` works: `http://` links and redirects to `http://` are refused.

### Variables

You can use these in `file://` links:

| Variable                     | Becomes                                              |
| ---------------------------- | ---------------------------------------------------- |
| `${userHome}`                | Your home folder                                     |
| `${workspaceFolder}`         | The first folder open in VS Code (trusted workspaces only) |
| `${cwd}`                     | The current working folder (trusted workspaces only) |
| `${execPath}`                | The path to the VS Code program                      |
| `${pathSeparator}` or `${/}` | `\` on Windows, `/` everywhere else                  |
| `${env:NAME}`                | The environment variable `NAME`, or nothing if unset |
| `${env:NAME:default}`        | The environment variable `NAME`, or `default`        |

## Permissions

Stylesmith needs permission to change VS Code's files.

- **Windows:** the normal (per-user) install usually works as is. If VS Code is installed in `Program Files`, run it as Administrator when you enable or disable Stylesmith.
- **macOS and Linux:** if you get a permission error, make yourself the owner of the VS Code folder:

  ```sh
  sudo chown -R "$(whoami)" /usr/share/code                          # most Linux systems
  sudo chown -R "$(whoami)" "/Applications/Visual Studio Code.app"  # macOS
  ```

  Some installs, like Snap and Flatpak, can't be changed at all, so Stylesmith won't work with them.

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

| Rule          | What's added           | Why                                                     |
| ------------- | ---------------------- | ------------------------------------------------------- |
| `script-src`  | a hash of each script  | Lets exactly Stylesmith's scripts run, and nothing else |
| `font-src`    | `data:`                | Lets your CSS use fonts embedded in the CSS itself      |
| `style-src`   | `https:`, only with `stylesmith.allowRemoteImports` | Lets your CSS load stylesheets from the web |
| `font-src`    | `https:`, only with `stylesmith.allowRemoteImports` | Lets your CSS use web fonts            |
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

- **CodeQL**, GitHub's code scanner, with its extended security rules. Runs on every push, every pull request, and weekly.
- **npm audit**, which checks dependencies for known security problems and verifies package signatures. Runs on every push and pull request.
- **Dependency review**, which blocks pull requests that add a dependency with a known security problem.
- **OpenSSF Scorecard**, which checks the project's supply-chain practices. Runs on every push to `main` and weekly.

On top of that, Dependabot keeps dependencies and GitHub Actions up to date, and every GitHub Action is pinned to an exact version.

### Reporting a problem

Please report security problems privately. See [SECURITY.md](SECURITY.md).

## Development

You need Node.js 22 or newer.

```sh
npm install
npm run compile   # build TypeScript into out/
npm run watch     # rebuild when files change
npm test          # build and run the tests
npm run lint      # check the code with ESLint
npm run format    # format the code with Prettier
npm run themes    # rebuild the color themes from scripts/build-themes.mjs
npm run fonts     # download, verify and rebuild the bundled Nerd Fonts
npm run icons     # rebuild the pixel icon theme from scripts/build-icons.mjs
```

```
src/
├── extension.ts   # commands, settings and messages in VS Code
├── patch.ts       # adding and removing changes in the HTML
├── csp.ts         # extending VS Code's security policy
├── effects.ts     # the list of built-in effects and their settings
├── fonts.ts       # the bundled Nerd Fonts and the editor/terminal font settings
├── imports.ts     # reading your files and filling in variables
├── workbench.ts   # finding and saving VS Code's HTML file
├── presets.ts     # the presets and what each one turns on
├── messages.ts    # text shown to the user
└── test/          # tests
themes/            # color themes (generated by scripts/build-themes.mjs)
icons/             # pixel icon theme (generated by scripts/build-icons.mjs)
assets/
├── effects/       # built-in effects (CSS and JS)
├── fonts/         # bundled Nerd Fonts (WOFF2) and their licenses
└── statusbar.js   # the status bar icon
```

Only `extension.ts` uses the VS Code API, so everything else can be tested with plain Node.js.

## License

[MIT](LICENSE.txt). Copyright © 2026 Grzegorz Ziolo. Contains code from Custom CSS and JS Loader, © 2016 Belleve Invis and © 2016 Roberto Huertas, used under the MIT License.

The bundled fonts keep their own licenses (SIL Open Font License 1.1, plus the icon licenses listed by Nerd Fonts); see [assets/fonts/licenses](assets/fonts/licenses).
