import * as vscode from 'vscode';

/**
 * Opens the extension settings
 */
export async function openS3Settings(): Promise<void> {
  await vscode.commands.executeCommand(
    'workbench.action.openSettings',
    's3Downloader',
  );
}
