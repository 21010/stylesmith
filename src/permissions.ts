/**
 * Help for the most common problem with tools like Stylesmith: VS Code's own folder can't be
 * written to. What to do depends on the system and on how VS Code was installed, so this
 * works out the steps for the user's case, with the exact folder.
 *
 * Stylesmith never runs any of this itself; it only shows the steps and can copy the command.
 */

/** VS Code's folder couldn't be written to. */
export class PermissionDeniedError extends Error {
	constructor(
		/** The folder that holds VS Code's workbench file. */
		readonly folder: string,
		options?: { cause?: unknown }
	) {
		super(`Stylesmith can't write to ${folder}`, options);
		this.name = "PermissionDeniedError";
	}
}

/** Steps for the user, and the command that fixes it when there is one. */
export interface PermissionHelp {
	/** One line: what's wrong. */
	summary: string;
	/** What to do, in order. */
	steps: string[];
	/** A terminal command that fixes it, when there is one. */
	command?: string;
}

/** Quotes text for a POSIX shell, so any folder name is passed as one plain argument. */
export function shellQuote(text: string): string {
	return `'${text.replace(/'/g, `'\\''`)}'`;
}

/** What to do when `folder` can't be written to, on this platform and kind of install. */
export function permissionHelp(platform: NodeJS.Platform, folder: string): PermissionHelp {
	const posix = folder.replace(/\\/g, "/");
	const summary = `Stylesmith can't change VS Code's files in ${folder}.`;
	const enableAgain = "Then run Stylesmith: Enable again.";

	// Read-only installs: no permission change can help.
	const readOnly = readOnlyInstall(posix);
	if (readOnly) {
		return {
			summary,
			steps: [
				`VS Code was installed as ${readOnly}, and its files can't be changed.`,
				"To use Stylesmith, install VS Code from code.visualstudio.com instead (the .deb, .rpm or .tar.gz download).",
				enableAgain
			]
		};
	}

	const chown = `sudo chown -R "$(whoami)" ${shellQuote(folder)}`;

	if (platform === "darwin") {
		if (posix.includes("/AppTranslocation/")) {
			return {
				summary,
				steps: [
					"VS Code is running from a temporary, read-only copy because it hasn't been moved out of the Downloads folder.",
					"Quit VS Code, move Visual Studio Code into the Applications folder, and open it from there.",
					enableAgain
				]
			};
		}
		return {
			summary,
			steps: [
				"Open System Settings > Privacy & Security > App Management, and turn on Visual Studio Code (macOS 13 and newer).",
				"If that's not enough, make yourself the owner of VS Code's workbench folder: run the command below in Terminal.",
				enableAgain
			],
			command: chown
		};
	}

	if (platform === "win32") {
		return {
			summary,
			steps: [
				/program files/i.test(folder)
					? "VS Code was installed for all users, so changing its files needs administrator rights."
					: "Windows didn't allow the change.",
				"Close VS Code, right-click Visual Studio Code and choose Run as administrator.",
				`${enableAgain} After the restart, you can open VS Code normally.`,
				"Or install the User version of VS Code, which doesn't need administrator rights."
			]
		};
	}

	return {
		summary,
		steps: [
			"Make yourself the owner of VS Code's workbench folder: run the command below in a terminal. It changes only that folder.",
			enableAgain,
			"A VS Code update from your package manager may change the owner back; then run the command again."
		],
		command: chown
	};
}

function readOnlyInstall(posixFolder: string): string | undefined {
	if (posixFolder.startsWith("/snap/")) return "a Snap package";
	if (posixFolder.includes("/flatpak/")) return "a Flatpak";
	if (/^\/tmp\/\.mount_/.test(posixFolder)) return "an AppImage";
	return undefined;
}
