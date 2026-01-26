// Public API
export { Validator, guessKind, type SchemaKind, type ValidationIssue } from './validate.js';
export { readDocument, writeDocument, resolvePath } from './io.js';
export { checkRegistry } from './checks/registry.js';
export { checkGraph, type GraphCheckContext } from './checks/graph.js';
export { type CheckIssue, type Severity } from './checks/types.js';

// Types
export * from './types.js';
