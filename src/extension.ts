// VS Code extension entry point: exports Markdown (.md) to self-contained .md.html
// files (manually or automatically on save) and provides a built-in rendered viewer for *.md.html.
import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import * as utils from './utils';
import * as logger from './logger';
import { installSanitizeRules } from './markdown-it-sanitize';
import hljs from 'highlight.js';
import markdownIt from 'markdown-it';
import { markdownItCheckbox } from './markdown-it-checkbox';
import { full as markdownItEmojiFull } from 'markdown-it-emoji';
import { markdownItNamedHeaders } from './markdown-it-named-headers';
import { markdownItGitHubAlerts } from './markdown-it-github-alerts';
import markdownItKatex from '@vscode/markdown-it-katex';
import { mathFencePlugin } from './markdown-it-math-fence';
import { mathBracketsPlugin } from './markdown-it-math-brackets';
import { renderMath } from './math-renderer';
import { MarkdownHtmlViewerProvider } from './html-viewer';

const EXTENSION_ROOT = path.join(__dirname, '..');
const SHOW_DETAILS_ACTION = 'Show Details';

function getConfig<T>(key: string, defaultValue: T, resource?: vscode.Uri): T {
  const htmlConfig = vscode.workspace.getConfiguration('markdown-html', resource);
  const inspect = htmlConfig.inspect<T>(key);
  if (
    inspect &&
    (inspect.workspaceFolderValue !== undefined ||
      inspect.workspaceValue !== undefined ||
      inspect.globalValue !== undefined)
  ) {
    return htmlConfig.get<T>(key, defaultValue);
  }
  const legacyConfig = vscode.workspace.getConfiguration('markdown-pdf', resource);
  const legacyInspect = legacyConfig.inspect<T>(key);
  if (
    legacyInspect &&
    (legacyInspect.workspaceFolderValue !== undefined ||
      legacyInspect.workspaceValue !== undefined ||
      legacyInspect.globalValue !== undefined)
  ) {
    return legacyConfig.get<T>(key, defaultValue);
  }
  return htmlConfig.get<T>(key, defaultValue);
}

export function activate(context: vscode.ExtensionContext): void {
  logger.initializeLogger(
    context,
    () => vscode.window.createOutputChannel('Markdown HTML', { log: true }),
  );

  context.subscriptions.push(
    MarkdownHtmlViewerProvider.register(context),
    vscode.commands.registerCommand('extension.markdown-html.export', async (uri?: vscode.Uri) => {
      await exportMarkdownCommand(uri, false);
    }),
    vscode.commands.registerCommand('extension.markdown-html.showSource', async (uri?: vscode.Uri) => {
      await showSourceCommand(uri);
    }),
    vscode.commands.registerCommand('extension.markdown-pdf.html', async (uri?: vscode.Uri) => {
      await exportMarkdownCommand(uri, false);
    }),
    vscode.commands.registerCommand('extension.markdown-pdf.settings', async (uri?: vscode.Uri) => {
      await exportMarkdownCommand(uri, false);
    }),
    vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
      await onDidSaveMarkdownDocument(document);
    }),
    vscode.workspace.onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
      if (
        e.affectsConfiguration('markdown.styles') ||
        e.affectsConfiguration('markdown-html.styles') ||
        e.affectsConfiguration('markdown-pdf.styles')
      ) {
        for (const doc of vscode.workspace.textDocuments) {
          await onDidSaveMarkdownDocument(doc);
        }
      }
    }),
  );
}

export function deactivate(): void {}

async function onDidSaveMarkdownDocument(document: vscode.TextDocument): Promise<void> {
  if (document.languageId !== 'markdown' || document.isUntitled) {
    return;
  }

  const convertOnSave = getConfig<string | boolean>('convertOnSave', 'ifExists', document.uri);
  if (convertOnSave === 'never' || convertOnSave === false) {
    return;
  }

  const basename = path.basename(document.fileName);
  const excludePatterns = getConfig<string[]>('convertOnSaveExclude', [], document.uri);
  if (utils.isExcludeFile(basename, excludePatterns)) {
    return;
  }

  const targetFilename = getOutputPath(utils.toMdHtmlFilename(document.uri.fsPath), document.uri);
  if (!targetFilename) {
    return;
  }

  if (convertOnSave === 'ifExists' && !utils.isExistsPath(targetFilename)) {
    return;
  }

  exportDocumentToHtml(document, targetFilename, true);
}

