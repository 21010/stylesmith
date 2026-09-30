<p align="center">
  <img src="images/logo.png" width="128" height="128" alt="Stylesmith logo">
</p>

<h1 align="center">Stylesmith</h1>

<p align="center">
  <strong>Forge your own VS Code.</strong><br>
  Inject custom CSS and JavaScript into the VS Code workbench, and remove it cleanly.
</p>

> [!NOTE]
> **Stylesmith is an independent fork of [Custom CSS and JS Loader](https://github.com/be5invis/vscode-custom-css)** by Belleve Invis, which itself built on work by Roberto Huertas.
> It started from that codebase but is now a separate project with its own name, extension ID and settings. It is not affiliated with or endorsed by the original authors. Thanks to them for the idea and years of groundwork.

---

## Why Stylesmith?

Stylesmith keeps what made the original useful: your styles and scripts go straight into VS Code's UI. It rebuilds everything underneath for safety, speed and maintainability.

|                            | Custom CSS and JS Loader                              | Stylesmith                                                                                      |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Language**               | Plain JavaScript                                      | Strict **TypeScript**, small single-purpose modules                                            |
| **Runtime dependencies**   | `uuid`, `node-fetch`, `file-url`                      | **None**. Only Node.js and VS Code built-ins                                                   |
| **Startup cost**           | Activates in every window at startup (`*`)            | **Loads only when you run one of its commands**                                                |
| **Undoing a patch**        | Restores from backup files, which pile up over time   | **Byte-exact revert**, no backup files needed                                                   |
| **Content-Security-Policy** | Deleted permanently                                   | Commented out while active and **restored on disable**                                          |
| **Writing VS Code's files** | In-place overwrite                                   | **Atomic write**, plus a check that the patch can be reverted before anything is written       |
| **Loading your files**     | One after another; a bad URL aborts everything        | **In parallel**, with timeouts, HTTP error checks and per-file warnings                         |
| **Your code**              | `$1`, `$&` in your JS could be silently rewritten     | Inserted verbatim; `</script>` / `</style>` inside files can't break the page                   |
| **Quality**                | No tests, no CI                                       | Unit tests (`node:test`), ESLint 9 and Prettier, run in CI on every push                        |

## ⚠️ Before you start

Stylesmith works by **modifying VS Code's own installation files**. That has some consequences:

- VS Code may say its installation **"appears to be corrupt"**. That's expected, because a file changed. Choose **Don't Show Again**.
- A **VS Code update replaces the patched file**, so run **Stylesmith: Enable** again after each update.
- **Anything you load runs with full access to your editor.** Only load files you trust, and prefer `file://` or `https://` URLs over `http://`.

Use it at your own risk. **Stylesmith: Disable** always restores VS Code's original file.

## Installation

Stylesmith isn't on the Marketplace yet. Build and install it from source:

```sh
git clone https://github.com/21010/stylesmith.git
cd stylesmith
npm install
npx @vscode/vsce package --no-dependencies
code --install-extension stylesmith-1.0.0.vsix
```

Or in VS Code: **Extensions** view → **⋯** → **Install from VSIX…** → pick the `.vsix` file.

## Quick start

1. Create a stylesheet, for example `~/.vscode-styles/custom.css`:

   ```css
   .monaco-workbench .part.statusbar {
   	font-weight: 600;
   }
   ```

2. Point Stylesmith at it in your `settings.json`:

   ```json
   "stylesmith.imports": [
   	"file://${userHome}/.vscode-styles/custom.css"
   ]
   ```

3. Run **Stylesmith: Enable** from the Command Palette (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>).
4. Click **Restart Visual Studio Code** when prompted.

A paint-can icon in the status bar shows that Stylesmith is active.

## Commands

| Command                                   | What it does                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| **Stylesmith: Enable**  | Loads every file in `stylesmith.imports` and injects it into VS Code.           |
| **Stylesmith: Reload**  | Same as Enable. Use it after editing your files or settings.                     |
| **Stylesmith: Disable** | Restores VS Code's original workbench file exactly.                              |

Changes take effect after restarting VS Code.

## Settings

| Setting                | Type       | Default | Description                                               |
| ---------------------- | ---------- | ------- | --------------------------------------------------------- |
| `stylesmith.imports`   | `string[]` | `[]`    | URLs of `.css` and `.js` files to inject, in order.       |
| `stylesmith.statusbar` | `boolean`  | `true`  | Show a status bar icon while custom CSS/JS is active.     |

### Import URLs

Entries must be **URLs, not file paths**:

| Kind       | Example                                                  |
| ---------- | -------------------------------------------------------- |
| Windows    | `file:///C:/Users/me/styles/custom.css` (the `C:/` part is required) |
| macOS      | `file:///Users/me/styles/custom.css`                     |
| Linux      | `file:///home/me/styles/custom.css`                      |
| Remote     | `https://example.com/theme.css`                          |

Only `.css` and `.js` files are supported. Files are injected in the order you list them. A file that fails to load is skipped with a warning, and the rest are still applied.

### Variables

`file://` URLs can contain variables:

| Variable                      | Value                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| `${userHome}`                 | Your home directory                                                    |
| `${workspaceFolder}`          | The first folder of the open workspace                                 |
| `${cwd}`                      | The extension host's working directory                                 |
| `${execPath}`                 | The VS Code executable                                                 |
| `${pathSeparator}` or `${/}`  | `\` on Windows, `/` elsewhere                                          |
| `${env:NAME}`                 | Environment variable `NAME` (empty if unset)                           |
| `${env:NAME:fallback}`        | Environment variable `NAME`, or `fallback` if unset                    |

## Permissions

Stylesmith needs write access to VS Code's installation.

- **Windows:** a per-user install (the default) usually just works. For a system-wide install under `Program Files`, run VS Code as Administrator when enabling or disabling.
- **macOS / Linux:** VS Code must be able to modify itself. If you get a permission error, take ownership of the installation directory, for example:

  ```sh
  sudo chown -R "$(whoami)" /usr/share/code                                  # most Linux distributions
  sudo chown -R "$(whoami)" "/Applications/Visual Studio Code.app"         # macOS
  ```

  Package-manager installs (Snap, Flatpak, some distribution packages) may be read-only, and Stylesmith can't patch those.

## Migrating from Custom CSS and JS Loader

1. Install Stylesmith, then **uninstall Custom CSS and JS Loader**. Running both would make them fight over the same file.
2. Rename `vscode_custom_css.imports` to `stylesmith.imports` in your settings. Until you do, Stylesmith falls back to the old setting.
3. Run **Stylesmith: Enable**.

Stylesmith recognizes the original extension's patches, removes them, and deletes the backup files it left behind. If the original extension had already deleted VS Code's Content-Security-Policy, the next VS Code update will restore it.

## How it works

1. Stylesmith finds VS Code's `workbench.html`. It supports the old and new VS Code layouts, the ESM build and Cursor.
2. It loads your files in parallel and inlines them as `<style>` and `<script>` tags in the page's `<head>`, so auxiliary windows get them too.
3. VS Code's Content-Security-Policy would block inline code, so Stylesmith wraps it in a marked comment instead of deleting it.
4. Before writing, it checks that removing its markers gives back the original file exactly. Then it replaces the file atomically.

Disabling removes the markers, which gives back the original file byte for byte.

## Development

Requires Node.js 22+.

```sh
npm install
npm run compile        # TypeScript → out/
npm run watch          # recompile on change
npm test               # compile + unit tests
npm run lint           # ESLint
npm run format         # Prettier
```

```
src/
├── extension.ts   # VS Code entry point: commands, settings, notifications
├── patch.ts       # pure HTML transforms: patch / unpatch / wrapImport
├── imports.ts     # URL variables and loading CSS/JS from file:// and https://
├── workbench.ts   # finding VS Code's workbench, atomic writes, legacy cleanup
├── messages.ts    # user-facing strings
└── test/          # unit tests (node:test)
assets/statusbar.js  # status bar indicator injected into the workbench
```

Only `extension.ts` depends on the VS Code API. Everything else is plain Node.js and fully unit-testable.

## License

[MIT](LICENSE.txt). Copyright © 2026 Grzegorz Ziolo. Includes code from Custom CSS and JS Loader, © 2016 Belleve Invis and © 2016 Roberto Huertas, used under the MIT License.
