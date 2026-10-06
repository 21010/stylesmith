# Stylesmith

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/21010.stylesmith.svg?label=VS%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=21010.stylesmith)
[![GitHub](https://img.shields.io/github/v/release/21010/stylesmith.svg?label=GitHub&color=brightgreen)](https://github.com/21010/stylesmith)

Stylesmith customizes Visual Studio Code with themes, fonts, effects, and optional CSS and JavaScript. To apply workbench styles, it modifies the installed VS Code workbench files and may update `product.json`. This is outside VS Code's supported extension APIs; updates can replace or change those files. Review the security and recovery limits below before adding custom code.

## Architecture Overview

Stylesmith reads VS Code's installed `workbench.html`, adds marked content, and writes the changed file back. The extension also writes bundled font files beside the workbench and may update the matching checksum in `product.json`.

1. **Marked patch:** Stylesmith inserts its additions between markers so it can identify them later. Before writing, it checks that removing its patch from the source string yields the expected unpatched string.
2. **File replacement:** Workbench and metadata writes use a uniquely named temporary file and rename. This avoids writing a partial file in place if a write fails, but it does not guarantee recovery from every crash, filesystem failure, or external change. Font files are prepared in a separate folder before that folder is swapped into place.
3. **Disable and uninstall:** **Stylesmith: Disable** attempts to remove marked additions, remove its font files, restore settings Stylesmith manages, and update VS Code's checksum when applicable. The uninstall hook attempts workbench and font cleanup but does not restore managed user settings; run Disable before uninstalling if you want those settings restored. If cleanup or a checksum update fails, VS Code may need repair or reinstallation. Updates may replace the workbench and require Stylesmith to be enabled again.

## Security Model & CSP Compliance

Stylesmith keeps the installed workbench's `Content-Security-Policy` (CSP) and extends selected directives for its additions. This is a browser policy, not a sandbox for code that runs in the workbench.

- **CSP changes:** Stylesmith adds a SHA-256 source for each inline script it inserts. A hash identifies the script bytes; it does not limit what that script can do or establish that the code is trustworthy. Your own JavaScript runs in VS Code's workbench context with the privileges available there. Only add scripts you trust. Stylesmith also adds `https:` to `style-src` and `font-src` when `stylesmith.allowRemoteImports` is enabled, and adds `data:` to `font-src` for bundled fonts. Existing policy sources are retained.
- **Remote imports:** They are off by default. When enabled, HTTPS imports and HTTPS resources referenced by unpinned CSS can change at the server. A hash pin checks the imported file's bytes, but does not make JavaScript safe; pinned CSS is refused if it loads further network resources.
- **VS Code integrity warning:** When `stylesmith.silenceCorruptWarning` is enabled and VS Code tracks the workbench checksum, Stylesmith writes the checksum for the content it generated to `product.json`. That can suppress VS Code's warning for that content. On Disable or uninstall, Stylesmith attempts to write the checksum of the restored workbench. Turning the setting off lets VS Code report that the workbench differs from its recorded checksum. This checksum is not an authenticity guarantee, and suppressing the warning can make other changes harder to notice.
- **Reapply prompt:** If Stylesmith was enabled but its markers are gone, it may offer to apply the patch again. When the VS Code build identifier is unchanged, it compares the file with the checksum in `product.json` to choose a message. This can reveal a mismatch; it cannot identify who changed the file or detect every modification.

## Deep Technical Configuration

You can configure Stylesmith via your user `settings.json`; it does not read project settings for its imports. In untrusted workspaces, `${workspaceFolder}` and `${cwd}` import substitutions are refused. This is a limit on Stylesmith imports, not a sandbox for other extensions or code.

| Setting                            | Type       | Description                                                                                                                                                                                                                        |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stylesmith.imports`               | `string[]` | URLs of your custom `.css` and `.js` files. While it isn't set, `vscode_custom_css.imports` is used; set it to `[]` for no imports.                                                                                                |
| `stylesmith.allowRemoteImports`    | `boolean`  | Allows `https://` URLs. Modifies CSP `style-src` and `font-src` to permit external servers. (Default: `false`)                                                                                                                     |
| `stylesmith.silenceCorruptWarning` | `boolean`  | When VS Code tracks the workbench, writes the checksum for Stylesmith's patched content to `product.json`, which may suppress the integrity warning for that content. The checksum is not proof of authenticity. (Default: `true`) |

### Environment Variables

Stylesmith resolves standard variables in your import paths:

- `${env:NAME}`: Your system environment variables.
- `${userHome}`: Your home directory.
- `${workspaceFolder}`: The current workspace root (refused in untrusted workspaces).
- `${cwd}`: The VS Code process working directory (refused in untrusted workspaces).

### Trusted Types and DOM API

VS Code may require Trusted Types for DOM injection. Stylesmith preserves the workbench policy and, when its existing policy has a `trusted-types` directive and you add a JS import, adds the `stylesmith` policy name. A Trusted Types policy does not sanitize input for you. Your JavaScript still runs with workbench privileges; use a reviewed sanitizer for untrusted HTML and only add code you trust.

If `stylesmith.imports` contains a `.js` file, Stylesmith adds the `stylesmith` policy name to an existing `trusted-types` directive. Creating that policy only satisfies the browser policy; it does not make HTML safe or reduce the script's privileges.

## Built-in Effects

Stylesmith includes hardware-accelerated visual effects that can be enabled independently of your custom CSS.

- **Caret Animation:** Smooth, high-FPS cursor glide. Halts immediately on idle to save CPU.
- **Matrix Rain:** A zero-idle-cost canvas overlay that drops fading matrix characters when you type.
- **CRT Flicker:** Intermittently translates the editor via CSS to mimic a failing CRT monitor.

All visual effects actively query `window.matchMedia('(prefers-reduced-motion: reduce)')`. If your operating system is set to reduce motion, Stylesmith immediately suspends all animations.

## Commands

- **Stylesmith: Enable** - Patches `workbench.html` and restarts the window.
- **Stylesmith: Disable** - Attempts to remove Stylesmith's patch and restore managed settings. If files have changed or cannot be written, cleanup may need manual repair.

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
