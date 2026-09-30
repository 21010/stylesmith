export const messages = {
	admin: "Stylesmith: run VS Code with admin privileges so the changes can be applied.",
	enabled:
		"Stylesmith enabled. Restart to take effect. " +
		'If VS Code reports that its installation is corrupt, choose "Don\'t Show Again". ' +
		"See the README for details.",
	disabled: "Stylesmith disabled and VS Code restored to default. Restart to take effect.",
	alreadyDisabled: "Stylesmith is already disabled.",
	somethingWrong: "Stylesmith: something went wrong: ",
	restartIde: "Restart Visual Studio Code",
	notConfigured:
		'Stylesmith has nothing to load. Add CSS/JS file URLs to "stylesmith.imports" in your user settings.',
	unableToLocateVsCodeInstallationPath:
		"Stylesmith could not locate the VS Code installation, so it cannot apply your styles.",
	cannotLoad: (url: string, reason: string) =>
		`Stylesmith cannot load '${url}' (${reason}). Skipping.`
} as const;
