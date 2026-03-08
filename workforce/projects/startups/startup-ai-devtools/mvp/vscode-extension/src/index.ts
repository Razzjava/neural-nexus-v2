import * as vscode from 'vscode';
import { SentinelCodeProvider } from './extension';

let provider: SentinelCodeProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('SentinelCode extension activated');
  
  provider = new SentinelCodeProvider(context);
  
  vscode.window.showInformationMessage('🔒 SentinelCode is now protecting your code!');
}

export function deactivate() {
  if (provider) {
    provider.dispose();
  }
  console.log('SentinelCode extension deactivated');
}
