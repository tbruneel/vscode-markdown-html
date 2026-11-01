# VS Code Markdown HTML (`tbruneel/vscode-markdown-html`)

A lightweight VS Code extension that exports Markdown (`.md`) files into **100% self-contained `.md.html` documents** (with inlined CSS, KaTeX math fonts, and local images) and includes a **built-in rendered viewer** for `*.md.html` files inside VS Code.

Derived from [`yzane/vscode-markdown-pdf`](https://github.com/yzane/vscode-markdown-pdf) and paired with:
- [`tbruneel/vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets) — Declarative CSS extension providing the `902px` preview layout and whitelisted VS Code 2026 & GitHub Primer themes for `"markdown.styles"`.
- [`tbruneel/vscode-markdown-alert`](https://github.com/tbruneel/vscode-markdown-alert) — Live VS Code Markdown preview support for GitHub Alerts.

---

## Key Features & Fork Modifications

1. **Lightweight Pure-JS Architecture (Zero Chromium / Puppeteer):**
   - Strips out `puppeteer-core`, background Chromium downloads, and PDF/PNG/JPEG/PlantUML/`:::container` bloat.
   - Exports `.md` $\rightarrow$ `.md.html` in milliseconds using pure Node.js (`markdown-it`, `@vscode/markdown-it-katex`, `highlight.js`, and `markdown-it-emoji`).
2. **Automatic Stylesheet Selection (Follows `"markdown.styles"` or Active VS Code Theme):**
   - If VS Code's native **`"markdown.styles"`** (or `"markdown-html.styles"`) is configured, those stylesheets are **inlined directly into `<style>...</style>`**.
   - If `"markdown.styles"` is empty (`[]`), the exporter automatically detects your active VS Code color theme (`Light` vs `Dark`) and inlines the bundled `markdown-vscode-light2026.css` or `markdown-vscode-dark2026.css` stylesheet—so **zero `settings.json` configuration is required** out of the box.
3. **100% Self-Contained `.md.html` Single-File Output:**
   - CSS stylesheets, KaTeX math fonts, and local relative images (`png`, `jpg`, `svg`, `gif`, `webp`) are embedded directly inside the `.md.html` file.
   - Every exported `.md.html` file can be opened in any browser on any machine—or inside VS Code—without external file dependencies.
4. **Smart Auto-Update on Save (`markdown-html.convertOnSave`):**
   - Defaults to `"ifExists"`: export a `.md` file manually once via **Markdown HTML: Export (.md.html)** to create `<file>.md.html`, and every subsequent `Ctrl+S` on `<file>.md` automatically updates `<file>.md.html` (and live-reloads any open viewer tab).
   - Can also be set to `"always"` or `"never"`.
5. **Built-In Rendered Viewer for `*.md.html` (`markdown-html.viewer`) & Editor Title Bar Actions:**
   - Registers a `CustomReadonlyEditorProvider` with `"priority": "default"` for `*.md.html`.
   - Clicking any `*.md.html` file in VS Code's Explorer opens the rendered webpage view immediately instead of raw HTML source (use **Reopen Editor With... $\rightarrow$ Text Editor** whenever you want to inspect the raw HTML).
   - Adds a **`Markdown HTML: Export (.md.html)`** button (`$(export)`) in the editor title bar of `.md` files right next to the Markdown Preview buttons, and an **`Open Source File`** button (`$(file-code)`) in the `.md.html` viewer title bar to jump back to the corresponding `.md` file.

---

## Configuration (`settings.json`)

**Zero configuration is needed by default**—installing the three extensions automatically configures the `902px` preview layout, GitHub Alerts, `*.md.html` viewer, auto-save updates, and active VS Code Light/Dark theme export.

If you want to override the theme in **both** the built-in Markdown Preview and `.md.html` exports (for example, to use GitHub Light), run **`Markdown Stylesheets: Select Theme`** from the Command Palette or set `"markdown-stylesheets.theme"` in `settings.json`:

```json
{
    "markdown-stylesheets.theme": "github-light" // Options: "auto", "vscode-light2026", "vscode-dark2026", "github-light", "github-dark"
}
```
