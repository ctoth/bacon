import {
  Graph,
  Registry,
  isIdentifier,
  isBindValue,
  isExprValue,
  connectionEndpoints,
  portRefNode,
  ParamValue,
  PortRef,
} from '../types.js';
import { CheckIssue } from './types.js';

export interface GraphCheckContext {
  registry?: Registry;
}

export function checkGraph(graph: Graph, ctx: GraphCheckContext = {}): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const { registry } = ctx;

  const nodeIds = new Set(Object.keys(graph.nodes));

  // Check each node
  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    const nodePath = `/nodes/${nodeId}`;

    // Check node ID is valid identifier
    if (!isIdentifier(nodeId)) {
      issues.push({
        severity: 'error',
        path: nodePath,
        message: `Invalid node ID: "${nodeId}" (must be valid identifier)`,
      });
    }

    // Check node type exists in registry (if registry provided)
    if (registry) {
      if (!(node.type in registry.primitives)) {
        issues.push({
          severity: 'error',
          path: `${nodePath}/type`,
          message: `Unknown primitive type: "${node.type}"`,
        });
      } else {
        const prim = registry.primitives[node.type];

        // Check params against registry definition
        if (node.params) {
          for (const [paramName, paramValue] of Object.entries(node.params)) {
            const paramPath = `${nodePath}/params/${paramName}`;

            if (!(paramName in prim.params)) {
              issues.push({
                severity: 'warning',
                path: paramPath,
                message: `Unknown param "${paramName}" for primitive "${node.type}"`,
              });
            } else {
              // Validate param value against definition
              const paramDef = prim.params[paramName];
              const valueIssues = validateParamValue(paramValue, paramDef, paramPath);
              issues.push(...valueIssues);
            }
          }
        }

        // Check for missing required params (those without defaults)
        for (const [paramName, paramDef] of Object.entries(prim.params)) {
          if (paramDef.default === undefined && (!node.params || !(paramName in node.params))) {
            issues.push({
              severity: 'info',
              path: `${nodePath}/params`,
              message: `Param "${paramName}" has no default and is not specified`,
            });
          }
        }

        // Check options
        if (prim.options) {
          for (const [optName, optDef] of Object.entries(prim.options)) {
            if (optDef.required && (!node.options || !(optName in node.options))) {
              issues.push({
                severity: 'error',
                path: `${nodePath}/options`,
                message: `Required option "${optName}" is not specified`,
              });
            }
          }
        }
      }
    }

    // Validate bypass if present
    if (node.bypass !== undefined) {
      const bypassIssues = validateParamValue(node.bypass, { type: 'bool' }, `${nodePath}/bypass`);
      issues.push(...bypassIssues);
    }
  }

  // Check connections
  if (graph.connections) {
    for (let i = 0; i < graph.connections.length; i++) {
      const conn = graph.connections[i];
      const connPath = `/connections/${i}`;
      const { from, to } = connectionEndpoints(conn);

      // Check from node exists
      const fromNode = portRefNode(from);
      if (!nodeIds.has(fromNode)) {
        issues.push({
          severity: 'error',
          path: `${connPath}/from`,
          message: `Connection references unknown node: "${fromNode}"`,
        });
      }

      // Check to node exists
      const toNode = portRefNode(to);
      if (!nodeIds.has(toNode)) {
        issues.push({
          severity: 'error',
          path: `${connPath}/to`,
          message: `Connection references unknown node: "${toNode}"`,
        });
      }

      // Validate port references against registry
      if (registry) {
        validatePortRef(from, 'out', graph, registry, `${connPath}/from`, issues);
        validatePortRef(to, 'in', graph, registry, `${connPath}/to`, issues);
      }

      // Check gain if present
      if (!Array.isArray(conn) && conn.gain !== undefined) {
        const gainIssues = validateParamValue(conn.gain, { type: 'float' }, `${connPath}/gain`);
        issues.push(...gainIssues);
      }
    }
  }

  // Check inputs reference valid nodes
  if (graph.inputs) {
    for (let i = 0; i < graph.inputs.length; i++) {
      const input = graph.inputs[i];
      const inputNode = portRefNode(input);
      if (!nodeIds.has(inputNode)) {
        issues.push({
          severity: 'error',
          path: `/inputs/${i}`,
          message: `Input references unknown node: "${inputNode}"`,
        });
      }
    }
  }

  // Check outputs reference valid nodes
  if (graph.outputs) {
    for (let i = 0; i < graph.outputs.length; i++) {
      const output = graph.outputs[i];
      const outputNode = portRefNode(output);
      if (!nodeIds.has(outputNode)) {
        issues.push({
          severity: 'error',
          path: `/outputs/${i}`,
          message: `Output references unknown node: "${outputNode}"`,
        });
      }
    }
  }

  return issues;
}

