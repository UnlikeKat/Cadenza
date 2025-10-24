// TYPE DEFINITIONS: These define the "shape" of our data
// Think of them as blueprints that TypeScript uses to check our code

// What an uploaded sheet music file looks like
export interface UploadedSheet {
  id: string;              // Unique identifier (like "sheet_123")
  originalName: string;    // Original filename ("beethoven-moonlight.jpg")
  uploadDate: Date;        // When it was uploaded
  fileSize: number;        // Size in bytes
  fileHash: string;        // SHA-256 hash of file
  status: 'pending' | 'processing' | 'completed' | 'failed';  // Current state
  cachedConversionId?: string;   // Link to cached result if exists
}

// What a conversion result looks like
export interface ConversionResult {
  success: boolean;        // Did conversion work?
  musicXmlPath?: string;   // Path to generated MusicXML file (if successful)
  error?: string;          // Error message (if failed)
  processingTime?: number; // How long it took (in seconds)
  fromCache: boolean;      // Was this from cache?
  cacheHit?: boolean;      // Alias for clarity
  isDuplicate?: boolean;  // Is this a duplicate upload?
}

// User's MIDI input event
export interface MidiNote {
  note: number;            // MIDI note number (60 = Middle C)
  velocity: number;        // How hard key was pressed (0-127)
  timestamp: number;       // When it was pressed
}

// Cached conversion entry
export interface CachedConversion {
  id: string;                    // Database ID
  musicContentHash: string;      // Hash of MusicXML content (for deduplication)
  originalFilename: string;      // First filename uploaded (for reference)
  musicXmlPath: string;          // Path to cached MusicXML file
  createdAt: Date;               // When first converted
  lastAccessedAt: Date;          // When last requested (for cleanup)
  accessCount: number;           // How many times used (analytics!)
  fileSize: number;              // Original image size
  conversionTime: number;        // How long HOMR took (seconds)
  isPublic: boolean;             // Is this shared publicly?

  // Library-specific fields
  qualityScore?: number;         // User-rated quality (1-5 stars)
  reportCount?: number;          // Number of quality issue reports
  metadata?: {                   // Optional metadata (extracted or user-provided)
    composer?: string;
    title?: string;
    instrument?: string;
    tags?: string[];             // e.g., ['classical', 'baroque', 'piano']
    pageCount?: number;          // Number of pages
    verified: boolean;           // User confirmed accuracy
  };

  /**
 * Analytics for cache performance
 */

}

export interface CacheAnalytics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageConversionTime: number;
  averageCacheRetrievalTime: number;
  timeSaved: number;
}