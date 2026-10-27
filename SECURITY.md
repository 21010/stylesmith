# Security policy

## Scope

Stylesmith uses only VS Code's extension API and does not read or write VS Code installation files. It does not patch `workbench.html`, update `product.json`, or load custom or remote CSS/JavaScript. It installs a font only when the user asks it to and confirms, as described under [Font installation](#font-installation). Themes and icon themes are declared contributions; Problem Lens uses the VS Code decoration and diagnostics APIs; settings are changed through the VS Code configuration API. The bundled terminal and Vim add-ons in `extras/` are static files that are copied to the clipboard only when requested from the Stylesmith menu, and are never written to shell or Vim startup files automatically.

Stylesmith does not read workspace content or workspace settings to choose or execute code. Its manifest declares support for untrusted workspaces. Its extension code still runs with the normal capabilities granted to a local VS Code extension, so installing it remains a trust decision.

## Features left out for this boundary

Visual effects that would need private workbench DOM access, injected styles or scripts, or extension-bundled web fonts are not offered. Remaining effects set documented VS Code settings. Font selection chooses a family installed on the user's system; Stylesmith can install one for the current user, on request.

## Font installation

Stylesmith can install a Nerd Font for the current user (`src/fontInstall.ts`). This is the only code that downloads files or runs programs; a test checks that no other source does.

- **Only on request:** it never runs automatically or from a preset. The user chooses a font that isn't installed, or runs **Stylesmith: Install Font…**, and must choose **Install** in a modal confirmation that names the files, their source, their size and the destination folder.
- **Pinned files:** files are downloaded over HTTPS only, from the `fonts-3.5.1-r2` release of this repository, following GitHub's redirects. Each file's size and SHA-256 are built into the extension (`src/fonts.ts`). A download larger than the pinned size is stopped, and every file is checked before any is written; a mismatch installs nothing.
- **No administrator rights:** fonts go to the user's own font folder. On Windows Stylesmith runs `reg.exe` to register the per-user font under `HKCU`, and on Linux it runs `fc-cache`. Programs are started without a shell, with fixed arguments.
- **Recorded and removable:** Stylesmith records what it installed in its own storage. **Stylesmith: Remove Installed Fonts…** deletes only pinned font file names directly in the user's font folder, and only registry values of the form Stylesmith writes, even if the record was changed.
- **Licenses:** the fonts are under the SIL Open Font License 1.1 (and the BSD 3-Clause License for 3270); their licenses are saved with Stylesmith's data.

## Uninstalling

Stylesmith restores the user settings it changed only when **Stylesmith: Disable** runs. Run it before uninstalling; otherwise the applied values remain in the user's settings and can be reset by hand.

## Reporting a vulnerability

Please report security issues privately to the maintainers through the contact details in the repository's GitHub security policy. Include the affected version, environment, and steps to reproduce. Do not include private project contents or credentials.
