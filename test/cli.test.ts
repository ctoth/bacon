import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const cli = join(import.meta.dirname, '..', 'dist', 'cli.js');
const fixtures = join(import.meta.dirname, 'fixtures');

function run(args: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node ${cli} ${args}`, {
      encoding: 'utf-8',
      cwd: fixtures,
    });
    return { stdout, stderr: '', code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      code: e.status || 1,
    };
  }
}

describe('CLI validate', () => {
  it('validates valid registry', () => {
    const result = run('validate valid-registry.yaml');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('OK');
  });

  it('validates valid graph', () => {
    const result = run('validate valid-graph.yaml');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('OK');
  });

  it('rejects invalid graph', () => {
    const result = run('validate invalid-graph.yaml');
    expect(result.code).toBe(1);
  });

  it('accepts --kind option', () => {
    const result = run('validate --kind registry valid-registry.yaml');
    expect(result.code).toBe(0);
  });
});

describe('CLI check', () => {
  it('checks valid graph with registry', () => {
    const result = run('check valid-graph.yaml');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('OK');
  });
});

describe('CLI help', () => {
  it('shows help', () => {
    const result = run('--help');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('validate');
    expect(result.stdout).toContain('check');
    expect(result.stdout).toContain('format');
  });
});
