# VSCode S3 Downloader Extension

A VSCode extension that allows you to download and open S3 files directly from their S3 URIs.

https://github.com/user-attachments/assets/7d1194a9-82ea-483f-909e-dfbc2a6250eb

## Available Commands

### S3: Open File
Downloads and automatically opens an S3 file. Text files open in VSCode, other files open in the system default application.

### S3: Download File
Downloads an S3 file without opening it. Offers options to open the download folder or copy the file path.

### S3: Open Settings
Opens the extension settings page where you can configure download locations and behavior.

## Usage

1. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
2. Type "S3" to find available commands
3. Select either:
   - "S3: Open File" to download and open
   - "S3: Download File" to download only
   - "S3: Open Settings" to configure download location
4. Enter your S3 URI (examples below)
5. The file will be downloaded to your configured location

### View Logs

The extension provides structured logging in VSCode's Output panel:

1. Open the Output panel (`View` > `Output` or `Ctrl+Shift+U`)
2. Select "S3 Downloader" from the dropdown

Example output:
```
2024-11-14 12:00:00.000 [info] S3 Downloader extension activated!
2024-11-14 12:00:10.123 [info] Input URI: s3://my-bucket/file.txt
2024-11-14 12:00:10.456 [info] Parsed URI successfully
2024-11-14 12:00:10.789 [debug] Creating S3 client with region: us-west-2
2024-11-14 12:00:11.234 [info] Successfully received response from S3
2024-11-14 12:00:12.567 [info] File written successfully
```

## Supported S3 URI Formats

The following S3 URI formats are supported through the [`amazon-s3-url`](https://github.com/zirkelc/amazon-s3-url) package:

- `s3://my-bucket/path/to/file.txt` (region auto-detected)
- `s3://s3.amazonaws.com/my-bucket/path/to/file.txt`
- `s3://my-bucket.s3.amazonaws.com/path/to/file.txt`
- `https://s3.amazonaws.com/my-bucket/path/to/file.txt`
- `https://my-bucket.s3.amazonaws.com/path/to/file.txt`
- `s3://s3.us-west-2.amazonaws.com/my-bucket/path/to/file.txt`
- `s3://my-bucket.s3.us-west-2.amazonaws.com/path/to/file.txt`
- `https://s3.us-west-2.amazonaws.com/my-bucket/path/to/file.txt`
- `https://my-bucket.s3.us-west-2.amazonaws.com/path/to/file.txt`

## Configuration

The extension provides several settings to customize download behavior:

### Download Location (`s3Downloader.downloadLocation`)
Choose where to save downloaded files:
- **`downloads`** (default): System Downloads folder
- **`workspace`**: Current workspace root folder (if available)
- **`temp`**: System temporary folder (creates `s3Downloader` subfolder)
- **`custom`**: Custom folder path specified in settings

### Custom Download Path (`s3Downloader.customDownloadPath`)
When using `custom` download location, specify an absolute path here.

Examples:
- `/Users/username/Documents/s3Downloader` (macOS/Linux)
- `C:\Users\username\Documents\s3Downloader` (Windows)

### Always Prompt for Location (`s3Downloader.alwaysPromptForLocation`)
Always ask where to save files before downloading, regardless of other settings. Default: `false`

### Accessing Settings

You can access settings in three ways:
1. Command Palette: `S3: Open Settings`
2. VSCode Settings: Search for "S3 Downloader"
3. Settings JSON: Add to your `settings.json`:
   ```json
   {
     "s3Downloader.downloadLocation": "workspace",
     "s3Downloader.customDownloadPath": "/Users/username/Documents/S3",
     "s3Downloader.alwaysPromptForLocation": false
   }
   ```

### Download Location Details

- **Downloads**: Uses the OS-specific Downloads folder
  - Windows: `%USERPROFILE%\Downloads`
  - macOS: `~/Downloads`
  - Linux: `~/Downloads` or `$XDG_DOWNLOAD_DIR`

- **Workspace**: Uses the current VSCode workspace root folder
  - Falls back to Downloads if no workspace is open

- **Temp**: Uses the system temporary directory with an `s3Downloader` subfolder
  - Windows: `%TEMP%\s3Downloader`
  - macOS/Linux: `/tmp/s3Downloader` or `$TMPDIR/s3Downloader`

- **Custom**: Uses your specified absolute path

## Requirements

- AWS credentials must be configured on your system (via AWS CLI, environment variables, or IAM roles)
- Read access to the S3 buckets you want to download from

## AWS Credentials

AWS credentials must be configured on your system (via AWS CLI, environment variables, or IAM roles) with permissions to read the S3 buckets you want to download from.

The extension uses the AWS SDK which automatically looks for credentials in this order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. AWS config file (`~/.aws/config`)

## Development

### Building the Extension

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run compile

# Watch for changes
pnpm run watch
```

### Test the Extension

1. Open the project in VSCode
2. Press `F5` to run the extension in a new Extension Development Host window
3. In the new window, use `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) to open the command palette
4. Type "S3" and select either "S3: Open File" or "S3: Download File"

## License

MIT
