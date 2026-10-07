# Security policy

## Scope

Apart from the one-time cleanup described under [Upgrade recovery](#upgrade-recovery), the API-only Stylesmith build does not read or write VS Code installation files. It does not patch `workbench.html`, update `product.json`, load custom or remote CSS/JavaScript, or install fonts. Themes and icon themes are declared contributions; Problem Lens uses the VS Code decoration and diagnostics APIs; settings are changed through the VS Code configuration API.

Stylesmith does not read workspace content or workspace settings to choose or execute code. Its manifest declares support for untrusted workspaces. Its extension code still runs with the normal capabilities granted to a local VS Code extension, so installing it remains a trust decision.

## Features removed for this boundary

Visual effects that needed private workbench DOM access, injected styles or scripts, and extension-bundled web fonts are not available in this build. Remaining effects set documented VS Code settings. Font selection only chooses a family already installed on the user's system.

## Upgrade recovery

Stylesmith 1.x could modify the installed workbench. VS Code updates extensions automatically, so most users can't run **Stylesmith: Disable** in the old version before upgrading. On startup this build therefore checks for, and removes, changes left by Stylesmith 1.x. This is the only code that reads or writes the installation (`src/legacyCleanup.ts`), and it is limited to undoing Stylesmith's own changes:

- In the workbench HTML file, it removes only blocks between Stylesmith's own markers, and restores the original Content-Security-Policy that Stylesmith kept in a comment. Blocks from other tools are left in place.
- It removes the `stylesmith-fonts` folder (and leftovers of an interrupted font copy) next to that file.
- It updates the workbench checksum in `product.json` only when that checksum matches the patched file, which means Stylesmith set it. It then sets the checksum of the restored file. A checksum that doesn't match is left alone, so a file changed by something else is never made to look genuine.
- Files are replaced atomically (written to a temporary file, then renamed) and keep their permissions.
- It never requests elevated permissions. If the installation isn't writable by the user, Stylesmith shows a one-time notice; use VS Code's repair or reinstall process to restore its files.

Stylesmith restores the user settings it changed only when **Stylesmith: Disable** runs. Run it before uninstalling; otherwise the applied values remain in the user's settings and can be reset by hand.

## Reporting a vulnerability

Please report security issues privately to the maintainers through the contact details in the repository's GitHub security policy. Include the affected version, environment, and steps to reproduce. Do not include private project contents or credentials.
