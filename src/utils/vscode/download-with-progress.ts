import * as vscode from 'vscode';
import {
  type DownloadResult,
  downloadToFile,
  extractFilename,
} from '../download';
import type { Logger } from '../logger';
import { getS3Object, type ParsedS3Uri } from '../s3';

export async function downloadWithProgress(
  parsedUri: ParsedS3Uri,
  logger: Logger,
): Promise<DownloadResult> {
  // Extract filename from the S3 key first for use in messages
  const filename = extractFilename(parsedUri.key);

  const downloadResult = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Downloading S3 file`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({
        message: `Downloading ${parsedUri.key} from ${parsedUri.bucket}...`,
      });

      // Download the file from S3
      const s3Result = await getS3Object(
        {
          bucket: parsedUri.bucket,
          key: parsedUri.key,
          region: parsedUri.region,
        },
        logger,
      );

      // Save the file to disk
      progress.report({ message: `Saving ${filename}...` });
      const result = await downloadToFile(
        {
          stream: s3Result.stream,
          fileName: filename,
        },
        logger,
      );

      // Mark progress as complete
      progress.report({
        message: `Download complete: ${filename}`,
        increment: 100,
      });

      // Log success message
      logger.info(`Downloaded: ${filename}`);
      logger.info(`Location: ${result.filePath}`);
      logger.info(`Size: ${result.size} bytes`);

      return result;
    },
  );

  return downloadResult;
}
