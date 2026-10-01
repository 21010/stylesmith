# Security policy

Stylesmith changes VS Code's own files and adds code to its main window, so security matters a lot here. Thank you for helping keep it safe.

## Reporting a problem

Please **don't open a public issue** for a security problem.

Report it privately on GitHub instead: go to the [Security tab](https://github.com/21010/stylesmith/security) and click **Report a vulnerability**. Please include:

- what the problem is and what someone could do with it
- steps to reproduce it
- the Stylesmith and VS Code versions you used

You'll get a reply within a few days. Once a fix is released, the report is published with credit to you, unless you'd rather stay anonymous.

## Supported versions

Only the latest release gets security fixes.

## What Stylesmith protects against

These are the protections Stylesmith is built to keep, so a way around any of them counts as a security problem:

- **Only your scripts run.** VS Code's Content-Security-Policy stays on. Stylesmith allows exactly the scripts it adds, by their SHA-256 hash, and nothing else. It loosens the policy only as far as your settings need: web stylesheets and fonts only with remote imports on, and its Trusted Types policy name only when you add your own scripts.
- **Only you choose what's added.** Stylesmith reads its settings from your user settings only. A project you open can't add code through its workspace settings.
- **Untrusted projects can't add code.** `${workspaceFolder}` and `${cwd}` imports are skipped in workspaces you haven't trusted.
- **Remote code is off by default.** `https://` imports need `stylesmith.allowRemoteImports`. `http://` is never allowed, and a redirect to `http://` is refused. `file://` imports must be on this computer: network paths are refused.
- **Changes can always be undone.** Stylesmith only writes a change it has checked it can revert, and it writes through a temporary file so a failed write can't damage VS Code.

## What is out of scope

- **Code you choose to add.** Scripts in `stylesmith.imports` run with full access to VS Code's window. Only add files you trust.
- **Someone who can already change VS Code's files,** or your user settings. They don't need Stylesmith to take control of VS Code.
