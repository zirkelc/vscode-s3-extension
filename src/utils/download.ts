import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Logger } from './logger';
import {
  getConfiguredDownloadFolder,
  getSystemDownloadsFolder,
  promptForDownloadLocation,
} from './vscode/settings';

/**
 * Gets the OS-specific download folder (legacy function for backwards compatibility)
 * @returns The path to the downloads folder
 * @deprecated Use getConfiguredDownloadFolder from settingsManager instead
 */
export function getDownloadFolder(): string {
  return getSystemDownloadsFolder();
}

/**
 * Ensures the download folder exists
 * @param folderPath The folder path to ensure exists
 */
export function ensureDownloadFolderExists(folderPath: string): void {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

/**
 * Gets a unique file path, adding a counter if file already exists
 * @param folderPath The folder where the file will be saved
 * @param filename The desired filename
 * @returns A unique file path
 */
export function getUniqueFilePath(
  folderPath: string,
  filename: string,
): string {
  const filePath = path.join(folderPath, filename);

  // If file doesn't exist, return the original path
  if (!fs.existsSync(filePath)) {
    return filePath;
  }

  // Generate unique filename with counter
  let counter = 1;
  let uniquePath = filePath;
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);

  while (fs.existsSync(uniquePath)) {
    uniquePath = path.join(folderPath, `${nameWithoutExt}_${counter}${ext}`);
    counter++;
  }

  return uniquePath;
}

/**
 * Download configuration
 */
export interface DownloadConfig {
  stream: Readable;
  fileName: string;
  folder?: string;
  overwrite?: boolean;
}

/**
 * Download result
 */
export interface DownloadResult {
  fileName: string;
  filePath: string;
  size?: number;
  folder: string;
}

/**
 * Downloads a stream to a file
 * @param config Download configuration
 * @param logger Optional logger instance
 * @returns The path where the file was saved
 */
export async function downloadToFile(
  config: DownloadConfig,
  logger?: Logger,
): Promise<DownloadResult> {
  // Determine download folder - use provided folder or get from settings
  let downloadFolder: string;

  if (config.folder) {
    // Use explicitly provided folder
    downloadFolder = config.folder;
  } else {
    // Get folder from settings
    const configuredFolder = await getConfiguredDownloadFolder(logger);

    if (!configuredFolder) {
      // Settings indicate to prompt user
      const defaultFolder = getSystemDownloadsFolder();
      const selectedFolder = await promptForDownloadLocation(
        defaultFolder,
        config.fileName,
      );

      if (!selectedFolder) {
        throw new Error('Download cancelled - no folder selected');
      }

      downloadFolder = selectedFolder;
      logger?.info(`User selected download folder: ${downloadFolder}`);
    } else {
      downloadFolder = configuredFolder;
      logger?.debug(`Using configured download folder: ${downloadFolder}`);
    }
  }

  ensureDownloadFolderExists(downloadFolder);

  // Get the final file path
  const finalPath = config.overwrite
    ? path.join(downloadFolder, config.fileName)
    : getUniqueFilePath(downloadFolder, config.fileName);

  logger?.info(`Saving file to: ${finalPath}`);

  // Create write stream
  const writeStream = fs.createWriteStream(finalPath);

  // Download the file
  logger?.debug(`Writing file to disk...`);
  await pipeline(config.stream, writeStream);

  // Get file stats
  const stats = fs.statSync(finalPath);

  logger?.info(`File saved successfully (${stats.size} bytes)`);

  return {
    fileName: config.fileName,
    filePath: finalPath,
    size: stats.size,
    folder: downloadFolder,
  };
}

/**
 * Extracts filename from a path or key
 * @param keyOrPath The S3 key or file path
 * @returns The filename
 */
export function extractFilename(keyOrPath: string): string {
  const parts = keyOrPath.split('/');
  return parts[parts.length - 1] || keyOrPath;
}
