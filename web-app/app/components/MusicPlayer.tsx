'use client';

import { useEffect, useRef, useState } from 'react';
import verovio from 'verovio';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

interface MusicPlayerProps {
  musicxml?: string;
  midiFile?: File;
}

export default function MusicPlayer({ musicxml, midiFile }: MusicPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(35); // Zoom scale (20-100) - lower = more measures per line
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [instrumentLoading, setInstrumentLoading] = useState(false);
  const pianoRef = useRef<Tone.Sampler | null>(null);
  const scheduledPartsRef = useRef<Tone.Part[]>([]);
  const verovioRef = useRef<InstanceType<typeof verovio.toolkit> | null>(null);

  // Initialize high-quality piano sampler
  useEffect(() => {
    setInstrumentLoading(true);
    
    // Create a high-quality piano sampler with multiple velocity layers
    pianoRef.current = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3"
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      onload: () => {
        setInstrumentLoading(false);
      }
    }).toDestination();

    // Add reverb for more realistic sound
    const reverb = new Tone.Reverb({
      decay: 2.5,
      wet: 0.3
    }).toDestination();
    
    pianoRef.current.connect(reverb);

    return () => {
      pianoRef.current?.dispose();
      reverb.dispose();
    };
  }, []);

  // Render MusicXML with Verovio
  useEffect(() => {
    if (!musicxml || !containerRef.current) return;

    const renderMusic = () => {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        
        const tk = new verovio.toolkit();
        verovioRef.current = tk;
        
        // Get the actual container width (wait for layout to be ready)
        const container = containerRef.current.parentElement;
        const containerWidth = container?.clientWidth || 1600;
        
        // Calculate pageWidth based on zoom - smaller zoom = more measures per line
        // Higher zoom = fewer measures per line (wraps to next line)
        const baseWidth = Math.max(containerWidth - 40, 1200);
        const adjustedPageWidth = Math.floor(baseWidth * (50 / zoom));
        
        tk.setOptions({
          scale: zoom, // Use zoom as scale - this affects note size
          pageWidth: adjustedPageWidth, // Adjust page width inversely to zoom
          adjustPageHeight: true,
          breaks: 'auto', // Auto break measures to fit width
        });

        tk.loadData(musicxml);
        
        // Get the total number of pages
        const pageCount = tk.getPageCount();
        
        // Render all pages and combine them
        let allSvg = '';
        for (let i = 1; i <= pageCount; i++) {
          allSvg += tk.renderToSVG(i);
        }
        
        if (containerRef.current) {
          containerRef.current.innerHTML = allSvg;
          
          // Make all SVGs fill the width for responsive display
          const svgElements = containerRef.current.querySelectorAll('svg');
          svgElements.forEach((svgElement: Element) => {
            if (svgElement instanceof SVGElement) {
              svgElement.style.width = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.display = 'block';
              svgElement.style.marginBottom = '1rem';
            }
          });
        }
        
        setLoading(false);
      } catch {
        setError('Failed to render music notation');
        setLoading(false);
      }
    };

    // Wait a tick for the DOM to be ready
    setTimeout(renderMusic, 0);
  }, [musicxml, zoom]);

  // Play MusicXML or MIDI with high-quality piano
  const handlePlay = async () => {
    if (!pianoRef.current || instrumentLoading) return;

    try {
      setIsPlaying(true);
      await Tone.start(); // Start audio context

      let midi: Midi;

      if (midiFile) {
        // If we have a MIDI file, use it directly
        const arrayBuffer = await midiFile.arrayBuffer();
        midi = new Midi(arrayBuffer);
      } else if (musicxml && verovioRef.current) {
        // Convert MusicXML to MIDI using Verovio
        const midiBase64 = verovioRef.current.renderToMIDI() as string;
        const midiData = Uint8Array.from(atob(midiBase64), c => c.charCodeAt(0));
        midi = new Midi(midiData.buffer);
      } else {
        setError('No music data to play');
        setIsPlaying(false);
        return;
      }

      // Clear any previously scheduled parts
      scheduledPartsRef.current.forEach(part => part.dispose());
      scheduledPartsRef.current = [];

      // Schedule all tracks
      midi.tracks.forEach(track => {
        if (track.notes.length === 0) return; // Skip empty tracks

        const part = new Tone.Part((time, note) => {
          pianoRef.current?.triggerAttackRelease(
            note.name,
            note.duration,
            time,
            note.velocity
          );
        }, track.notes.map(note => ({
          time: note.time,
          name: note.name,
          duration: note.duration,
          velocity: note.velocity
        })));

        part.start(0);
        scheduledPartsRef.current.push(part);
      });

      // Start transport
      Tone.Transport.start();

      // Stop playing after duration
      setTimeout(() => {
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        scheduledPartsRef.current.forEach(part => {
          part.stop();
          part.dispose();
        });
        scheduledPartsRef.current = [];
        setIsPlaying(false);
      }, midi.duration * 1000 + 1000); // Add 1s buffer

    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play music');
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    scheduledPartsRef.current.forEach(part => {
      part.stop();
      part.dispose();
    });
    scheduledPartsRef.current = [];
    setIsPlaying(false);
  };

  return (
    <div className="bg-purple-900/30 rounded-lg p-4 sm:p-6 border border-purple-400/30">
      {/* Controls */}
      <div className="mb-4 sm:mb-6 flex gap-2 sm:gap-4 flex-wrap items-center">
        <button
          onClick={handlePlay}
          disabled={isPlaying || loading || instrumentLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-purple-900/50 px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors"
          title={instrumentLoading ? 'Loading piano...' : isPlaying ? 'Playing...' : 'Play'}
        >
          {instrumentLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
          <span className="hidden sm:inline ml-2">
            {instrumentLoading ? 'Loading...' : isPlaying ? 'Playing...' : 'Play'}
          </span>
        </button>
        
        <button
          onClick={handleStop}
          disabled={!isPlaying}
          className="bg-red-600 hover:bg-red-700 disabled:bg-purple-900/50 px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors"
          title="Stop"
        >
          ⏹️
          <span className="hidden sm:inline ml-2">Stop</span>
        </button>

        {/* Zoom Controls */}
        <button
          onClick={() => setShowZoomSlider(!showZoomSlider)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          title="Adjust Zoom"
        >
          🔍
          <span className="hidden sm:inline">Zoom</span>
        </button>
      </div>

      {/* Zoom Slider */}
      {showZoomSlider && (
        <div className="mb-4 sm:mb-6 bg-purple-900/50 rounded-lg p-3 sm:p-4 border border-purple-400/30">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <span className="text-white text-sm font-semibold">Size: {zoom}</span>
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setZoom(Math.max(20, zoom - 5))}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm transition-colors flex-shrink-0"
              >
                −
              </button>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-2 bg-purple-300/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <button
                onClick={() => setZoom(Math.min(100, zoom + 5))}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm transition-colors flex-shrink-0"
              >
                +
              </button>
            </div>
            <button
              onClick={() => setZoom(35)}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm transition-colors flex-shrink-0"
            >
              Reset
            </button>
          </div>
          <p className="text-xs text-purple-300 mt-2">
            Lower values fit more measures per line • Higher values make notes larger
          </p>
        </div>
      )}

      {/* Sheet Music Display */}
      <div className="bg-white rounded-lg p-4 overflow-y-auto overflow-x-hidden border-2 border-purple-400/50 max-h-[80vh] touch-pan-y">
        {loading && (
          <div className="text-center text-purple-600 py-8">
            Loading music notation...
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-500 py-8">
            {error}
          </div>
        )}
        
        <div ref={containerRef} className="w-full min-h-[200px]" />
      </div>

      {/* Attribution */}
      <div className="text-xs text-purple-300 mt-4 text-center">
        Rendered with{' '}
        <a 
          href="https://www.verovio.org" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Verovio
        </a>
        {' '}(LGPL 3.0)
      </div>
    </div>
  );
}