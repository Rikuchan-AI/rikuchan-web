/**
 * Detect file paths mentioned in agent messages.
 * Supports Unix (/path/to/file) and Windows (C:\path\to\file, H:\path) paths.
 */

export interface DetectedFile {
  path: string;
  name: string;
  extension: string;
}

const FILE_PATH_REGEX = /(?:\/(?:mnt\/[a-z]|home|usr|tmp|var|opt|etc)\/[^\s,;:'")\]}>]+\.[a-zA-Z0-9]+|[A-Z]:\\[^\s,;:'")\]}>]+\.[a-zA-Z0-9]+|\/[^\s,;:'")\]}>]*\/[^\s,;:'")\]}>]+\.[a-zA-Z0-9]+)/g;

const IGNORED_EXTENSIONS = new Set(["com", "org", "net", "io", "ai", "dev"]);

export function detectFilePaths(text: string): DetectedFile[] {
  const matches = text.match(FILE_PATH_REGEX) ?? [];
  const seen = new Set<string>();
  const files: DetectedFile[] = [];

  for (let match of matches) {
    // Clean trailing punctuation
    match = match.replace(/[.,:;!?)}\]]+$/, "");

    const normalized = match.replace(/\\/g, "/");
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const name = normalized.split("/").pop() ?? match;
    const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extMatch?.[1]?.toLowerCase() ?? "";

    // Skip URLs disguised as paths
    if (IGNORED_EXTENSIONS.has(extension)) continue;
    // Skip very short names (likely false positives)
    if (name.length < 3) continue;

    files.push({ path: match, name, extension });
  }

  return files;
}

export function getFileIcon(extension: string): string {
  const icons: Record<string, string> = {
    md: "doc",
    txt: "doc",
    pdf: "doc",
    doc: "doc",
    docx: "doc",
    ts: "code",
    tsx: "code",
    js: "code",
    jsx: "code",
    py: "code",
    go: "code",
    rs: "code",
    java: "code",
    json: "config",
    yaml: "config",
    yml: "config",
    toml: "config",
    env: "config",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    svg: "image",
    csv: "data",
    xlsx: "data",
    sql: "data",
  };
  return icons[extension] ?? "file";
}

export function getFileTypeLabel(extension: string): string {
  const type = getFileIcon(extension);
  const labels: Record<string, string> = {
    doc: "Document",
    code: "Source",
    config: "Config",
    image: "Image",
    data: "Data",
    file: "File",
  };
  return labels[type] ?? "File";
}
