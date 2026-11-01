// Shared helpers for the markdown-html extension: file I/O, path and URL
// resolution, self-contained HTML/CSS/image assembly, and option builders for markdown-it.
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import type { HLJSApi } from 'highlight.js';
import { githubSlugify } from './markdown-it-named-headers';
import { logWarn, formatError } from './logger';

/** Returns `a` when `a` is a defined boolean (including false); otherwise returns `b`. */
export function setBooleanValue(a: boolean | undefined | null, b: boolean | undefined): boolean | undefined {
  if (a === false) {
    return false;
  } else {
    return a || b;
  }
}

/** Checks whether a path exists, logging and returning false on any fs error. */
export function isExistsPath(filePath: string): boolean {
  if (filePath.length === 0) {
    return false;
  }
  try {
    fs.accessSync(filePath);
    return true;
  } catch (error: unknown) {
    console.warn((error as Error).message);
    return false;
  }
}

/** Checks whether a path exists and is a directory, logging and returning false otherwise. */
export function isExistsDir(dirname: string): boolean {
  if (dirname.length === 0) {
    return false;
  }
  try {
    if (fs.statSync(dirname).isDirectory()) {
      return true;
    } else {
      console.warn('Directory does not exist!');
      return false;
    }
  } catch (error: unknown) {
    console.warn((error as Error).message);
    return false;
  }
}

/** Generates a GitHub-compatible slug from a heading title. */
export function Slug(string: string): string {
  return githubSlugify(string);
}

/**
 * Strips a file:// prefix from a path if present.
 */
export function stripFileProtocol(filename: string): string {
  if (filename.indexOf('file://') === 0) {
    if (process.platform === 'win32') {
      return filename.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
    } else {
      return filename.replace(/^file:\/\//, '');
    }
  }
  return filename;
}

/**
 * Reads a file synchronously, stripping file:// URI prefixes beforehand.
 * Returns '' on any I/O failure; warnings are logged via logWarn (not-found vs read-error) and errors are never re-thrown.
 */
export function readFile(filename: string, encode?: BufferEncoding | null): string | Buffer {
  if (filename.length === 0) {
    return '';
  }
  if (!encode && encode !== null) {
    encode = 'utf-8';
  }
  filename = stripFileProtocol(filename);
  try {
    return fs.readFileSync(filename, encode);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      logWarn(`File not found: ${filename}`);
    } else {
      logWarn(`Failed to read file: ${filename}`, formatError(error));
    }
    return '';
  }
}

/** Reads a CSS file and wraps its contents in a <style> tag, or returns '' when the file is empty. */
export function makeCss(filename: string): string {
  const css = readFile(filename);
  if (css) {
    return '\n<style>\n' + css + '\n</style>\n';
  } else {
    return '';
  }
}

const KATEX_FONT_MIME: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

/**
 * Builds an inline <style> tag for KaTeX CSS with every url(fonts/...)
 * reference rewritten to a base64 data: URI. Produces a fully self-contained
 * stylesheet so the generated HTML stays portable when copied or moved.
 * Returns '' when the KaTeX CSS file is not present at the expected location.
 */
