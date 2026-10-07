/** Small helpers shared by the end-to-end test runs. */

import * as vscode from "vscode";

export function userValue(section: string, key: string): unknown {
	return vscode.workspace.getConfiguration(section).inspect(key)?.globalValue;
}

export function withTimeout(work: Thenable<unknown>, what: string, ms = 60_000): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
	});
	return Promise.race([work, timeout])
		.then(
			() => undefined,
			(error: unknown) => Promise.reject(error)
		)
		.finally(() => clearTimeout(timer));
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function step(name: string, check: () => Promise<void> | void): Promise<void> {
	await check();
	console.log(`  ✔ ${name}`);
}

/** Waits until `check` is true, polling: some things happen on activation, not on command. */
export async function until(check: () => boolean, what: string, ms = 30_000): Promise<void> {
	const deadline = Date.now() + ms;
	while (!check()) {
		if (Date.now() > deadline) throw new Error(`timed out waiting until ${what}`);
		await sleep(100);
	}
}
