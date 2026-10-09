/** Whether VS Code asks for reduced motion: workbench.reduceMotion "on". */
export function reducesMotion(setting: unknown): boolean {
	return setting === "on";
}
