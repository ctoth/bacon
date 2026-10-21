import _Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// AJV CJS/ESM interop - types don't match runtime, this is the documented fix
// See: https://github.com/ajv-validator/ajv/issues/2132
const Ajv = _Ajv as unknown as typeof _Ajv.default;

const __dirname = dirname(fileURLToPath(import.meta.url));

export type SchemaKind = 'graph' | 'registry';

export interface ValidationIssue {
  path: string;
  message: string;
}

export class Validator {
  private ajv: InstanceType<typeof Ajv>;
  private schemas: Map<SchemaKind, object> = new Map();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.loadSchemas();
  }

  private loadSchemas(): void {
    const schemaDir = join(__dirname, '..', 'schemas');

    // Load common schema first (referenced by others)
    const commonSchema = JSON.parse(readFileSync(join(schemaDir, 'common.schema.json'), 'utf-8'));
    // Remove $id so refs resolve against our local key
    delete commonSchema.$id;
    this.ajv.addSchema(commonSchema, 'common.schema.json');

    // Load document schemas
    for (const kind of ['graph', 'registry'] as const) {
      const schema = JSON.parse(readFileSync(join(schemaDir, `${kind}.schema.json`), 'utf-8'));
      // Remove $id so relative refs resolve against our namespace
      delete schema.$id;
      this.schemas.set(kind, schema);
    }
  }

  validate(kind: SchemaKind, doc: unknown): ValidationIssue[] {
    const schema = this.schemas.get(kind);
    if (!schema) {
      return [{ path: '/', message: `Unknown schema kind: ${kind}` }];
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(doc);

    if (valid) {
      return [];
    }

    return (validate.errors || []).map((err: ErrorObject) => ({
      path: err.instancePath || '/',
      message: `${err.message}${err.params ? ` (${JSON.stringify(err.params)})` : ''}`,
    }));
  }
}

export function guessKind(doc: unknown): SchemaKind | null {
  if (typeof doc !== 'object' || doc === null) {
    return null;
  }

  const obj = doc as Record<string, unknown>;

  if ('primitives' in obj) {
    return 'registry';
  }
  if ('nodes' in obj) {
    return 'graph';
  }

  return null;
}
