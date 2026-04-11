'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWebMscore } from '@/lib/webmscore';


interface WebMscorePlayerProps {
  data?: Uint8Array;
  format?: string;
}

export function WebMscorePlayer({ data, format }: WebMscorePlayerProps) {
  const { 
    score, 
    isLoading, 
    error, 
    playbackState, 
    cursorPosRef, 
    rawSvgTexts,
    load, 
    play, 
    pause, 
    stop 
  } = useWebMscore();

  const [svgPages, setSvgPages] = useState<{ url: string; viewBox: string }[]>([]);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cursorDivRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastLoadRef = useRef<{ data: Uint8Array; format?: string } | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  // Load score data when it changes
  useEffect(() => {
    const normalizedFormat = format === 'musicxml' ? 'xml' : format;

    if (!data) {
      lastLoadRef.current = null;
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
      setSvgPages([]);
      return;
    }

    const isDuplicateRequest =
      lastLoadRef.current?.data === data &&
      lastLoadRef.current?.format === normalizedFormat;

    if (!isDuplicateRequest && !isLoading) {
      lastLoadRef.current = { data, format: normalizedFormat };
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
      setSvgPages([]);
      load(new Uint8Array(data), normalizedFormat);
    }
  }, [data, load, score, isLoading, error, format]);

  // Build SVG pages from rawSvgTexts (rendered during score load) 
  useEffect(() => {
    const texts = rawSvgTexts.current;
    if (!score || texts.length === 0) {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
      setSvgPages([]);
      return;
    }

    const pages: { url: string; viewBox: string }[] = [];
    
    for (const rawSvg of texts) {
      if (!rawSvg) continue;
      const viewBoxMatch = rawSvg.match(/viewBox=["']([^"']+)["']/);
      const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 2480 3508';
      const blob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      pages.push({ url, viewBox });
    }

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = pages.map(p => p.url);
    setSvgPages(pages);
    console.log(`[WebMscorePlayer] Built ${pages.length} page blobs from raw SVGs`);
  }, [score, rawSvgTexts]);

  useEffect(() => {
    if (playbackState !== 'playing') {
      // Hide all cursor divs when stopped/paused
      cursorDivRefs.current.forEach(d => { if (d) d.style.display = 'none'; });
      return;
    }
  
    let rafId: number;
    const animate = () => {
      const pos = cursorPosRef.current;   // read from the hook
      cursorDivRefs.current.forEach((div, pageIdx) => {
        if (!div) return;
        if (pos && pos.page === pageIdx) {
          // The SVG coordinate needs to be mapped to the CSS pixel space of the <img>.
          // The img is 100% wide; svgViewBox width is the denominator.
          const container = containerRefs.current[pageIdx];
          if (!container) return;
          const imgWidth = container.clientWidth;
          const svgWidth = /* viewBox width, e.g. 2480 */ svgPages[pageIdx]?.viewBox.split(' ')[2];
          const scale = imgWidth / Number(svgWidth || 2480);
          const cssX = pos.x * scale;
          const cssHeight = pos.height * scale;
          const cssY = pos.y * scale;
          div.style.display = 'block';
          div.style.transform = `translate3d(${cssX}px, ${cssY}px, 0)`;
          div.style.height = `${cssHeight}px`;

          // Auto-scroll logic if needed
          const bounds = div.getBoundingClientRect();
          if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
            div.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          div.style.display = 'none';
        }
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [playbackState, cursorPosRef, svgPages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-indigo-900/20 rounded-xl border border-indigo-500/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-purple-200 font-medium animate-pulse text-lg">Initializing MuseScore Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-900/20 rounded-xl border border-red-500/30 text-center">
        <h3 className="text-xl font-bold text-red-400 mb-2 font-mono">Error Loading Score</h3>
        <p className="text-red-200 opacity-90">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-red-500/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto animate-in fade-in duration-700">
      {/* Playback Controls */}
      <div className="sticky top-4 z-50 flex justify-center gap-4 p-4 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl shadow-purple-500/10 self-center">
        {playbackState !== 'playing' ? (
          <button 
            onClick={play}
            className="p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg shadow-purple-500/30"
            title="Play"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        ) : (
          <button 
            onClick={pause}
            className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg shadow-indigo-500/30"
            title="Pause"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
        )}
        <button 
          onClick={stop}
          className="p-3 bg-gray-700 hover:bg-gray-800 text-white rounded-full transition-all hover:scale-110 active:scale-95"
          title="Stop"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
        </button>
      </div>

      {/* Pages Container */}
      <div className="flex flex-col gap-12 w-full">
        {svgPages.map((page, index) => (
          <div 
            key={index}
            className="bg-white text-black p-2 sm:p-8 rounded-xl shadow-2xl shadow-black/40 overflow-hidden ring-1 ring-white/10"
          >
            <div 
              ref={el => { containerRefs.current[index] = el }}
              className="relative block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.url}
                alt={`Sheet music page ${index + 1}`}
                className="block w-full h-auto select-none"
                draggable={false}
              />
              <div
                ref={el => { cursorDivRefs.current[index] = el; }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '2px',
                  backgroundColor: 'rgba(147, 51, 234, 0.85)',  /* purple */
                  boxShadow: '0 0 8px rgba(147, 51, 234, 0.6)',
                  pointerEvents: 'none',
                  display: 'none',   /* hidden by default */
                  zIndex: 10,
                  willChange: 'transform',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
