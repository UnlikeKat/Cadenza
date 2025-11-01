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

  const HIGHLIGHT_FLAG_ATTR = 'data-verovio-highlighted';
  const PREV_FILL_ATTR = 'data-prev-fill';
  const PREV_STROKE_ATTR = 'data-prev-stroke';
  const PREV_STROKE_WIDTH_ATTR = 'data-prev-stroke-width';
  const PREV_STYLE_ATTR = 'data-prev-style';
  const PREV_TRANSFORM_ATTR = 'data-prev-transform';
  const PREV_TRANSFORM_ORIGIN_ATTR = 'data-prev-transform-origin';
  const PREV_TRANSITION_ATTR = 'data-prev-transition';
  const STYLE_SENTINEL = '__verovio_none__';

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

  const applyHighlightToElement = (element: Element, collector: Set<Element>) => {
    if (!(element instanceof SVGElement)) {
      return;
    }

    if (!element.hasAttribute(HIGHLIGHT_FLAG_ATTR)) {
      element.setAttribute(HIGHLIGHT_FLAG_ATTR, 'true');

      const prevFill = element.getAttribute('fill');
      element.setAttribute(PREV_FILL_ATTR, prevFill ?? STYLE_SENTINEL);

      const prevStroke = element.getAttribute('stroke');
      element.setAttribute(PREV_STROKE_ATTR, prevStroke ?? STYLE_SENTINEL);

      const prevStrokeWidth = element.getAttribute('stroke-width');
      element.setAttribute(PREV_STROKE_WIDTH_ATTR, prevStrokeWidth ?? STYLE_SENTINEL);

      const prevStyle = element.getAttribute('style');
      element.setAttribute(PREV_STYLE_ATTR, prevStyle ?? STYLE_SENTINEL);

      const prevTransform = element.style.transform;
      element.setAttribute(PREV_TRANSFORM_ATTR, prevTransform || STYLE_SENTINEL);

      const prevTransformOrigin = element.style.transformOrigin;
      element.setAttribute(PREV_TRANSFORM_ORIGIN_ATTR, prevTransformOrigin || STYLE_SENTINEL);

      const prevTransition = element.style.transition;
      element.setAttribute(PREV_TRANSITION_ATTR, prevTransition || STYLE_SENTINEL);
    }

    element.setAttribute('fill', '#a78bfa');
    element.setAttribute('stroke', '#8b5cf6');
    element.setAttribute('stroke-width', '2.4');

    const mergedStyle = element.getAttribute('style') || '';
    const stylesToInject = [
      'filter: drop-shadow(0 0 12px rgba(167, 139, 250, 0.85))',
      'opacity: 1',
      'will-change: transform, filter',
    ];
    const styleSet = new Set(
      mergedStyle
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
    );
    stylesToInject.forEach(rule => styleSet.add(rule));
    element.setAttribute('style', Array.from(styleSet).join('; '));

    element.style.transform = 'scale(1.18)';
    element.style.transformOrigin = 'center';
    element.style.transition = 'transform 0.08s ease-out';

    element.classList.add('playing-note-active');

    collector.add(element);
  };

  const clearHighlightedNotes = () => {
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
    }

    if (!containerRef.current) return;
    const highlighted = containerRef.current.querySelectorAll(`[${HIGHLIGHT_FLAG_ATTR}="true"]`);
    highlighted.forEach(el => {
      if (el instanceof SVGElement) {
        const prevFill = el.getAttribute(PREV_FILL_ATTR);
        if (prevFill === STYLE_SENTINEL || prevFill === null) {
          el.removeAttribute('fill');
        } else {
          el.setAttribute('fill', prevFill);
        }

        const prevStroke = el.getAttribute(PREV_STROKE_ATTR);
        if (prevStroke === STYLE_SENTINEL || prevStroke === null) {
          el.removeAttribute('stroke');
        } else {
          el.setAttribute('stroke', prevStroke);
        }

        const prevStrokeWidth = el.getAttribute(PREV_STROKE_WIDTH_ATTR);
        if (prevStrokeWidth === STYLE_SENTINEL || prevStrokeWidth === null) {
          el.removeAttribute('stroke-width');
        } else {
          el.setAttribute('stroke-width', prevStrokeWidth);
        }

        const prevStyle = el.getAttribute(PREV_STYLE_ATTR);
        if (prevStyle === STYLE_SENTINEL || prevStyle === null) {
          el.removeAttribute('style');
        } else {
          el.setAttribute('style', prevStyle);
        }

        const prevTransform = el.getAttribute(PREV_TRANSFORM_ATTR);
        el.style.transform = prevTransform && prevTransform !== STYLE_SENTINEL ? prevTransform : '';

        const prevTransformOrigin = el.getAttribute(PREV_TRANSFORM_ORIGIN_ATTR);
        el.style.transformOrigin = prevTransformOrigin && prevTransformOrigin !== STYLE_SENTINEL ? prevTransformOrigin : '';

        const prevTransition = el.getAttribute(PREV_TRANSITION_ATTR);
        el.style.transition = prevTransition && prevTransition !== STYLE_SENTINEL ? prevTransition : '';
      }

      el.removeAttribute(HIGHLIGHT_FLAG_ATTR);
      el.removeAttribute(PREV_FILL_ATTR);
      el.removeAttribute(PREV_STROKE_ATTR);
      el.removeAttribute(PREV_STROKE_WIDTH_ATTR);
      el.removeAttribute(PREV_STYLE_ATTR);
      el.removeAttribute(PREV_TRANSFORM_ATTR);
      el.removeAttribute(PREV_TRANSFORM_ORIGIN_ATTR);
      el.removeAttribute(PREV_TRANSITION_ATTR);
      el.classList.remove('playing-note-active');
    });
  };

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

    const minLeft = Math.min(...rects.map(r => r.left));
    const maxRight = Math.max(...rects.map(r => r.right));

    const padX = 8;
  const width = Math.min(48, Math.max(14, maxRight - minLeft + padX * 2));
  const centerX = (minLeft + maxRight) / 2;
  const wrapperHeight = wrapper.scrollHeight || wrapperRect.height;
  const rawLeft = centerX - wrapperRect.left - width / 2;
  const clampedLeft = Math.min(Math.max(0, rawLeft), Math.max(0, wrapperRect.width - width));

  overlay.style.left = `${clampedLeft}px`;
    overlay.style.top = '0px';
    overlay.style.width = `${width}px`;
    overlay.style.height = `${wrapperHeight}px`;
    overlay.style.opacity = '1';
  };

  const scrollHighlightedIntoView = (elements: Element[]) => {
    if (elements.length === 0) return;

    const scrollHost = wrapperRef.current?.parentElement ?? containerRef.current?.parentElement;
    if (!scrollHost) return;

    const target = elements[0];
    if (!('getBoundingClientRect' in target) || typeof target.getBoundingClientRect !== 'function') {
      return;
    }

    const noteRect = target.getBoundingClientRect();
    const containerRect = scrollHost.getBoundingClientRect();

    if (noteRect.top < containerRect.top + 80 || noteRect.bottom > containerRect.bottom - 80) {
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
          clearHighlightedNotes();
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

    clearHighlightedNotes();
    fallbackNoteIndexRef.current = 0;

    if (samplerRef.current) {
      samplerRef.current.releaseAll(Tone.now());
    }

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
        
        <div ref={wrapperRef} className="relative w-full min-h-[200px]">
          <div ref={containerRef} className="w-full min-h-[200px]" />
          <div
            ref={overlayRef}
            className="pointer-events-none absolute top-0 left-0 rounded-full bg-purple-400/20 ring-1 ring-purple-500/40 shadow-[0_0_22px_rgba(167,139,250,0.45)] opacity-0 transition-all duration-75 ease-out mix-blend-screen"
            style={{ width: 0, height: 0 }}
          />
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
    </div>
  );
}