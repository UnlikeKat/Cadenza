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
        
        tk.setOptions({
          scale: 40,
          pageWidth: Math.max(containerWidth - 40, 1600), // Subtract padding, min 1600
          adjustPageHeight: true,
          breaks: 'auto',
        });

        tk.loadData(musicxml);
        const svg = tk.renderToSVG(1);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          
          // Make SVG responsive
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
  }, [musicxml]);

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
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handlePlay}
          disabled={isPlaying || loading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition-colors"
        >
          {isPlaying ? '⏸️ Playing...' : '▶️ Play'}
        </button>
        
        <button
          onClick={handleStop}
          disabled={!isPlaying}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition-colors"
        >
          ⏹️ Stop
        </button>
      </div>

      {/* Sheet Music Display */}
      <div className="bg-white rounded-lg p-4 overflow-x-auto">
        {loading && (
          <div className="text-center text-gray-500 py-8">
            Loading music notation...
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-500 py-8">
            {error}
          </div>
        )}
        
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Attribution */}
      <div className="text-xs text-gray-500 mt-4 text-center">
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