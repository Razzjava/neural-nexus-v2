import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { createNodeMiddleware } from '@octokit/webhooks';
import { config } from '../config';
import { securityScanner } from '../scanner';
import { ScanResult, VulnerabilityInput } from '../types';

/**
 * GitHub App Integration
 * Handles webhooks and PR reviews
 */
export class GitHubIntegration {
  private app: App;

  constructor() {
    this.app = new App({
      appId: config.github.appId,
      privateKey: config.github.privateKey,
      webhooks: {
        secret: config.github.webhookSecret,
      },
    });

    this.setupWebhookHandlers();
  }

  /**
   * Get middleware for Fastify
   */
  getMiddleware() {
    return createNodeMiddleware(this.app.webhooks, {
      path: '/webhooks/github',
    });
  }

  /**
   * Get authenticated Octokit client for an installation
   */
  async getInstallationClient(installationId: number): Promise<Octokit> {
    return this.app.getInstallationOctokit(installationId);
  }

  private setupWebhookHandlers() {
    // Handle PR opened or synchronized
    this.app.webhooks.on('pull_request.opened', this.handlePROpened.bind(this));
    this.app.webhooks.on('pull_request.synchronize', this.handlePRSynchronized.bind(this));

    // Handle installation
    this.app.webhooks.on('installation.created', this.handleInstallationCreated.bind(this));
    this.app.webhooks.on('installation_repositories.added', this.handleReposAdded.bind(this));

    // Error handler
    this.app.webhooks.onError((error) => {
      console.error('GitHub webhook error:', error);
    });
  }

  private async handlePROpened(event: any) {
    const { pull_request, repository, installation } = event.payload;
    
    console.log(`PR opened: ${repository.full_name}#${pull_request.number}`);
    
    await this.analyzePullRequest({
      installationId: installation.id,
      owner: repository.owner.login,
      repo: repository.name,
      pullNumber: pull_request.number,
      headSha: pull_request.head.sha,
      baseRef: pull_request.base.ref,
      headRef: pull_request.head.ref,
    });
  }

  private async handlePRSynchronized(event: any) {
    const { pull_request, repository, installation } = event.payload;
    
    console.log(`PR synchronized: ${repository.full_name}#${pull_request.number}`);
    
    await this.analyzePullRequest({
      installationId: installation.id,
      owner: repository.owner.login,
      repo: repository.name,
      pullNumber: pull_request.number,
      headSha: pull_request.head.sha,
      baseRef: pull_request.base.ref,
      headRef: pull_request.head.ref,
    });
  }

  private async handleInstallationCreated(event: any) {
    const { installation, repositories } = event.payload;
    console.log(`App installed for ${installation.account.login}`);
    console.log(`Repositories: ${repositories?.map((r: any) => r.full_name).join(', ')}`);
  }

  private async handleReposAdded(event: any) {
    const { installation, repositories_added } = event.payload;
    console.log(`Repositories added for ${installation.account.login}`);
    console.log(`Added: ${repositories_added?.map((r: any) => r.full_name).join(', ')}`);
  }

  private async analyzePullRequest(params: {
    installationId: number;
    owner: string;
    repo: string;
    pullNumber: number;
    headSha: string;
    baseRef: string;
    headRef: string;
  }) {
    const { installationId, owner, repo, pullNumber, headSha } = params;

    try {
      const octokit = await this.getInstallationClient(installationId);

      // Create check run
      const checkRun = await octokit.rest.checks.create({
        owner,
        repo,
        name: 'SentinelCode Security Scan',
        head_sha: headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });

      // Get changed files
      const { data: files } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
      });

      // Filter for code files
      const codeFiles = files.filter(f => 
        this.isCodeFile(f.filename) && 
        (f.status === 'added' || f.status === 'modified')
      );

      // Scan each file
      const allVulnerabilities: Array<VulnerabilityInput & { filename: string }> = [];
      
      for (const file of codeFiles.slice(0, 10)) { // Limit to 10 files for MVP
        try {
          // Get file content
          const { data: content } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: headSha,
          });

