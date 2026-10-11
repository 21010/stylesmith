// The pixel art and colors of Stylesmith's icons. scripts/build-icons.mjs draws them and
// adjusts the colors for contrast; src/test/icons.test.ts checks the result.

// 3×5 pixel font: five rows of three bits each.
export const GLYPHS = {
	A: "010101111101101",
	B: "110101110101110",
	C: "011100100100011",
	D: "110101101101110",
	E: "111100110100111",
	F: "111100110100100",
	G: "011100101101011",
	H: "101101111101101",
	I: "111010010010111",
	J: "001001001101010",
	K: "101101110101101",
	L: "100100100100111",
	M: "101111111101101",
	N: "110101101101101",
	O: "010101101101010",
	P: "110101110100100",
	Q: "010101101110011",
	R: "110101110101101",
	S: "011100010001110",
	T: "111010010010010",
	U: "101101101101111",
	V: "101101101101010",
	W: "101101111111101",
	X: "101101010101101",
	Y: "101101010010010",
	Z: "111001010100111",
	"#": "101111101111101",
	"+": "000010111010000",
	"{": "011010110010011",
	"}": "110010011010110",
	"<": "001010100010001",
	">": "100010001010100",
	"/": "001001010100100",
	0: "111101101101111",
	1: "010110010010111",
	2: "111001111100111",
	3: "111001111001111",
	4: "101101111001001",
	5: "111100111001111",
	6: "111100111101111",
	7: "111001001001001",
	8: "111101111101111",
	9: "111101111001111"
};

