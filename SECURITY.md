# Security policy

Stylesmith modifies VS Code's installed workbench files and can add custom CSS and JavaScript to the editor window. These controls reduce specific risks; they do not make the workbench supported by VS Code or sandbox user-supplied code.

## Reporting a problem

Please **don't open a public issue** for a security problem.

Report it privately on GitHub instead: go to the [Security tab](https://github.com/21010/stylesmith/security) and click **Report a vulnerability**. Please include:

- what the problem is and what someone could do with it
- steps to reproduce it
- the Stylesmith and VS Code versions you used

You'll get a reply within a few days. Once a fix is released, the report is published with credit to you, unless you'd rather stay anonymous.

## Supported versions

Only the latest release gets security fixes.

## Security controls and their limits

Stylesmith keeps the workbench's existing Content Security Policy (CSP) and extends selected directives for its additions. It adds SHA-256 hashes for inline scripts it inserts. A hash identifies exact script bytes; it does not restrict what the script can do, prove that it is trustworthy, or protect against other code already running in VS Code. Custom JavaScript runs in the workbench context with the privileges available there. Only add code you trust.

- **Settings:** Import settings are read from user settings, not project settings. `${workspaceFolder}` and `${cwd}` substitutions are refused in untrusted workspaces. Other extensions and code that can modify user settings or VS Code files are outside this protection.
- **Network access:** Remote imports are off by default. When enabled, HTTPS is allowed for imports and for resources referenced by unpinned CSS; redirects to HTTP are refused. Remote content may change at any time. `file://` network paths are refused. A `#sha256-…` pin checks an import's bytes; it is not a safety review. Pinned CSS that references network resources is rejected.
- **File writes:** Stylesmith checks its patch transformation and replaces workbench or metadata files through a temporary file and rename, instead of writing the target in place. This reduces the risk of a partial write; it cannot guarantee recovery from every crash, disk failure, permission change, or concurrent external modification.
- **Disable and uninstall:** Disable attempts to remove marked workbench content and bundled font files, restore settings Stylesmith manages, and write the restored workbench checksum when VS Code tracks it. The uninstall hook attempts workbench and font cleanup, but does not restore managed user settings; run Disable before uninstalling to restore those. Cleanup or checksum writes can fail. If VS Code still fails to start or files remain changed, use VS Code's repair or reinstall process.
- **Integrity warning:** With `stylesmith.silenceCorruptWarning` enabled, Stylesmith may update `product.json` to record the checksum of the workbench content it generated. This can suppress VS Code's warning for that content. The checksum is not proof of authenticity, and suppressing the warning can make unrelated changes harder to notice. Turn the setting off if you want VS Code to report that the workbench differs from its recorded checksum.
- **Reapplying after updates:** If Stylesmith's markers disappear while its saved state says it was enabled, Stylesmith may offer to apply its changes again. When the VS Code build identifier is unchanged, it compares the workbench to the recorded checksum and can report a mismatch. This check cannot identify who made a change or detect every modification.

## What is out of scope

- **Code you choose to add.** Scripts in `stylesmith.imports` run in the VS Code workbench context and can use the privileges available there. HTTPS and SHA-256 pins do not sandbox code or make it trustworthy.
- **Someone who can already change VS Code's files,** or your user settings. They don't need Stylesmith to take control of VS Code.
