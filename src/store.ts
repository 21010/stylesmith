/**
 * Stylesmith's own state: the user's font and effect settings it changed (so Disable can put
 * them back), whether it's enabled, and when it last asked to re-apply.
 *
 * It's kept in a small JSON file in the extension's storage folder rather than in VS Code's
 * globalState: in older VS Code versions (seen on 1.93), a few quick globalState updates in a
 * row can lose values, which would leave the user's settings changed after Disable. The file
 * is read fresh every time, so several VS Code windows also see each other's changes.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { SavedValue } from "./managed";

export interface StoredState {
	fontSettings?: Record<string, SavedValue>;
	effectSettings?: Record<string, SavedValue>;
	enabled?: boolean;
	reapplyAskedAt?: number;
}

export class StateFile {
	/**
	 * @param file Where the state is kept.
	 * @param legacy State from older Stylesmith versions, used until the file exists.
	 */
	constructor(
		private readonly file: string,
		private readonly legacy: () => StoredState = () => ({})
	) {}

	async read(): Promise<StoredState> {
		let text: string;
		try {
			text = await readFile(this.file, "utf-8");
		} catch {
			return this.legacy(); // first run after an update, or nothing stored yet
		}
		try {
			const state: unknown = JSON.parse(text);
			return typeof state === "object" && state !== null ? (state as StoredState) : {};
		} catch {
			return {}; // a damaged file shouldn't break Stylesmith
		}
	}

	/** Changes some values; `undefined` removes one. */
	async update(change: Partial<StoredState>): Promise<void> {
		const state: Record<string, unknown> = { ...(await this.read()), ...change };
		for (const key of Object.keys(state)) {
			if (state[key] === undefined) delete state[key];
		}
		await mkdir(path.dirname(this.file), { recursive: true });
		// Write a temporary file and rename it, so a crash can't leave half a file behind.
		const temp = `${this.file}.${process.pid}.tmp`;
		await writeFile(temp, JSON.stringify(state, null, "\t"));
		await rename(temp, this.file);
	}
}
