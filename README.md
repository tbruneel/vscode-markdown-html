# VS Code Markdown HTML (`tbruneel/vscode-markdown-html`)

## Key Takeaways

> [!IMPORTANT]
> **How this extension exports and views self-contained `.md.html` documents in VS Code:**
> - **Instant Pure-JS Export (`.md` $\rightarrow$ `.md.html`):** Converts Markdown files into **100% self-contained single-file `.md.html` documents** in milliseconds using pure Node.js (`markdown-it`, `@vscode/markdown-it-katex`, `highlight.js`, and `markdown-it-emoji`)—with zero Chromium or `puppeteer-core` bloat.
> - **100% Portable Single-File Output:** Automatically inlines CSS stylesheets, Base64-encoded KaTeX math fonts (`.woff2`/`.woff`/`.ttf`), local relative images (`png`, `jpg`, `svg`, `gif`, `webp`), GitHub Alert octicons, and interactive code-block copy buttons directly into the `.md.html` file so it opens anywhere without external dependencies.
> - **Built-In Rendered Viewer & Smart Auto-Update on Save:** Clicking any `*.md.html` file in VS Code opens the rendered webpage immediately (`markdown-html.viewer`). Once `<file>.md.html` exists alongside `<file>.md`, saving the `.md` file (`Ctrl+S`) or switching themes in [`vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets) automatically updates `<file>.md.html` and live-reloads any open viewer tab.

## 1. Quick Start Guide

### Step A — Export a Markdown File (`.md` $\rightarrow$ `.md.html`)

Open any saved `.md` file in VS Code and trigger an export using any of the three built-in entry points:

| Entry Point | Action to Perform |
| :--- | :--- |
| **1. Editor Title Bar Button** | Click the **Export (`.md.html`)** icon (`$(export)`) in the top-right corner of the Markdown editor title bar (right next to **Open Preview to the Side**). |
| **2. Context Menu** | Right-click the `.md` file in the **VS Code Explorer** (or right-click inside the active Markdown editor) $\rightarrow$ click **`Markdown HTML: Export (.md.html)`**. |
| **3. Command Palette** | Press `Ctrl+Shift+P` (or `F1`) $\rightarrow$ run **`Markdown HTML: Export (.md.html)`**. |

This creates `<filename>.md.html` in the same folder as `<filename>.md` and displays a confirmation in the VS Code status bar.

### Step B — View & Auto-Update `.md.html` Files

1. **Open the Rendered View in VS Code:**
   - Click any `*.md.html` file in the VS Code Explorer to open it directly in the **Markdown HTML Viewer** (complete with working `#anchor` table-of-contents scrolling and copy-to-clipboard code buttons).
   - Click the **Open Source File** icon (`$(file-code)`) in the top-right viewer title bar at any time to jump back to the source `.md` file.
2. **Automatic Updates on Save (`"ifExists"`):**
   - By default (`"markdown-html.convertOnSave": "ifExists"`), saving a `.md` file only exports when its companion `.md.html` file already exists on disk.
   - Once you export a `.md` file once, every subsequent `Ctrl+S` on that `.md` file automatically updates its `.md.html` file and live-reloads the viewer.
3. **Inspect Raw HTML Source When Needed:**
   - To view the raw HTML source code of a `.md.html` file inside VS Code, right-click the editor tab or Explorer item $\rightarrow$ **Reopen Editor With...** $\rightarrow$ **Text Editor**.

## 2. Commands, UI Actions & Configuration Reference

### 2.1 Commands & Custom Editor Contributions

| Identifier | Title / Label | Location & Behavior |
| :--- | :--- | :--- |
| `extension.markdown-html.export` | **Markdown HTML: Export (.md.html)** | • **Editor Title Bar (`$(export)`):** Shown when editing a `.md` file.<br>• **Explorer & Editor Context Menus:** Shown for `.md` files.<br>• **Command Palette:** Exports the active `.md` file to `<file>.md.html`. |
| `extension.markdown-html.showSource` | **Open Source File** | • **Viewer Title Bar (`$(file-code)`):** Shown when viewing a `*.md.html` file.<br>• **Command Palette:** Opens or focuses the corresponding `<file>.md` source file. |
| `markdown-html.viewer` | **Markdown HTML Viewer** | • **Default Custom Editor for `*.md.html`:** Renders `*.md.html` files in a VS Code Webview with live file-watcher reload and smooth `#anchor` navigation. |

### 2.2 Extension Settings (`markdown-html.*`)

| Setting | Default | Description |
| :--- | :--- | :--- |
| `markdown-html.convertOnSave` | `"ifExists"` | Controls automatic `.md.html` export when saving a `.md` file:<br>• `"ifExists"`: Updates `<file>.md.html` on save **only** if `<file>.md.html` already exists.<br>• `"always"`: Creates or updates `<file>.md.html` on every `.md` save.<br>• `"never"`: Disables automatic export on save. |
| `markdown-html.convertOnSaveExclude` | `[]` | Array of regular expression patterns for filenames excluded from `convertOnSave`. |
| `markdown-html.includeDefaultStyles` | `true` | When neither `"markdown.styles"` nor `"markdown-html.styles"` is set, automatically inlines the bundled `markdown-vscode-light2026.css` or `markdown-vscode-dark2026.css` matching your active VS Code color theme. |
| `markdown-html.styles` | `[]` | Optional array of additional local CSS paths or `https://` URLs to inline after `"markdown.styles"`. |
| `markdown-html.stylesRelativePathFile` | `false` | When `true`, resolves relative paths in `markdown-html.styles` relative to the `.md` file instead of the workspace root. |
| `markdown-html.outputDirectory` | `""` | Optional directory path for exported `.md.html` files (supports `~`, relative paths, or absolute paths). Leave empty to write next to the `.md` file. |
| `markdown-html.outputDirectoryRelativePathFile` | `false` | When `true`, resolves relative `outputDirectory` paths relative to the `.md` file. |
| `markdown-html.sanitize` | `"gfm"` | Raw HTML sanitization mode:<br>• `"gfm"`: Strips unsafe tags (`<script>`, `<iframe>`, `<style>`, etc.) and `on*` / `javascript:` attributes per GitHub Flavored Markdown.<br>• `"gfm-allow-style"`: Same as `"gfm"` but preserves inline `<style>` blocks.<br>• `"none"`: Disables HTML sanitization. |
| `markdown-html.highlight` | `true` | Enables `highlight.js` syntax highlighting for fenced code blocks. |
| `markdown-html.highlightStyle` | `""` | Optional `highlight.js` theme filename (defaults to the bundled `tomorrow.css` base). |
| `markdown-html.math.enabled` | `true` | Enables server-side KaTeX math rendering for `$...$`, `$$...$$`, `\(...\)`, `\[...\]`, and ```` ```math ```` blocks. |
| `markdown-html.math.katex.macros` | `{}` | Object of custom KaTeX macros (e.g. `{"\\RR": "\\mathbb{R}"}`) passed to the KaTeX renderer. |
| `markdown-html.emoji` | `true` | Converts emoji shortcodes (such as `:rocket:`) into native Unicode emojis (🚀). |
| `markdown-html.breaks` | `false` | Converts single line breaks inside paragraphs into `<br>` tags. |
| `markdown-html.mermaidServer` | `"https://unpkg.com/..."` | Mermaid JS URL injected **only** when the document contains a ```` ```mermaid ```` diagram. |
| `markdown-html.StatusbarMessageTimeout` | `5000` | Duration (in ms) for the `$(markdown) Exported <file>.md.html` status bar notification. |

### 2.3 Switching Export & Preview Themes

**Zero configuration is needed by default.** When [`tbruneel/vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets) is installed, switching themes via **`Markdown Stylesheets: Select Theme`** or setting `"markdown-stylesheets.theme"` in `settings.json` updates `"markdown.styles"` and automatically re-exports any open `.md` documents that have an existing `.md.html` file:

```json
{
    "markdown-stylesheets.theme": "github-light"
}
```

| `"markdown-stylesheets.theme"` Value | Stylesheet Inlined into Exported `.md.html` |
| :--- | :--- |
| `"auto"` *(default)* | Bundled `markdown-vscode-light2026.css` or `markdown-vscode-dark2026.css` (matching your active VS Code Light/Dark window theme). |
| `"vscode-light2026"` | `markdown-vscode-light2026.css` (`#FFFFFF` background, `#202020` text). |
| `"vscode-dark2026"` | `markdown-vscode-dark2026.css` (`#121314` background, `#BBBEBF` text). |
| `"github-light"` | `markdown-github-light.css` (`#FFFFFF` background, `#1F2328` text, GitHub Primer Light). |
| `"github-dark"` | `markdown-github-dark.css` (`#0D1117` background, `#F0F6FC` text, GitHub Primer Dark). |

## 3. Supported Markdown & Export Features

| Feature | Syntax & Export Behavior |
| :--- | :--- |
| **GitHub-Style Alerts** | Renders `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, and `> [!CAUTION]` blockquotes with inline Octicon SVGs and consistent `16px` title spacing. |
| **Self-Contained KaTeX Math** | Renders inline (`$...$`, `\(...\)`) and display (`$$...$$`, `\[...\]`, ```` ```math ````) equations to static HTML/MathML at export time. Only when math is present in the document does the exporter append `katex.min.css` with all `url(fonts/...)` references rewritten as Base64 `data:font/woff2;base64,...` URIs. |
| **Self-Contained Local Images** | Automatically resolves local relative image paths (`png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`, `bmp`, `ico`) relative to the `.md` file and embeds them as `data:image/...;base64,...` URIs. Remote `http://` / `https://` URLs are left untouched. |
| **Syntax Highlighting & Copy Buttons** | Highlights fenced code blocks via `highlight.js` with `class="language-<lang>"` on `<code>` and injects a lightweight client-side copy button (`.code-block-copy-button`) into every `<pre>` block with a `48px` right gutter and `"Copy code to clipboard"` / `"Copied!"` tooltip. |
| **Task Lists, Emojis & Heading Slugs** | Supports GFM checkboxes (`- [ ]` / `- [x]`), `:emoji:` shortcodes, YAML front-matter overrides (`breaks`, `emoji`, `math.enabled`, `math.katex.macros`), and GitHub-compatible heading `id` slugs. |
| **Conditional Mermaid Diagrams** | Converts ```` ```mermaid ```` blocks into `<div class="mermaid">` and injects the Mermaid `<script>` tag **only** when the document actually contains a Mermaid diagram. |

## 4. Technical Overview: Architecture & Fork Modifications

### 4.1 End-to-End Export & Viewer Pipeline

```text
+-------------------------------------------------------------------------------+
| Source Document: <file>.md                                                    |
|  • Triggered manually (Title Bar / Context Menu / Command Palette)            |
|  • Or automatically on Ctrl+S ("convertOnSave": "ifExists") / Theme Change    |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| 1. Markdown Conversion Pipeline (convertMarkdownToHtml)                       |
|  • Strips YAML front matter (reads per-file breaks, emoji, and KaTeX macros)  |
|  • markdown-it + GFM HTML sanitizer + checkboxes + emoji + named heading IDs  |
|  • markdown-it-github-alerts (> [!NOTE], [!TIP], [!IMPORTANT], etc.)          |
|  • @vscode/markdown-it-katex + mathFence + mathBrackets -> static KaTeX HTML  |
|  • Rewrites local relative <img src="..."> paths to Base64 data: URIs         |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| 2. Self-Contained Style & Template Assembly (makeHtml / buildStyleTags)       |
|  • Inlines tomorrow.css + "markdown.styles" (from vscode-markdown-stylesheets)|
|    or falls back to bundled markdown-vscode-light2026 / dark2026.css          |
|  • If class="katex" is present, inlines katex.min.css with Base64 woff2 fonts |
|  • Injects template.html with interactive code-block copy-to-clipboard script |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Output: <file>.md.html (100% Self-Contained Single File)                      |
|  • Opens in any browser on any machine with zero external file dependencies   |
|  • Opens in VS Code via MarkdownHtmlViewerProvider (live reload + #anchors)   |
+-------------------------------------------------------------------------------+
```

### 4.2 Summary of Fork Modifications (from `yzane/vscode-markdown-pdf`)

This extension is derived from [`yzane/vscode-markdown-pdf`](https://github.com/yzane/vscode-markdown-pdf) and redesigned specifically for fast, portable `.md.html` workflows:

| Category | Upstream `yzane/vscode-markdown-pdf` | `tbruneel/vscode-markdown-html` |
| :--- | :--- | :--- |
| **Runtime & Dependencies** | Downloads ~150 MB Chromium via `puppeteer-core`; bundles `cheerio`, `mustache`, `markdown-it-container`, `markdown-it-plantuml`, etc. | Pure Node.js (`markdown-it`, `katex`, `highlight.js`, `js-yaml`, `markdown-it-emoji`) bundled into a single `dist/extension.js` via `esbuild`. |
| **Output Format & Portability** | Exports `.html` with external `<link>` stylesheet tags and external relative image paths that break when the `.html` file is moved or shared. | Exports `<file>.md.html` with all local CSS stylesheets, KaTeX fonts, and local images Base64-inlined into a single portable file. |
| **Theme & Layout Integration** | Uses legacy VS Code preview CSS with full-bleed width and no dark-mode or GitHub Primer support. | Follows `"markdown.styles"` (paired with [`vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets)) and bundles `902px` (`838px` content) VS Code Light/Dark 2026 fallback themes. |
| **Code Blocks & Alerts** | Basic `<pre class="hljs"><code><div>` without language classes, copy buttons, or GitHub Alerts. | Emits `<code class="language-...">`, adds a `48px` right gutter with an interactive copy button + tooltip, and includes native GitHub Alerts. |
| **VS Code Integration** | No `.html` viewer; `convertOnSave` is boolean (`true`/`false`). | Includes a built-in `*.md.html` Custom Editor viewer (`markdown-html.viewer`), editor title bar buttons (`Export` & `Open Source File`), and `"ifExists"` smart auto-save. |

### 4.3 Building & Typechecking from Source

```powershell
# Install dependencies
npm install

# Run TypeScript typechecking
npm run check

# Bundle src/extension.ts -> dist/extension.js via esbuild
npm run build
```
