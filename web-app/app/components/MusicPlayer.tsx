'use client';

import { useEffect, useRef, useState } from 'react';
import { convertMusicXmlForOsmd } from '@/lib/musicxml';

interface MusicPlayerProps {
  musicxml?: string;
  midiFile?: File;
}

declare global {
  interface Window {
    opensheetmusicdisplay?: {
      OpenSheetMusicDisplay: new (container: HTMLElement, options?: unknown) => {
        load: (xml: string) => Promise<void>;
        render: () => Promise<void>;
        Sheet?: {
          playbackSettings: unknown;
          musicPartManager: unknown;
        };
        cursor?: unknown;
        PlaybackManager?: unknown;
      };
      PlaybackManager: new (timingSource: unknown, metronome?: unknown, audioPlayer?: unknown, controlPanel?: unknown) => {
        DoPlayback: boolean;
        DoPreCount: boolean;
        initialize: (manager: unknown) => void;
        addListener: (listener: unknown) => void;
        reset: () => void;
        play: () => Promise<void>;
        pause: () => Promise<void>;
      };
      LinearTimingSource: new () => {
        reset: () => void;
        pause: () => void;
        Settings: unknown;
      };
      BasicAudioPlayer: new () => unknown;
      BackendType: {
        SVG: string;
      };
    };
  }
}

