import _Ajv from 'ajv';
import type { ErrorObject } from 'ajv';

// AJV CJS/ESM interop - types don't match runtime, this is the documented fix
// See: https://github.com/ajv-validator/ajv/issues/2132
const Ajv = _Ajv as unknown as typeof _Ajv.default;

export type SchemaKind = 'graph' | 'registry';
export type Schemas = Readonly<Record<SchemaKind | 'common', object>>;

export interface ValidationIssue {
  path: string;
  message: string;
}

export class SchemaValidator {
  private ajv: InstanceType<typeof Ajv>;
  private schemas: Map<SchemaKind, object> = new Map();

  constructor(schemas: Schemas) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    // The caller retains its schema objects, including their published IDs.
    const commonSchema = { ...schemas.common } as Record<string, unknown>;
    delete commonSchema.$id;
    this.ajv.addSchema(commonSchema, 'common.schema.json');

    for (const kind of ['graph', 'registry'] as const) {
      const schema = { ...schemas[kind] } as Record<string, unknown>;
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
