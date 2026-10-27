/**
 * A small fake of the VS Code API, for unit tests of the code that talks to VS Code (#120):
 * the Problem Lens, the save receipt, the failed-command signal and the undo highlight.
 * Decorations and status bar items can't be read back through the real API, so the fake
 * records them. Importing this module makes `require("vscode")` return the fake in this test
 * process, so import it before the code under test.
 */

import Module from "node:module";

type Listener<T> = (value: T) => void;

/** An event and a way to fire it, like vscode.EventEmitter. */
class Emitter<T> {
	private readonly listeners = new Set<Listener<T>>();
	readonly event = (listener: Listener<T>) => {
		this.listeners.add(listener);
		return { dispose: () => this.listeners.delete(listener) };
	};
	fire(value: T): void {
		for (const listener of [...this.listeners]) listener(value);
	}
}

class Position {
	constructor(
		readonly line: number,
		readonly character: number
	) {}
}

export class Range {
	readonly start: Position;
	readonly end: Position;
	constructor(
		start: Position | number,
		end: Position | number,
		endLine?: number,
		endChar?: number
	) {
		if (typeof start === "number" && typeof end === "number") {
			this.start = new Position(start, end);
			this.end = new Position(endLine ?? start, endChar ?? end);
		} else {
			this.start = start as Position;
			this.end = end as Position;
		}
	}
}

export class ThemeColor {
	constructor(readonly id: string) {}
}

export interface DecorationType {
	options: Record<string, unknown>;
	disposed: boolean;
	dispose(): void;
}

export class FakeDocument {
	readonly uri = { toString: () => `untitled:${this.name}` };
	constructor(
		readonly name: string,
		private readonly lines: string[]
	) {}
	get lineCount(): number {
		return this.lines.length;
	}
	lineAt(line: number) {
		const length = this.lines[line]?.length ?? 0;
		return { range: new Range(line, 0, line, length) };
	}
}

export class FakeEditor {
	selection = { active: new Position(0, 0) };
	/** The latest decorations set for each decoration type. */
	readonly decorations = new Map<DecorationType, unknown[]>();
	constructor(readonly document: FakeDocument) {}
	setDecorations(type: DecorationType, options: unknown[]): void {
		this.decorations.set(type, options);
	}
}

interface StatusItem {
	id: string;
	text: string;
	tooltip?: string;
	visible: boolean;
	backgroundColor?: ThemeColor;
	show(): void;
	hide(): void;
	dispose(): void;
}

export interface Diagnostic {
	range: Range;
	severity: number;
	message: string;
}

/** Everything a test can set and read. */
export const state = {
	settings: new Map<string, unknown>(),
	diagnostics: new Map<FakeDocument, Diagnostic[]>(),
	decorationTypes: [] as DecorationType[],
	statusItems: [] as StatusItem[]
};

export const events = {
	diagnostics: new Emitter<{ uris: { toString(): string }[] }>(),
	configuration: new Emitter<{ affectsConfiguration(section: string): boolean }>(),
	visibleEditors: new Emitter<unknown>(),
	selection: new Emitter<{ textEditor: FakeEditor }>(),
	activeEditor: new Emitter<unknown>(),
	colorTheme: new Emitter<unknown>(),
	willSave: new Emitter<{ document: FakeDocument; reason: number }>(),
	didSave: new Emitter<FakeDocument>(),
	documentChange: new Emitter<{
		document: FakeDocument;
		reason?: number;
		contentChanges: { range: Range; text: string }[];
	}>(),
	shellStart: new Emitter<{ execution: unknown }>(),
	shellEnd: new Emitter<{ execution?: unknown; exitCode: number | undefined }>()
};

const window = {
	activeTextEditor: undefined as FakeEditor | undefined,
	visibleTextEditors: [] as FakeEditor[],
	activeColorTheme: { kind: 2 },
	createTextEditorDecorationType(options: Record<string, unknown>): DecorationType {
		const type: DecorationType = {
			options,
			disposed: false,
			dispose: () => {
				type.disposed = true;
			}
		};
		state.decorationTypes.push(type);
		return type;
	},
	createStatusBarItem(id: string): StatusItem {
		const item: StatusItem = {
			id,
			text: "",
			visible: false,
			show: () => {
				item.visible = true;
			},
			hide: () => {
				item.visible = false;
			},
			dispose: () => {
				item.visible = false;
			}
		};
		state.statusItems.push(item);
		return item;
	},
	onDidChangeVisibleTextEditors: events.visibleEditors.event,
	onDidChangeTextEditorSelection: events.selection.event,
	onDidChangeActiveTextEditor: events.activeEditor.event,
	onDidChangeActiveColorTheme: events.colorTheme.event,
	onDidStartTerminalShellExecution: events.shellStart.event,
	onDidEndTerminalShellExecution: events.shellEnd.event
};

export const fake = {
	Range,
	Position,
	ThemeColor,
	StatusBarAlignment: { Left: 1, Right: 2 },
	OverviewRulerLane: { Left: 1, Center: 2, Right: 4, Full: 7 },
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
	TextDocumentSaveReason: { Manual: 1, AfterDelay: 2, FocusOut: 3 },
	TextDocumentChangeReason: { Undo: 1, Redo: 2 },
	env: { language: "en" },
	window,
	workspace: {
		getConfiguration: (section: string) => ({
			get: <T>(key: string, fallback?: T): T | undefined =>
				state.settings.has(`${section}.${key}`)
					? (state.settings.get(`${section}.${key}`) as T)
					: fallback
		}),
		onDidChangeConfiguration: events.configuration.event,
		onWillSaveTextDocument: events.willSave.event,
		onDidSaveTextDocument: events.didSave.event,
		onDidChangeTextDocument: events.documentChange.event
	},
	languages: {
		onDidChangeDiagnostics: events.diagnostics.event,
		getDiagnostics: (uri: { toString(): string }) =>
			[...state.diagnostics].find(
				([document]) => document.uri.toString() === uri.toString()
			)?.[1] ?? []
	}
};

export { window };

/** Makes `require("vscode")` return the fake, in this test process. */
function install(): void {
	const loader = Module as unknown as {
		_load: (request: string, parent: unknown, isMain: boolean) => unknown;
	};
	const load = loader._load;
	loader._load = (request, parent, isMain) =>
		request === "vscode" ? fake : load(request, parent, isMain);
}

install();
