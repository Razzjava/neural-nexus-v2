import * as vscode from 'vscode';
import axios from 'axios';

interface ScanResult {
  aiGenerated: {
    isAIGenerated: boolean;
    confidence: number;
  };
  scan: {
    vulnerabilities: Vulnerability[];
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  scannedAt: string;
}

interface Vulnerability {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  filePath: string;
  lineStart: number;
  lineEnd?: number;
  message: string;
  suggestedFix?: string;
  cweId?: string;
  owaspCategory?: string;
}

export class SentinelCodeProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private decorationType: vscode.TextEditorDecorationType;
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('sentinelcode');
    this.outputChannel = vscode.window.createOutputChannel('SentinelCode');
    
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      border: '1px solid rgba(255, 0, 0, 0.3)',
      borderRadius: '2px',
    });

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.text = '$(shield) SentinelCode';
    this.statusBarItem.tooltip = 'Click to scan current file';
    this.statusBarItem.command = 'sentinelcode.scanFile';
    this.statusBarItem.show();

    this.registerCommands();
    this.registerEventHandlers();
  }

  private registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('sentinelcode.scanFile', () => this.scanCurrentFile()),
      vscode.commands.registerCommand('sentinelcode.scanWorkspace', () => this.scanWorkspace()),
      vscode.commands.registerCommand('sentinelcode.openDashboard', () => this.openDashboard()),
      vscode.commands.registerCommand('sentinelcode.enableAutoScan', () => this.setAutoScan(true)),
      vscode.commands.registerCommand('sentinelcode.disableAutoScan', () => this.setAutoScan(false)),
    );
  }

  private registerEventHandlers() {
    // Scan on file save if enabled
    this.context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const config = vscode.workspace.getConfiguration('sentinelcode');
        if (config.get('autoScan')) {
          this.scanDocument(doc);
        }
      }),
    );

    // Clear diagnostics when file is closed
    this.context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
      }),
    );
  }

  private async scanCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active file to scan');
      return;
    }

    await this.scanDocument(editor.document);
  }

  private async scanDocument(document: vscode.TextDocument) {
    // Skip non-code files
    if (!this.isCodeFile(document.languageId)) {
      return;
    }

    const config = vscode.workspace.getConfiguration('sentinelcode');
    if (!config.get('enabled')) {
      return;
    }

    this.statusBarItem.text = '$(sync~spin) Scanning...';

    try {
      const code = document.getText();
      const result = await this.performScan(code, document.languageId, document.fileName);
      
      this.displayResults(document, result);
      this.updateStatusBar(result.scan.summary);

    } catch (error) {
      this.outputChannel.appendLine(`Scan error: ${error}`);
      this.statusBarItem.text = '$(shield) SentinelCode (Error)';
    }
  }

  private async performScan(code: string, language: string, filePath: string): Promise<ScanResult> {
    const config = vscode.workspace.getConfiguration('sentinelcode');
    const apiUrl = config.get('apiUrl') as string || 'http://localhost:3000';

    const response = await axios.post(`${apiUrl}/api/v1/scan`, {
      code,
      language: this.mapLanguageId(language),
      filePath,
    }, {
      timeout: 10000,
    });

    return response.data;
  }

  private displayResults(document: vscode.TextDocument, result: ScanResult) {
    const diagnostics: vscode.Diagnostic[] = [];
    const decorations: vscode.DecorationOptions[] = [];

    const config = vscode.workspace.getConfiguration('sentinelcode');
    const severityFilter = config.get('severityFilter') as string[];
    const showDecorations = config.get('showInlineDecorations') as boolean;

    for (const vuln of result.scan.vulnerabilities) {
      // Skip if filtered out
      if (!severityFilter.includes(vuln.severity)) {
        continue;
      }

      const line = vuln.lineStart - 1;
      const range = new vscode.Range(line, 0, line, document.lineAt(line).text.length);

      // Create diagnostic
      const diagnostic = new vscode.Diagnostic(
        range,
        `[${vuln.ruleId}] ${vuln.message}`,
        this.mapSeverity(vuln.severity),
      );
      diagnostic.code = vuln.ruleId;
      diagnostic.source = 'SentinelCode';
      diagnostics.push(diagnostic);

      // Create decoration
      if (showDecorations) {
        decorations.push({
          range,
          hoverMessage: this.createHoverMessage(vuln),
        });
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);

    // Apply decorations
    const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
    if (editor && showDecorations) {
      editor.setDecorations(this.decorationType, decorations);
    }
  }

  private createHoverMessage(vuln: Vulnerability): vscode.MarkdownString {
    const message = new vscode.MarkdownString();
    message.appendMarkdown(`## 🔒 ${vuln.ruleId}\n\n`);
    message.appendMarkdown(`**Severity:** ${vuln.severity.toUpperCase()}\n\n`);
    message.appendMarkdown(`${vuln.message}\n\n`);
    
    if (vuln.cweId) {
      message.appendMarkdown(`**CWE:** ${vuln.cweId}\n`);
    }
    if (vuln.owaspCategory) {
      message.appendMarkdown(`**OWASP:** ${vuln.owaspCategory}\n`);
    }
    if (vuln.suggestedFix) {
      message.appendMarkdown(`\n**Suggested Fix:**\n\`\`\`\n${vuln.suggestedFix}\n\`\`\`\n`);
    }
    
    message.isTrusted = true;
    return message;
  }

  private updateStatusBar(summary: ScanResult['scan']['summary']) {
    if (summary.critical > 0) {
      this.statusBarItem.text = `$(error) ${summary.critical} Critical`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (summary.high > 0) {
      this.statusBarItem.text = `$(warning) ${summary.high} High`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else if (summary.total > 0) {
      this.statusBarItem.text = `$(info) ${summary.total} Issues`;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = '$(shield) Secure';
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  private async scanWorkspace() {
    const files = await vscode.workspace.findFiles(
      '**/*.{js,ts,jsx,tsx,py,java,go}',
      '**/node_modules/**',
    );

    let scanned = 0;
    let totalIssues = 0;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning workspace with SentinelCode',
      cancellable: true,
    }, async (progress, token) => {
      for (const file of files.slice(0, 50)) { // Limit to 50 files for MVP
        if (token.isCancellationRequested) break;

        try {
          const document = await vscode.workspace.openTextDocument(file);
          await this.scanDocument(document);
          scanned++;
          totalIssues += this.diagnosticCollection.get(file)?.length || 0;
          
          progress.report({
            message: `${scanned}/${files.length} files scanned`,
            increment: (100 / files.length),
          });
        } catch (error) {
          this.outputChannel.appendLine(`Error scanning ${file}: ${error}`);
        }
      }
    });

    vscode.window.showInformationMessage(
      `Scanned ${scanned} files. Found ${totalIssues} potential security issues.`,
    );
  }

  private openDashboard() {
    const config = vscode.workspace.getConfiguration('sentinelcode');
    const apiUrl = config.get('apiUrl') as string || 'https://sentinelcode.io';
    vscode.env.openExternal(vscode.Uri.parse(`${apiUrl}/dashboard`));
  }

  private setAutoScan(enabled: boolean) {
    const config = vscode.workspace.getConfiguration('sentinelcode');
    config.update('autoScan', enabled, true);
    vscode.window.showInformationMessage(`Auto-scan ${enabled ? 'enabled' : 'disabled'}`);
  }

  private isCodeFile(languageId: string): boolean {
    const supportedLanguages = [
      'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
      'python', 'java', 'go', 'ruby', 'php', 'csharp', 'cpp', 'c',
      'rust', 'swift', 'kotlin', 'scala',
    ];
    return supportedLanguages.includes(languageId);
  }

  private mapLanguageId(languageId: string): string {
    const mapping: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'javascriptreact': 'javascript',
      'typescriptreact': 'typescript',
      'python': 'python',
      'java': 'java',
      'go': 'go',
      'ruby': 'ruby',
      'php': 'php',
      'csharp': 'csharp',
      'cpp': 'cpp',
      'c': 'c',
      'rust': 'rust',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'scala': 'scala',
    };
    return mapping[languageId] || languageId;
  }

  private mapSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
      case 'high':
        return vscode.DiagnosticSeverity.Error;
      case 'medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'low':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Warning;
    }
  }

  dispose() {
    this.diagnosticCollection.dispose();
    this.decorationType.dispose();
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
  }
}
