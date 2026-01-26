import { describe, it, expect } from 'vitest';
import { checkRegistry } from '../src/checks/registry.js';
import { checkGraph } from '../src/checks/graph.js';
import { Registry, Graph } from '../src/types.js';

describe('checkRegistry', () => {
  it('accepts valid registry', () => {
    const registry: Registry = {
      bacon: '0.1',
      primitives: {
        gain: {
          params: {
            level: { type: 'float', range: [0, 1], default: 0.5 },
          },
        },
      },
    };
    const issues = checkRegistry(registry);
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('detects invalid range (min > max)', () => {
    const registry: Registry = {
      bacon: '0.1',
      primitives: {
        bad: {
          params: {
            level: { type: 'float', range: [100, 0] },
          },
        },
      },
    };
    const issues = checkRegistry(registry);
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('min');
  });

  it('warns when default is outside range', () => {
    const registry: Registry = {
      bacon: '0.1',
      primitives: {
        test: {
          params: {
            level: { type: 'float', range: [0, 1], default: 5 },
          },
        },
      },
    };
    const issues = checkRegistry(registry);
    const warnings = issues.filter(i => i.severity === 'warning');
    expect(warnings.length).toBe(1);
    expect(warnings[0].message).toContain('outside range');
  });

  it('detects duplicate port indices', () => {
    const registry: Registry = {
      bacon: '0.1',
      primitives: {
        multi: {
          params: {},
          ports: {
            left: { direction: 'out', index: 0 },
            right: { direction: 'out', index: 0 }, // duplicate
          },
        },
      },
    };
    const issues = checkRegistry(registry);
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('Duplicate');
  });
});

describe('checkGraph', () => {
  it('accepts valid graph', () => {
    const graph: Graph = {
      bacon: '0.1',
      nodes: {
        osc: { type: 'oscillator' },
        out: { type: 'gain' },
      },
      connections: [['osc', 'out']],
      outputs: ['out'],
    };
    const issues = checkGraph(graph);
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('detects connection to unknown node', () => {
    const graph: Graph = {
      bacon: '0.1',
      nodes: {
        a: { type: 'test' },
      },
      connections: [['a', 'missing']],
    };
    const issues = checkGraph(graph);
    expect(issues.some(i => i.message.includes('unknown node'))).toBe(true);
  });

  it('detects output referencing unknown node', () => {
    const graph: Graph = {
      bacon: '0.1',
      nodes: {
        a: { type: 'test' },
      },
      outputs: ['nonexistent'],
    };
    const issues = checkGraph(graph);
    expect(issues.some(i => i.message.includes('unknown node'))).toBe(true);
  });

  it('validates against registry when provided', () => {
    const registry: Registry = {
      bacon: '0.1',
      primitives: {
        gain: {
          params: {
            level: { type: 'float', range: [0, 1] },
          },
        },
      },
    };
    const graph: Graph = {
      bacon: '0.1',
      nodes: {
        out: { type: 'gain', params: { level: 5 } }, // out of range
      },
    };
    const issues = checkGraph(graph, { registry });
    expect(issues.some(i => i.message.includes('outside range'))).toBe(true);
  });

  it('detects unknown primitive type', () => {
    const registry: Registry = {
      bacon: '0.1',
      primitives: {},
    };
    const graph: Graph = {
      bacon: '0.1',
      nodes: {
        x: { type: 'nonexistent' },
      },
    };
    const issues = checkGraph(graph, { registry });
    expect(issues.some(i => i.message.includes('Unknown primitive'))).toBe(true);
  });
});
