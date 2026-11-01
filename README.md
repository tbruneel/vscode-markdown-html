# VS Code Markdown HTML

## Key Takeaways

> [!IMPORTANT]
> - **Self-Contained Export:** Exports Markdown files (`.md`) into self-contained Markdown files (`.md.html`) with inlined CSS stylesheets, KaTeX math fonts, local images, GitHub Alerts, and blockquote copy-to-clipboard buttons. When editing and saving a `.md` file which was previously exported, it is automatically updated.
> - **Built-In Viewer:** Opens `.md.html` files directly in VS Code's built-in web browser with live reload and one-click navigation back to the `.md` source file.
> - **Companion Extensions:** Works alongside [`vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets) and [`vscode-markdown-alert`](https://github.com/tbruneel/vscode-markdown-alert).

## Exporting Self-Contained Markdown

Open any `.md` file in VS Code and export it using any of the following actions:

| Entry Point | Action |
| :--- | :--- |
| **Editor Title Bar** | Click the **Export** icon in the top-right corner of the Markdown editor. |
| **Context Menu** | Right-click the `.md` file in the Explorer or inside the editor → Click **`Markdown HTML: Export`**. |
| **Command Palette** | Press `Ctrl+Shift+P` → Click **`Markdown HTML: Export`**. |

When editing and saving a `.md` file which was previously exported as a `.md.html` file, it is automatically updated.

## Viewing Self-Contained Markdown Exports

- **Built-In Viewer:** By default, opening any `.md.html` file in the VS Code Explorer opens the rendered document directly in VS Code's built-in web browser and live-reloads whenever the file is updated.
- **Open Source File:** Click the **Open Source File** icon in the top-right corner of the viewer title bar to jump back to the corresponding `.md` file.
- **View Raw HTML Source:** Right-click the `.md.html` tab or Explorer item → **Reopen Editor With...** → **Text Editor**.

## Supported Features & Settings

### Markdown Features

| Feature | Export Behavior |
| :--- | :--- |
| **GitHub Alerts** | Renders `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]` callouts with inline icons. |
| **KaTeX Math** | Renders inline (`$...$`, `\(...\)`) and display (`$$...$$`, `\[...\]`, ```` ```math ````) equations and embeds Base64 KaTeX fonts when math is used. |
| **Local Images** | Embeds local relative images (`png`, `jpg`, `gif`, `svg`, `webp`, `bmp`, `ico`) as Base64 `data:` URIs. |
| **Blockquotes** | Highlights syntax via `highlight.js` and adds a copy-to-clipboard button to every blockquote. |
| **GFM & Mermaid** | Supports task lists (`- [x]`), `:emoji:` shortcodes, YAML front matter, GFM HTML sanitization, and ```` ```mermaid ```` diagrams. |

### Key Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `markdown-html.convertOnSave` | `"ifExists"` | Auto-export on save: `"ifExists"` (only if `.md.html` already exists), `"always"`, or `"never"`. |
| `markdown-html.includeDefaultStyles` | `true` | Inlines the bundled VS Code Light/Dark 2026 stylesheet when `"markdown.styles"` is not set. |
| `markdown-html.styles` | `[]` | Additional local CSS paths or `https://` URLs to inline into exported `.md.html` files. |
| `markdown-html.outputDirectory` | `""` | Custom output folder for `.md.html` files (defaults to the same directory as the `.md` file). |
| `markdown-html.sanitize` | `"gfm"` | HTML sanitization mode (`"gfm"`, `"gfm-allow-style"`, or `"none"`). |
| `markdown-html.math.enabled` | `true` | Enables KaTeX math rendering (custom macros can be set in `markdown-html.math.katex.macros`). |

When [`vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets) is installed, exported `.md.html` files automatically inline the active `"markdown-stylesheets.theme"` (`"auto"`, `"vscode-light2026"`, `"vscode-dark2026"`, `"github-light"`, or `"github-dark"`).

## Companion Extensions

This repository is part of a three-extension setup:

| Extension Repository | Role in the VS Code Markdown Suite |
| :--- | :--- |
| **[`tbruneel/vscode-markdown-html`](https://github.com/tbruneel/vscode-markdown-html)** *(this repo)* | Exports Markdown files (`.md`) to self-contained Markdown files (`.md.html`) which are automatically opened by VS Code's built-in web browser. |
| **[`tbruneel/vscode-markdown-stylesheets`](https://github.com/tbruneel/vscode-markdown-stylesheets)** | Provides custom Markdown stylesheet themes that align with GitHub styling (such as a fixed-width centered layout, and blockquotes with horizontal scrollbars and a copy-to-clipboard button). |
| **[`tbruneel/vscode-markdown-alert`](https://github.com/tbruneel/vscode-markdown-alert)** | Provides support for GitHub Alert callouts in VS Code's live Markdown Preview, with support for automatic theme detection and Markdown stylesheet theme overrides. |

## Building & Packaging from Source

```powershell
# Install dependencies
npm install

# Run TypeScript typechecking and bundle dist/extension.js via esbuild
npm run check
npm run build

# Package into a local .vsix archive
npx @vscode/vsce package --no-dependencies
```
