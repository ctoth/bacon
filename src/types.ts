/**
 * Bacon IR TypeScript types
 * These match the JSON Schema definitions
 */

// Common types
export type BaconVersion = string;

export interface BindValue {
  bind: string;
}

export interface ExprValue {
  expr: string;
}

export type ParamValue = number | string | boolean | BindValue | ExprValue;

export interface PortRefObj {
  node: string;
  port?: string | number;
}

export type PortRef = string | PortRefObj;

export type Connection =
  | [PortRef, PortRef]
  | { from: PortRef; to: PortRef; gain?: ParamValue; meta?: Record<string, unknown> };

// Graph types
export interface GraphNode {
  type: string;
  params?: Record<string, ParamValue>;
  options?: Record<string, unknown>;
  bypass?: ParamValue;
  meta?: Record<string, unknown>;
}

export interface Graph {
  bacon: BaconVersion;
  name?: string;
  meta?: Record<string, unknown>;
  nodes: Record<string, GraphNode>;
  connections?: Connection[];
  inputs?: PortRef[];
  outputs?: PortRef[];
}

// Registry types
export interface ParamDef {
  description?: string;
  rate?: 'a' | 'k';
  type?: 'float' | 'int' | 'bool';
  range?: [number, number];
  default?: number | string | boolean;
  unit?: string;
  enum?: Array<string | number | boolean>;
}

export interface OptionDef {
  description?: string;
  type?: 'string' | 'number' | 'bool' | 'array' | 'object';
  default?: unknown;
  required?: boolean;
}

export interface PortDef {
  description?: string;
  direction?: 'in' | 'out';
  index?: number;
}

export interface PrimitiveDef {
  description?: string;
  wasm?: string;
  worklet?: string;
  native?: string;
  inputs?: number;
  outputs?: number;
  params: Record<string, ParamDef>;
  options?: Record<string, OptionDef>;
  ports?: Record<string, PortDef>;
  meta?: Record<string, unknown>;
}

export interface Registry {
  bacon: BaconVersion;
  primitives: Record<string, PrimitiveDef>;
}

// Semantics types
export interface InputParamDef {
  description?: string;
  type?: 'float' | 'int' | 'bool';
  range?: [number, number];
  default?: number | boolean;
  unit?: string;
}

export type ConstantDef = number | string | boolean | unknown[] | Record<string, unknown>;

export interface FunctionDef {
  description?: string;
  params: string[];
  expr: string;
}

export type RealizationRule = string | { description?: string; expr: string; unit?: string };

export interface Semantics {
  bacon: BaconVersion;
  name: string;
  extends?: string;
  description?: string;
  meta?: Record<string, unknown>;
  params?: Record<string, InputParamDef>;
  constants?: Record<string, ConstantDef>;
  functions?: Record<string, FunctionDef>;
  realize?: Record<string, RealizationRule>;
}

// Type guards
export function isBindValue(v: unknown): v is BindValue {
  return typeof v === 'object' && v !== null && 'bind' in v && typeof (v as BindValue).bind === 'string';
}

export function isExprValue(v: unknown): v is ExprValue {
  return typeof v === 'object' && v !== null && 'expr' in v && typeof (v as ExprValue).expr === 'string';
}

export function isPortRefObj(p: unknown): p is PortRefObj {
  return typeof p === 'object' && p !== null && 'node' in p && typeof (p as PortRefObj).node === 'string';
}

// Utilities
export function connectionEndpoints(c: Connection): { from: PortRef; to: PortRef } {
  return Array.isArray(c) ? { from: c[0], to: c[1] } : { from: c.from, to: c.to };
}

export function portRefNode(p: PortRef): string {
  return typeof p === 'string' ? p : p.node;
}

export function isIdentifier(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(s);
}
