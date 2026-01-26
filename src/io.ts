import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve, extname } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export function readDocument(filePath: string): unknown {
  const content = readFileSync(filePath, 'utf-8');
  const ext = extname(filePath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(content);
  }
  return parseYaml(content);
}

export function writeDocument(filePath: string, doc: unknown): void {
  const ext = extname(filePath).toLowerCase();

  let content: string;
  if (ext === '.json') {
    content = JSON.stringify(doc, null, 2) + '\n';
  } else {
    content = stringifyYaml(doc, { indent: 2, lineWidth: 0 });
  }

  writeFileSync(filePath, content, 'utf-8');
}

export function resolvePath(fromFile: string, relativePath: string): string {
  return resolve(dirname(fromFile), relativePath);
}
