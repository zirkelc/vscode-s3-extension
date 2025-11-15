import {
  GetBucketLocationCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { parseS3Url, type S3Object } from 'amazon-s3-url';
import type { Readable } from 'stream';
import type { Logger } from './logger';

/**
 * S3 Service configuration
 */
export interface S3Config {
  region?: string;
  bucket: string;
  key: string;
}

/**
 * S3 download result
 */
export interface S3DownloadResult {
  stream: Readable;
  contentLength?: number;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Detects the correct region for an S3 bucket
 * @param bucketName The name of the S3 bucket
 * @param logger Optional logger instance for structured logging
 * @returns The region of the bucket
 */
export async function detectBucketRegion(
  bucketName: string,
  logger?: Logger,
): Promise<string> {
  // GetBucketLocation must be called from us-east-1 for all buckets
  const client = new S3Client({ region: 'us-east-1' });

  logger?.debug(`Detecting region for bucket: ${bucketName}`);

  try {
    const response = await client.send(
      new GetBucketLocationCommand({ Bucket: bucketName }),
    );

    // LocationConstraint is undefined for us-east-1 buckets
    // For other regions, it contains the region name
    const region = response.LocationConstraint || 'us-east-1';

    // EU is a legacy location constraint that maps to eu-west-1
    if (region === 'EU') {
      logger?.debug(`Found legacy EU region, mapping to eu-west-1`);
      return 'eu-west-1';
    }

    logger?.info(`Detected bucket region: ${region}`);
    return region;
  } catch (error: any) {
    logger?.error(`Error detecting bucket region: ${error?.message}`);

    // If GetBucketLocation fails, try to extract region from error message
    if (
      error?.name === 'PermanentRedirect' ||
      error?.$metadata?.httpStatusCode === 301
    ) {
      // Try to parse the endpoint from the error message
      const endpointMatch = error?.message?.match(
        /s3[.-]([a-z0-9-]+)\.amazonaws\.com/,
      );
      if (endpointMatch && endpointMatch[1] !== 's3') {
        logger?.info(
          `Extracted region from error message: ${endpointMatch[1]}`,
        );
        return endpointMatch[1];
      }
    }

    throw new Error(
      `Could not determine bucket region: ${error?.message || 'Unknown error'}`,
    );
  }
}

/**
 * Downloads an object from S3
 * @param config S3 configuration
 * @param logger Optional logger instance
 * @returns Download result with stream and metadata
 */
export async function getS3Object(
  config: S3Config,
  logger?: Logger,
): Promise<S3DownloadResult> {
  let region = config.region;

  // Auto-detect region if not provided
  if (!region) {
    logger?.info('Region not specified, attempting auto-detection...');
    try {
      region = await detectBucketRegion(config.bucket, logger);
    } catch (error) {
      // Fall back to default region or environment variable
      region = process.env.AWS_REGION || 'us-east-1';
      logger?.warn(`Could not detect region, using default: ${region}`);
      logger?.debug(`Region detection error: ${error}`);
    }
  } else {
    logger?.info(`Using specified region: ${region}`);
  }

  // Create S3 client with the correct region
  logger?.debug(`Creating S3 client with region: ${region}`);
  const s3Client = new S3Client({ region });

  // Create GetObject command
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: config.key,
  });

  logger?.info(
    `Downloading object from S3: s3://${config.bucket}/${config.key}`,
  );

  try {
    const response = await s3Client.send(command);
    logger?.info(`Successfully received response from S3`);

    if (!response.Body) {
      throw new Error('No file content received from S3');
    }

    // Log metadata
    if (response.ContentLength) {
      logger?.debug(`File size: ${response.ContentLength} bytes`);
    }
    if (response.ContentType) {
      logger?.debug(`Content type: ${response.ContentType}`);
    }

    return {
      stream: response.Body as Readable,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      metadata: response.Metadata,
    };
  } catch (error: any) {
    // Handle redirect errors by retrying with correct region
    if (
      error?.name === 'PermanentRedirect' ||
      error?.$metadata?.httpStatusCode === 301
    ) {
      const endpointMatch = error?.message?.match(
        /s3[.-]([a-z0-9-]+)\.amazonaws\.com/,
      );
      if (endpointMatch && endpointMatch[1] !== 's3') {
        const correctRegion = endpointMatch[1];
        logger?.warn(
          `Received redirect to region: ${correctRegion}, retrying...`,
        );

        // Retry with correct region
        const correctClient = new S3Client({ region: correctRegion });
        const response = await correctClient.send(command);
        logger?.info(`Successfully downloaded after redirect`);

        if (!response.Body) {
          throw new Error('No file content received from S3');
        }

        return {
          stream: response.Body as Readable,
          contentLength: response.ContentLength,
          contentType: response.ContentType,
          metadata: response.Metadata,
        };
      }
    }

    throw error;
  }
}

export interface ParsedS3Uri {
  bucket: string;
  key: string;
  region?: string;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Parses an S3 URI and validates that it contains a key (not just a directory)
 * @param uri The S3 URI to parse (supports both s3:// and https:// formats)
 * @returns ParsedS3Uri object with validation results
 */
export function parseAndValidateS3Uri(uri: string): ParsedS3Uri {
  try {
    // Trim whitespace
    const trimmedUri = uri.trim();

    if (!trimmedUri) {
      return {
        bucket: '',
        key: '',
        isValid: false,
        errorMessage: 'S3 URI cannot be empty',
      };
    }

    // Parse the S3 URI using amazon-s3-url package
    const s3Object: S3Object = parseS3Url(trimmedUri);

    // Check if the URI has a key (not just a bucket/directory)
    if (!s3Object.key || s3Object.key.trim() === '') {
      return {
        bucket: s3Object.bucket,
        key: '',
        region: s3Object.region,
        isValid: false,
        errorMessage:
          'S3 URI must include a file key (not just a bucket or directory)',
      };
    }

    // Check if the key ends with a slash (indicating a directory)
    if (s3Object.key.endsWith('/')) {
      return {
        bucket: s3Object.bucket,
        key: s3Object.key,
        region: s3Object.region,
        isValid: false,
        errorMessage:
          'S3 URI must point to a file, not a directory (URI ends with /)',
      };
    }

    // Valid S3 URI with a file key
    return {
      bucket: s3Object.bucket,
      key: s3Object.key,
      region: s3Object.region,
      isValid: true,
    };
  } catch (error) {
    // Handle parsing errors
    const errorMessage =
      error instanceof Error ? error.message : 'Invalid S3 URI format';
    return {
      bucket: '',
      key: '',
      isValid: false,
      errorMessage: `Failed to parse S3 URI: ${errorMessage}`,
    };
  }
}
