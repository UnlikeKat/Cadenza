/**
 * OMR Utility Functions
 */

import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from './types';

/**
 * Check if file type is supported for OMR conversion
 */
export function isSupportedFileType(filename: string): boolean {
  const extension = `.${filename.split('.').pop()?.toLowerCase()}`;
  return SUPPORTED_FILE_TYPES.includes(extension as any);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file for OMR conversion
 */
export function validateOMRFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large (max ${formatFileSize(MAX_FILE_SIZE)})`
    };
  }

  // Check type
  if (!isSupportedFileType(file.name)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported: ${SUPPORTED_FILE_TYPES.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Download MusicXML file
 */
export function downloadMusicXML(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}