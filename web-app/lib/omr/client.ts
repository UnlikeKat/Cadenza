/**
 * OMR Service Client
 * Client for communicating with the Audiveris OMR service
 * 
 * @license AGPL-3.0
 */

import type {
  OMRServiceConfig,
  ConversionRequest,
  ConversionResponse,
  OMRServiceStatus
} from './types';

export class OMRClient {
  private config: OMRServiceConfig;

  constructor(config: OMRServiceConfig) {
    this.config = {
      timeout: 120000, // 2 minutes default
      ...config
    };
  }

  /**
   * Check if OMR service is healthy
   */
  async checkHealth(): Promise<OMRServiceStatus> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OMR service health check failed:', error);
      return {
        status: 'error'
      };
    }
  }

  /**
   * Convert sheet music image/PDF to MusicXML
   */
  async convert(request: ConversionRequest): Promise<ConversionResponse> {
    try {
      // Validate file
      const validation = this.validateFile(request.file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', request.file);

      // Call OMR service
      const response = await fetch(`${this.config.baseUrl}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        },
        body: formData,
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `Conversion failed: ${response.status}`,
          details: errorData.details
        };
      }

      // Get MusicXML content
      const musicxml = await response.text();

      return {
        success: true,
        musicxml,
        filename: `${request.file.name}.musicxml`
      };

    } catch (error) {
      console.error('OMR conversion failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Conversion timeout (exceeded 2 minutes)',
            details: 'The sheet music image may be too complex or the service is overloaded'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: 'Unknown error during conversion'
      };
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return {
        valid: false,
        error: 'File too large (max 10MB)'
      };
    }

    // Check file type
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const supportedTypes = ['.png', '.jpg', '.jpeg', '.pdf', '.tif', '.tiff'];
    
    if (!supportedTypes.includes(extension)) {
      return {
        valid: false,
        error: `Unsupported file type: ${extension}. Supported: ${supportedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }
}

/**
 * Create OMR client instance from environment variables
 */
export function createOMRClient(): OMRClient {
  const baseUrl = process.env.OMR_SERVICE_URL;
  const token = process.env.OMR_SERVICE_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('OMR service not configured. Check OMR_SERVICE_URL and OMR_SERVICE_TOKEN in .env.local');
  }

  return new OMRClient({
    baseUrl,
    token
  });
}