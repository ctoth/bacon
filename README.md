# @bacon/core

Schema + validation toolkit for Bacon IR documents.

Bacon IR is a small set of YAML/JSON documents used to describe audio graphs and primitive registries. This package ships the JSON Schemas, TypeScript types, a validator, and a CLI that runs schema validation plus cross-document checks.

Bacon is purely a graph + registry format. Higher-level parameter semantics (named params, constants, realize rules) are the consuming application's domain — see e.g. Qlatt's `semantics.yaml` and its `docs/host-contract.md`.

## What it validates

- **Graph**: a node/connection graph (with optional inputs/outputs)
- **Registry**: primitive definitions (params/options/ports/implementations)

## Bacon IR spec (short)

Bacon IR is a minimal audio-graph interchange format built from two YAML/JSON document kinds. Each document is standalone but can reference the other. All documents include a `bacon` version string (e.g. `"0.1"`).

### Graph

Describes a graph of typed nodes and their connections.

- Required: `bacon`, `nodes`
- Optional: `name`, `meta`, `connections`, `inputs`, `outputs`
- `nodes` is a map of node id -> `{ type, params?, options?, bypass?, meta? }`
- `connections` is either a tuple `[from, to]` or `{ from, to, gain?, meta? }`
- A port ref is either a node id (`"osc1"`) or `{ node, port? }` where `port` is a name or index

### Registry

Defines the available primitive node types.

- Required: `bacon`, `primitives`
- `primitives` maps type name -> definition
- Each primitive can define:
  - `params` (typed params with ranges/defaults)
  - `options` (typed options, possibly required)
  - `ports` (named ports with direction/index)
  - `inputs`/`outputs` counts
  - implementation hints: `wasm`, `worklet`, `native`

### Implementation hints are bindings, not definitions

`wasm`, `worklet`, and `native` tell a *particular host* how to instantiate a
primitive; they do not define what the primitive does. A primitive's semantics
must be owned by something host-independent — a portable implementation (e.g.
a WASM/Rust module) or a written definition maintained by the registry author.
A `native` hint is an optimization a host may use only when the host-native
node conforms to that owned definition. A primitive whose only definition *is*
a host-native node is not portable and should be treated as a bug in the
registry.

### Parameter values

Graph node params and connection gains can be:

- literal number/string/boolean
- `{ bind: "name" }` to reference a parameter name supplied by the consuming
  application (bacon validates only that the name is non-empty)
- `{ expr: "..." }` for an inline expression (evaluated by the consuming
  application)

## Install

```bash
npm install @bacon/core
```

## CLI

After building (or when installed as a dependency), you can use the `bacon` binary.

```bash
# validate a single document
bacon validate path/to/graph.yaml
bacon validate --kind registry path/to/registry.json

# validate + cross-document checks (loads referenced registry)
bacon check path/to/graph.yaml

# reformat YAML/JSON (sorted keys, stable style)
bacon format path/to/doc.yaml
bacon format path/to/doc.yaml --out formatted.yaml

# JSON output for tooling
bacon check path/to/graph.yaml --json
```

### Cross-document checks

`bacon check` expects a graph file. If the graph has references in `meta`, they are loaded relative to the graph file:

```yaml
meta:
  primitives: ./registry.yaml
```

`meta.primitives` may also be a list of registry paths. Registries are merged
in order, with later entries overriding earlier ones per primitive — a base
registry can be layered under an experiment's additions:

```yaml
meta:
  primitives:
    - ../base/registry.yaml
    - ./registry.yaml
```

## Programmatic API

```ts
import { Validator, guessKind } from '@bacon/core';
import { readDocument, writeDocument } from '@bacon/core';

const validator = new Validator();
const doc = readDocument('graph.yaml');
const kind = guessKind(doc) ?? 'graph';
const issues = validator.validate(kind, doc);

if (issues.length) {
  console.error(issues);
}
```

TypeScript types are exported from the package as well (see `src/types.ts`).

## Examples

Graph + registry (YAML):

```yaml
bacon: "0.1"
name: simple-synth
meta:
  primitives: ./registry.yaml
nodes:
  osc1:
    type: osc
    params:
      frequency: 440
  out:
    type: gain
    params:
      gain: 0.5
connections:
  - [osc1, out]
outputs:
  - out
```

Registry snippet:

```yaml
bacon: "0.1"
primitives:
  gain:
    native: GainNode
    inputs: 1
    outputs: 1
    params:
      gain:
        type: float
        range: [0, 10]
        default: 1
```

## Development

```bash
npm run build
npm run validate
npm run check
npm run format
```

## License

MIT