async function exportMarkdownCommand(uri?: vscode.Uri, isOnSave = false): Promise<void> {
  try {
    let document: vscode.TextDocument | undefined;
    if (uri) {
      document = await vscode.workspace.openTextDocument(uri);
    } else if (vscode.window.activeTextEditor) {
      document = vscode.window.activeTextEditor.document;
    }

    if (!document) {
      vscode.window.showWarningMessage('Markdown HTML: No active Markdown editor.');
      return;
    }

    if (document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('Markdown HTML: Active document is not a Markdown file.');
      return;
    }

    if (document.isUntitled || !utils.isExistsPath(document.uri.fsPath)) {
      vscode.window.showWarningMessage('Markdown HTML: Please save the Markdown file before exporting.');
      return;
    }

    const targetFilename = getOutputPath(utils.toMdHtmlFilename(document.uri.fsPath), document.uri);
    if (!targetFilename) {
      return;
    }

    exportDocumentToHtml(document, targetFilename, isOnSave);
  } catch (error) {
    reportError('Markdown HTML: Export failed.', error);
  }
}

async function showSourceCommand(uri?: vscode.Uri): Promise<void> {
  try {
    let htmlFilePath: string | undefined = uri?.fsPath;

    if (!htmlFilePath) {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      if (activeTab?.input instanceof vscode.TabInputCustom && activeTab.input.uri) {
        htmlFilePath = activeTab.input.uri.fsPath;
      }
    }

    if (!htmlFilePath) {
      htmlFilePath = MarkdownHtmlViewerProvider.getActiveFilePath();
    }

    if (!htmlFilePath) {
      vscode.window.showWarningMessage('Markdown HTML: No active .md.html viewer.');
      return;
    }

    const mdFilePath = utils.toSourceMdFilename(htmlFilePath);
    if (!utils.isExistsPath(mdFilePath)) {
      vscode.window.showWarningMessage(
        `Markdown HTML: Source Markdown file not found (${path.basename(mdFilePath)}).`,
      );
      return;
    }

    const mdUri = vscode.Uri.file(mdFilePath);
    const normalizedTarget = path.normalize(mdFilePath).toLowerCase();
    const existingEditor = vscode.window.visibleTextEditors.find(
      (editor) => path.normalize(editor.document.uri.fsPath).toLowerCase() === normalizedTarget,
    );
    const document = await vscode.workspace.openTextDocument(mdUri);
    await vscode.window.showTextDocument(document, existingEditor ? existingEditor.viewColumn : undefined);
  } catch (error) {
    reportError('Markdown HTML: Failed to open source Markdown file.', error);
  }
}

/**
 * Exports a Markdown file on disk or from a TextDocument to its target .md.html file.
 */
export function exportDocumentToHtml(
  document: vscode.TextDocument,
  exportFilename: string,
  isOnSave: boolean,
): void {
  const mdfilename = document.uri.fsPath;
  const text = document.getText();
  const sanitizeMode = getConfig<utils.SanitizeMode>('sanitize', 'gfm', document.uri);

  const converted = convertMarkdownToHtml(mdfilename, text, document.uri, sanitizeMode);
  if (!converted) {
    return;
  }

  const html = makeHtml(converted.html, document.uri);
  if (html === undefined) {
    return;
  }

  try {
    fs.writeFileSync(exportFilename, html, 'utf-8');
    MarkdownHtmlViewerProvider.refreshFile(exportFilename);
    const timeout = getConfig<number>('StatusbarMessageTimeout', 5000, document.uri);
    vscode.window.setStatusBarMessage('$(markdown) Exported ' + path.basename(exportFilename), timeout);
    logger.logInfo('Exported: ' + exportFilename);
  } catch (error) {
    reportError('Failed to write ' + exportFilename, error);
    return;
  }

  notifySanitize(converted.report, sanitizeMode, isOnSave);
}

function getFrontMatterBoolean(data: Record<string, unknown>, key: string): boolean | null | undefined {
  const value = data[key];
  return typeof value === 'boolean' || value === null ? value : undefined;
}

