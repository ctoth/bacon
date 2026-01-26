import { Semantics, isIdentifier } from '../types.js';
import { CheckIssue } from './types.js';

export function checkSemantics(semantics: Semantics): CheckIssue[] {
  const issues: CheckIssue[] = [];

  // Collect all available names in scope
  const paramNames = new Set(Object.keys(semantics.params || {}));
  const constNames = new Set(Object.keys(semantics.constants || {}));
  const funcNames = new Set(Object.keys(semantics.functions || {}));
  const allNames = new Set([...paramNames, ...constNames, ...funcNames]);

  // Check params
  if (semantics.params) {
    for (const [name, def] of Object.entries(semantics.params)) {
      const path = `/params/${name}`;

      if (!isIdentifier(name)) {
        issues.push({
          severity: 'error',
          path,
          message: `Invalid param name: "${name}" (must be valid identifier)`,
        });
      }

      // Check range validity
      if (def.range) {
        const [min, max] = def.range;
        if (min > max) {
          issues.push({
            severity: 'error',
            path: `${path}/range`,
            message: `Invalid range: min (${min}) > max (${max})`,
          });
        }

        if (def.default !== undefined && typeof def.default === 'number') {
          if (def.default < min || def.default > max) {
            issues.push({
              severity: 'warning',
              path: `${path}/default`,
              message: `Default value ${def.default} outside range [${min}, ${max}]`,
            });
          }
        }
      }
    }
  }

  // Check constants
  if (semantics.constants) {
    for (const name of Object.keys(semantics.constants)) {
      if (!isIdentifier(name)) {
        issues.push({
          severity: 'error',
          path: `/constants/${name}`,
          message: `Invalid constant name: "${name}" (must be valid identifier)`,
        });
      }
    }
  }

  // Check functions
  if (semantics.functions) {
    for (const [name, def] of Object.entries(semantics.functions)) {
      const path = `/functions/${name}`;

      if (!isIdentifier(name)) {
        issues.push({
          severity: 'error',
          path,
          message: `Invalid function name: "${name}" (must be valid identifier)`,
        });
      }

      // Check function params are valid identifiers
      for (const p of def.params) {
        if (!isIdentifier(p)) {
          issues.push({
            severity: 'error',
            path: `${path}/params`,
            message: `Invalid function parameter name: "${p}"`,
          });
        }
      }

      // Check for duplicate params
      const seen = new Set<string>();
      for (const p of def.params) {
        if (seen.has(p)) {
          issues.push({
            severity: 'error',
            path: `${path}/params`,
            message: `Duplicate function parameter: "${p}"`,
          });
        }
        seen.add(p);
      }
    }
  }

  // Check realize rules
  if (semantics.realize) {
    for (const [name, rule] of Object.entries(semantics.realize)) {
      const path = `/realize/${name}`;

      if (!isIdentifier(name)) {
        issues.push({
          severity: 'error',
          path,
          message: `Invalid realization output name: "${name}" (must be valid identifier)`,
        });
      }

      // Basic expression syntax check (just ensure non-empty)
      const expr = typeof rule === 'string' ? rule : rule.expr;
      if (!expr || expr.trim().length === 0) {
        issues.push({
          severity: 'error',
          path: `${path}/expr`,
          message: `Empty realization expression`,
        });
      }
    }
  }

  // Check for name collisions
  const allNamesList = [...paramNames, ...constNames, ...funcNames];
  const duplicates = allNamesList.filter((name, index) => allNamesList.indexOf(name) !== index);
  for (const dup of new Set(duplicates)) {
    issues.push({
      severity: 'error',
      path: '/',
      message: `Name collision: "${dup}" is defined multiple times across params/constants/functions`,
    });
  }

  return issues;
}
