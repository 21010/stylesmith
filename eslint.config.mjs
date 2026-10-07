// @ts-check
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
	{ ignores: ["out/", "node_modules/", ".vscode-test/"] },
	js.configs.recommended,
	tseslint.configs.recommended,
	{
		// Type-aware rules for the TypeScript code: an unawaited promise hides errors, and an
		// `any` value switches off type checking wherever it flows.
		files: ["src/**/*.ts"],
		languageOptions: {
			parserOptions: {
				project: ["./tsconfig.json", "./tsconfig.browser.json"],
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/no-floating-promises": [
				"error",
				{
					// node:test runs describe() and it() itself; they needn't be awaited.
					allowForKnownSafeCalls: [
						{ from: "package", package: "node:test", name: ["describe", "it"] }
					]
				}
			],
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "error"
		}
	},
	{
		files: ["site/**/*.js"],
		languageOptions: { sourceType: "script", globals: globals.browser }
	},
	{
		files: ["scripts/**/*.mjs"],
		languageOptions: { globals: globals.node }
	},
	prettier
);
