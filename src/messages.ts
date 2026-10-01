export const messages = {
	admin: "Stylesmith: run VS Code with admin privileges so the changes can be applied.",
	enabled:
		"Stylesmith enabled. Restart to take effect. " +
		'If VS Code reports that its installation is corrupt, choose "Don\'t Show Again". ' +
		"See the README for details.",
	disabled: "Stylesmith disabled and VS Code restored to default. Restart to take effect.",
	alreadyDisabled: "Stylesmith is already disabled.",
	somethingWrong: "Stylesmith: something went wrong: ",
	copyCommand: "Copy Command",
	commandCopied: "Stylesmith: the command is copied. Paste it into a terminal.",
	restartIde: "Restart Visual Studio Code",
	notConfigured:
		'Stylesmith has nothing to add. Add CSS/JS file URLs to "stylesmith.imports", or turn on a built-in effect such as "stylesmith.effects.caretAnimation".',
	unableToLocateVsCodeInstallationPath:
		"Stylesmith could not locate the VS Code installation, so it cannot apply your styles.",
	statusActive: "Stylesmith is on. Click for presets, effects and fonts.",
	statusInactive: "Stylesmith is off. Click for presets, effects and fonts.",
	reapply:
		"A VS Code update removed Stylesmith's changes. Re-apply them now? VS Code restarts afterwards.",
	reapplyNow: "Re-apply",
	dontAskAgain: "Don't Ask Again",
	cannotLoad: (url: string, reason: string) =>
		`Stylesmith cannot load '${url}' (${reason}). Skipping.`
} as const;
