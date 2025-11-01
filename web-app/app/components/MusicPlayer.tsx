'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import verovio from 'verovio';
import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';

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
  const samplerRef = useRef<Tone.Sampler | null>(null);

  type TonePartHandle = Tone.Part;
  const scheduledPartsRef = useRef<TonePartHandle[]>([]);
  const verovioRef = useRef<InstanceType<typeof verovio.toolkit> | null>(null);
  const noteElementsRef = useRef<Element[]>([]);
  const fallbackNoteIndexRef = useRef(0);
  const stopTimeoutRef = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const disposeFxNodes = () => {
    if (samplerRef.current) {
      samplerRef.current.dispose();
      samplerRef.current = null;
    }
  };

  // Ensure the Web Audio context unlocks on the first user gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const unlock = async () => {
      if (cancelled) return;
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const ensureSampler = useCallback(async () => {
    if (samplerRef.current) {
      return samplerRef.current;
    }

    if (typeof window === 'undefined') {
      throw new Error('Audio engine is not available during server rendering');
    }

    setInstrumentLoading(true);
    setError(null);

    try {
      // Create a high-quality piano sampler with Salamander Grand Piano samples
      // Using a subset of notes for faster loading while maintaining quality
      const sampler = new Tone.Sampler({
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
        baseUrl: "https://tonejs.github.io/audio/salamander/"
      }).toDestination();

      sampler.volume.value = -8;

      await Tone.loaded();
      samplerRef.current = sampler;
      setInstrumentLoading(false);
      return sampler;
    } catch (err) {
      console.error('Failed to load piano samples', err);
      setError('Failed to load piano samples');
      setInstrumentLoading(false);
      throw err;
    }
  }, []);

  // Not used anymore - we use a vertical line indicator instead
  const applyHighlightToElement = (element: Element, collector: Set<Element>) => {
    collector.add(element);
  };

  const clearHighlightedNotes = () => {
    // Not needed anymore - vertical line indicator doesn't modify notes
  };

  // Update the vertical line position based on note position
  const updateOverlayPosition = (elements: Element[]) => {
    const overlay = overlayRef.current;
    const wrapper = wrapperRef.current;

    if (!overlay || !wrapper || elements.length === 0) {
      if (overlay) {
        overlay.style.opacity = '0';
      }
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const rects = elements
      .filter(el => 'getBoundingClientRect' in el && typeof el.getBoundingClientRect === 'function')
      .map(el => el.getBoundingClientRect());

    if (rects.length === 0) {
      overlay.style.opacity = '0';
      return;
    }

    // Calculate the center X position of the notes
    const minLeft = Math.min(...rects.map(r => r.left));
    const maxRight = Math.max(...rects.map(r => r.right));
    const centerX = (minLeft + maxRight) / 2;
    
    // Position a thin vertical line at the center
    const lineWidth = 3;
    const wrapperHeight = wrapper.scrollHeight || wrapperRect.height;
    const leftPos = centerX - wrapperRect.left - lineWidth / 2;
    const clampedLeft = Math.max(0, Math.min(leftPos, wrapperRect.width - lineWidth));

    overlay.style.left = `${clampedLeft}px`;
    overlay.style.top = '0px';
    overlay.style.width = `${lineWidth}px`;
    overlay.style.height = `${wrapperHeight}px`;
    overlay.style.opacity = '1';
  };

  // Smooth scroll to keep the playback line visible without jumping
  const scrollHighlightedIntoView = (elements: Element[]) => {
    if (elements.length === 0) return;

    const scrollHost = wrapperRef.current?.parentElement;
    if (!scrollHost) return;

    const target = elements[0];
    if (!('getBoundingClientRect' in target) || typeof target.getBoundingClientRect !== 'function') {
      return;
    }

    const noteRect = target.getBoundingClientRect();
    const containerRect = scrollHost.getBoundingClientRect();
    
    // Only scroll if note is significantly outside the visible area
    // This prevents constant jumping
    const topMargin = containerRect.height * 0.2;
    const bottomMargin = containerRect.height * 0.2;
    
    const isAboveView = noteRect.top < (containerRect.top + topMargin);
    const isBelowView = noteRect.bottom > (containerRect.bottom - bottomMargin);

    if (isAboveView || isBelowView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  };

  const highlightUsingVerovio = (timeSeconds: number): Element[] => {
    if (!containerRef.current || !verovioRef.current) return [];

    try {
      const toolkit = verovioRef.current as unknown as {
        getElementsAtTime?: (time: number) => Record<string, string[] | undefined>;
      };

      if (!toolkit.getElementsAtTime) return [];

      const timeInMs = Math.max(0, Math.round(timeSeconds * 1000));
      const elementsAtTime = toolkit.getElementsAtTime(timeInMs);

      if (!elementsAtTime) return [];

      const primaryIds = [
        ...(elementsAtTime.note ?? []),
        ...(elementsAtTime.chord ?? []),
        ...(elementsAtTime['note-chord'] ?? []),
      ].filter((id): id is string => typeof id === 'string');

      const ids = primaryIds.length > 0
        ? primaryIds
        : Object.values(elementsAtTime)
            .flat()
            .filter((id): id is string => typeof id === 'string');

      if (ids.length === 0) return [];

      const highlightedSet = new Set<Element>();

      ids
        .map(id => {
          const safeId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/([:\[\].#])/g, '\\$1');
          return containerRef.current!.querySelector(`[id="${safeId}"]`);
        })
        .filter((el): el is Element => !!el)
        .forEach(el => {
          applyHighlightToElement(el, highlightedSet);

          if (el instanceof SVGGElement) {
            const childShapes = el.querySelectorAll('use, path, ellipse, circle');
            childShapes.forEach(child => applyHighlightToElement(child, highlightedSet));
          }
        });

      return Array.from(highlightedSet);
    } catch (err) {
      console.warn('Verovio highlighting failed', err);
      return [];
    }
  };

  const highlightFallback = (): Element[] => {
    if (!containerRef.current || noteElementsRef.current.length === 0) return [];

    if (fallbackNoteIndexRef.current >= noteElementsRef.current.length) {
      fallbackNoteIndexRef.current = 0;
    }

    const target = noteElementsRef.current[fallbackNoteIndexRef.current];
    fallbackNoteIndexRef.current += 1;

    if (!target) return [];

    const highlighted = new Set<Element>();

    applyHighlightToElement(target, highlighted);

    const parentNoteGroup = target.closest('[id^="note"]');
    if (parentNoteGroup) {
      const siblingShapes = parentNoteGroup.querySelectorAll('use, path, ellipse, circle');
      siblingShapes.forEach(el => {
        if (el !== target) {
          applyHighlightToElement(el, highlighted);
        }
      });
    }

    return Array.from(highlighted);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && stopTimeoutRef.current !== null) {
        window.clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      scheduledPartsRef.current.forEach(part => {
        part.stop();
        part.dispose();
      });
      scheduledPartsRef.current = [];

      Tone.getTransport().stop();
      Tone.getTransport().cancel(0);
      Tone.getDraw().cancel();

      clearHighlightedNotes();

      if (samplerRef.current) {
        samplerRef.current.releaseAll();
      }

      disposeFxNodes();
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
          clearHighlightedNotes();
          
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

          noteElementsRef.current = Array.from(
            containerRef.current.querySelectorAll('[id^="note"] use, use[class*="note"], use[class*="notehead"], path[class*="note"], ellipse[class*="note"], circle[class*="note"]')
          );

          if (noteElementsRef.current.length === 0) {
            noteElementsRef.current = Array.from(
              containerRef.current.querySelectorAll('use, path, rect, ellipse, circle')
            );
          }

          fallbackNoteIndexRef.current = 0;
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

  // Play MusicXML or MIDI with high-quality piano and note highlighting
  const handlePlay = async () => {
    if (instrumentLoading) return;

    try {
      await Tone.start();
      const sampler = await ensureSampler();
      setError(null);

      // Reset transport, visuals, and scheduling before a fresh playback
      Tone.getTransport().stop();
      Tone.getTransport().cancel(0);
      Tone.getDraw().cancel();
      Tone.getTransport().position = 0;

      clearHighlightedNotes();

      if (stopTimeoutRef.current !== null) {
        window.clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      scheduledPartsRef.current.forEach(part => part.dispose());
      scheduledPartsRef.current = [];

      if (containerRef.current && noteElementsRef.current.length === 0) {
        noteElementsRef.current = Array.from(
          containerRef.current.querySelectorAll('[id^="note"] use, use[class*="note"], use[class*="notehead"], path[class*="note"], ellipse[class*="note"], circle[class*="note"]')
        );

        if (noteElementsRef.current.length === 0) {
          noteElementsRef.current = Array.from(
            containerRef.current.querySelectorAll('use, path, rect, ellipse, circle')
          );
        }
      }

      fallbackNoteIndexRef.current = 0;

      let midi: Midi;

      if (midiFile) {
        // If we have a MIDI file, use it directly
        const arrayBuffer = await midiFile.arrayBuffer();
        midi = new Midi(arrayBuffer);
      } else if (musicxml && verovioRef.current) {
        // Convert MusicXML to MIDI using Verovio
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const midiBase64 = (verovioRef.current as any).renderToMIDI() as string;
        const midiData = Uint8Array.from(atob(midiBase64), c => c.charCodeAt(0));
        midi = new Midi(midiData.buffer);
      } else {
        setError('No music data to play');
        setIsPlaying(false);
        return;
      }

      const uniqueTimes = Array.from(
        new Set(
          midi.tracks.flatMap(track =>
            track.notes.map(note => Math.round(note.time * 1000) / 1000)
          )
        )
      ).sort((a, b) => a - b);

      midi.tracks.forEach(track => {
        if (track.notes.length === 0) return; // Skip empty tracks

        const part = new Tone.Part((time: number, note: { name: string; duration: number; velocity: number }) => {
          // Scale velocity for more dynamic range (0.3 to 1.0 instead of 0 to 1)
          const scaledVelocity = 0.3 + (note.velocity * 0.7);

          // Play note with Sampler - triggerAttackRelease(note, duration, time, velocity)
          sampler.triggerAttackRelease(note.name, note.duration, time, scaledVelocity);
        }, track.notes.map(note => ({
          time: note.time,
          name: note.name,
          duration: note.duration,
          velocity: note.velocity
        })));

        part.start(0);
        scheduledPartsRef.current.push(part as unknown as TonePartHandle);
      });

      const highlightPart = new Tone.Part((time: number, event: { highlightTime: number }) => {
        const noteTime = event.highlightTime;
        Tone.getDraw().schedule(() => {
          const highlighted = highlightUsingVerovio(noteTime);
          const toHandle = highlighted.length > 0 ? highlighted : highlightFallback();
          updateOverlayPosition(toHandle);
          scrollHighlightedIntoView(toHandle);
        }, time);
      }, uniqueTimes.map(highlightTime => ({
        time: highlightTime,
        highlightTime
      })));

      highlightPart.start(0);
      scheduledPartsRef.current.push(highlightPart as unknown as TonePartHandle);

      Tone.getTransport().start();
      setIsPlaying(true);

      if (typeof window !== 'undefined') {
        stopTimeoutRef.current = window.setTimeout(() => {
          handleStop();
        }, midi.duration * 1000 + 300);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play music');
      handleStop();
    }
  };

  const handleStop = () => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    Tone.getTransport().cancel(0);
    Tone.getDraw().cancel();

    scheduledPartsRef.current.forEach(part => {
      part.stop();
      part.dispose();
    });
    scheduledPartsRef.current = [];

    if (typeof window !== 'undefined' && stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    fallbackNoteIndexRef.current = 0;

    if (samplerRef.current) {
      samplerRef.current.releaseAll(Tone.now());
    }
    
    // Hide the playback line
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
    }

    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      Tone.getTransport().pause();
      setIsPlaying(false);
    } else if (Tone.getTransport().state === 'paused') {
      // Resume from pause
      Tone.getTransport().start();
      setIsPlaying(true);
    } else {
      // Start from beginning
      void handlePlay();
    }
  };

  return (
    <div className="bg-purple-900/30 rounded-lg p-4 sm:p-6 border border-purple-400/30">
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

      {/* Sheet Music Display - scrollbar hidden but scrollable */}
      <div className="bg-white rounded-lg p-4 border-2 border-purple-400/50 max-h-[80vh] relative overflow-hidden">
        <div 
          className="overflow-y-auto overflow-x-hidden h-full scrollbar-hide touch-pan-y"
          style={{
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none', /* IE and Edge */
          }}
        >
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
          
          <div ref={wrapperRef} className="relative w-full min-h-[200px]">
            <div ref={containerRef} className="w-full min-h-[200px]" />
            {/* Vertical playback line indicator */}
            <div
              ref={overlayRef}
              className="pointer-events-none absolute top-0 left-0 bg-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.8)] opacity-0 transition-opacity duration-100 ease-out"
              style={{ width: 0, height: 0 }}
            />
          </div>
        </div>

        {/* Floating Control Overlay - Always visible at bottom center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-purple-900/80 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-400/50 shadow-lg flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              disabled={loading || instrumentLoading}
              className="p-2 rounded-full bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900/50 disabled:cursor-not-allowed transition-colors"
              title={instrumentLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
            >
              {instrumentLoading ? (
                <span className="text-white text-xl">⏳</span>
              ) : isPlaying ? (
                <span className="text-white text-xl">⏸️</span>
              ) : (
                <span className="text-white text-xl">▶️</span>
              )}
            </button>
            
            {/* Stop Button */}
            <button
              onClick={handleStop}
              disabled={!isPlaying && Tone.getTransport().state !== 'paused'}
              className="p-2 rounded-full bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900/50 disabled:cursor-not-allowed transition-colors"
              title="Stop"
            >
              <span className="text-white text-xl">⏹️</span>
            </button>

            {/* Zoom Button */}
            <button
              onClick={() => setShowZoomSlider(!showZoomSlider)}
              className="p-2 rounded-full bg-purple-700 hover:bg-purple-600 transition-colors"
              title="Adjust Zoom"
            >
              <span className="text-white text-xl">🔍</span>
            </button>
          </div>
        </div>
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

      {/* CSS for hiding scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}