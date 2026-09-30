<p align="center">
  <img src="images/logo.png" width="128" height="128" alt="Stylesmith logo">
</p>

<h1 align="center">Stylesmith</h1>

<p align="center">
  Add your own CSS and JavaScript to VS Code, without turning off its security.
</p>

> [!NOTE]
> Stylesmith is a fork of [Custom CSS and JS Loader](https://github.com/be5invis/vscode-custom-css) by Belleve Invis, which was based on work by Roberto Huertas. Thank you both for the idea and the years of work behind it.
> Stylesmith is a separate project. It has its own name, extension ID and settings, and it isn't connected to the original project.

## What it does

VS Code doesn't let extensions change its interface with your own CSS. Stylesmith adds your CSS and JS files straight into VS Code's main HTML file, so you can change fonts, colors, spacing, or anything else you can reach with CSS. It also comes with a built-in [caret animation](#caret-animation) that works out of the box.

## Why Stylesmith

Adding code to VS Code's main window is powerful, and that's exactly why it has to be done with security in mind. Code running there can see everything you open in VS Code. This is the main reason Stylesmith exists.

To make your code run, tools like this usually switch off VS Code's security policy (its Content-Security-Policy) for as long as they're active. That doesn't just let your code in. It lets **any** script in.

Stylesmith keeps VS Code's security policy on:

- **Only your code runs.** Stylesmith allows exactly the scripts it adds, identified by a fingerprint (hash) of each one. Any other script trying to run in VS Code's window is still blocked, just as it would be without Stylesmith.
- **Only you decide what's added.** Stylesmith reads its settings from your user settings only. A project you open can't slip in its own code through its workspace settings.
- **Untrusted projects stay untrusted.** Imports that point into your workspace folder are skipped until you trust that workspace.
- **Local files by default.** Files from the web are off until you turn them on. `http://` is never allowed.

The [Security](#security) section has the details.

## More about how it works

- **You can always undo it.** Stylesmith marks everything it adds. **Stylesmith: Disable** removes it and gives you back VS Code's original file.
- **It checks before it writes.** Stylesmith only saves the change if it knows it can undo it later. It writes to a temporary file first, so a failed save won't leave VS Code broken.
- **It stays out of your way.** It doesn't run when VS Code starts, only when you use one of its commands.
- **One bad file doesn't stop the rest.** If a file can't be loaded, you get a warning and the other files still apply.
- **It's written in TypeScript**, has no extra dependencies, and has tests that run on every push.

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
code --install-extension stylesmith-1.2.0.vsix
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

A paint-can icon appears in the status bar while Stylesmith is on.

## Built-in effects

Stylesmith comes with effects you can use without writing any code. They're applied when you run **Stylesmith: Enable**, even if `stylesmith.imports` is empty.

### Caret animation

On by default. When the text cursor moves, it glides to its new place and leaves a short trail behind it, so it's easier to follow your cursor as you jump around a file.

- It follows your theme's cursor color.
- It turns itself off if your system is set to reduce motion.
- It doesn't animate while you scroll.
- It does nothing while the cursor is still, so it doesn't use any CPU when you're not moving around.

To turn it off, set `"stylesmith.effects.caretAnimation": false` and run **Stylesmith: Reload**.

The idea comes from [Neovide](https://github.com/neovide/neovide)'s cursor animation and [vscode-neovide-cursor](https://github.com/LengineerC/vscode-neovide-cursor). Stylesmith has its own version, written from scratch.

## Commands

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| **Stylesmith: Enable**  | Adds the files from `stylesmith.imports` to VS Code.            |
| **Stylesmith: Reload**  | Does the same as Enable. Use it after you change your files.    |
| **Stylesmith: Disable** | Removes everything Stylesmith added.                            |

Restart VS Code to see the change.

## Settings

| Setting                             | Default | What it does                                              |
| ----------------------------------- | ------- | --------------------------------------------------------- |
| `stylesmith.imports`                | `[]`    | A list of `.css` and `.js` files to add, in order.        |
| `stylesmith.allowRemoteImports`     | `false` | Allows `https://` links in `stylesmith.imports`.          |
| `stylesmith.effects.caretAnimation` | `true`  | Turns the built-in caret animation on or off.             |
| `stylesmith.statusbar`              | `true`  | Shows the paint-can icon while Stylesmith is on.          |

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
| `${cwd}`                     | The current working folder                           |
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
| `style-src`   | `https:`               | Lets your CSS load stylesheets from the web             |
| `font-src`    | `https:` and `data:`   | Lets your CSS use web fonts                             |
| `trusted-types` | `stylesmith`         | Lets your scripts create HTML in an approved way (see below) |

Everything else stays exactly as VS Code set it. **Stylesmith: Disable** puts the original policy back.

### Notes for script authors

VS Code uses [Trusted Types](https://developer.mozilla.org/docs/Web/API/Trusted_Types_API), and Stylesmith leaves them on. This means you can't put a plain string into `innerHTML`, `outerHTML` or `insertAdjacentHTML`. Either build elements with `document.createElement`, which is what Stylesmith's own scripts do, or create a policy with the name Stylesmith allows:

```js
const policy = trustedTypes.createPolicy("stylesmith", { createHTML: html => html });
element.innerHTML = policy.createHTML("<b>Hello</b>");
```

A policy name can only be used once, so if you have several scripts, create the policy in one of them and share it.

Scripts can't load other scripts from the web. CSS can load images, fonts and stylesheets over `https://`.

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
```

```
src/
├── extension.ts   # commands, settings and messages in VS Code
├── patch.ts       # adding and removing changes in the HTML
├── csp.ts         # extending VS Code's security policy
├── imports.ts     # reading your files and filling in variables
├── workbench.ts   # finding and saving VS Code's HTML file
├── messages.ts    # text shown to the user
└── test/          # tests
assets/
├── effects/       # built-in effects, like the caret animation
└── statusbar.js   # the status bar icon
```

Only `extension.ts` uses the VS Code API, so everything else can be tested with plain Node.js.

## License

[MIT](LICENSE.txt). Copyright © 2026 Grzegorz Ziolo. Contains code from Custom CSS and JS Loader, © 2016 Belleve Invis and © 2016 Roberto Huertas, used under the MIT License.
