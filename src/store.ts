/**
 * Stylesmith's own state: the user's font and effect settings it changed (so Disable can put
 * them back), whether it's enabled, and when it last asked to re-apply.
 *
 * It's kept in a small JSON file in the extension's storage folder rather than in VS Code's
 * globalState: in older VS Code versions (seen on 1.93), a few quick globalState updates in a
 * row can lose values, which would leave the user's settings changed after Disable. The file
 * is read fresh every time, so several VS Code windows also see each other's changes.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";

// Updates to the same file, across every StateFile in this process, run one after another:
// two updates at once would both start from the old state, and one would undo the other.
const pending = new Map<string, Promise<void>>();

/** What Stylesmith remembers about a setting it changed. */
export interface SavedValue {
	/** The user's own value before Stylesmith changed it; undefined if it wasn't set. */
	previous: unknown;
	/** The value Stylesmith wrote. */
	applied: unknown;
}

/** Everything in the state file. */
export interface StoredState {
	fontSettings?: Record<string, SavedValue>;
	effectSettings?: Record<string, SavedValue>;
	enabled?: boolean;
	reapplyAskedAt?: number;
	vsCodeCommit?: string;
}

/** Reads and updates the state file. Every read is fresh; updates never overlap. */
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
			return typeof state === "object" && state !== null ? state : {};
		} catch {
			return {}; // a damaged file shouldn't break Stylesmith
		}
	}

	/** Changes some values; `undefined` removes one. */
	update(change: Partial<StoredState>): Promise<void> {
		const key = path.resolve(this.file);
		const next = (pending.get(key) ?? Promise.resolve())
			.catch(() => undefined) // a failed update doesn't block the next one
			.then(() => this.write(change));
		pending.set(key, next);
		return next.finally(() => {
			if (pending.get(key) === next) pending.delete(key);
		});
	}

	private async write(change: Partial<StoredState>): Promise<void> {
		const state: Record<string, unknown> = { ...(await this.read()), ...change };
		for (const key of Object.keys(state)) {
			if (state[key] === undefined) delete state[key];
		}
		await mkdir(path.dirname(this.file), { recursive: true });
		// Write a temporary file and rename it, so a crash can't leave half a file behind. Each
		// write has its own temporary file, so two writes can never mix their contents.
		const temp = `${this.file}.${randomUUID()}.tmp`;
		try {
			await writeFile(temp, JSON.stringify(state, null, "\t"), { flag: "wx" });
			await rename(temp, this.file);
		} catch (error) {
			await rm(temp, { force: true });
			throw error;
		}
	}
}