// label (or picture), color, and the file extensions, file names and language IDs that use the
// icon. The color is Stylesmith Pixel's; theme sets color by kind (see kindOf below).
export const FILES = [
	{ id: "js", label: "JS", color: "#f7df1e", ext: ["js", "mjs", "cjs"], lang: ["javascript"] },
	{ id: "ts", label: "TS", color: "#3b8eea", ext: ["ts", "mts", "cts"], lang: ["typescript"] },
	{ id: "jsx", label: "JSX", color: "#61dafb", ext: ["jsx"], lang: ["javascriptreact"] },
	{ id: "tsx", label: "TSX", color: "#61dafb", ext: ["tsx"], lang: ["typescriptreact"] },
	{
		id: "json",
		label: "{}",
		color: "#e5c07b",
		ext: ["json", "jsonc", "json5"],
		lang: ["json", "jsonc"]
	},
	{ id: "md", label: "MD", color: "#6fb3d2", ext: ["md", "mdx", "markdown"], lang: ["markdown"] },
	{ id: "html", label: "</>", color: "#ef6c4a", ext: ["html", "htm"], lang: ["html"] },
	{ id: "css", label: "CSS", color: "#9b7bef", ext: ["css"], lang: ["css"] },
	{ id: "scss", label: "SCS", color: "#e57cb0", ext: ["scss", "sass"], lang: ["scss", "sass"] },
	{ id: "less", label: "LES", color: "#6f8fd8", ext: ["less"], lang: ["less"] },
	{ id: "py", label: "PY", color: "#5a9fd4", ext: ["py", "pyi", "pyw"], lang: ["python"] },
	{ id: "ipynb", label: "NB", color: "#f58a3c", ext: ["ipynb"], lang: [] },
	{ id: "go", label: "GO", color: "#35c2e8", ext: ["go"], lang: ["go"] },
	{ id: "rs", label: "RS", color: "#e0a57e", ext: ["rs"], lang: ["rust"] },
	{ id: "java", label: "JV", color: "#e0913a", ext: ["java", "jar"], lang: ["java"] },
	{ id: "kt", label: "KT", color: "#a97bff", ext: ["kt", "kts"], lang: ["kotlin"] },
	{ id: "c", label: "C", color: "#8fa8c8", ext: ["c"], lang: ["c"] },
	{ id: "cpp", label: "C++", color: "#5b9bd5", ext: ["cpp", "cc", "cxx"], lang: ["cpp"] },
	{ id: "h", label: "H", color: "#b39ddb", ext: ["h", "hpp", "hh"], lang: [] },
	{ id: "cs", label: "C#", color: "#5cbf5c", ext: ["cs", "csx"], lang: ["csharp"] },
	{ id: "php", label: "PHP", color: "#8f93d6", ext: ["php"], lang: ["php"] },
	{ id: "rb", label: "RB", color: "#e0574f", ext: ["rb", "gemspec"], lang: ["ruby"] },
	{
		id: "sh",
		label: "SH",
		color: "#89e051",
		ext: ["sh", "bash", "zsh", "fish"],
		lang: ["shellscript"]
	},
	{
		id: "ps1",
		label: "PS",
		color: "#5391fe",
		ext: ["ps1", "psm1", "psd1"],
		lang: ["powershell"]
	},
	{ id: "yaml", label: "YML", color: "#e06c75", ext: ["yml", "yaml"], lang: ["yaml"] },
	{ id: "toml", label: "TML", color: "#c98a4a", ext: ["toml"], lang: ["toml"] },
	{ id: "xml", label: "XML", color: "#f08d49", ext: ["xml", "xsd", "plist"], lang: ["xml"] },
	{ id: "svg", label: "SVG", color: "#ffb13b", ext: ["svg"], lang: [] },
	{
		id: "image",
		label: "IMG",
		color: "#b58ae0",
		ext: ["png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "avif"],
		lang: []
	},
	{
		id: "font",
		label: "FNT",
		color: "#c8c8d8",
		ext: ["woff", "woff2", "ttf", "otf", "eot"],
		lang: []
	},
	{ id: "sql", label: "SQL", color: "#e8a33d", ext: ["sql"], lang: ["sql"] },
	{ id: "vue", label: "VUE", color: "#41b883", ext: ["vue"], lang: ["vue"] },
	{ id: "svelte", label: "SVL", color: "#ff5a2a", ext: ["svelte"], lang: ["svelte"] },
	{ id: "lua", label: "LUA", color: "#6f8fe8", ext: ["lua"], lang: ["lua"] },
	{ id: "dart", label: "DRT", color: "#2fc6bd", ext: ["dart"], lang: ["dart"] },
	{ id: "swift", label: "SWF", color: "#f7743e", ext: ["swift"], lang: ["swift"] },
	{
		id: "zip",
		label: "ZIP",
		color: "#e3b341",
		ext: ["zip", "tar", "gz", "tgz", "7z", "rar", "xz", "vsix"],
		lang: []
	},
	{ id: "pdf", label: "PDF", color: "#ef5b4a", ext: ["pdf"], lang: [] },
	{ id: "csv", label: "CSV", color: "#4cc26a", ext: ["csv", "tsv"], lang: [] },
	{ id: "txt", label: "TXT", color: "#a8aec4", ext: ["txt", "log"], lang: ["plaintext", "log"] },
	{
		id: "lock",
		label: "LCK",
		picture: "lock",
		color: "#9aa0b4",
		ext: ["lock"],
		lang: [],
		names: [
			"package-lock.json",
			"yarn.lock",
			"pnpm-lock.yaml",
			"bun.lockb",
			"poetry.lock",
			"uv.lock",
			"Pipfile.lock",
			"Cargo.lock",
			"go.sum",
			"Gemfile.lock",
			"composer.lock"
		]
	},
	{
		id: "env",
		label: "ENV",
		picture: "key",
		color: "#ecd53f",
		ext: ["env"],
		lang: [],
		names: [".env", ".env.local", ".env.example", ".env.development", ".env.production"]
	},
	{
		id: "docker",
		label: "DKR",
		color: "#2f9cef",
		ext: ["dockerfile"],
		lang: ["dockerfile"],
		names: [
			"Dockerfile",
			"Containerfile",
			"docker-compose.yml",
			"docker-compose.yaml",
			"compose.yml",
			"compose.yaml",
			".dockerignore"
		]
	},
	{
		id: "git",
		label: "GIT",
		color: "#f26b4f",
		ext: [],
		lang: ["ignore"],
		names: [
			".gitignore",
			".gitattributes",
			".gitmodules",
			".git-blame-ignore-revs",
			".cursorignore"
		]
	},
	{
		id: "npm",
		label: "NPM",
		color: "#e04a4a",
		ext: [],
		lang: [],
		names: ["package.json", ".npmrc"]
	},
	{
		id: "license",
		label: "LIC",
		color: "#d8bf4a",
		ext: [],
		lang: [],
		names: ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]
	}
];