function getFrontMatterRecord(data: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = data[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function convertMarkdownToHtml(
  filename: string,
  text: string,
  resourceUri: vscode.Uri | undefined,
  sanitizeMode: utils.SanitizeMode = 'gfm',
): { html: string; report: utils.SanitizeReport } | undefined {
  const matterParts = utils.parseFrontMatter(text);

  try {
    const breaks = utils.setBooleanValue(
      getFrontMatterBoolean(matterParts.data, 'breaks'),
      getConfig<boolean>('breaks', false, resourceUri),
    );
    const md = markdownIt(
      utils.buildMarkdownItOptions({
        breaks: breaks,
        hljs: hljs,
        escapeHtml: markdownIt().utils.escapeHtml,
      }) as markdownIt.Options,
    );

    // Inline local images as base64 data: URIs so .md.html is 100% self-contained
    const defaultRender = md.renderer.rules.image;
    md.renderer.rules.image = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIdx = token.attrIndex('src');
      if (srcIdx >= 0 && token.attrs) {
        const href = token.attrs[srcIdx][1];
        token.attrs[srcIdx][1] = utils.inlineImageHref(href, filename);
      }
      return defaultRender!(tokens, idx, options, env, self);
    };

    const sanitizeReport: utils.SanitizeReport = { removedElements: [], strippedAttributes: [] };
    installSanitizeRules(md, sanitizeMode, sanitizeReport);

    // Task-list checkboxes (- [ ] / - [x])
    md.use(markdownItCheckbox);

    // Native Unicode Emoji shortcodes (:rocket: -> 🚀)
    const emojiEnabled = utils.setBooleanValue(
      getFrontMatterBoolean(matterParts.data, 'emoji'),
      getConfig<boolean>('emoji', true, resourceUri),
    );
    if (emojiEnabled) {
      md.use(markdownItEmojiFull);
    }

    // GitHub-compatible heading id slugs
    md.use(markdownItNamedHeaders, { slugify: utils.Slug });

    // GitHub-style blockquote alerts (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION])
    md.use(markdownItGitHubAlerts);

    // Math rendering via KaTeX ($...$, $$...$$, \(...\), \[...\], ```math)
    const mathFrontmatter = getFrontMatterRecord(matterParts.data, 'math') || {};
    const mathFrontmatterKatex = getFrontMatterRecord(mathFrontmatter, 'katex') || {};
    const mathEnabled =
      utils.setBooleanValue(
        typeof mathFrontmatter['enabled'] === 'boolean' ? (mathFrontmatter['enabled'] as boolean) : undefined,
        getConfig<boolean>('math.enabled', true, resourceUri),
      ) ?? true;
    const mathMacrosFrontmatter = getFrontMatterRecord(mathFrontmatterKatex, 'macros');
    const mathMacrosSettings = getConfig<Record<string, string>>('math.katex.macros', {}, resourceUri) || {};
    const mathMacros: Record<string, string> = {};
    for (const [k, v] of Object.entries(mathMacrosSettings)) {
      if (typeof v === 'string') {
        mathMacros[k] = v;
      }
    }
    if (mathMacrosFrontmatter) {
      for (const [k, v] of Object.entries(mathMacrosFrontmatter)) {
        if (typeof v === 'string') {
          mathMacros[k] = v;
        }
      }
    }
    if (mathEnabled) {
      md.use(markdownItKatex, { enableBareBlocks: true, enableMathBlockInHtml: false });
      md.use(mathBracketsPlugin);
      md.renderer.rules.math_inline = function (tokens, idx) {
        const token = tokens[idx];
        const displayMode = token.markup === '\\[';
        return renderMath(token.content, displayMode, { macros: mathMacros });
      };
      md.renderer.rules.math_block = function (tokens, idx) {
        return renderMath(tokens[idx].content, true, { macros: mathMacros });
      };
      md.use(mathFencePlugin, { macros: mathMacros });
    }

    const html = md.render(matterParts.content);
    return { html, report: sanitizeReport };
  } catch (error) {
    reportError('Failed to convert Markdown to HTML.', error);
    return undefined;
  }
}

export function makeHtml(data: string, uri: vscode.Uri): string | undefined {
  try {
    const style = readStyles(uri, data) || '';
    const title = path.basename(uri.fsPath);
    const templatePath = path.join(EXTENSION_ROOT, 'template', 'template.html');
    const template = utils.readFile(templatePath) as string;

    const view = utils.buildHtmlViewData({
      content: data,
      title: title,
      style: style,
      mermaidServer: getConfig<string>('mermaidServer', 'https://unpkg.com/mermaid/dist/mermaid.min.js', uri),
    });
    return utils.renderTemplate(template, view);
  } catch (error) {
    reportError('Failed to build the HTML document.', error);
    return undefined;
  }
}

function readStyles(uri: vscode.Uri, htmlBody: string): string | undefined {
  try {
    const includeDefaultStyles = getConfig<boolean>('includeDefaultStyles', true, uri);
    const highlightStyle = getConfig<string>('highlightStyle', '', uri);
    const highlight = getConfig<boolean>('highlight', true, uri);
    const markdownStyles = vscode.workspace.getConfiguration('markdown', uri).get<string[]>('styles') || [];
    const customStyles = getConfig<string[]>('styles', [], uri);
    const themeKind = vscode.window.activeColorTheme.kind;
    const isDarkTheme =
      themeKind === vscode.ColorThemeKind.Dark || themeKind === vscode.ColorThemeKind.HighContrast;

    let style =
      utils.buildStyleTags({
        includeDefaultStyles,
        isDarkTheme,
        highlight,
        highlightStyle,
        markdownStyles,
        customStyles,
        baseDir: EXTENSION_ROOT,
        onMissingHighlightStyle: (requestedStyle: string, resolvedStyle: string) => {
          vscode.window.showWarningMessage(
            `Markdown HTML: highlightStyle "${requestedStyle}" was not found; falling back to "${resolvedStyle}".`,
          );
        },
        resolveHrefFn: (href: string) => fixHref(uri, href) || '',
      }) || '';

    if (htmlBody && htmlBody.includes('class="katex')) {
      style += utils.buildKatexStyleTag(EXTENSION_ROOT);
    }

    return style;
  } catch (error) {
    reportError('Failed to read stylesheets.', error);
    return undefined;
  }
}

function fixHref(resource: vscode.Uri, href: string): string | undefined {
  if (!href) {
    return href;
  }
  const hrefUri = vscode.Uri.parse(href);
  if (['http', 'https'].indexOf(hrefUri.scheme) >= 0) {
    return hrefUri.toString();
  }
  const stylesRelativePathFile = getConfig<boolean>('stylesRelativePathFile', false, resource);
  const root = vscode.workspace.getWorkspaceFolder(resource);
  return utils.resolveHref(href, resource.fsPath, stylesRelativePathFile, root ? root.uri.fsPath : undefined) ?? undefined;
}

function getOutputPath(filename: string, resource: vscode.Uri): string | undefined {
  const outputDirectory = getConfig<string>('outputDirectory', '', resource);
  const outputDirectoryRelativePathFile = getConfig<boolean>('outputDirectoryRelativePathFile', false, resource);
  const root = vscode.workspace.getWorkspaceFolder(resource);
  const result = utils.resolveOutputDir(
    filename,
    outputDirectory,
    outputDirectoryRelativePathFile,
    resource.fsPath,
    root ? root.uri.fsPath : undefined,
  );

  if (result === null) {
    reportError('The configured output directory does not exist: ' + outputDirectory);
    return undefined;
  }

  if (outputDirectory.indexOf('~') === 0) {
    fs.mkdirSync(outputDirectory.replace(/^~/, os.homedir()), { recursive: true });
  } else if (outputDirectory.length > 0 && !path.isAbsolute(outputDirectory)) {
    fs.mkdirSync(path.dirname(result), { recursive: true });
  }

  return result;
}

function reportError(operation: string, error?: unknown): void {
  logger.logError(operation);
  if (error !== undefined) {
    logger.logError(logger.formatError(error));
  }
  vscode.window.showErrorMessage('ERROR: ' + operation, SHOW_DETAILS_ACTION).then((selection) => {
    if (selection === SHOW_DETAILS_ACTION) {
      logger.showLog();
    }
  });
}

function notifySanitize(report: utils.SanitizeReport, mode: utils.SanitizeMode, isOnSave: boolean): void {
  if (report.removedElements.length === 0 && report.strippedAttributes.length === 0) {
    return;
  }
  logger.logWarn(utils.buildSanitizeLogDetail(report, mode));
  if (!isOnSave) {
    vscode.window.showWarningMessage(utils.buildSanitizeSummary(report), SHOW_DETAILS_ACTION).then((selection) => {
      if (selection === SHOW_DETAILS_ACTION) {
        logger.showLog();
      }
    });
  }
}
