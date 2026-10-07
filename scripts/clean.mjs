// `tsc` doesn't remove JavaScript for source files that were deleted. Clear only its ignored
// output directory so stale modules and tests can't ship or run after a source removal.
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

await rm(resolve("out"), { recursive: true, force: true });
