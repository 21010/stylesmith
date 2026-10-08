/**
 * Stylesmith's own state: the user's font and effect settings it changed (so Disable can put
 * them back), and whether it's enabled.
 *
 * It's kept in a small JSON file in the extension's storage folder rather than in VS Code's
 * globalState: in older VS Code versions (seen on 1.93), a few quick globalState updates in a
 * row can lose values, which would leave the user's settings changed after Disable. The file
 * is read fresh every time, and a file-system lock coordinates updates across VS Code windows.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";

// Updates to the same file run one after another in this process. The on-disk lock below also
// coordinates extension hosts in other VS Code windows.
const pending = new Map<string, Promise<unknown>>();

const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 30_000;
const STALE_LOCK_MS = 5 * 60_000;
const LOCK_INIT_GRACE_MS = 5_000;

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
	/** The color and icon theme a preset chose, so Disable can put the user's own back. */
	themeSettings?: Record<string, SavedValue>;
	enabled?: boolean;
	/** Set once the user was told the old workbench patch can't be removed, to tell them once. */
	legacyDeniedShown?: boolean;
	/** When Stylesmith first ran on this computer, for the one-time feedback question. */
	firstRunAt?: number;
	/** Set once the feedback question was shown, whatever the answer. */
	feedbackAsked?: boolean;
	/** Fonts Stylesmith installed for the user, by font id: what to remove again. */
	installedFonts?: Record<string, { files: string[]; registry: string[] }>;
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
			return typeof state === "object" && state !== null && !Array.isArray(state)
				? state
				: {};
		} catch {
			return {}; // a damaged file shouldn't break Stylesmith
		}
	}

	/** Changes some values; `undefined` removes one. */
	update(change: Partial<StoredState>): Promise<void> {
		return this.serialize(() => this.withLock(() => this.write(change)));
	}

	/** Reads, derives and writes state as one cross-window transaction. */
	transact<T>(
		derive: (
			state: StoredState
		) =>
			| { change: Partial<StoredState>; result: T }
			| Promise<{ change: Partial<StoredState>; result: T }>
	): Promise<T> {
		return this.serialize(() =>
			this.withLock(async () => {
				const state = await this.read();
				const { change, result } = await derive(state);
				await this.write(change, state);
				return result;
			})
		);
	}

	private serialize<T>(task: () => Promise<T>): Promise<T> {
		const key = path.resolve(this.file);
		const previous = pending.get(key) ?? Promise.resolve();
		const next = previous.catch(() => undefined).then(task);
		pending.set(key, next);
		return next.finally(() => {
			if (pending.get(key) === next) pending.delete(key);
		});
	}

	/** Holds an atomic directory lock across the read/modify/write cycle. */
	private async withLock<T>(task: () => Promise<T>): Promise<T> {
		const lock = `${this.file}.lock`;
		const deadline = Date.now() + LOCK_TIMEOUT_MS;
		const token = `${process.pid}:${randomUUID()}`;
		await mkdir(path.dirname(this.file), { recursive: true });
		for (;;) {
			try {
				await mkdir(lock);
				await writeFile(
					path.join(lock, "owner.json"),
					JSON.stringify({ token, pid: process.pid })
				);
				break;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
					await rm(lock, { recursive: true, force: true }).catch(() => undefined);
					throw error;
				}
				if (Date.now() >= deadline)
					throw new Error("Timed out waiting for Stylesmith state lock");
				if (await this.lockIsStale(lock)) await this.breakStaleLock(lock);
				await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_MS));
			}
		}
		try {
			return await task();
		} finally {
			const owner = await readFile(path.join(lock, "owner.json"), "utf-8").catch(() => "");
			if (owner.includes(token)) await rm(lock, { recursive: true, force: true });
		}
	}

	/**
	 * Removes a stale lock. Only the holder of a second, short-lived "break" lock may do so, and
	 * it checks staleness again while holding it: without that, two waiters could both see the
	 * same stale lock, and the slower one would remove the fresh lock the faster one took.
	 */
	private async breakStaleLock(lock: string): Promise<void> {
		const breaker = `${lock}.break`;
		try {
			await mkdir(breaker);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			// The break lock is only held for a moment; one this old was left by a crash.
			const since = (await stat(breaker).catch(() => undefined))?.mtimeMs ?? Date.now();
			if (Date.now() - since > LOCK_INIT_GRACE_MS)
				await rm(breaker, { recursive: true, force: true });
			return;
		}
		try {
			if (await this.lockIsStale(lock)) await rm(lock, { recursive: true, force: true });
		} finally {
			await rm(breaker, { recursive: true, force: true });
		}
	}

	private async lockIsStale(lock: string): Promise<boolean> {
		try {
			const owner = JSON.parse(await readFile(path.join(lock, "owner.json"), "utf-8")) as {
				pid?: unknown;
			};
			// No update takes this long. After a crash and a reboot, the owner's process id can
			// belong to an unrelated process, so a live id alone doesn't keep a lock forever.
			if (Date.now() - (await stat(lock)).mtimeMs > STALE_LOCK_MS) return true;
			if (typeof owner.pid === "number" && Number.isInteger(owner.pid) && owner.pid > 0) {
				try {
					process.kill(owner.pid, 0);
					return false;
				} catch (error) {
					return (error as NodeJS.ErrnoException).code === "ESRCH";
				}
			}
			return false;
		} catch {
			// A process can stop after creating the directory but before writing owner.json.
			// Give that brief initialization window time to finish, then recover the orphan.
			try {
				return Date.now() - (await stat(lock)).mtimeMs > LOCK_INIT_GRACE_MS;
			} catch {
				return false;
			}
		}
	}

	private async write(change: Partial<StoredState>, base?: StoredState): Promise<void> {
		const state: Record<string, unknown> = { ...(base ?? (await this.read())), ...change };
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
