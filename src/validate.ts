import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaValidator } from './schema-validator.js';

export { guessKind, type SchemaKind, type ValidationIssue } from './schema-validator.js';

/** Existing Node API: load the packaged schemas before pure validation. */
export class Validator extends SchemaValidator {
  constructor() {
    const directory = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');
    const read = (name: string): object => JSON.parse(
      readFileSync(join(directory, `${name}.schema.json`), 'utf8')
    );
    super({ common: read('common'), graph: read('graph'), registry: read('registry') });
  }
}