          if ('content' in content) {
            const code = Buffer.from(content.content, 'base64').toString('utf-8');
            
            // Check if AI-generated
            const aiCheck = await securityScanner.detectAIGenerated(code);
            
            if (aiCheck.isAIGenerated || true) { // Scan all for MVP
              const language = this.getLanguageFromFilename(file.filename);
              const result = await securityScanner.scan(code, language, {
                filePath: file.filename,
                language,
                repositoryId: `${owner}/${repo}`,
              });

              allVulnerabilities.push(...result.vulnerabilities.map(v => ({
                ...v,
                filename: file.filename,
              })));
            }
          }
        } catch (error) {
          console.error(`Error scanning ${file.filename}:`, error);
        }
      }

      // Post review comments
      await this.postReviewComments(octokit, owner, repo, pullNumber, allVulnerabilities);

      // Update check run
      await this.updateCheckRun(octokit, owner, repo, checkRun.data.id, allVulnerabilities);

    } catch (error) {
      console.error('Error analyzing PR:', error);
    }
  }

  private async postReviewComments(
    octokit: Octokit,
    owner: string,
    repo: string,
    pullNumber: number,
    vulnerabilities: Array<VulnerabilityInput & { filename: string }>
  ) {
    // Group by file
    const byFile = new Map<string, typeof vulnerabilities>();
    for (const vuln of vulnerabilities) {
      const list = byFile.get(vuln.filename) || [];
      list.push(vuln);
      byFile.set(vuln.filename, list);
    }

    // Post summary comment
    if (vulnerabilities.length > 0) {
      const summary = this.formatSummaryComment(vulnerabilities);
      
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: summary,
      });

      // Post individual comments for high/critical
      for (const vuln of vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high')) {
        try {
          await octokit.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number: pullNumber,
            commit_id: vuln.commitSha || '',
            path: vuln.filename,
            line: vuln.lineStart,
            body: this.formatReviewComment(vuln),
          });
        } catch (error) {
          console.error('Error posting review comment:', error);
        }
      }
    }
  }

  private async updateCheckRun(
    octokit: Octokit,
    owner: string,
    repo: string,
    checkRunId: number,
    vulnerabilities: VulnerabilityInput[]
  ) {
    const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
    const high = vulnerabilities.filter(v => v.severity === 'high').length;
    const medium = vulnerabilities.filter(v => v.severity === 'medium').length;
    const low = vulnerabilities.filter(v => v.severity === 'low').length;

    const conclusion = critical > 0 ? 'failure' : 'success';
    
    let summary = `## SentinelCode Security Scan Results\n\n`;
    summary += `Found **${vulnerabilities.length}** security issues in AI-generated code:\n\n`;
    summary += `- 🔴 Critical: ${critical}\n`;
    summary += `- 🟠 High: ${high}\n`;
    summary += `- 🟡 Medium: ${medium}\n`;
    summary += `- 🟢 Low: ${low}\n\n`;
    
    if (vulnerabilities.length > 0) {
      summary += `### Details\n\n`;
      for (const vuln of vulnerabilities.slice(0, 10)) {
        summary += `- **${vuln.ruleId}** (${vuln.severity}): ${vuln.message}\n`;
      }
      if (vulnerabilities.length > 10) {
        summary += `\n... and ${vulnerabilities.length - 10} more\n`;
      }
    }

    await octokit.rest.checks.update({
      owner,
      repo,
      check_run_id: checkRunId,
      status: 'completed',
      conclusion,
      completed_at: new Date().toISOString(),
      output: {
        title: conclusion === 'failure' ? 'Security Issues Found' : 'No Critical Issues',
        summary,
        annotations: vulnerabilities.slice(0, 50).map(v => ({
          path: v.filePath,
          start_line: v.lineStart,
          end_line: v.lineEnd || v.lineStart,
          annotation_level: v.severity === 'critical' || v.severity === 'high' 
            ? 'failure' 
            : 'warning',
          message: v.message,
          raw_details: v.suggestedFix,
        })),
      },
    });
  }

  private formatSummaryComment(vulnerabilities: VulnerabilityInput[]): string {
    const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
    const high = vulnerabilities.filter(v => v.severity === 'high').length;
    
    let comment = `## 🔒 SentinelCode Security Scan\n\n`;
    comment += `Found **${vulnerabilities.length}** potential security issues in AI-generated code.\n\n`;
    
    if (critical > 0) {
      comment += `⚠️ **${critical} critical** issues require immediate attention.\n\n`;
    }
    if (high > 0) {
      comment += `⚠️ **${high} high** severity issues should be addressed before merging.\n\n`;
    }
    
    comment += `### Next Steps\n`;
    comment += `1. Review the inline comments for detailed information\n`;
    comment += `2. Apply the suggested fixes\n`;
    comment += `3. Re-request review when ready\n\n`;
    comment += `---\n`;
    comment.append(`*Powered by [SentinelCode](https://sentinelcode.io) - AI-generated code security guardian*`);
    
    return comment;
  }

  private formatReviewComment(vuln: VulnerabilityInput): string {
    let comment = `**${vuln.ruleId}** (${vuln.severity.toUpperCase()})\n\n`;
    comment += `${vuln.message}\n\n`;
    if (vuln.cweId) {
      comment += `CWE: ${vuln.cweId}\n`;
    }
    if (vuln.owaspCategory) {
      comment += `OWASP: ${vuln.owaspCategory}\n`;
    }
    if (vuln.suggestedFix) {
      comment += `\n**Suggested Fix:**\n\`\`\`\n${vuln.suggestedFix}\n\`\`\`\n`;
    }
    return comment;
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.mjs',
      '.py', '.java', '.go', '.rb', '.php',
      '.cs', '.cpp', '.c', '.h', '.swift',
      '.kt', '.rs', '.scala', '.r'
    ];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  private getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mapping: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'mjs': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c': 'c',
      'swift': 'swift',
      'kt': 'kotlin',
      'rs': 'rust',
    };
    return mapping[ext || ''] || 'unknown';
  }
}

export const githubIntegration = new GitHubIntegration();