// Special files (#101): names that mean more than their extension. Matched by exact name
// (case-insensitive); a name with a slash also requires that direct parent folder.
const page = (id, label, color, kind, names, ext = []) => ({
	id,
	label,
	color,
	kind,
	ext,
	lang: [],
	names
});
export const SPECIAL_FILES = [
	// Docs
	{
		...page("readme", "RDM", "#6fb3d2", "docs", [
			"README.md",
			"README",
			"README.rst",
			"README.txt"
		]),
		picture: "readme"
	},
	page("changelog", "CHG", "#6fb3d2", "docs", ["CHANGELOG.md", "CHANGES.md", "HISTORY.md"]),
	page("contributing", "CTB", "#6fb3d2", "docs", ["CONTRIBUTING.md"]),
	page("security", "SEC", "#e0574f", "docs", ["SECURITY.md"]),
	page("conduct", "COC", "#6fb3d2", "docs", ["CODE_OF_CONDUCT.md"]),
	page("owners", "OWN", "#a8aec4", "docs", ["CODEOWNERS", ".github/CODEOWNERS"]),
	page("mkdocs", "MKD", "#6fb3d2", "docs", ["mkdocs.yml"]),
	page("llms", "LLM", "#c792ea", "docs", ["llms.txt", "llms-full.txt"]),
	// Package manifests
	page("pyproject", "PYP", "#5a9fd4", "config", ["pyproject.toml"]),
	page("requirements", "REQ", "#5a9fd4", "config", [
		"requirements.txt",
		"requirements-dev.txt",
		"dev-requirements.txt"
	]),
	page("setup", "SET", "#5a9fd4", "config", ["setup.py", "setup.cfg"]),
	page("pipfile", "PIP", "#5a9fd4", "config", ["Pipfile"]),
	page("conda", "CND", "#4cc26a", "config", [
		"environment.yml",
		"environment.yaml",
		"conda.yaml",
		"conda.yml"
	]),
	page("cargo", "CRG", "#e0a57e", "config", ["Cargo.toml"]),
	page("gomod", "MOD", "#35c2e8", "config", ["go.mod"]),
	page("maven", "MVN", "#e0913a", "config", ["pom.xml"]),
	page("gradle", "GRD", "#5cbf9f", "config", [
		"build.gradle",
		"build.gradle.kts",
		"settings.gradle",
		"settings.gradle.kts",
		"gradle.properties",
		"gradlew",
		"gradlew.bat"
	]),
	page("composer", "CMP", "#8f93d6", "config", ["composer.json"]),
	page("gemfile", "GEM", "#e0574f", "config", ["Gemfile"]),
	page("dotnet", "NET", "#a97bff", "config", ["global.json", "nuget.config"], ["csproj", "sln"]),
	// Tool configs
	page("tsconfig", "TSC", "#3b8eea", "config", [
		"tsconfig.json",
		"jsconfig.json",
		"tsconfig.build.json"
	]),
	page("eslint", "ESL", "#8f93d6", "config", [
		"eslint.config.js",
		"eslint.config.mjs",
		"eslint.config.cjs",
		"eslint.config.ts",
		".eslintrc.json",
		".eslintrc.js",
		".eslintrc.cjs",
		".eslintrc.yml"
	]),
	page("prettier", "PRT", "#e3b341", "config", [
		".prettierrc",
		".prettierrc.json",
		".prettierrc.yaml",
		".prettierrc.yml",
		"prettier.config.js",
		"prettier.config.mjs"
	]),
	page("vite", "VIT", "#b58ae0", "config", [
		"vite.config.js",
		"vite.config.mjs",
		"vite.config.ts"
	]),
	page("vitest", "VTS", "#4cc26a", "config", [
		"vitest.config.js",
		"vitest.config.mjs",
		"vitest.config.ts"
	]),
	page("jest", "JST", "#e0574f", "config", [
		"jest.config.js",
		"jest.config.mjs",
		"jest.config.ts"
	]),
	page("webpack", "WPK", "#61dafb", "config", [
		"webpack.config.js",
		"webpack.config.mjs",
		"webpack.config.ts"
	]),
	page("next", "NXT", "#c8c8d8", "config", [
		"next.config.js",
		"next.config.mjs",
		"next.config.ts"
	]),
	page("babel", "BBL", "#e3b341", "config", ["babel.config.js", "babel.config.json", ".babelrc"]),
	page("editorconfig", "EDC", "#a8aec4", "config", [".editorconfig"]),
	// Build, containers and deploy, CI
	page("make", "MK", "#c98a4a", "tooling", ["Makefile", "GNUmakefile"]),
	page("cmake", "CMK", "#5b9bd5", "tooling", ["CMakeLists.txt"]),
	page("meson", "MSN", "#8fa8c8", "tooling", ["meson.build"]),
	page("just", "JF", "#c98a4a", "tooling", ["justfile"]),
	page("rake", "RAK", "#e0574f", "tooling", ["Rakefile"]),
	page("procfile", "PRC", "#a97bff", "tooling", ["Procfile"]),
	page("vagrant", "VGR", "#5391fe", "tooling", ["Vagrantfile"]),
	page("ci", "CI", "#f26b4f", "tooling", [
		".gitlab-ci.yml",
		"Jenkinsfile",
		"azure-pipelines.yml",
		".travis.yml"
	]),
	page("precommit", "PRE", "#f08d49", "tooling", [".pre-commit-config.yaml"]),
	page("bots", "BOT", "#5cbf5c", "tooling", [
		"dependabot.yml",
		".github/dependabot.yml",
		"renovate.json"
	]),
	page("codecov", "COV", "#e06c75", "tooling", ["codecov.yml", ".codecov.yml"]),
	page("versions", "VER", "#89e051", "tooling", [
		".nvmrc",
		".node-version",
		".python-version",
		".tool-versions"
	]),
	// Python project files
	page("conftest", "TST", "#5a9fd4", "code", ["conftest.py"]),
	page("manage", "MNG", "#5a9fd4", "code", ["manage.py"]),
	page("pyinit", "PKG", "#5a9fd4", "code", ["__init__.py"]),
	// AI agents: instruction files share one picture; Copilot's and Cursor's rule files by extension
	{
		...page(
			"agents",
			"AGT",
			"#c792ea",
			"agents",
			[
				"AGENTS.md",
				"AGENT.md",
				"CLAUDE.md",
				"CLAUDE.local.md",
				"GEMINI.md",
				".rules",
				".cursorrules",
				".windsurfrules",
				".clinerules",
				".github/copilot-instructions.md",
				"opencode.json"
			],
			["instructions.md", "prompt.md", "agent.md", "chatmode.md", "mdc"]
		),
		picture: "sparkle"
	},
	page("skill", "SKL", "#c792ea", "agents", ["SKILL.md"]),
	page("mcp", "MCP", "#c792ea", "agents", [
		".mcp.json",
		"mcp.json",
		".vscode/mcp.json",
		".cursor/mcp.json"
	]),
	// Process models and Robocorp
	{ ...page("bpmn", "BPM", "#f08d49", "model", [], ["bpmn"]), picture: "bpmn" },
	page("dmn", "DMN", "#e8a33d", "model", [], ["dmn"]),
	page("cmmn", "CMN", "#e0913a", "model", [], ["cmmn"]),
	{ ...page("robotyaml", "RBY", "#4cc26a", "model", ["robot.yaml"]), picture: "robot" },
	page("robot", "RBT", "#4cc26a", "code", [], ["robot"])
];

