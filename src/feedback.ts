/**
 * Asks once, after about a week of use, what the user uses Stylesmith for (issue #30). The
 * answer goes to a public GitHub poll the user opens themselves: Stylesmith sends nothing and
 * collects nothing. Whatever the user chooses, it doesn't ask again.
 */

/** Where the question leads: the repository's poll category, so the link never goes stale. */
export const FEEDBACK_URL = "https://github.com/21010/stylesmith/discussions/categories/polls";

/** How long Stylesmith has to be in use before it asks (ms). */
export const FEEDBACK_DELAY = 7 * 24 * 60 * 60 * 1000;

/** What Stylesmith remembers about the question, in its state file. */
export interface FeedbackState {
	/** When Stylesmith first ran on this computer (ms since 1970). */
	firstRunAt?: number;
	/** Set once the question was shown, whatever the answer. */
	feedbackAsked?: boolean;
}

/**
 * Decides what to do at startup: record the first run, ask now, or do nothing. Returns the
 * change to save, and whether to ask. Asking is recorded at the same time, so two windows
 * starting together can't both ask.
 */
export function feedbackStep(
	state: FeedbackState,
	now: number
): { change: FeedbackState; ask: boolean } {
	if (state.feedbackAsked) return { change: {}, ask: false };
	const firstRunAt = typeof state.firstRunAt === "number" ? state.firstRunAt : undefined;
	if (firstRunAt === undefined) return { change: { firstRunAt: now }, ask: false };
	if (now - firstRunAt < FEEDBACK_DELAY) return { change: {}, ask: false };
	return { change: { feedbackAsked: true }, ask: true };
}
