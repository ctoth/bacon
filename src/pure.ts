// No filesystem, URL, CLI or document-loading imports in this entry.
export { SchemaValidator as Validator, guessKind, type Schemas, type SchemaKind, type ValidationIssue } from './schema-validator.js';
export { checkGraph, type GraphCheckContext } from './checks/graph.js';
export { checkRegistry } from './checks/registry.js';
export { type CheckIssue, type Severity } from './checks/types.js';
export * from './types.js';
