import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import { parseAndValidateS3Uri } from '../utils/s3';
import { downloadWithProgress } from '../utils/vscode/download-with-progress';
import { promptForS3Uri } from '../utils/vscode/prompt-s3-uri';

/**
 * Downloads an S3 file without opening it
 * @param logger Logger instance for structured logging
 */
export async function downloadS3File(logger: Logger): Promise<void> {
  try {
    logger.info('S3 download command started');

    logger.info('Prompting user for S3 URI input');
    // Prompt user for S3 URI
    const s3Uri = await promptForS3Uri();

    if (!s3Uri) {
      logger.info('User cancelled the S3 URI input dialog');
      return;
    }

    logger.info(`Input URI: ${s3Uri}`);

    // Parse and validate the S3 URI
    const parsedUri = parseAndValidateS3Uri(s3Uri);

    if (!parsedUri.isValid) {
      logger.error(`Invalid S3 URI: ${parsedUri.errorMessage}`);
      vscode.window.showErrorMessage(
        `Invalid S3 URI: ${parsedUri.errorMessage}`,
      );
      return;
    }

    logger.info(`Parsed URI successfully`);
    logger.info(JSON.stringify(parsedUri, null, 2));

    const downloadResult = await downloadWithProgress(parsedUri, logger);

    const { fileName: filename } = downloadResult;

    // Show information message with options after progress completes
    const action = await vscode.window.showInformationMessage(
      `Successfully downloaded: ${filename}`,
      'Open Folder',
      'Copy Path',
    );

    if (action === 'Open Folder') {
      // Open the download folder in system explorer
      const folderUri = vscode.Uri.file(downloadResult.folder);
      await vscode.env.openExternal(folderUri);
    } else if (action === 'Copy Path') {
      // Copy the file path to clipboard
      await vscode.env.clipboard.writeText(downloadResult.filePath);
      vscode.window.showInformationMessage('File path copied to clipboard');
    }
  } catch (error) {
    const errorMessage = logger.error(error);
    vscode.window.showErrorMessage(
      `Failed to download S3 file: ${errorMessage}`,
    );
    console.error('S3 download error:', error);
  } finally {
    logger.info('S3 download command ended');
  }
}
