import * as fs from 'fs';
import * as vscode from 'vscode';
import type { DownloadResult } from '../download';
import type { Logger } from '../logger';

/**
 * Opens a file in VSCode
 * @param filePath The path to the file to open
 * @param logger Optional logger instance
 * @returns The opened text document
 */
export async function openFileInVSCode(
  filePath: string,
  logger?: Logger,
): Promise<vscode.TextDocument> {
  logger?.debug(`Opening file in VSCode: ${filePath}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    // Open the text document
    const document = await vscode.workspace.openTextDocument(filePath);

    // Show the document in the editor
    await vscode.window.showTextDocument(document);

    logger?.info(`File opened successfully in VSCode`);

    return document;
  } catch (error) {
    logger?.error(`Failed to open file: ${error}`);
    throw error;
  }
}

/**
 * Opens a file in the system default application
 * @param filePath The path to the file to open
 * @param logger Optional logger instance
 */
export async function openFileInSystem(
  filePath: string,
  logger?: Logger,
): Promise<void> {
  logger?.debug(`Opening file in system default application: ${filePath}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    // Use VSCode's API to open externally
    const fileUri = vscode.Uri.file(filePath);
    await vscode.env.openExternal(fileUri);

    logger?.info(`File opened in system default application`);
  } catch (error) {
    logger?.error(`Failed to open file externally: ${error}`);
    throw error;
  }
}

export async function openWithProgress(
  downloadResult: DownloadResult,
  logger: Logger,
): Promise<void> {
  const { fileName: filename, filePath } = downloadResult;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Opening S3 file`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: `Opening ${filename}...` });

      // Open the file
      await openFileInVSCode(filePath, logger);

      // Mark progress as complete
      progress.report({
        message: `Successfully opened ${filename}`,
        increment: 100,
      });

      // Show success message
      logger.info(`Downloaded: ${filename}`);
      logger.info(`Location: ${filePath}`);
      vscode.window.showInformationMessage(`Successfully opened: ${filename}`);
    },
  );
}
