import { Registry, isIdentifier } from '../types.js';
import { CheckIssue } from './types.js';

export function checkRegistry(registry: Registry): CheckIssue[] {
  const issues: CheckIssue[] = [];

  for (const [primName, prim] of Object.entries(registry.primitives)) {
    const primPath = `/primitives/${primName}`;

    // Check primitive name is valid identifier
    if (!isIdentifier(primName)) {
      issues.push({
        severity: 'error',
        path: primPath,
        message: `Invalid primitive name: "${primName}" (must be valid identifier)`,
      });
    }

    // Check parameter definitions
    for (const [paramName, paramDef] of Object.entries(prim.params ?? {})) {
      const paramPath = `${primPath}/params/${paramName}`;

      // Check param name is valid identifier
      if (!isIdentifier(paramName)) {
        issues.push({
          severity: 'error',
          path: paramPath,
          message: `Invalid param name: "${paramName}" (must be valid identifier)`,
        });
      }

      // Check range validity
      if (paramDef.range) {
        const [min, max] = paramDef.range;
        if (min > max) {
          issues.push({
            severity: 'error',
            path: `${paramPath}/range`,
            message: `Invalid range: min (${min}) > max (${max})`,
          });
        }

        // Check default within range
        if (paramDef.default !== undefined && typeof paramDef.default === 'number') {
          if (paramDef.default < min || paramDef.default > max) {
            issues.push({
              severity: 'warning',
              path: `${paramPath}/default`,
              message: `Default value ${paramDef.default} outside range [${min}, ${max}]`,
            });
          }
        }
      }

      // Check enum values match type
      if (paramDef.enum && paramDef.type) {
        for (const val of paramDef.enum) {
          const valType = typeof val;
          const expectedType = paramDef.type === 'bool' ? 'boolean' : paramDef.type === 'int' || paramDef.type === 'float' ? 'number' : 'string';
          if (valType !== expectedType && !(paramDef.type === 'int' && valType === 'number')) {
            issues.push({
              severity: 'warning',
              path: `${paramPath}/enum`,
              message: `Enum value "${val}" (${valType}) doesn't match declared type "${paramDef.type}"`,
            });
          }
        }
      }
    }

    // Check option definitions
    if (prim.options) {
      for (const [optName, optDef] of Object.entries(prim.options)) {
        const optPath = `${primPath}/options/${optName}`;

        if (!isIdentifier(optName)) {
          issues.push({
            severity: 'error',
            path: optPath,
            message: `Invalid option name: "${optName}" (must be valid identifier)`,
          });
        }

        // Required option must not have default
        if (optDef.required && optDef.default !== undefined) {
          issues.push({
            severity: 'warning',
            path: optPath,
            message: `Option marked as required but has a default value`,
          });
        }
      }
    }

    // Check port definitions
    if (prim.ports) {
      const seenIndices = new Map<string, number[]>();

      for (const [portName, portDef] of Object.entries(prim.ports)) {
        const portPath = `${primPath}/ports/${portName}`;

        if (!isIdentifier(portName)) {
          issues.push({
            severity: 'error',
            path: portPath,
            message: `Invalid port name: "${portName}" (must be valid identifier)`,
          });
        }

        // Track indices for collision detection
        if (portDef.index !== undefined && portDef.direction) {
          const key = portDef.direction;
          const indices = seenIndices.get(key) || [];
          if (indices.includes(portDef.index)) {
            issues.push({
              severity: 'error',
              path: `${portPath}/index`,
              message: `Duplicate ${portDef.direction} port index: ${portDef.index}`,
            });
          }
          indices.push(portDef.index);
          seenIndices.set(key, indices);
        }
      }
    }

    // Warn if no implementation specified
    if (!prim.wasm && !prim.worklet && !prim.native) {
      issues.push({
        severity: 'info',
        path: primPath,
        message: `No implementation specified (wasm, worklet, or native)`,
      });
    }
  }

  return issues;
}
