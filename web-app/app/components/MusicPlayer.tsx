'use client';

import { useEffect, useRef, useState } from 'react';
import { convertMusicXmlForOsmd } from '@/lib/musicxml';

interface MusicPlayerProps {
  musicxml?: string;
}

interface OSMDInstance {
  load: (xml: string) => Promise<void>;
  render: () => Promise<void>;
  zoom: number;
  Sheet?: {
    playbackSettings: unknown;
    musicPartManager: unknown;
    DefaultStartTempoInBpm?: number;
  };
  cursor?: unknown;
  PlaybackManager?: unknown;
}

interface PlaybackManagerInstance {
  DoPlayback: boolean;
  DoPreCount: boolean;
  initialize: (manager: unknown) => void;
  addListener: (listener: unknown) => void;
  reset: () => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  audioPlayer?: { 
    volume: number;
    audioContext?: AudioContext;
  };
  Metronome?: { Enabled: boolean };
}

interface TimingSourceInstance {
  reset: () => void;
  pause: () => void;
  Settings?: { PlaybackSpeed: number };
}

declare global {
  interface Window {
    opensheetmusicdisplay?: {
      OpenSheetMusicDisplay: new (container: HTMLElement, options?: unknown) => OSMDInstance;
      PlaybackManager: new (
        timingSource: TimingSourceInstance,
        metronome?: unknown,
        audioPlayer?: unknown,
        controlPanel?: unknown
      ) => PlaybackManagerInstance;
      LinearTimingSource: new () => TimingSourceInstance;
      BasicAudioPlayer: new () => unknown;
      BackendType: {
        SVG: string;
      };
    };
  }
}

