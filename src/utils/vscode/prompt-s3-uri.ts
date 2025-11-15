import * as vscode from 'vscode';
import { parseAndValidateS3Uri } from '../s3';
/**
 * Prompts the user for an S3 URI with validation
 * @returns The S3 URI or undefined if cancelled
 */
export async function promptForS3Uri(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt:
      'Enter S3 URI (s3://bucket/key or https://bucket.s3.region.amazonaws.com/key)',
    placeHolder: 's3://my-bucket/path/to/file.txt',
    validateInput: (value) => {
      if (!value) {
        return 'Please enter an S3 URI';
      }
      const parsed = parseAndValidateS3Uri(value);
      if (!parsed.isValid) {
        return parsed.errorMessage;
      }
      return null;
    },
  });
}
