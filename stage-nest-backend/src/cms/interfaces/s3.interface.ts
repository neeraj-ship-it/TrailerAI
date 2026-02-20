export interface CompleteMultipartUploadForRawMediaParams {
  bucket: string;
  filePath: string;
  parts: { ETag: string; PartNumber: number }[];
  uploadId: string;
}
