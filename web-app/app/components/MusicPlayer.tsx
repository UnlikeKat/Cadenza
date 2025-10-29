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
  const synthRef = useRef<Tone.PolySynth | null>(null);

  // Initialize Tone.js synthesizer
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    return () => {
      synthRef.current?.dispose();
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
        const svg = tk.renderToSVG(1);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          
          // Make SVG fill the width for responsive display
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = 'auto';
          }
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

  // Play MIDI
  const playMidi = async (file: File) => {
    if (!synthRef.current) return;

    try {
      setIsPlaying(true);
      await Tone.start(); // Start audio context

      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      // Schedule all notes
      const now = Tone.now();
      
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          synthRef.current?.triggerAttackRelease(
            note.name,
            note.duration,
            now + note.time,
            note.velocity
          );
        });
      });

      // Stop playing after duration
      setTimeout(() => {
        setIsPlaying(false);
      }, midi.duration * 1000);

    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play MIDI file');
      setIsPlaying(false);
    }
  };

  const handlePlay = () => {
    if (midiFile) {
      playMidi(midiFile);
    }
  };

  const handleStop = () => {
    synthRef.current?.releaseAll();
    setIsPlaying(false);
  };

  return (
    <div className="bg-purple-900/30 rounded-lg p-4 sm:p-6 border border-purple-400/30">
      {/* Controls */}
      <div className="mb-4 sm:mb-6 flex gap-2 sm:gap-4 flex-wrap items-center">
        <button
          onClick={handlePlay}
          disabled={isPlaying || loading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-purple-900/50 px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors"
          title={isPlaying ? 'Playing...' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
          <span className="hidden sm:inline ml-2">{isPlaying ? 'Playing...' : 'Play'}</span>
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