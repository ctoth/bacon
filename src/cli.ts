#!/usr/bin/env node
import { Command } from 'commander';
import { basename } from 'path';
import { readDocument, writeDocument, resolvePath } from './io.js';
import { Validator, guessKind, SchemaKind, ValidationIssue } from './validate.js';
import { checkRegistry } from './checks/registry.js';
import { checkSemantics } from './checks/semantics.js';
import { checkGraph, GraphCheckContext } from './checks/graph.js';
import { CheckIssue } from './checks/types.js';
import { Graph, Registry, Semantics } from './types.js';

interface PrintOptions {
  json: boolean;
}

function printIssues(label: string, issues: (ValidationIssue | CheckIssue)[], opts: PrintOptions): void {
  if (issues.length === 0) return;

  if (opts.json) {
    console.log(JSON.stringify({ label, issues }, null, 2));
    return;
  }

  console.log(`\n=== ${label} (${issues.length}) ===`);
  for (const i of issues) {
    const sev = 'severity' in i ? i.severity.toUpperCase() : 'ERROR';
    console.log(`${sev}: ${i.path || '/'}: ${i.message}`);
  }
}

function hasErrors(issues: (ValidationIssue | CheckIssue)[]): boolean {
  return issues.some(i => !('severity' in i) || i.severity === 'error');
}

const program = new Command();

program
  .name('bacon')
  .description('Validate and check Bacon IR documents')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate a document against its schema')
  .argument('<file>', 'YAML or JSON document')
  .option('-k, --kind <kind>', 'schema kind (graph|registry|semantics|auto)', 'auto')
  .option('--json', 'JSON output', false)
  .action((file: string, opts: { kind: string; json: boolean }) => {
    const validator = new Validator();
    const doc = readDocument(file);
    const kind: SchemaKind | null = opts.kind === 'auto' ? guessKind(doc) : opts.kind as SchemaKind;

    if (!kind) {
      console.error('ERROR: Could not infer schema kind. Use --kind.');
      process.exitCode = 2;
      return;
    }

    const issues = validator.validate(kind, doc);
    if (issues.length) {
      printIssues(`schema:${kind}`, issues.map(i => ({ ...i, severity: 'error' as const })), opts);
      process.exitCode = 1;
    } else {
      console.log(`OK: ${basename(file)} validates as ${kind}`);
    }
  });

program
  .command('check')
  .description('Validate + cross-document consistency checks')
  .argument('<graphFile>', 'Graph YAML/JSON file')
  .option('--json', 'JSON output', false)
  .action((graphFile: string, opts: { json: boolean }) => {
    const validator = new Validator();
    const rawGraph = readDocument(graphFile);

    // Validate graph schema
    const graphSchemaIssues = validator.validate('graph', rawGraph);
    if (graphSchemaIssues.length) {
      printIssues('schema:graph', graphSchemaIssues.map(i => ({ ...i, severity: 'error' as const })), opts);
      process.exitCode = 1;
      return;
    }

    const graph = rawGraph as Graph;
    const meta = (graph.meta ?? {}) as Record<string, unknown>;
    const ctx: GraphCheckContext = {};
    let allIssues: CheckIssue[] = [];

    // Load and check registry if referenced
    if (typeof meta.primitives === 'string') {
      const regPath = resolvePath(graphFile, meta.primitives);
      const rawReg = readDocument(regPath);

      const regSchemaIssues = validator.validate('registry', rawReg);
      if (regSchemaIssues.length) {
        printIssues(`schema:registry (${basename(regPath)})`, regSchemaIssues.map(i => ({ ...i, severity: 'error' as const })), opts);
        process.exitCode = 1;
        return;
      }

      ctx.registry = rawReg as Registry;
      const regChecks = checkRegistry(ctx.registry);
      if (regChecks.length) {
        printIssues(`checks:registry (${basename(regPath)})`, regChecks, opts);
        allIssues = allIssues.concat(regChecks);
      }
    }

    // Load and check semantics if referenced
    if (typeof meta.semantics === 'string') {
      const semPath = resolvePath(graphFile, meta.semantics);
      const rawSem = readDocument(semPath);

      const semSchemaIssues = validator.validate('semantics', rawSem);
      if (semSchemaIssues.length) {
        printIssues(`schema:semantics (${basename(semPath)})`, semSchemaIssues.map(i => ({ ...i, severity: 'error' as const })), opts);
        process.exitCode = 1;
        return;
      }

      ctx.semantics = rawSem as Semantics;
      const semChecks = checkSemantics(ctx.semantics);
      if (semChecks.length) {
        printIssues(`checks:semantics (${basename(semPath)})`, semChecks, opts);
        allIssues = allIssues.concat(semChecks);
      }
    }

    // Run graph checks
    const graphChecks = checkGraph(graph, ctx);
    if (graphChecks.length) {
      printIssues(`checks:graph (${basename(graphFile)})`, graphChecks, opts);
      allIssues = allIssues.concat(graphChecks);
    }

    if (hasErrors(allIssues)) {
      process.exitCode = 1;
    } else if (allIssues.length === 0) {
      console.log(`OK: ${basename(graphFile)} passes all checks`);
    }
  });

program
  .command('format')
  .description('Reformat a document (sorted keys, consistent style)')
  .argument('<file>', 'YAML or JSON file')
  .option('-o, --out <file>', 'output file (default: in-place)')
  .action((file: string, opts: { out?: string }) => {
    const doc = readDocument(file);
    const out = opts.out ?? file;
    writeDocument(out, doc);
    console.log(`Formatted: ${out}`);
  });

program.parse();