export default function MusicPlayer({ musicxml }: MusicPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const osmdRef = useRef<OSMDInstance | null>(null);
  const playbackManagerRef = useRef<PlaybackManagerInstance | null>(null);
  const timingSourceRef = useRef<TimingSourceInstance | null>(null);
  const [osmdReady, setOsmdReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [tempo, setTempo] = useState(120);
  const [volume, setVolume] = useState(100);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);

  // Load OSMD Extended script
  useEffect(() => {
    if (typeof window === 'undefined' || osmdReady) return;

    const loadOSMDScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.opensheetmusicdisplay) {
          resolve();
          return;
        }

        const existingScript = document.querySelector('script[src="/osmd/opensheetmusicdisplay.min.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load OSMD script')));
          return;
        }

        const script = document.createElement('script');
        script.src = '/osmd/opensheetmusicdisplay.min.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load OSMD script'));
        document.head.appendChild(script);
      });
    };

    const initializeOSMD = async () => {
      try {
        await loadOSMDScript();
        
        if (!window.opensheetmusicdisplay || !containerRef.current) {
          throw new Error('OSMD library not available');
        }

        const OSMD = window.opensheetmusicdisplay.OpenSheetMusicDisplay;
        const BT = window.opensheetmusicdisplay.BackendType;

        const osmd = new OSMD(containerRef.current, {
          autoResize: true,
          backend: BT.SVG,
          drawingParameters: 'default',
          pageFormat: 'Endless', // Single continuous page to prevent awkward measure breaks
          renderSingleHorizontalStaffline: false,
        });

        osmdRef.current = osmd;
        setOsmdReady(true);
      } catch (err: unknown) {
        console.error('Failed to initialize OSMD', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load music display library.';
        setError(errorMessage);
      }
    };

    initializeOSMD();
  }, [osmdReady]);

  // Load and render MusicXML with playback
  useEffect(() => {
    if (!musicxml || !containerRef.current || !osmdRef.current || !osmdReady) return;

    const loadMusic = async () => {
      try {
        setLoading(true);
        setError(null);

        // Process the XML
        const trimmedXml = musicxml.trim();
        let xmlToLoad = trimmedXml;

        if (!trimmedXml.startsWith('<?xml')) {
          const rootMatch = trimmedXml.match(/<(\w+:)?score-partwise|<(\w+:)?score-timewise/);
          if (rootMatch) {
            xmlToLoad = '<?xml version="1.0" encoding="UTF-8"?>\n' + trimmedXml;
            console.log('Added XML declaration to MusicXML');
          } else {
            throw new Error('Invalid MusicXML: could not find a root element.');
          }
        }

        // Convert MusicXML 4.0 to 3.1
        xmlToLoad = convertMusicXmlForOsmd(xmlToLoad);

        // Inject tempo if needed - OSMD Extended requires this in the FIRST measure of the FIRST part
        // Find the first <part> element, then find its first <measure>
        const firstPartMatch = xmlToLoad.match(/<part[^>]*>/);
        if (firstPartMatch) {
          const firstPartStartIndex = xmlToLoad.indexOf(firstPartMatch[0]);
          const firstPartEndIndex = xmlToLoad.indexOf('</part>', firstPartStartIndex);
          
          if (firstPartEndIndex > firstPartStartIndex) {
            const partContent = xmlToLoad.substring(firstPartStartIndex, firstPartEndIndex);
            
            // Now find the first measure within this part
            const firstMeasureMatch = partContent.match(/<measure\b[^>]*>/);
            if (firstMeasureMatch) {
              const measureStartInPart = partContent.indexOf(firstMeasureMatch[0]);
              const measureEndInPart = partContent.indexOf('</measure>', measureStartInPart);
              
              if (measureEndInPart > measureStartInPart) {
                const measureContent = partContent.substring(
                  measureStartInPart + firstMeasureMatch[0].length,
                  measureEndInPart
                );
                
                // Check if THIS specific measure has tempo
                const hasSoundTempo = /<sound\b[^>]*tempo=["'][^"']+["']/.test(measureContent);
                const hasMetronome = /<metronome\b/.test(measureContent);
                
                console.log('First measure tempo check:', { hasSoundTempo, hasMetronome });
                console.log('First measure content (first 2000 chars):', measureContent.substring(0, 2000));
                
                // OSMD Extended needs BOTH metronome AND sound tempo attribute
                // If metronome exists but sound tempo doesn't, we need to add sound tempo
                if (hasMetronome && !hasSoundTempo) {
                  console.log('Has metronome but no sound tempo - attempting to add sound tempo');
                  // Find the <direction> tag that contains the metronome and add sound tempo to it
                  const directionMatch = measureContent.match(/<direction\b[^>]*>[\s\S]*?<\/direction>/);
                  console.log('Direction match found:', !!directionMatch);
                  if (directionMatch) {
                    console.log('Direction content:', directionMatch[0]);
                    const directionIndex = measureContent.indexOf(directionMatch[0]);
                    const absoluteDirectionIndex = firstPartStartIndex + measureStartInPart + firstMeasureMatch[0].length + directionIndex;
                    
                    // Extract the BPM from the metronome if possible
                    const bpmMatch = measureContent.match(/<per-minute>(\d+)<\/per-minute>/);
                    const bpm = bpmMatch ? bpmMatch[1] : '120';
                    console.log('Extracted BPM:', bpm);
                    
                    // Add sound tempo right before the closing </direction> tag
                    const directionEndTag = '</direction>';
                    const directionEndIndex = directionMatch[0].lastIndexOf(directionEndTag);
                    const soundTempo = `\n          <sound tempo="${bpm}"/>`;
                    
                    const updatedDirection = directionMatch[0].substring(0, directionEndIndex) + soundTempo + '\n        ' + directionEndTag;
                    
                    xmlToLoad = xmlToLoad.substring(0, absoluteDirectionIndex) + updatedDirection + xmlToLoad.substring(absoluteDirectionIndex + directionMatch[0].length);
                    console.log(`Added sound tempo="${bpm}" to existing metronome direction`);
                  } else {
                    console.log('ERROR: Could not find direction element even though metronome was detected');
                  }
                }
                // If this first measure doesn't have tempo at all, inject it
                else if (!hasSoundTempo && !hasMetronome) {
                  // Find where to insert - after <attributes> if present
                  const attributesMatch = measureContent.match(/<attributes\b[\s\S]*?<\/attributes>/);
                  let insertPositionInMeasure = firstMeasureMatch[0].length;
                  
                  if (attributesMatch) {
                    insertPositionInMeasure = measureContent.indexOf(attributesMatch[0]) + attributesMatch[0].length;
                  }
                  
                  const absoluteInsertPosition = firstPartStartIndex + measureStartInPart + insertPositionInMeasure;
                  
                  const defaultTempo = `
        <direction placement="above">
          <direction-type>
            <metronome parentheses="no">
              <beat-unit>quarter</beat-unit>
              <per-minute>120</per-minute>
            </metronome>
          </direction-type>
          <sound tempo="120"/>
        </direction>`;
                  
                  xmlToLoad = xmlToLoad.substring(0, absoluteInsertPosition) + defaultTempo + xmlToLoad.substring(absoluteInsertPosition);
                  console.log('Injected default tempo (120 BPM) into first measure of first part');
                } else {
                  console.log('Tempo already present in first measure of first part');
                }
              }
            }
          }
        }

        if (!xmlToLoad.includes('score-partwise') && !xmlToLoad.includes('score-timewise')) {
          throw new Error('Invalid MusicXML: file must contain a root element');
        }

        console.log('Loading MusicXML, length:', xmlToLoad.length);
        
        // Debug: Log the first measure to verify tempo injection
        const debugMeasure = xmlToLoad.match(/<measure\b[^>]*>[\s\S]*?<\/measure>/);
        if (debugMeasure) {
          console.log('First measure preview:', debugMeasure[0].substring(0, 500));
        }

        const osmd = osmdRef.current;
        if (!osmd) throw new Error('OSMD not initialized');

        // Load and render - wrap in try-catch to provide better error handling
        try {
          await osmd.load(xmlToLoad);
          osmd.zoom = zoom;
          await osmd.render();
        } catch (loadError) {
          console.error('OSMD load/render error:', loadError);
          // Try to provide more context about the error
          if (loadError instanceof Error && (loadError.message.includes('TempoInBpm') || loadError.message.includes('incomplete'))) {
            // This is a known OSMD Extended bug - try to continue without detailed tempo info
            console.warn('Tempo calculation error detected, this may affect playback but display should work');
            throw new Error('Failed to fully process the music score. The sheet music may display but playback features might not work correctly. This appears to be related to tempo calculation in the MusicXML file.');
          }
          throw loadError;
        }

        // Initialize playback if available
        if (window.opensheetmusicdisplay?.PlaybackManager) {
          setLoadingInstruments(true);
          const PM = window.opensheetmusicdisplay.PlaybackManager;
          const LTS = window.opensheetmusicdisplay.LinearTimingSource;
          const BAP = window.opensheetmusicdisplay.BasicAudioPlayer;

          const timingSource = new LTS();
          const audioPlayer = new BAP() as { audioContext?: AudioContext; volume: number };
          
          // Optimize audio player settings for better performance
          // Resume audio context if suspended (browser autoplay policy)
          if (audioPlayer.audioContext) {
            const context = audioPlayer.audioContext;
            if (context.state === 'suspended') {
              context.resume();
            }
          }
          
          const playbackManager = new PM(timingSource, undefined, audioPlayer, undefined);

          playbackManager.DoPlayback = true;
          playbackManager.DoPreCount = false;

          timingSource.reset();
          timingSource.pause();
          if (osmd.Sheet?.playbackSettings) {
            timingSource.Settings = osmd.Sheet.playbackSettings as { PlaybackSpeed: number };
          }
          
          if (osmd.Sheet?.musicPartManager) {
            // Initialize will trigger instrument preloading
            await playbackManager.initialize(osmd.Sheet.musicPartManager);
          }
          if (osmd.cursor) {
            playbackManager.addListener(osmd.cursor);
          }
          playbackManager.reset();

          timingSourceRef.current = timingSource;
          playbackManagerRef.current = playbackManager;
          osmd.PlaybackManager = playbackManager;

          // Set initial tempo from the sheet
          if (osmd.Sheet?.DefaultStartTempoInBpm) {
            setTempo(Math.round(osmd.Sheet.DefaultStartTempoInBpm));
          }

          setLoadingInstruments(false);
          console.log('Playback initialized with preloaded instruments');
        }

        setLoading(false);
      } catch (err: unknown) {
        console.error('Failed to render music', err);
        let errorMessage = 'Failed to render music';
        
        if (err instanceof Error) {
          errorMessage = `Error: ${err.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadMusic();
  }, [musicxml, osmdReady, zoom]);

  const handlePlayPause = async () => {
    if (!playbackManagerRef.current) return;

    try {
      if (isPlaying) {
        await playbackManagerRef.current.pause();
        setIsPlaying(false);
      } else {
        await playbackManagerRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const handleStop = () => {
    if (!playbackManagerRef.current) return;
    
    playbackManagerRef.current.pause();
    playbackManagerRef.current.reset();
    
    // Clear audio context to prevent memory buildup
    if (playbackManagerRef.current.audioPlayer?.audioContext) {
      const context = playbackManagerRef.current.audioPlayer.audioContext;
      // Stop all audio nodes
      if (context.state === 'running') {
        context.suspend().then(() => {
          setTimeout(() => context.resume(), 100); // Resume for next playback
        });
      }
    }
    
    setIsPlaying(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    if (timingSourceRef.current?.Settings) {
      timingSourceRef.current.Settings.PlaybackSpeed = newTempo / 120; // Adjust relative to default 120 BPM
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (playbackManagerRef.current?.audioPlayer) {
      playbackManagerRef.current.audioPlayer.volume = newVolume / 100;
    }
  };

  const toggleMetronome = () => {
    if (playbackManagerRef.current?.Metronome) {
      const newState = !metronomeEnabled;
      playbackManagerRef.current.Metronome.Enabled = newState;
      setMetronomeEnabled(newState);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Instrument Loading Indicator */}
      {loadingInstruments && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-blue-700 font-medium">Preloading instruments for smooth playback...</span>
        </div>
      )}
      
      {/* Playback Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Play/Pause/Stop */}
          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              disabled={!playbackManagerRef.current || loading || loadingInstruments}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <>
                  <span>⏸</span>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={handleStop}
              disabled={!playbackManagerRef.current || loading || loadingInstruments}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              title="Stop"
            >
              ⏹ Stop
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
              title="Zoom Out"
            >
              🔍−
            </button>
            <span className="text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
              title="Zoom In"
            >
              🔍+
            </button>
          </div>

          {/* Tempo Control */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Tempo:</label>
            <input
              type="range"
              min="40"
              max="240"
              value={tempo}
              onChange={(e) => handleTempoChange(parseInt(e.target.value))}
              disabled={!playbackManagerRef.current}
              className="w-32"
            />
            <span className="text-sm min-w-[50px]">{tempo} BPM</span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Volume:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              disabled={!playbackManagerRef.current}
              className="w-32"
            />
            <span className="text-sm min-w-[40px]">{volume}%</span>
          </div>

          {/* Metronome Toggle */}
          <button
            onClick={toggleMetronome}
            disabled={!playbackManagerRef.current}
            className={`px-4 py-2 rounded-lg transition-colors ${
              metronomeEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } disabled:bg-gray-300 disabled:text-gray-500`}
            title="Toggle Metronome"
          >
            🎵 Metronome
          </button>
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-purple-600">Loading music...</div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      {/* Sheet Music Display */}
      <div 
        ref={containerRef} 
        className="w-full overflow-x-auto bg-white rounded-lg shadow-sm p-4"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}

