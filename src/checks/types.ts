export type Severity = 'error' | 'warning' | 'info';

export interface CheckIssue {
  severity: Severity;
  path: string;
  message: string;
}