function validateParamValue(
  value: ParamValue,
  paramDef: { type?: string; range?: [number, number]; enum?: Array<string | number | boolean> },
  path: string
): CheckIssue[] {
  const issues: CheckIssue[] = [];

  if (isBindValue(value)) {
    // Just validate it's a non-empty string - what it binds to is the runtime's problem
    if (!value.bind || value.bind.trim().length === 0) {
      issues.push({
        severity: 'error',
        path,
        message: `Empty binding name`,
      });
    }
    return issues;
  }

  if (isExprValue(value)) {
    // Basic expr validation - just check non-empty
    if (!value.expr || value.expr.trim().length === 0) {
      issues.push({
        severity: 'error',
        path,
        message: `Empty expression`,
      });
    }
    return issues;
  }

  // Literal value validation
  const valType = typeof value;

  // Type check
  if (paramDef.type) {
    const expectedType = paramDef.type === 'bool' ? 'boolean' : paramDef.type === 'int' || paramDef.type === 'float' ? 'number' : 'string';
    if (valType !== expectedType) {
      issues.push({
        severity: 'warning',
        path,
        message: `Value type "${valType}" doesn't match expected type "${paramDef.type}"`,
      });
    }

    // Int check
    if (paramDef.type === 'int' && valType === 'number' && !Number.isInteger(value)) {
      issues.push({
        severity: 'warning',
        path,
        message: `Value ${value} should be an integer`,
      });
    }
  }

  // Range check
  if (paramDef.range && typeof value === 'number') {
    const [min, max] = paramDef.range;
    if (value < min || value > max) {
      issues.push({
        severity: 'warning',
        path,
        message: `Value ${value} outside range [${min}, ${max}]`,
      });
    }
  }

  // Enum check
  if (paramDef.enum && !paramDef.enum.includes(value as string | number | boolean)) {
    issues.push({
      severity: 'warning',
      path,
      message: `Value "${value}" not in allowed enum: [${paramDef.enum.join(', ')}]`,
    });
  }

  return issues;
}

function validatePortRef(
  ref: PortRef,
  expectedDirection: 'in' | 'out',
  graph: Graph,
  registry: Registry,
  path: string,
  issues: CheckIssue[]
): void {
  const nodeId = portRefNode(ref);
  const node = graph.nodes[nodeId];
  if (!node) return; // Already reported as unknown node

  const prim = registry.primitives[node.type];
  if (!prim) return; // Already reported as unknown type

  // If port is specified by name, check it exists
  if (typeof ref === 'object' && ref.port !== undefined && typeof ref.port === 'string') {
    if (prim.ports && !(ref.port in prim.ports)) {
      issues.push({
        severity: 'warning',
        path,
        message: `Unknown port "${ref.port}" on node "${nodeId}" (type: ${node.type})`,
      });
    } else if (prim.ports && prim.ports[ref.port].direction && prim.ports[ref.port].direction !== expectedDirection) {
      issues.push({
        severity: 'error',
        path,
        message: `Port "${ref.port}" is ${prim.ports[ref.port].direction}, expected ${expectedDirection}`,
      });
    }
  }

  // If port is specified by index, check it's within bounds
  if (typeof ref === 'object' && typeof ref.port === 'number') {
    const maxPort = expectedDirection === 'in' ? (prim.inputs ?? 1) : (prim.outputs ?? 1);
    if (ref.port >= maxPort) {
      issues.push({
        severity: 'error',
        path,
        message: `Port index ${ref.port} out of bounds (max ${expectedDirection}: ${maxPort})`,
      });
    }
  }
}