// The kind of every file type, for the theme sets. Unlisted types are code.
const KIND_OF = {
	config: ["json", "yaml", "toml", "xml", "csv", "npm"],
	tooling: ["env", "docker", "git"],
	docs: ["md", "txt", "pdf", "license", "ipynb"],
	media: ["svg", "image", "font", "zip"],
	muted: ["lock"]
};
export const kindOf = file =>
	file.kind ?? Object.keys(KIND_OF).find(kind => KIND_OF[kind].includes(file.id)) ?? "code";

// Special folders (#101): each kind is a folder with a cut-out emblem or label. A name with a
// slash also requires that direct parent folder (VS Code matches one parent level).
const TEST_PARENTS = ["tests", "test", "__tests__", "spec"];
const inTests = names => TEST_PARENTS.flatMap(parent => names.map(name => `${parent}/${name}`));
export const FOLDERS = [
	{
		id: "source",
		mark: "</>",
		names: ["src", "lib", "app", "packages", "pkg", "cmd", "internal"]
	},
	{ id: "tests", mark: "check", names: TEST_PARENTS },
	{ id: "docs", mark: "DOC", names: ["docs", "doc", "documentation", "wiki", "guides"] },
	{ id: "ci", mark: "CI", names: [".github", ".gitlab", ".circleci"] },
	{ id: "editor", mark: "IDE", names: [".vscode", ".idea", ".devcontainer"] },
	{ id: "scripts", mark: "SH", names: ["scripts", "tools"] },
	{
		id: "assets",
		mark: "IMG",
		names: ["assets", "public", "static", "images", "img", "fonts", "icons"]
	},
	{ id: "config", mark: "CFG", names: ["config", "configs", ".config"] },
	{
		id: "data",
		mark: "DAT",
		names: [
			"data",
			"datasets",
			"notebooks",
			"migrations",
			"devdata",
			"devdata/work-items-in",
			"devdata/work-items-out"
		]
	},
	{
		id: "agents",
		mark: "sparkle",
		names: [
			".agents",
			".claude",
			".cursor",
			".codex",
			".kiro",
			".opencode",
			".gemini",
			".windsurf",
			".roo",
			".junie",
			".continue",
			".clinerules",
			".amazonq",
			".agents/skills",
			".claude/skills",
			".claude/agents",
			".claude/commands",
			".cursor/rules",
			".github/agents",
			".github/instructions",
			".github/prompts"
		]
	},
	{
		id: "build",
		mark: "OUT",
		muted: true,
		names: ["dist", "build", "out", "target", "bin", "obj", "output"]
	},
	{
		id: "dependencies",
		mark: "DEP",
		muted: true,
		names: ["node_modules", "vendor", ".venv", "venv"]
	},
	{
		id: "cache",
		mark: "TMP",
		muted: true,
		names: ["__pycache__", ".pytest_cache", ".mypy_cache", ".cache", "coverage"]
	},
	// Test categories: inside a test folder; names that only mean tests, also anywhere.
	{ id: "unit", mark: "UNI", names: inTests(["unit"]) },
	{ id: "integration", mark: "INT", names: inTests(["integration"]) },
	{ id: "e2e", mark: "E2E", names: ["e2e", ...inTests(["e2e"])] },
	{ id: "functional", mark: "FUN", names: inTests(["functional"]) },
	{ id: "acceptance", mark: "ACC", names: ["acceptance", ...inTests(["acceptance"])] },
	{ id: "regression", mark: "REG", names: ["regression", ...inTests(["regression"])] },
	{ id: "smoke", mark: "SMK", names: ["smoke", ...inTests(["smoke"])] },
	{
		id: "performance",
		mark: "PRF",
		names: ["benchmarks", ...inTests(["performance", "perf", "load", "benchmarks"])]
	},
	{ id: "contract", mark: "CTR", names: inTests(["contract"]) },
	{ id: "api", mark: "API", names: inTests(["api"]) },
	{ id: "ui", mark: "UI", names: inTests(["ui"]) },
	{ id: "system", mark: "SYS", names: inTests(["system"]) },
	{ id: "fixtures", mark: "FIX", names: ["fixtures", ...inTests(["fixtures"])] },
	{ id: "mocks", mark: "MCK", names: ["__mocks__", ...inTests(["mocks"])] },
	{ id: "snapshots", mark: "SNP", names: ["__snapshots__", ...inTests(["snapshots"])] }
];

