import { describe, it, expect } from 'vitest';
import { Validator, guessKind } from '../src/validate.js';
import { readDocument } from '../src/io.js';
import { Validator as PureValidator, type Schemas } from '../src/pure.js';
import { join } from 'path';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('Validator', () => {
  const validator = new Validator();

  it('validates supplied schemas without changing their identities', () => {
    const schemas: Schemas = {
      common: readDocument(join(fixtures, '../../schemas/common.schema.json')) as object,
      graph: readDocument(join(fixtures, '../../schemas/graph.schema.json')) as object,
      registry: readDocument(join(fixtures, '../../schemas/registry.schema.json')) as object,
    };
    const before = structuredClone(schemas);
    const pure = new PureValidator(schemas);
    for (const kind of ['graph', 'registry'] as const) {
      for (const name of [`valid-${kind}.yaml`, `invalid-${kind}.yaml`]) {
        const document = readDocument(join(fixtures, name));
        expect(pure.validate(kind, document)).toEqual(validator.validate(kind, document));
      }
    }
    expect(schemas).toEqual(before);
  });

  describe('validate registry', () => {
    it('accepts valid registry', () => {
      const doc = readDocument(join(fixtures, 'valid-registry.yaml'));
      const issues = validator.validate('registry', doc);
      expect(issues).toEqual([]);
    });

    it('rejects registry missing primitives', () => {
      const doc = { bacon: '0.1' };
      const issues = validator.validate('registry', doc);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain('primitives');
    });
  });

  describe('validate graph', () => {
    it('accepts valid graph', () => {
      const doc = readDocument(join(fixtures, 'valid-graph.yaml'));
      const issues = validator.validate('graph', doc);
      expect(issues).toEqual([]);
    });

    it('rejects graph with node missing type', () => {
      const doc = readDocument(join(fixtures, 'invalid-graph.yaml'));
      const issues = validator.validate('graph', doc);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('rejects graph missing nodes', () => {
      const doc = { bacon: '0.1' };
      const issues = validator.validate('graph', doc);
      expect(issues.length).toBeGreaterThan(0);
    });
  });

});

describe('guessKind', () => {
  it('detects registry', () => {
    expect(guessKind({ primitives: {} })).toBe('registry');
  });

  it('detects graph', () => {
    expect(guessKind({ nodes: {} })).toBe('graph');
  });

  it('returns null for unknown', () => {
    expect(guessKind({})).toBe(null);
    expect(guessKind(null)).toBe(null);
    expect(guessKind('string')).toBe(null);
  });
});