export function buildKatexStyleTag(baseDir: string): string {
  const cssPath = path.join(baseDir, 'styles', 'katex', 'katex.min.css');
  const rawCss = readFile(cssPath);
  if (typeof rawCss !== 'string' || !rawCss) {
    return '';
  }
  const katexDir = path.join(baseDir, 'styles', 'katex');
  const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const inlined = rawCss.replace(urlRe, function (match, _quote, href: string) {
    if (/^(data:|https?:|file:)/i.test(href)) {
      return match;
    }
    const normalized = href.replace(/^\.\//, '').split('?')[0].split('#')[0];
    const fontPath = path.join(katexDir, normalized);
    const relative = path.relative(katexDir, fontPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return match;
    }
    if (!isExistsPath(fontPath)) {
      return match;
    }
    const ext = path.extname(fontPath).toLowerCase();
    const mime = KATEX_FONT_MIME[ext];
    if (!mime) {
      return match;
    }
    const buffer = fs.readFileSync(fontPath);
    const base64 = buffer.toString('base64');
    return 'url(data:' + mime + ';base64,' + base64 + ')';
  });
  return '\n<style>\n' + inlined + '\n</style>\n';
}

/**
 * Resolves a local image path to an embedded base64 data: URI when the file exists on disk,
 * or leaves remote http/https/data URLs untouched.
 */
export function inlineImageHref(src: string, mdFilename: string): string {
  if (!src) {
    return src;
  }
  const cleaned = decodeURIComponent(src).replace(/("|')/g, '');
  if (/^(https?:|data:|mailto:|#)/i.test(cleaned)) {
    return src;
  }

  let candidatePath = stripFileProtocol(cleaned);
  if (!path.isAbsolute(candidatePath) && !path.win32.isAbsolute(candidatePath)) {
    candidatePath = path.resolve(path.dirname(mdFilename), candidatePath);
  }

  const ext = path.extname(candidatePath).toLowerCase();
  const mime = IMAGE_MIME[ext];
  if (mime && isExistsPath(candidatePath)) {
    try {
      const buffer = fs.readFileSync(candidatePath);
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      // Fall back to cleaned href if reading fails
    }
  }
  return cleaned;
}

/** Returns true when filename matches any of the given regex pattern strings. */
export function isExcludeFile(filename: string, patterns: string[] | undefined | string): boolean {
  if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }
  for (let i = 0; i < patterns.length; i++) {
    const re = new RegExp(patterns[i]);
    if (re.test(filename)) {
      return true;
    }
  }
  return false;
}

/** Resolves a style href to an absolute file:// URL or local path, leaving http/https/data URLs untouched. */
export function resolveHref(href: string | undefined | null, resourceFsPath: string, stylesRelativePathFile: boolean | undefined, workspaceFsPath: string | undefined): string | undefined | null {
  if (!href) {
    return href;
  }

  let protocol: string | null = null;
  try {
    protocol = new URL(href).protocol;
  } catch {
    // Not a valid absolute URL
  }
  if (protocol === 'http:' || protocol === 'https:' || protocol === 'data:') {
    return href;
  }

  if (href.indexOf('~') === 0) {
    return 'file://' + href.replace(/^~/, os.homedir());
  }

  if (path.isAbsolute(href) || path.win32.isAbsolute(href)) {
    return 'file://' + href;
  }

  if (stylesRelativePathFile === false && workspaceFsPath) {
    return 'file://' + path.join(workspaceFsPath, href);
  }

  return 'file://' + path.join(path.dirname(resourceFsPath), href);
}

/**
 * Resolves the output directory for a converted file.
 * Returns null when a configured absolute outputDirectory does not exist.
 */
export function resolveOutputDir(filename: string, outputDirectory: string | undefined | null, outputDirectoryRelativePathFile: boolean | undefined, resourceFsPath: string, workspaceFsPath: string | undefined): string | null {
  if (!outputDirectory || outputDirectory.length === 0) {
    return filename;
  }

  if (outputDirectory.indexOf('~') === 0) {
    return path.join(outputDirectory.replace(/^~/, os.homedir()), path.basename(filename));
  }

  if (path.isAbsolute(outputDirectory)) {
    if (!isExistsDir(outputDirectory)) {
      return null;
    }
    return path.join(outputDirectory, path.basename(filename));
  }

  if (outputDirectoryRelativePathFile === false && workspaceFsPath) {
    return path.join(workspaceFsPath, outputDirectory, path.basename(filename));
  }

  return path.join(path.dirname(resourceFsPath), outputDirectory, path.basename(filename));
}

const LEGACY_HIGHLIGHT_STYLE_ALIASES: Record<string, string> = {
  'github-gist.css': 'github.css',
  'kimbie.dark.css': 'kimbie-dark.css',
  'kimbie.light.css': 'kimbie-light.css',
  'qtcreator_dark.css': 'qtcreator-dark.css',
  'qtcreator_light.css': 'qtcreator-light.css',
};

function resolveHighlightStyle(baseDir: string, highlightStyle: string): { filename: string; requestedStyle: string; resolvedStyle: string; usedFallback: boolean } {
  const resolvedStyle = LEGACY_HIGHLIGHT_STYLE_ALIASES[highlightStyle] || highlightStyle;
  const stylePath = path.join(baseDir, 'node_modules', 'highlight.js', 'styles', resolvedStyle);

  if (fs.existsSync(stylePath)) {
    return {
      filename: stylePath,
      requestedStyle: highlightStyle,
      resolvedStyle: resolvedStyle,
      usedFallback: resolvedStyle !== highlightStyle,
    };
  }

  return {
    filename: path.join(baseDir, 'styles', 'tomorrow.css'),
    requestedStyle: highlightStyle,
    resolvedStyle: 'tomorrow.css',
    usedFallback: true,
  };
}

export interface BuildStyleTagsOptions {
  includeDefaultStyles: boolean;
  isDarkTheme?: boolean;
  highlight: boolean;
  highlightStyle: string;
  markdownStyles: string[] | string;
  customStyles: string[] | string;
  baseDir: string;
  onMissingHighlightStyle?: (requestedStyle: string, resolvedStyle: string) => void;
  resolveHrefFn: (href: string) => string;
}

/**
 * Helper to inline a stylesheet if it resolves to a local file, or emit a <link> tag if it is a remote http/https URL.
 */
function inlineOrLinkStylesheet(resolvedHref: string): string {
  if (!resolvedHref) {
    return '';
  }
  if (/^https?:/i.test(resolvedHref)) {
    return '<link rel="stylesheet" href="' + resolvedHref + '" type="text/css">';
  }
  const inlined = makeCss(resolvedHref);
  if (inlined) {
    return inlined;
  }
  return '<link rel="stylesheet" href="' + resolvedHref + '" type="text/css">';
}

/** Builds the concatenated <style> tags for syntax highlighting, markdown.styles, customStyles, or the active VS Code 2026 fallback theme. */
export function buildStyleTags(options: BuildStyleTagsOptions): string {
  let style = '';
  let filename = '';

  if (options.highlight) {
    if (options.highlightStyle) {
      const resolvedHighlight = resolveHighlightStyle(options.baseDir, options.highlightStyle);
      filename = resolvedHighlight.filename;
      if (options.onMissingHighlightStyle && resolvedHighlight.usedFallback) {
        options.onMissingHighlightStyle(resolvedHighlight.requestedStyle, resolvedHighlight.resolvedStyle);
      }
      style += makeCss(filename);
    } else {
      filename = path.join(options.baseDir, 'styles', 'tomorrow.css');
      style += makeCss(filename);
    }
  }

  const hasMarkdownStyles = Array.isArray(options.markdownStyles) && options.markdownStyles.length > 0;
  const hasCustomStyles = Array.isArray(options.customStyles) && options.customStyles.length > 0;

  if (hasMarkdownStyles) {
    for (let i = 0; i < options.markdownStyles.length; i++) {
      const markdownHref = options.resolveHrefFn(options.markdownStyles[i]);
      style += inlineOrLinkStylesheet(markdownHref);
    }
  }

  if (hasCustomStyles) {
    for (let i = 0; i < options.customStyles.length; i++) {
      const customHref = options.resolveHrefFn(options.customStyles[i]);
      style += inlineOrLinkStylesheet(customHref);
    }
  }

  if (!hasMarkdownStyles && !hasCustomStyles && options.includeDefaultStyles) {
    const defaultThemeFile = options.isDarkTheme
      ? 'markdown-vscode-dark2026.css'
      : 'markdown-vscode-light2026.css';
    style += makeCss(path.join(options.baseDir, 'styles', defaultThemeFile));
  }

  return style;
}

/** Returns a markdown-it highlight callback that renders mermaid blocks as <div> and other languages via highlight.js. */
export function buildHighlightCallback(hljs: HLJSApi, escapeHtml: (str: string) => string): (str: string, lang: string) => string {
  return function (str: string, lang: string): string {
    if (lang && lang.match(/\bmermaid\b/i)) {
      return '<div class="mermaid">' + str + '</div>';
    }

    if (lang && hljs.getLanguage(lang)) {
      try {
        str = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
      } catch {
        str = escapeHtml(str);
      }
    } else {
      str = escapeHtml(str);
    }

    return '<pre class="hljs"><code><div>' + str + '</div></code></pre>';
  };
}

interface MarkdownItConfig {
  breaks: boolean | undefined;
  hljs: HLJSApi;
  escapeHtml: (str: string) => string;
}

/** Builds the options object passed to the markdown-it constructor. */
export function buildMarkdownItOptions(config: MarkdownItConfig): Record<string, unknown> {
  return {
    html: true,
    breaks: config.breaks,
    highlight: buildHighlightCallback(config.hljs, config.escapeHtml),
  };
}

interface HtmlViewDataConfig {
  title: string;
  style: string;
  content: string;
  mermaidServer: string;
}

/** Builds the view model passed to the HTML template renderer. Injects Mermaid script only when a mermaid diagram is present. */
export function buildHtmlViewData(config: HtmlViewDataConfig): { title: string; style: string; content: string; mermaid: string } {
  const hasMermaid = config.content.includes('class="mermaid"') && Boolean(config.mermaidServer);
  const mermaidBlock = hasMermaid
    ? `<script src="${config.mermaidServer}"></script>\n<script>document.addEventListener('DOMContentLoaded', function () { if (typeof mermaid !== 'undefined') { mermaid.initialize({ startOnLoad: true, theme: 'default' }); } });</script>`
    : '';
  return {
    title: config.title,
    style: config.style,
    content: config.content,
    mermaid: mermaidBlock,
  };
}

/** Substitutes {{{key}}} placeholders in a template with matching values from view. */
export function renderTemplate(template: string, view: Record<string, string>): string {
  return template.replace(/\{\{\{(\w+)\}\}\}/g, function (match: string, key: string): string {
    return key in view ? view[key] : match;
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Parses YAML front matter from a markdown string, tolerating a leading BOM
 * and an empty front matter block. Returns an empty data object when YAML is
 * missing, empty, or not a plain object.
 */
export function parseFrontMatter(text: string): { data: Record<string, unknown>; content: string } {
  const match = text.match(/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    const emptyMatch = text.match(/^(?:\uFEFF)?---\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    if (emptyMatch) {
      return { data: {}, content: emptyMatch[1] };
    }
    return { data: {}, content: text };
  }
  const yamlStr = match[1];
  const content = match[2];
  if (!yamlStr.trim()) {
    return { data: {}, content: content };
  }
  const data = yaml.load(yamlStr);
  return {
    data: isPlainRecord(data) ? data : {},
    content: content,
  };
}

/** Converts a .md / .markdown file path into its target .md.html file path. */
export function toMdHtmlFilename(mdFilename: string): string {
  if (/\.md$/i.test(mdFilename)) {
    return mdFilename + '.html';
  }
  const ext = path.extname(mdFilename);
  if (ext) {
    return mdFilename.slice(0, -ext.length) + '.md.html';
  }
  return mdFilename + '.md.html';
}

// Sanitize mode for raw HTML in Markdown. 'gfm' removes dangerous tags per
// GitHub Flavored Markdown; 'gfm-allow-style' keeps <style>; 'none' disables.
export type SanitizeMode = 'gfm' | 'gfm-allow-style' | 'none';

export interface SanitizeReport {
  removedElements: string[];
  strippedAttributes: string[];
}

export interface SanitizeOptions {
  removeWithContent?: boolean;
}

const REMOVE_WITH_CONTENT = new Set(['style', 'script', 'iframe']);

function findHtmlTagEnd(html: string, startIndex: number): number {
  let quote: string | null = null;
  for (let i = startIndex; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '>') {
      return i;
    }
  }
  return -1;
}

function getTagName(tag: string): string | null {
  const match = /^<\/?\s*([a-z0-9-]+)/i.exec(tag);
  return match ? match[1].toLowerCase() : null;
}

function stripDangerousAttributes(tag: string): { tag: string; stripped: string[] } {
  const stripped: string[] = [];
  if (tag.length < 2 || tag[1] === '/') {
    return { tag, stripped };
  }

  let nameEnd = 1;
  while (nameEnd < tag.length && /[a-z0-9-]/i.test(tag[nameEnd])) {
    nameEnd++;
  }

  let result = tag.slice(0, nameEnd);
  let i = nameEnd;
  while (i < tag.length) {
    const wsStart = i;
    while (i < tag.length && /\s/.test(tag[i])) {
      i++;
    }
    const ws = tag.slice(wsStart, i);

    if (i >= tag.length) {
      result += ws;
      break;
    }

    if (tag[i] === '/' || tag[i] === '>') {
      result += ws;
      result += tag[i];
      i++;
      continue;
    }

    const attrStart = i;
    while (i < tag.length && !/[\s=/>]/.test(tag[i])) {
      i++;
    }
    const attrName = tag.slice(attrStart, i);

    let afterName = i;
    while (afterName < tag.length && /\s/.test(tag[afterName])) {
      afterName++;
    }

    let attrEnd = afterName;
    let attrValue: string | null = null;
    if (afterName < tag.length && tag[afterName] === '=') {
      let valueStart = afterName + 1;
      while (valueStart < tag.length && /\s/.test(tag[valueStart])) {
        valueStart++;
      }
      if (valueStart < tag.length && (tag[valueStart] === '"' || tag[valueStart] === "'")) {
        const quote = tag[valueStart];
        const close = tag.indexOf(quote, valueStart + 1);
        if (close === -1) {
          attrValue = tag.slice(valueStart + 1);
          attrEnd = tag.length;
        } else {
          attrValue = tag.slice(valueStart + 1, close);
          attrEnd = close + 1;
        }
      } else {
        let valueEnd = valueStart;
        while (valueEnd < tag.length && !/[\s/>]/.test(tag[valueEnd])) {
          valueEnd++;
        }
        attrValue = tag.slice(valueStart, valueEnd);
        attrEnd = valueEnd;
      }
    }

    const lowerName = attrName.toLowerCase();
    const isEventHandler = /^on[a-z]{3}/i.test(lowerName);
    const isJavascriptUrl =
      (lowerName === 'href' || lowerName === 'src') &&
      attrValue !== null &&
      /^\s*javascript:/i.test(attrValue);

    if (!isEventHandler && !isJavascriptUrl) {
      result += ws;
      result += attrName;
      if (attrEnd > afterName) {
        result += tag.slice(i, attrEnd);
      }
    } else {
      stripped.push(isEventHandler ? lowerName : lowerName + '(javascript:)');
    }
    i = attrEnd;
  }
  return { tag: result, stripped };
}

export function getDisallowedTags(mode: SanitizeMode): Set<string> {
  if (mode === 'none') {
    return new Set();
  }
  const tags = new Set(['title', 'textarea', 'style', 'xmp', 'iframe', 'noembed', 'noframes', 'script', 'plaintext']);
  if (mode === 'gfm-allow-style') {
    tags.delete('style');
  }
  return tags;
}

export function sanitizeRawHtml(
  html: string,
  mode: SanitizeMode,
  options?: SanitizeOptions,
): { html: string; report: SanitizeReport } {
  const report: SanitizeReport = { removedElements: [], strippedAttributes: [] };
  if (mode === 'none' || !html) {
    return { html, report };
  }
  const removeWithContent = options?.removeWithContent === true;
  const disallowed = getDisallowedTags(mode);
  let result = '';
  let index = 0;
  while (index < html.length) {
    if (html.startsWith('<!--', index)) {
      const commentEnd = html.indexOf('-->', index + 4);
      if (commentEnd === -1) {
        result += html.slice(index);
        break;
      }
      result += html.slice(index, commentEnd + 3);
      index = commentEnd + 3;
      continue;
    }

    if (html[index] !== '<') {
      result += html[index];
      index++;
      continue;
    }

    const tagEnd = findHtmlTagEnd(html, index + 1);
    if (tagEnd === -1) {
      result += html.slice(index);
      break;
    }

    const tag = html.slice(index, tagEnd + 1);
    const tagName = getTagName(tag);

    if (tagName && disallowed.has(tagName)) {
      if (removeWithContent && REMOVE_WITH_CONTENT.has(tagName)) {
        if (tag[1] === '/') {
          index = tagEnd + 1;
          continue;
        }
        const closeRe = new RegExp('</' + tagName + '\\s*>', 'i');
        const match = closeRe.exec(html.slice(tagEnd + 1));
        if (match) {
          index = tagEnd + 1 + match.index + match[0].length;
        } else {
          index = tagEnd + 1;
        }
        report.removedElements.push(tagName);
        continue;
      }
      result += '&lt;' + tag.slice(1);
      index = tagEnd + 1;
      continue;
    }

    const stripResult = stripDangerousAttributes(tag);
    result += stripResult.tag;
    report.strippedAttributes.push(...stripResult.stripped);
    index = tagEnd + 1;
  }
  return { html: result, report };
}

function tallyOccurrences(items: string[]): Array<{ name: string; count: number }> {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!counts.has(item)) {
      order.push(item);
    }
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return order.map(function (name) {
    return { name: name, count: counts.get(name)! };
  });
}

export function buildSanitizeSummary(report: SanitizeReport): string {
  const parts: string[] = [];
  const removedKinds = tallyOccurrences(report.removedElements).map(function (e) {
    return '<' + e.name + '>';
  });
  if (removedKinds.length > 0) {
    parts.push('removed ' + removedKinds.join(', '));
  }
  if (report.strippedAttributes.length > 0) {
    parts.push('stripped unsafe attribute(s)');
  }
  const body = parts.length > 0 ? parts.join('; ') : 'sanitized raw HTML';
  return 'Markdown HTML: ' + body + ' for security. See output for details.';
}

export function buildSanitizeLogDetail(report: SanitizeReport, mode: SanitizeMode): string {
  const segments: string[] = [];
  const removed = tallyOccurrences(report.removedElements).map(function (e) {
    return '<' + e.name + '>×' + e.count;
  });
  const stripped = tallyOccurrences(report.strippedAttributes).map(function (e) {
    return e.name + '×' + e.count;
  });
  if (removed.length > 0) {
    segments.push('removed ' + removed.join(', '));
  }
  if (stripped.length > 0) {
    segments.push('stripped ' + stripped.join(', '));
  }
  const head = 'Sanitized raw HTML (mode: ' + mode + ')';
  const lines: string[] = [segments.length > 0 ? head + ': ' + segments.join('; ') + '.' : head + '.'];
  if (report.removedElements.indexOf('style') !== -1) {
    lines.push('Tip: to keep <style>, set "markdown-html.sanitize": "gfm-allow-style".');
  }
  return lines.join('\n');
}
