import * as vscode from 'vscode';
import { downloadS3File } from './commands/download-file';
import { openS3File } from './commands/open-file';
import { openS3Settings } from './commands/open-settings';
import { Logger } from './utils/logger';
import { getSettings } from './utils/vscode/settings';

// Create logger instance
export const logger = new Logger('S3 Downloader');

/**
 * This method is called when the extension is activated
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext) {
  logger.info('S3 Downloader extension activated!');

  // Log current settings
  const settings = getSettings();
  logger.debug(`Download location: ${settings.downloadLocation}`);
  if (settings.downloadLocation === 'custom') {
    logger.debug(`Custom path: ${settings.customDownloadPath}`);
  }

  // Register the open file command (primary command)
  const openFileCommand = vscode.commands.registerCommand(
    's3Downloader.openFile',
    () => openS3File(logger),
  );

  // Register the download only command
  const downloadFileCommand = vscode.commands.registerCommand(
    's3Downloader.downloadFile',
    () => downloadS3File(logger),
  );

  // Register the settings command
  const settingsCommand = vscode.commands.registerCommand(
    's3Downloader.openSettings',
    openS3Settings,
  );

  context.subscriptions.push(openFileCommand);
  context.subscriptions.push(downloadFileCommand);
  context.subscriptions.push(settingsCommand);
  context.subscriptions.push(logger);
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  logger.info('S3 Downloader extension deactivated!');
  logger.dispose();
}
