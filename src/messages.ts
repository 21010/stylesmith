/** The text Stylesmith shows in notifications, in one place. */

export const messages = {
	notAllowed: (reason: string) =>
		`Stylesmith couldn't save a change because it isn't allowed to (${reason}).`,
	enabled:
		"Stylesmith enabled. Reload the window to see the changes. " +
		'If VS Code reports that its installation is corrupt, choose "Don\'t Show Again". ' +
		"See the README for details.",
	disabled: "Stylesmith disabled and VS Code restored. Reload the window to finish.",
	alreadyDisabled: "Stylesmith is already disabled.",
	somethingWrong: "Stylesmith: something went wrong: ",
	copyCommand: "Copy Command",
	commandCopied: "Stylesmith: the command is copied. Paste it into a terminal.",
	reloadWindow: "Reload Window",
	notConfigured:
		"Stylesmith has nothing to add yet. Apply a preset, turn on an effect in the menu, or add your own CSS or JS files to stylesmith.imports.",
	applyPreset: "Apply a Preset",
	unableToLocateVsCodeInstallationPath:
		"Stylesmith could not locate the VS Code installation, so it cannot apply your styles.",
	statusActive: "Stylesmith is on. Click for presets, effects and fonts.",
	statusInactive: "Stylesmith is off. Click for presets, effects and fonts.",
	reapply:
		"A VS Code update removed Stylesmith's changes. Re-apply them now? The window reloads afterwards.",
	reapplyNow: "Re-apply",
	dontAskAgain: "Don't Ask Again",
	settingsChanged: "Stylesmith: your settings changed. Reload to apply them?",
	reloadNow: "Reload",
	cannotLoad: (url: string, reason: string) =>
		`Stylesmith cannot load '${url}' (${reason}). Skipping.`
} as const;
