import WebMscore from 'webmscore';

export class WebMscoreManager {
  private static instance: WebMscoreManager;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private sfData: Uint8Array | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of WebMscoreManager.
   */
  public static getInstance(): WebMscoreManager {
    if (!WebMscoreManager.instance) {
      WebMscoreManager.instance = new WebMscoreManager();
    }
    return WebMscoreManager.instance;
  }

  /**
   * Initialize the WebMscore library.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    console.log('[WebMscoreManager] Initializing official WebMscore package...');
    this.initPromise = (async () => {
      try {
        // Wait for the WebMscore runtime to be ready
        await WebMscore.ready;
        console.log('[WebMscoreManager] WebMscore ready');

        // Load high-quality soundfont
        try {
          console.log('[WebMscoreManager] Loading high-quality MS Basic soundfont...');
          const sfResponse = await fetch('/soundfonts/MS_Basic.sf3');
          if (sfResponse.ok) {
            const arrayBuffer = await sfResponse.arrayBuffer();
            this.sfData = new Uint8Array(arrayBuffer);
            console.log('[WebMscoreManager] High-quality soundfont fetched and stored');
          } else {
            console.warn('[WebMscoreManager] Failed to fetch soundfont. Audio may be limited.');
          }
        } catch (sfErr) {
          console.error('[WebMscoreManager] Soundfont loading error:', sfErr);
        }

        this.isInitialized = true;
      } catch (error) {
        this.initPromise = null;
        console.error('Failed to initialize WebMscore:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Preprocess MusicXML to remove hardcoded layout constraints.
   */
  private preprocessMusicXML(data: Uint8Array): Uint8Array {
    try {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let xmlString = decoder.decode(data);

      const originalLength = xmlString.length;
      
      // Remove system breaks and page breaks
      // These are often responsible for uneven measure distribution on web containers
      xmlString = xmlString.replace(/<print[^>]*new-system="yes"[^>]*>/g, (match) => {
        return match.replace(/new-system="yes"/, 'new-system="no"');
      });
      xmlString = xmlString.replace(/<print[^>]*new-page="yes"[^>]*>/g, (match) => {
        return match.replace(/new-page="yes"/, 'new-page="no"');
      });

      if (xmlString.length !== originalLength || xmlString.includes('new-system="no"')) {
        console.log('[WebMscoreManager] MusicXML preprocessed: hardcoded breaks disabled.');
        return encoder.encode(xmlString);
      }
      return data;
    } catch (err) {
      console.warn('[WebMscoreManager] Failed to preprocess MusicXML:', err);
      return data;
    }
  }

  /**
   * Load a score from a Uint8Array.
   */
  public async loadScore(data: Uint8Array, format: string): Promise<WebMscore | null> {
    await this.init();
    
    let currentData = data;
    let currentFormat = format;

    // Use remote conversion for MSCZ if enabled or as a first choice
    if (format === 'mscz') {
      console.log('[WebMscoreManager] Attempting remote conversion for MSCZ...');
      try {
        const response = await fetch('/api/mscz/mxml', {
          method: 'POST',
          body: data as any,
        });

        if (response.ok) {
          const mxmlData = await response.arrayBuffer();
          currentData = new Uint8Array(mxmlData);
          currentFormat = 'xml';
          console.log('[WebMscoreManager] Remote conversion success. Loading as XML.');
        } else {
          console.warn('[WebMscoreManager] Remote conversion failed, falling back to local engine');
        }
      } catch (error) {
        console.error('[WebMscoreManager] Remote conversion error:', error);
        // Fallback to local
      }
    }

    try {
      // Preprocess MusicXML to allow dynamic layout (after potential conversion)
      if (currentFormat === 'xml' || currentFormat === 'musicxml') {
        currentData = this.preprocessMusicXML(currentData);
      }

      console.log(`[WebMscoreManager] Loading ${currentFormat} score into local engine...`);
      const score = await WebMscore.load(currentFormat as any, currentData);
      
      // Apply soundfont to the score instance if available
      if (this.sfData) {
        console.log('[WebMscoreManager] Setting soundfont on score instance...');
        // Use a copy (slice) to prevent buffer detachment on subsequent loads
        await score.setSoundFont(new Uint8Array(this.sfData.slice(0)));
      }

      return score;
    } catch (error) {
      console.error('Failed to load score:', error);
      throw error;
    }
  }

  /**
   * Clean up a WebMscore instance.
   */
  public destroy(score: WebMscore): void {
    if (score && typeof score.destroy === 'function') {
      score.destroy();
    }
  }
}

export const webMscoreManager = WebMscoreManager.getInstance();