// Theme sets: each kind takes one of the theme's own colors (#101). A palette path: the token
// colors are under tokens.
export const KIND_COLORS = {
	folder: ["tokens", "keyword"],
	code: ["tokens", "function"],
	config: ["tokens", "type"],
	tooling: ["tokens", "property"],
	docs: ["tokens", "string"],
	media: ["tokens", "number"],
	agents: ["accent"],
	model: ["accentAlt"],
	muted: ["tokens", "comment"]
};

// Pictures: a few files whose shape says more than a label. Generic shapes, never a logo.
export const PICTURES = {
	readme: [
		"................",
		"...##########...",
		"...#.########...",
		"...#.########...",
		"...#.##....##...",
		"...#.########...",
		"...#.##...###...",
		"...#.########...",
		"...#.########...",
		"...#.########...",
		"...#.########...",
		"...#.########...",
		"...#.#######....",
		"...#..........#.",
		"....##########..",
		"................"
	],
	lock: [
		"................",
		"......####......",
		".....#....#.....",
		"....#......#....",
		"....#......#....",
		"....#......#....",
		"...##########...",
		"...##########...",
		"...####..####...",
		"...####..####...",
		"...#####.####...",
		"...#####.####...",
		"...##########...",
		"...##########...",
		"................",
		"................"
	],
	key: [
		"................",
		"................",
		"................",
		"................",
		"..####..........",
		".#....#.........",
		".#.##.##########",
		".#.##.##########",
		".#....#....##.##",
		"..####.....##.##",
		"................",
		"................",
		"................",
		"................",
		"................",
		"................"
	],
	robot: [
		"................",
		".......##.......",
		".......##.......",
		"...##########...",
		"...#........#...",
		"..##.##..##.##..",
		"..##.##..##.##..",
		"...#........#...",
		"...#..####..#...",
		"...#........#...",
		"...##########...",
		".....#....#.....",
		"....########....",
		"...##########...",
		"...##########...",
		"................"
	],
	bpmn: [
		"................",
		"................",
		"................",
		"................",
		".....######.....",
		".....#....#.....",
		".##..#....#..##.",
		"#..###....####..",
		"#..#.#....#.###.",
		".##..#....#..##.",
		".....######.....",
		"................",
		"................",
		"................",
		"................",
		"................"
	]
};
// Small marks cut out of a band or a folder.
export const MARKS = {
	sparkle: ["..#..", ".###.", "#####", ".###.", "..#.."],
	check: ["....#", "...##", "#.##.", "###..", ".#..."]
};

