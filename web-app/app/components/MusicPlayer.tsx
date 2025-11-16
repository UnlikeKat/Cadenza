'use client';

import { useEffect, useRef, useState } from 'react';

interface MusicPlayerProps {
  musicxml?: string;
  midiFile?: File;
}

export default function MusicPlayer({ musicxml, midiFile: _midiFile }: MusicPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const osmdRef = useRef<unknown>(null);
  const playbackManagerRef = useRef<unknown>(null);
  const timingSourceRef = useRef<unknown>(null);
  const [osmdReady, setOsmdReady] = useState(false);

  // Load OSMD dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const loadOSMD = async () => {
      try {
        setLoading(true);
        setError(null);

        // Dynamic import of OSMD modules
        const OSMDModule = await import('@osmd/OpenSheetMusicDisplay/OpenSheetMusicDisplay');
        const PlaybackModule = await import('@osmd/Playback');
        const OptionsModule = await import('@osmd/OpenSheetMusicDisplay/OSMDOptions');

        if (!OSMDModule?.OpenSheetMusicDisplay || !PlaybackModule?.PlaybackManager) {
          throw new Error('OSMD library modules not found. Please ensure OSMD is built.');
        }

        const OSMD = OSMDModule.OpenSheetMusicDisplay;
        const PM = PlaybackModule.PlaybackManager;
        const LTS = PlaybackModule.LinearTimingSource;
        const BAP = PlaybackModule.BasicAudioPlayer;
        const BT = OptionsModule.BackendType;

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
        const errorMessage = err instanceof Error ? err.message : 'Failed to load music display library. Please ensure OSMD is built in osmd-extended-master folder.';
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadOSMD();
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
        
        // Load MusicXML
        await osmd.load(musicxml);
        
        // Initialize playback if sheet is loaded
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
        
        // Render the sheet music
        await osmd.render();

        setLoading(false);
      } catch (err: unknown) {
        console.error('Failed to render music', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to render music notation';
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
                {isPlaying ? '⏸️' : '▶️'}
              </span>
            </button>
            
            <button
              onClick={handleStop}
              disabled={!isPlaying || loading}
              className="p-2 rounded-full bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900/50 disabled:cursor-not-allowed transition-colors"
              title="Stop"
            >
              <span className="text-white text-xl">⏹️</span>
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
