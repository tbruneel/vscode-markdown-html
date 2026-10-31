# VS Code Markdown HTML (`tbruneel/vscode-markdown-html`)

A lightweight VS Code extension that exports Markdown (`.md`) files into **100% self-contained `.md.html` documents** (with inlined CSS, KaTeX math fonts, and local images) and includes a **built-in rendered viewer** for `*.md.html` files inside VS Code.

Derived from [`yzane/vscode-markdown-pdf`](https://github.com/yzane/vscode-markdown-pdf) and paired with:
- [`tbruneel/vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets) — GitHub-compatible `1012px` fixed-width stylesheets for VS Code Light/Dark 2026 and GitHub Light/Dark themes.
- [`tbruneel/vscode-markdown-alert`](https://github.com/tbruneel/vscode-markdown-alert) — Live VS Code Markdown preview support for GitHub Alerts and `1012px` page/table geometry.

---

## Key Features & Fork Modifications

1. **Lightweight Pure-JS Architecture (Zero Chromium / Puppeteer):**
   - Strips out `puppeteer-core`, background Chromium downloads, and PDF/PNG/JPEG/PlantUML/`:::container` bloat.
   - Exports `.md` $\rightarrow$ `.md.html` in milliseconds using pure Node.js (`markdown-it`, `@vscode/markdown-it-katex`, `highlight.js`, and `markdown-it-emoji`).
2. **100% Self-Contained `.md.html` Single-File Output:**
   - Local CSS stylesheets configured in `markdown-html.styles` are **inlined directly into `<style>...</style>`** (rather than `<link href="file://...">`).
   - KaTeX math fonts and local relative images (`png`, `jpg`, `svg`, `gif`, `webp`) are embedded as base64 `data:` URIs.
   - Every exported `.md.html` file can be opened in any browser on any machine—or inside VS Code—without external file dependencies.
3. **Smart Auto-Update on Save (`markdown-html.convertOnSave`):**
   - Defaults to `"ifExists"`: export a `.md` file manually once via **Markdown HTML: Export (.md.html)** to create `<file>.md.html`, and every subsequent `Ctrl+S` on `<file>.md` automatically updates `<file>.md.html` (and live-reloads any open viewer tab).
   - Can also be set to `"always"` or `"never"`.
4. **Built-In Rendered Viewer for `*.md.html` (`markdown-html.viewer`):**
   - Registers a `CustomReadonlyEditorProvider` with `"priority": "default"` for `*.md.html`.
   - Clicking any `*.md.html` file in VS Code's Explorer opens the rendered webpage view immediately instead of raw HTML source (use **Reopen Editor With... $\rightarrow$ Text Editor** whenever you want to inspect the source).
5. **Full Feature Parity Across GitHub, VS Code Preview, and `.md.html`:**
   - **GitHub-Style Alerts:** `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, and `> [!CAUTION]` with GitHub Octicon SVGs and compact `6px` title spacing.
   - **KaTeX Math:** `$...$`, `$$...$$`, `\(...\)`, `\[...\]`, and ````math` fenced code blocks.
   - **Syntax Highlighting & Mermaid:** `highlight.js` code blocks and ````mermaid` diagrams (Mermaid script is injected only when a document actually contains a Mermaid block).
   - **Native Unicode Emojis & Checkboxes:** `:rocket:` $\rightarrow$ `🚀` and GFM task lists (`- [x]`).

---

## Configuration (`settings.json`)

```json
{
    "markdown-html.convertOnSave": "ifExists",
    "markdown-html.includeDefaultStyles": false,
    "markdown-html.styles": [
        "D:\\Development\\vscode-markdown-stylesheets\\markdown-vscode-light2026.css"
    ],
    "workbench.editorAssociations": {
        "*.md.html": "markdown-html.viewer"
    }
}
```
