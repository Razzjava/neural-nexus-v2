import { pgTable, uuid, varchar, timestamp, integer, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  role: varchar('role', { length: 50 }).default('member').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  githubId: integer('github_id').unique(),
  name: varchar('name', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  defaultBranch: varchar('default_branch', { length: 255 }).default('main').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('repo_org_idx').on(table.organizationId),
}));

export const securityScans = pgTable('security_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').references(() => repositories.id).notNull(),
  commitSha: varchar('commit_sha', { length: 40 }),
  branch: varchar('branch', { length: 255 }),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalIssues: integer('total_issues').default(0),
  criticalCount: integer('critical_count').default(0),
  highCount: integer('high_count').default(0),
  mediumCount: integer('medium_count').default(0),
  lowCount: integer('low_count').default(0),
}, (table) => ({
  repoIdx: index('scan_repo_idx').on(table.repositoryId),
  statusIdx: index('scan_status_idx').on(table.status),
}));

export const vulnerabilities = pgTable('vulnerabilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').references(() => securityScans.id).notNull(),
  ruleId: varchar('rule_id', { length: 255 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  filePath: text('file_path').notNull(),
  lineStart: integer('line_start').notNull(),
  lineEnd: integer('line_end'),
  columnStart: integer('column_start'),
  columnEnd: integer('column_end'),
  message: text('message').notNull(),
  codeSnippet: text('code_snippet'),
  suggestedFix: text('suggested_fix'),
  cweId: varchar('cwe_id', { length: 20 }),
  owaspCategory: varchar('owasp_category', { length: 50 }),
  status: varchar('status', { length: 50 }).default('open').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  scanIdx: index('vuln_scan_idx').on(table.scanId),
  severityIdx: index('vuln_severity_idx').on(table.severity),
  statusIdx: index('vuln_status_idx').on(table.status),
}));

export const codePatterns = pgTable('code_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').references(() => repositories.id).notNull(),
  patternType: varchar('pattern_type', { length: 50 }).notNull(),
  patternData: jsonb('pattern_data').notNull(),
  confidence: integer('confidence'),
  occurrenceCount: integer('occurrence_count').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
