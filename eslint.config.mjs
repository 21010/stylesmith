// @ts-check
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
	{ ignores: ["out/", "node_modules/"] },
	js.configs.recommended,
	tseslint.configs.recommended,
	{
		files: ["assets/**/*.js"],
		languageOptions: { sourceType: "script", globals: globals.browser }
	},
	{
		files: ["scripts/**/*.mjs"],
		languageOptions: { globals: globals.node }
	},
	{
		files: ["src/extension.ts"],
		languageOptions: { globals: globals.node },
		rules: {
			// `require.main` is used to locate VS Code's installation, not to import modules.
			"@typescript-eslint/no-require-imports": "off"
		}
	},
	prettier
);
