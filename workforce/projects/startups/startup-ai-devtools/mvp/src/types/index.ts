export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'team' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: Date;
}

export interface Repository {
  id: string;
  organizationId: string;
  githubId: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  isActive: boolean;
  createdAt: Date;
}

export interface SecurityScan {
  id: string;
  repositoryId: string;
  commitSha: string;
  branch: string;
  triggerType: 'ide' | 'pr' | 'manual' | 'webhook';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt: Date | null;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface Vulnerability {
  id: string;
  scanId: string;
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  filePath: string;
  lineStart: number;
  lineEnd: number | null;
  columnStart: number | null;
  columnEnd: number | null;
  message: string;
  codeSnippet: string | null;
  suggestedFix: string | null;
  cweId: string | null;
  owaspCategory: string | null;
  status: 'open' | 'resolved' | 'ignored' | 'false_positive';
  createdAt: Date;
}

export interface ScanResult {
  vulnerabilities: VulnerabilityInput[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface VulnerabilityInput {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  filePath: string;
  lineStart: number;
  lineEnd?: number;
  columnStart?: number;
  columnEnd?: number;
  message: string;
  codeSnippet?: string;
  suggestedFix?: string;
  cweId?: string;
  owaspCategory?: string;
}

export interface CodeContext {
  filePath: string;
  language: string;
  repositoryId: string;
  commitSha?: string;
  branch?: string;
}