export const SIDEBAR = {
	// The side bar colors the icons are checked against: VS Code's defaults and Stylesmith's.
	dark: ["#181818", "#252526", "#0b0d19", "#070e09", "#0f0b04", "#080c12", "#000000"],
	light: ["#f8f8f8", "#f3f3f3", "#efe8d6", "#ffffff"]
};
export const FOLDER = { dark: "#56c8f0", light: "#0a6a94" };
// Generated things (lock files, build output, dependencies, caches) in Stylesmith Pixel.
export const MUTED = { dark: "#9aa0b4", light: "#5f6479" };

// Gutter icons for the Problem Lens. Each kind has its own shape, so it isn't told apart by
// color alone: a bold X, a bold "!" (heavy at the top), and a bold "i" (heavy at the bottom).
export const PROBLEM_ICONS = {
	error: {
		color: { dark: "#ff6b8b", light: "#b8203a" },
		map: [
			"................",
			"................",
			"..##........##..",
			"..###......###..",
			"...###....###...",
			"....###..###....",
			".....######.....",
			"......####......",
			"......####......",
			".....######.....",
			"....###..###....",
			"...###....###...",
			"..###......###..",
			"..##........##..",
			"................",
			"................"
		]
	},
	warning: {
		color: { dark: "#ffcc66", light: "#7a5000" },
		map: [
			"................",
			"................",
			"......####......",
			"......####......",
			"......####......",
			"......####......",
			"......####......",
			".......##.......",
			".......##.......",
			".......##.......",
			"................",
			"......####......",
			"......####......",
			"................",
			"................",
			"................"
		]
	},
	info: {
		color: { dark: "#5fe0ff", light: "#005c80" },
		map: [
			"................",
			"................",
			"......####......",
			"......####......",
			"................",
			".....#####......",
			"......####......",
			"......####......",
			"......####......",
			"......####......",
			"......####......",
			"....########....",
			"....########....",
			"................",
			"................",
			"................"
		]
	}
};

// Editor backgrounds the problem icons are checked against: VS Code's defaults and Stylesmith's.
export const EDITOR = {
	dark: ["#1e1e1e", "#1f1f1f", "#0f1120", "#0b130d", "#140f07", "#0c121a", "#000000"],
	light: ["#ffffff", "#f7f2e4", "#f3f3f3"]
};
