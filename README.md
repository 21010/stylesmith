# Stylesmith

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/21010.stylesmith.svg?label=VS%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=21010.stylesmith)
[![GitHub](https://img.shields.io/github/v/release/21010/stylesmith.svg?label=GitHub&color=brightgreen)](https://github.com/21010/stylesmith)

Stylesmith is a safe, high-performance styling engine for Visual Studio Code. It allows you to inject custom CSS and JavaScript directly into the editor UI without compromising VS Code's internal security boundaries.

## Architecture Overview

Stylesmith operates by applying pure, functional transformations to VS Code's core `workbench.html`.

1. **Atomic Patching:** Stylesmith locates the main HTML file and reads it into memory. It injects your requested styles and scripts using precise comment markers (`<!-- !! STYLESMITH-START !! -->`).
2. **File System Safety:** To prevent TOCTOU (Time-of-Check to Time-of-Use) symlink attacks and race conditions, all file writes are atomic. Stylesmith generates a UUID-suffixed temporary file, copies permissions, writes the patched HTML using `COPYFILE_EXCL`, and atomically renames it. If VS Code's folder can't be written to, Stylesmith stops and leaves the file as it was rather than writing it in place. New font files are copied to a separate folder and swapped in only once they are all there.
3. **Restoration:** Before writing, the engine mathematically proves that removing the patch string byte-for-byte restores the exact pristine file. This guarantees that running **Stylesmith: Disable** will safely return VS Code to its factory state.

## Security Model & CSP Compliance

Other customization tools often require disabling VS Code's security policies. Stylesmith explicitly keeps the `Content-Security-Policy` (CSP) active and extends it dynamically.

- **Strict Script Hashing:** For every script you inject, Stylesmith calculates its exact SHA-256 hash at the moment of patching. It appends only these hashes to the `script-src` CSP directive. This ensures your scripts can run, but completely prevents unauthorized dynamic evaluation or injection by malicious extensions.
- **The "Installation appears corrupt" Warning:** Because Stylesmith modifies `workbench.html`, VS Code will flag the installation as unsupported. Stylesmith silences this warning by updating `product.json`, and puts VS Code's original checksum back on Disable, on uninstall, and when you turn `stylesmith.silenceCorruptWarning` off.
- **Commit Verification Lock:** Stylesmith does not blindly calculate checksums on the disk file (which would launder malware hashes). It hashes its own known-good, in-memory string. Furthermore, it records the current Git commit of your VS Code build. When Stylesmith's changes disappear, it offers to re-apply them. If VS Code wasn't updated and the workbench file doesn't match VS Code's own checksum, it warns that the file was changed by something else before you choose.

## Deep Technical Configuration

You can configure Stylesmith via your user `settings.json`. Workspace settings (`.vscode/settings.json`) are strictly ignored for security.

| Setting                            | Type       | Description                                                                                                              |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `stylesmith.imports`               | `string[]` | Array of absolute paths to your custom `.css` and `.js` files.                                                           |
| `stylesmith.allowRemoteImports`    | `boolean`  | Allows `https://` URLs. Modifies CSP `style-src` and `font-src` to permit external servers. (Default: `false`)           |
| `stylesmith.silenceCorruptWarning` | `boolean`  | Updates `product.json` to silence the "[Unsupported]" warning; turning it off brings the warning back. (Default: `true`) |

### Environment Variables

Stylesmith resolves standard variables in your import paths:

- `${env:NAME}`: Your system environment variables.
- `${userHome}`: Your home directory.
- `${workspaceFolder}`: The current workspace root (Disabled in Untrusted Workspaces).

### Trusted Types and DOM API

VS Code uses the Trusted Types API. Stylesmith leaves this enabled. If you write custom JavaScript that modifies the DOM, you cannot use raw string assignments like `innerHTML`.

If `stylesmith.imports` contains a `.js` file, Stylesmith automatically adds the `stylesmith` policy name to the `trusted-types` CSP directive. You must create and use this policy:

```js
const policy = trustedTypes.createPolicy("stylesmith", {
	createHTML: html => html // Implement your own sanitization here
});
document.body.innerHTML = policy.createHTML("<div>Safe HTML</div>");
```

## Built-in Effects

Stylesmith includes hardware-accelerated visual effects that can be enabled independently of your custom CSS.

- **Caret Animation:** Smooth, high-FPS cursor glide. Halts immediately on idle to save CPU.
- **Matrix Rain:** A zero-idle-cost canvas overlay that drops fading matrix characters when you type.
- **CRT Flicker:** Intermittently translates the editor via CSS to mimic a failing CRT monitor.

All visual effects actively query `window.matchMedia('(prefers-reduced-motion: reduce)')`. If your operating system is set to reduce motion, Stylesmith immediately suspends all animations.

## Commands

- **Stylesmith: Enable** - Patches `workbench.html` and restarts the window.
- **Stylesmith: Disable** - Removes all patches and restores the pristine state.

## License

[MIT](LICENSE.txt). Contains code from Custom CSS and JS Loader (MIT).

### All settings in settings.json

You can also set everything in your `settings.json`. Here is every Stylesmith setting with its default value:

```jsonc
{
	"stylesmith.imports": [],
	"stylesmith.allowRemoteImports": false,
	"stylesmith.silenceCorruptWarning": true,
	"stylesmith.effects.caretAnimation": true,
	"stylesmith.effects.neonCurrentLine": true,
	"stylesmith.effects.neonFocusFrame": true,
	"stylesmith.effects.neonSelections": true,
	"stylesmith.effects.neonBlocks": true,
	"stylesmith.effects.diagnosticHighlights": true,
	"stylesmith.effects.neonGlow": false,
	"stylesmith.effects.classicLayout": false,
	"stylesmith.effects.neonTerminal": true,
	"stylesmith.effects.terminalGlow": false,
	"stylesmith.effects.retroTerminalCursor": false,
	"stylesmith.effects.crtScanlines": false,
	"stylesmith.effects.crtFlicker": false,
	"stylesmith.effects.matrixRain": false,
	"stylesmith.effects.typingSparks": false,
	"stylesmith.effects.bootSequence": false,
	"stylesmith.effects.glitchOnSave": false,
	"stylesmith.fonts.enabled": true,
	"stylesmith.fonts.family": "JetBrainsMono",
	"stylesmith.problems.enabled": true,
	"stylesmith.problems.minimumSeverity": "warning",
	"stylesmith.problems.inlineMessages": true,
	"stylesmith.problems.gutterIcons": true,
	"stylesmith.problems.statusBar": true,
	"stylesmith.statusbar": true,
	"stylesmith.remindAfterUpdate": true
}
```

### Settings Stylesmith changes for you

Some effects need one of VS Code's own settings. Stylesmith turns it on while the effect is on, remembers your own value, and puts it back when you turn the effect off or run **Stylesmith: Disable**. You don't need to add these yourself:

| VS Code setting                                                         | Changed by                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| `editor.fontFamily`, `terminal.integrated.fontFamily`                   | `stylesmith.fonts.enabled` (the Nerd Font first) |
| `editor.guides.bracketPairs`                                            | `stylesmith.effects.neonBlocks`                  |
| `window.density.layout`                                                 | `stylesmith.effects.classicLayout`               |
| `terminal.integrated.cursorStyle`, `terminal.integrated.cursorBlinking` | `stylesmith.effects.retroTerminalCursor`         |
