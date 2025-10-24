/**
 * OMR Service Types
 * Types for Optical Music Recognition service integration
 */

export interface OMRServiceConfig {
  baseUrl: string;
  token: string;
  timeout?: number;
}

export interface ConversionRequest {
  file: File;
  options?: ConversionOptions;
}

export interface ConversionOptions {
  format?: 'mxl' | 'xml' | 'musicxml';
  quality?: 'fast' | 'balanced' | 'accurate';
}

export interface ConversionResponse {
  success: boolean;
  musicxml?: string;
  filename?: string;
  error?: string;
  details?: string;
}

export interface OMRServiceStatus {
  status: 'ok' | 'error';
  service?: string;
  version?: string;
  audiveris?: string;
}

export type SupportedFileType = '.png' | '.jpg' | '.jpeg' | '.pdf' | '.tif' | '.tiff';

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = [
  '.png',
  '.jpg',
  '.jpeg',
  '.pdf',
  '.tif',
  '.tiff'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB