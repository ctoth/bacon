import { describe, it, expect } from 'vitest';
import { checkRegistry } from '../src/checks/registry.js';
import { checkGraph } from '../src/checks/graph.js';
import { Registry, Graph, PortRef, ParamValue, PrimitiveDef } from '../src/types.js';

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
  const registry: Registry = {
    bacon: '0.1',
    primitives: {
      gain: {
        native: 'GainNode', inputs: 1, outputs: 1,
        params: { level: { type: 'int', range: [0, 2], enum: [0, 2], default: 0 } },
        ports: { input: { direction: 'in', index: 0 }, output: { direction: 'out', index: 0 } },
      },
      plain: { native: 'GainNode' },
      closed: { native: 'GainNode', inputs: 0, outputs: 0 },
    },
  };
  const graph = (): Graph => ({ bacon: '0.1', nodes: { a: { type: 'gain' }, b: { type: 'gain' } } });

  it.each<[ParamValue, string]>([
    ['wrong', 'Value type'], [0.5, 'integer'], [3, 'outside range'], [1, 'enum'],
  ])('rejects invalid literal %s', (value, message) => {
    const candidate = graph();
    candidate.nodes.a.params = { level: value };
    expect(checkGraph(candidate, { registry })).toContainEqual(expect.objectContaining({
      severity: 'error', path: '/nodes/a/params/level', message: expect.stringContaining(message),
    }));
  });

  it.each<ParamValue>([0, 2, { bind: 'supplied' }, { expr: 'application_function()' }])(
    'preserves valid literal, bound and expression values: %j', value => {
      const candidate = graph();
      candidate.nodes.a.params = { level: value };
      expect(checkGraph(candidate, { registry })).toEqual([]);
    },
  );

  it('rejects unknown node params, missing required params and parameter targets', () => {
    const candidate = graph();
    candidate.nodes.a.params = { unknown: 1 };
    candidate.connections = [['a', { node: 'b', param: 'unknown' }]];
    const selected: Registry = { bacon: '0.1', primitives: { gain: { params: { required: { type: 'float' } } } } };
    const errors = checkGraph(candidate, { registry: selected }).filter(i => i.severity === 'error');
    expect(errors.map(i => i.path)).toEqual([
      '/nodes/a/params/unknown', '/nodes/a/params/required',
      '/nodes/b/params/required', '/connections/0/to',
    ]);
  });

  it.each<[string, PortRef]>([
    ['gain', { node: 'a', port: 'missing' }],
    ['plain', { node: 'a', port: 'missing' }],
    ['gain', { node: 'a', port: 1 }],
    ['gain', { node: 'a', port: -1 }],
    ['gain', { node: 'a', port: 0.5 }],
    ['closed', 'a'],
    ['closed', { node: 'a' }],
  ])('checks every endpoint surface for %s %j', (type, ref) => {
    const candidate = graph();
    candidate.nodes.a.type = type;
    candidate.connections = [[ref, 'b'], ['b', ref]];
    candidate.inputs = [ref];
    candidate.outputs = [ref];
    expect(checkGraph(candidate, { registry }).filter(i => i.severity === 'error').map(i => i.path))
      .toEqual(['/connections/0/from', '/connections/1/to', '/inputs/0', '/outputs/0']);
  });

  it('checks named-port direction on connections and exposed interfaces', () => {
    const candidate = graph();
    candidate.connections = [[{ node: 'a', port: 'input' }, { node: 'b', port: 'output' }]];
    candidate.inputs = [{ node: 'a', port: 'output' }];
    candidate.outputs = [{ node: 'a', port: 'input' }];
    expect(checkGraph(candidate, { registry }).filter(i => i.severity === 'error').map(i => i.path))
      .toEqual(['/connections/0/from', '/connections/0/to', '/inputs/0', '/outputs/0']);
  });

  it('accepts named, indexed and default ports, parameter targets and feedback', () => {
    const candidate = graph();
    candidate.nodes.b.type = 'plain';
    candidate.connections = [
      [{ node: 'a', port: 'output' }, { node: 'b', port: 0 }],
      ['b', { node: 'a', port: 'input' }],
      ['b', { node: 'a', param: 'level' }],
    ];
    candidate.inputs = [{ node: 'a', port: 'input' }];
    candidate.outputs = ['b'];
    expect(checkGraph(candidate, { registry })).toEqual([]);
  });

  it.each<PrimitiveDef>([
    { inputs: 0, ports: { bad: { direction: 'in', index: 0 } } },
    { outputs: 1, ports: { bad: { direction: 'out', index: 1 } } },
    { ports: { bad: { direction: 'out', index: -1 } } },
    { ports: { bad: { direction: 'out', index: 0.5 } } },
    { ports: { bad: { direction: 'out' } } },
    { ports: { bad: { index: 0 } } },
  ])('rejects unusable named port declarations: %j', primitive => {
    const selected: Registry = { bacon: '0.1', primitives: { bad: primitive } };
    expect(checkRegistry(selected)).toContainEqual(expect.objectContaining({
      severity: 'error', path: expect.stringContaining('/primitives/bad/ports/bad'),
    }));
  });

  it('accepts valid named port indices with explicit and default counts', () => {
    expect(checkRegistry(registry).filter(i => i.severity === 'error')).toEqual([]);
    expect(checkRegistry({ bacon: '0.1', primitives: {
      p: { ports: { out: { direction: 'out', index: 0 } } },
    } }).filter(i => i.severity === 'error')).toEqual([]);
  });

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
