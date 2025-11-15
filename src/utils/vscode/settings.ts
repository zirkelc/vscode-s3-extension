import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Logger } from '../logger';

export type DownloadLocation = 'downloads' | 'workspace' | 'temp' | 'custom';

export interface S3DownloaderSettings {
  downloadLocation: DownloadLocation;
  customDownloadPath: string;
  alwaysPromptForLocation: boolean;
}

/**
 * Gets the extension settings
 */
export function getSettings(): S3DownloaderSettings {
  const config = vscode.workspace.getConfiguration('s3Downloader');

  return {
    downloadLocation: config.get<DownloadLocation>(
      'downloadLocation',
      'downloads',
    ),
    customDownloadPath: config.get<string>('customDownloadPath', ''),
    alwaysPromptForLocation: config.get<boolean>(
      'alwaysPromptForLocation',
      false,
    ),
  };
}

/**
 * Gets the configured download folder based on settings
 * @param logger Optional logger for debugging
 * @returns The download folder path or null if unavailable
 */
export async function getConfiguredDownloadFolder(
  logger?: Logger,
): Promise<string | null> {
  const settings = getSettings();

  // If always prompt is enabled, return null to trigger prompt
  if (settings.alwaysPromptForLocation) {
    logger?.debug('Always prompt for location is enabled');
    return null;
  }

  switch (settings.downloadLocation) {
    case 'downloads':
      return getSystemDownloadsFolder();

    case 'workspace':
      return getWorkspaceDownloadFolder(logger);

    case 'temp':
      return getSystemTempFolder(logger);

    case 'custom':
      return getCustomDownloadFolder(settings.customDownloadPath, logger);

    default:
      logger?.warn(
        `Unknown download location setting: ${settings.downloadLocation}`,
      );
      return getSystemDownloadsFolder();
  }
}

/**
 * Gets the system downloads folder
 */
export function getSystemDownloadsFolder(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'win32':
      return process.env.USERPROFILE
        ? path.join(process.env.USERPROFILE, 'Downloads')
        : path.join(homeDir, 'Downloads');

    case 'darwin':
      return path.join(homeDir, 'Downloads');

    case 'linux':
      return process.env.XDG_DOWNLOAD_DIR || path.join(homeDir, 'Downloads');

    default:
      return path.join(homeDir, 'Downloads');
  }
}

/**
 * Gets the system temporary folder with an S3 downloads subfolder
 * @param logger Optional logger
 * @returns The temp folder path
 */
function getSystemTempFolder(logger?: Logger): string {
  // Use os.tmpdir() to get the system temp directory
  const tempDir = os.tmpdir();

  // Create a subfolder for S3 downloads to keep them organized
  const s3TempPath = path.join(tempDir, 's3Downloader');

  logger?.debug(`Using temp folder: ${s3TempPath}`);

  return s3TempPath;
}

/**
 * Gets the workspace download folder
 * @param logger Optional logger
 * @returns The workspace folder path or null if no workspace is open
 */
function getWorkspaceDownloadFolder(logger?: Logger): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    logger?.warn(
      'No workspace folder available, falling back to Downloads folder',
    );
    return getSystemDownloadsFolder();
  }

  // Use the first workspace folder root
  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  logger?.debug(`Using workspace root: ${workspaceRoot}`);
  return workspaceRoot;
}

/**
 * Gets the custom download folder
 * @param customPath The custom path from settings
 * @param logger Optional logger
 * @returns The custom folder path or downloads folder if invalid
 */
function getCustomDownloadFolder(customPath: string, logger?: Logger): string {
  if (!customPath || customPath.trim() === '') {
    logger?.warn(
      'Custom download path is empty, falling back to Downloads folder',
    );
    return getSystemDownloadsFolder();
  }

  // Expect an absolute path
  if (!path.isAbsolute(customPath)) {
    logger?.error(`Custom download path must be absolute: ${customPath}`);
    logger?.warn('Falling back to Downloads folder');
    return getSystemDownloadsFolder();
  }

  logger?.debug(`Using custom download path: ${customPath}`);

  // Check if the parent directory exists (we'll create the final folder if needed)
  const parentDir = path.dirname(customPath);
  if (!fs.existsSync(parentDir)) {
    logger?.error(`Parent directory does not exist: ${parentDir}`);
    logger?.warn('Falling back to Downloads folder');
    return getSystemDownloadsFolder();
  }

  return customPath;
}

/**
 * Prompts the user to select a download location
 * @param defaultFolder The default folder to suggest
 * @param filename The filename being downloaded
 * @returns The selected folder path or null if cancelled
 */
export async function promptForDownloadLocation(
  defaultFolder: string,
  filename: string,
): Promise<string | null> {
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(defaultFolder),
    openLabel: 'Select Download Folder',
    title: `Select download location for ${filename}`,
  };

  const folderUri = await vscode.window.showOpenDialog(options);

  if (folderUri && folderUri.length > 0) {
    return folderUri[0].fsPath;
  }

  return null;
}

/**
 * Shows a quick pick to select download location type
 * @returns The selected location type or null if cancelled
 */
export async function promptForDownloadLocationType(): Promise<DownloadLocation | null> {
  const tempPath = path.join(os.tmpdir(), 's3Downloader');

  const items: vscode.QuickPickItem[] = [
    {
      label: '$(home) Downloads Folder',
      description: 'Save to system Downloads folder',
      detail: getSystemDownloadsFolder(),
    },
    {
      label: '$(folder) Current Workspace',
      description: 'Save to current workspace',
      detail:
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
        'No workspace open',
    },
    {
      label: '$(trash) Temporary Folder',
      description: 'Save to system temp folder (files may be deleted)',
      detail: tempPath,
    },
    {
      label: '$(folder-opened) Choose Folder...',
      description: 'Browse and select a folder',
      detail: 'Opens a folder selection dialog',
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select download location',
    title: 'Where would you like to save the file?',
  });

  if (!selected) {
    return null;
  }

  if (selected.label.includes('Downloads')) {
    return 'downloads';
  } else if (selected.label.includes('Workspace')) {
    return 'workspace';
  } else if (selected.label.includes('Temporary')) {
    return 'temp';
  } else {
    return 'custom';
  }
}