export default function MusicPlayer({ musicxml }: MusicPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const osmdRef = useRef<unknown>(null);
  const playbackManagerRef = useRef<unknown>(null);
  const timingSourceRef = useRef<unknown>(null);
  const [osmdReady, setOsmdReady] = useState(false);
  const scriptLoadedRef = useRef(false);

  // Load OSMD script dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || scriptLoadedRef.current) return;

    const loadOSMDScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if already loaded
        if (window.opensheetmusicdisplay) {
          resolve();
          return;
        }

        // Check if script is already in the DOM
        const existingScript = document.querySelector('script[src="/osmd/opensheetmusicdisplay.min.js"]');
        if (existingScript) {
          // Wait for it to load
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load OSMD script')));
          return;
        }

        // Create and load script
        const script = document.createElement('script');
        script.src = '/osmd/opensheetmusicdisplay.min.js';
        script.async = true;
        script.onload = () => {
          scriptLoadedRef.current = true;
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load OSMD script'));
        };
        document.head.appendChild(script);
      });
    };

    const initializeOSMD = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load the script
        await loadOSMDScript();

        if (!window.opensheetmusicdisplay || !containerRef.current) {
          throw new Error('OSMD library not available after loading script.');
        }

        const OSMD = window.opensheetmusicdisplay.OpenSheetMusicDisplay;
        const PM = window.opensheetmusicdisplay.PlaybackManager;
        const LTS = window.opensheetmusicdisplay.LinearTimingSource;
        const BAP = window.opensheetmusicdisplay.BasicAudioPlayer;
        const BT = window.opensheetmusicdisplay.BackendType;

        // Create OSMD instance
        const osmd = new OSMD(containerRef.current, {
          autoResize: true,
          backend: BT.SVG,
          disableCursor: false,
          drawingParameters: 'default',
          drawPartNames: true,
          drawFingerings: true,
          coloringEnabled: true,
        });

        osmdRef.current = osmd;

        // Initialize playback manager
        const timingSource = new LTS();
        const audioPlayer = new BAP();
        const playbackManager = new PM(timingSource, undefined, audioPlayer, undefined);
        
        playbackManager.DoPlayback = true;
        playbackManager.DoPreCount = false;
        
        timingSourceRef.current = timingSource;
        playbackManagerRef.current = playbackManager;
        setOsmdReady(true);

        setLoading(false);
      } catch (err: unknown) {
        console.error('Failed to load OSMD', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load music display library.';
        setError(errorMessage);
        setLoading(false);
      }
    };

    initializeOSMD();
  }, []);

  // Load and render MusicXML
  useEffect(() => {
    if (!musicxml || !containerRef.current || !osmdRef.current || !osmdReady) return;

    const loadMusic = async () => {
      try {
        setLoading(true);
        setError(null);

        const osmd = osmdRef.current as {
          load: (xml: string) => Promise<void>;
          render: () => Promise<void>;
          Sheet?: {
            playbackSettings: unknown;
            musicPartManager: unknown;
          };
          cursor?: unknown;
          PlaybackManager?: unknown;
        };
        
        try {
          if (osmdRef.current && musicxml) {
            const trimmedXml = musicxml.trim();
            let xmlToLoad = trimmedXml;

            if (!trimmedXml.startsWith('<?xml')) {
              const rootMatch = trimmedXml.match(/<(\w+:)?score-partwise|<(\w+:)?score-timewise/);
              if (rootMatch) {
                xmlToLoad = '<?xml version="1.0" encoding="UTF-8"?>\n' + trimmedXml;
                console.log('Added XML declaration to MusicXML');
              } else {
                throw new Error('Invalid MusicXML: could not find a root score-partwise or score-timewise element.');
              }
            }

            // Convert MusicXML 4.0 to 3.1 if needed
            xmlToLoad = convertMusicXmlForOsmd(xmlToLoad);

            if (!xmlToLoad.includes('score-partwise') && !xmlToLoad.includes('score-timewise')) {
              throw new Error('Invalid MusicXML: file must contain a score-partwise or score-timewise root element');
            }
            
            console.log('Loading MusicXML, length:', xmlToLoad.length);
            console.log('First 1000 chars:', xmlToLoad.substring(0, 1000));
            
            // Load MusicXML with error handling
            try {
              await osmd.load(xmlToLoad);
            } catch (loadError: unknown) {
              const errorMsg = loadError instanceof Error ? loadError.message : String(loadError);
              console.error('OSMD load failed:', errorMsg);
              
              // This is a known issue with OSMD extended version and MusicXML 4.0 files
              // The TemposCalculator has a bug where it tries to access TempoInBpm on undefined objects
              if (errorMsg.includes('TempoInBpm') || errorMsg.includes('incomplete')) {
                throw new Error(
                  'OSMD compatibility issue: This MusicXML file (version 4.0 from MuseScore) appears to have a compatibility issue with the OSMD extended library. ' +
                  'The error occurs during tempo calculation. This may be a bug in OSMD\'s TemposCalculator. ' +
                  'Please try exporting the file as MusicXML 3.1 or 3.0, or contact the OSMD extended repository maintainers.'
                );
              }
              throw loadError;
            }
            
            // Render the sheet music first
            await osmd.render();
            
            // Initialize playback if sheet is loaded (after render)
            if (osmd.Sheet && playbackManagerRef.current && timingSourceRef.current) {
              const playbackManager = playbackManagerRef.current as {
                initialize: (manager: unknown) => void;
                addListener: (cursor: unknown) => void;
                reset: () => void;
              };
              const timingSource = timingSourceRef.current as {
                reset: () => void;
                pause: () => void;
                Settings: unknown;
              };
              
              timingSource.reset();
              timingSource.pause();
              timingSource.Settings = osmd.Sheet.playbackSettings;
              playbackManager.initialize(osmd.Sheet.musicPartManager);
              if (osmd.cursor) {
                playbackManager.addListener(osmd.cursor);
              }
              playbackManager.reset();
              
              osmd.PlaybackManager = playbackManager;
            }
          }
        } catch (err: unknown) {
          console.error('Failed to render music', err);
          let errorMessage = 'Failed to render music notation';
          
          if (err instanceof Error) {
            errorMessage = err.message;
            
            // Provide specific error messages for known issues
            if (err.message.includes('TempoInBpm') || err.message.includes('OSMD compatibility')) {
              errorMessage = err.message; // Use the detailed message we set
            } else if (err.message.includes('incomplete') || err.message.includes('could not be loaded')) {
              errorMessage = 'The MusicXML file could not be loaded. This may be due to:\n' +
                'Ã¢â‚¬Â¢ Compatibility issues with MusicXML 4.0\n' +
                'Ã¢â‚¬Â¢ Missing or invalid tempo information\n' +
                'Ã¢â‚¬Â¢ A bug in the OSMD library\n\n' +
                'Try exporting your file as MusicXML 3.1 or 3.0 format.';
            } else if (err.message.includes('duration is not valid')) {
              errorMessage = 'Invalid duration found in MusicXML. The file may be corrupted or use unsupported features.';
            }
          }
          
          setError(errorMessage);
          setLoading(false);
        }

        setLoading(false);
      } catch (err: unknown) {
        console.error('Failed to render music', err);
        let errorMessage = 'Failed to render music notation';
        
        if (err instanceof Error) {
          errorMessage = err.message;
          
          // Provide specific error messages for known issues
          if (err.message.includes('TempoInBpm') || err.message.includes('OSMD compatibility')) {
            errorMessage = err.message; // Use the detailed message we set
          } else if (err.message.includes('incomplete') || err.message.includes('could not be loaded')) {
            errorMessage = 'The MusicXML file could not be loaded. This may be due to:\n' +
              'Ã¢â‚¬Â¢ Compatibility issues with MusicXML 4.0\n' +
              'Ã¢â‚¬Â¢ Missing or invalid tempo information\n' +
              'Ã¢â‚¬Â¢ A bug in the OSMD library\n\n' +
              'Try exporting your file as MusicXML 3.1 or 3.0 format.';
          } else if (err.message.includes('duration is not valid')) {
            errorMessage = 'Invalid duration found in MusicXML. The file may be corrupted or use unsupported features.';
          }
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadMusic();
  }, [musicxml, osmdReady]);

  const handlePlay = async () => {
    if (playbackManagerRef.current) {
      try {
        const playbackManager = playbackManagerRef.current as {
          play: () => Promise<void>;
        };
        await playbackManager.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback error', err);
        setError('Failed to start playback');
      }
    }
  };

  const handlePause = async () => {
    if (playbackManagerRef.current) {
      try {
        const playbackManager = playbackManagerRef.current as {
          pause: () => Promise<void>;
        };
        await playbackManager.pause();
        setIsPlaying(false);
      } catch (err) {
        console.error('Pause error', err);
      }
    }
  };

  const handleStop = () => {
    if (playbackManagerRef.current) {
      try {
        const playbackManager = playbackManagerRef.current as {
          reset: () => void;
        };
        playbackManager.reset();
        setIsPlaying(false);
      } catch (err) {
        console.error('Stop error', err);
      }
    }
  };

  return (
    <div>
      {/* Sheet Music Display */}
      <div className="bg-white rounded-lg p-4 border-2 border-purple-400/50 max-h-[80vh] relative overflow-hidden">
        <div 
          className="overflow-y-auto overflow-x-hidden h-full scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {loading && (
            <div className="text-center text-purple-600 py-8">
              Loading music notation...
            </div>
          )}
          
          {error && (
            <div className="text-center text-red-500 py-8 px-4">
              <p className="font-semibold mb-2">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <div ref={containerRef} className="w-full min-h-[200px]" />
        </div>

        {/* Playback Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-purple-900/80 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-400/50 shadow-lg flex items-center gap-3">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={loading || !musicxml || !!error || !osmdReady}
              className="p-2 rounded-full bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900/50 disabled:cursor-not-allowed transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="text-white text-xl">
                {isPlaying ? 'Ã¢ÂÂ¸Ã¯Â¸Â' : 'Ã¢â€“Â¶Ã¯Â¸Â'}
              </span>
            </button>
            
            <button
              onClick={handleStop}
              disabled={!isPlaying || loading}
              className="p-2 rounded-full bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900/50 disabled:cursor-not-allowed transition-colors"
              title="Stop"
            >
              <span className="text-white text-xl">Ã¢ÂÂ¹Ã¯Â¸Â</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSS for hiding scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

