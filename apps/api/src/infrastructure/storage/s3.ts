import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfig } from "../../shared/config/index.js";

export type StoredObject = {
  key: string;
  bucket: string;
};

export type ObjectStorage = {
  putPdf: (
    key: string,
    body: Buffer,
    contentType: string,
  ) => Promise<StoredObject>;
  getSignedGetUrl: (key: string, expiresInSeconds?: number) => Promise<string>;
  getSignedPutUrl: (
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ) => Promise<string>;
  headObject: (
    key: string,
  ) => Promise<{ contentLength: number; contentType: string | undefined }>;
  getObjectBuffer: (key: string) => Promise<Buffer>;
};

let client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!client) {
    const config = getConfig();
    const s3Config: ConstructorParameters<typeof S3Client>[0] = {
      region: config.AWS_REGION,
    };
    if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      };
    }
    if (config.S3_ENDPOINT) {
      s3Config.endpoint = config.S3_ENDPOINT;
      s3Config.forcePathStyle = config.S3_FORCE_PATH_STYLE;
    }
    client = new S3Client(s3Config);
  }
  return client;
}

export function createS3Storage(): ObjectStorage {
  return {
    async putPdf(key, body, contentType) {
      const config = getConfig();
      await getS3Client().send(
        new PutObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return { key, bucket: config.S3_BUCKET };
    },

    async getSignedGetUrl(key, expiresInSeconds = 900) {
      const config = getConfig();
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });
      return getSignedUrl(getS3Client(), command, {
        expiresIn: expiresInSeconds,
      });
    },

    async getSignedPutUrl(key, contentType, expiresInSeconds = 900) {
      const config = getConfig();
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        ContentType: contentType,
      });
      return getSignedUrl(getS3Client(), command, {
        expiresIn: expiresInSeconds,
      });
    },

    async headObject(key) {
      const config = getConfig();
      const result = await getS3Client().send(
        new HeadObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: key,
        }),
      );
      return {
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType,
      };
    },

    async getObjectBuffer(key) {
      const config = getConfig();
      const result = await getS3Client().send(
        new GetObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: key,
        }),
      );
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) {
        throw new Error(`Empty object for key ${key}`);
      }
      return Buffer.from(bytes);
    },
  };
}

export function resetS3Client(): void {
  client = undefined;
}
