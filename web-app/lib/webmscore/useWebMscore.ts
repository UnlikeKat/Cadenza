'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { webMscoreManager } from './WebMscoreManager';
import { PlaybackState, ScorePosition, PositionData, WebMscore } from './types';
import { extractNotePositions, NoteCoord } from './svgNoteExtractor';


/**
 * React hook for managing WebMscore state and operations.
 */
export function useWebMscore() {
  const [score, setScore] = useState<WebMscore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [positions, setPositions] = useState<PositionData[]>([]);
  
  // Provide raw cursor positions for the UI to animate
  const cursorPosRef = useRef<{ x: number; y: number; height: number; page: number } | null>(null);
  // Store raw SVG text per page for the player component to render
  const rawSvgTextsRef = useRef<string[]>([]);

  const scoreRef = useRef<WebMscore | null>(null);
  const isMountedRef = useRef(true);
  const loadIdRef = useRef(0);
  const requestRef = useRef<number>(undefined);
  const lastIndexRef = useRef(0);

  // Audio player refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthIteratorRef = useRef<((cancel?: boolean) => Promise<any>) | null>(null);
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextScheduleTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const positionsRef = useRef<PositionData[]>([]);
  const updatePositionLogCountRef = useRef(0);

  // Keep scoreRef in sync with score state and handle cleanup of old scores
  useEffect(() => {
    const oldScore = scoreRef.current;
    scoreRef.current = score;

    // If the score has changed and we have an old one, destroy it
    if (oldScore && oldScore !== score) {
      console.log('[useWebMscore] Destroying old score instance');
      webMscoreManager.destroy(oldScore);
    }
  }, [score]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      isPlayingRef.current = false;
      scheduledNodesRef.current.forEach(node => {
        try {
          node.onended = null;
          node.stop();
        } catch {}
      });
      scheduledNodesRef.current = [];

      if (scoreRef.current) {
        webMscoreManager.destroy(scoreRef.current);
        scoreRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Update the current position based on the score's playback time.
   */
  const updatePosition = useCallback(() => {
    const currentScore = scoreRef.current;
    const pos = positionsRef.current;
    if (!currentScore || !isPlayingRef.current || pos.length === 0) {
      if ((updatePositionLogCountRef.current++) < 5) {
        console.log('[useWebMscore] updatePosition early-return:', {
          hasScore: !!currentScore,
          isPlaying: isPlayingRef.current,
          posCount: pos.length,
        });
      }
      if (isPlayingRef.current) {
        requestRef.current = requestAnimationFrame(updatePosition);
      }
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const currentTime = audioContext.currentTime - startTimeRef.current + currentTimeRef.current;
    const currentTimeMs = currentTime * 1000;
    
    let currentIdx = lastIndexRef.current;
    if (currentIdx >= pos.length || pos[currentIdx].time > currentTimeMs) {
      currentIdx = 0;
    }

    while (currentIdx + 1 < pos.length && pos[currentIdx + 1].time <= currentTimeMs) {
      currentIdx++;
    }
    
    lastIndexRef.current = currentIdx;

    if (currentIdx !== -1) {
      const currentPos = pos[currentIdx];
      let currentX = currentPos.x;

      // Interpolate X position for a smooth gliding cursor between beats
      if (currentIdx + 1 < pos.length) {
        const nextPos = pos[currentIdx + 1];
        // Only glide if the next note is on the same staff line (same page and similar y)
        if (nextPos.page === currentPos.page && Math.abs(nextPos.y - currentPos.y) < 20) {
          const timeDiff = nextPos.time - currentPos.time;
          if (timeDiff > 0) {
            const progress = (currentTimeMs - currentPos.time) / timeDiff;
            const p = Math.max(0, Math.min(1, progress));
            currentX = currentPos.x + p * (nextPos.x - currentPos.x);
          }
        } else {
          // Cross-system/page glide: move from last note X to the end of the current measure
          const timeUntilNext = nextPos.time - currentPos.time;
          if (timeUntilNext > 0) {
            const progress = (currentTimeMs - currentPos.time) / timeUntilNext;
            const p = Math.max(0, Math.min(1, progress));
            // Glide towards the right edge of the measure
            const endX = currentPos.measureX + currentPos.width;
            currentX = currentPos.x + p * (endX - currentPos.x);
          }
        }
      }

      cursorPosRef.current = { x: currentX, y: currentPos.y, height: currentPos.height, page: currentPos.page };
    } else {
      cursorPosRef.current = null;
    }

    requestRef.current = requestAnimationFrame(updatePosition);
  }, []);

  // Keep positionsRef in sync with positions state
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    if (playbackState === 'playing') {
      requestRef.current = requestAnimationFrame(updatePosition);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [playbackState, updatePosition]);

  /**
   * Load a score from a Uint8Array.
   */
  const load = useCallback(async (data: Uint8Array, format?: string) => {
    console.log('[useWebMscore] Starting load sequence (Official Package)...', { dataLength: data?.length, format });
    const loadId = ++loadIdRef.current;
    setIsLoading(true);
    setError(null);

    const isStale = () => !isMountedRef.current || loadId !== loadIdRef.current;

    try {
      if (!data || data.length === 0) {
        throw new Error("Cannot load score: data is empty or undefined");
      }

      let detectedFormat = format;
      if (!detectedFormat) {
          // Detect MSCZ (PK..)
          if (data[0] === 0x50 && data[1] === 0x4B && data[2] === 0x03 && data[3] === 0x04) {
              detectedFormat = 'mscz';
          } else {
              // Try detect XML
              try {
                  const header = new TextDecoder().decode(data.slice(0, 100));
                  if (header.includes('<?xml') || header.includes('<score-partwise')) {
                      detectedFormat = 'xml';
                  } else {
                      detectedFormat = 'mscz';
                  }
              } catch (e) {
                  detectedFormat = 'mscz';
              }
          }
      }
      console.log(`[useWebMscore] Detected format for engine: ${detectedFormat}`);

      const newScore = await webMscoreManager.loadScore(data, detectedFormat);
      if (!newScore) {
        throw new Error("WebMscore failed to create a score instance");
      }
      console.log('[useWebMscore] Score loaded into engine');

      if (isStale()) {
        webMscoreManager.destroy(newScore);
        return;
      }

      // In official package, we might want to wait a bit or it's already ready if load finishes
      
      let posData: PositionData[] = [];
      
      try {
        console.log('[useWebMscore] Retrieving visual positions via measurePositions()...');
        
        const positionsRaw = await newScore.measurePositions();
        
        const elementMap = new Map();
        positionsRaw.elements.forEach((el: any) => elementMap.set(el.id, el));

        // --- SVG Extraction + lightweight notehead X extraction ---
        // Render all pages and extract notehead positions (x,y only — no glow injection)
        const pageCount = await newScore.npages();
        const rawSvgs: string[] = [];
        const allNoteCoords: NoteCoord[][] = [];
        
        for (let i = 0; i < pageCount; i++) {
          if (isStale()) break;
          try {
            const rawSvg = await newScore.saveSvg(i);
            rawSvgs.push(rawSvg);
            const pageNotes = extractNotePositions(rawSvg, i);
            allNoteCoords.push(pageNotes);
            console.log(`[useWebMscore] Page ${i}: found ${pageNotes.length} noteheads for cursor positioning`);
          } catch (svgErr) {
            console.error(`[useWebMscore] Failed to render page ${i}:`, svgErr);
            rawSvgs.push('');
            allNoteCoords.push([]);
          }
        }
        rawSvgTextsRef.current = rawSvgs;

        // --- XML Beat Interpolation + Note Coordinate Matching ---
        const xmlStr = await newScore.saveXml();
        const xmlDoc = new DOMParser().parseFromString(xmlStr, "text/xml");
        const parts = Array.from(xmlDoc.querySelectorAll('part'));
        
        let newPosData: PositionData[] = [];
        
        if (parts.length > 0) {
           // Establish strict structural measure indices from the primary part
           const primaryMeasures = parts[0].querySelectorAll('measure');

           positionsRaw.events.forEach((measureEv: any, eventIndex: number) => {
             const elid = measureEv.elid;
             if (elid < 0 || elid >= primaryMeasures.length) return;
             
             const measureEl = elementMap.get(elid);
             if (!measureEl) return;
             
             const page0 = measureEl.page;
             const measureStartTime = measureEv.position;
             
             const nextEv = positionsRaw.events[eventIndex + 1];
             const nextMeasureTime = nextEv ? nextEv.position : measureStartTime + 2000;
             const measureTimeDuration = Math.max(1, nextMeasureTime - measureStartTime);
             
             // Pass 1: Global Metric Scan to find the absolute measure duration
             let globalMaxAbsoluteBeat = 0.0001; // Avoid divide by zero
             
             parts.forEach((part) => {
                 let divisions = 1;
                 const divNode = part.querySelector('attributes divisions');
                 if (divNode) divisions = Number(divNode.textContent) || 1;
                 
                 const measureNodes = part.querySelectorAll('measure');
                 if (elid >= measureNodes.length) return;
                 const measureNode = measureNodes[elid];
                 
                 const localDivNode = measureNode.querySelector('attributes divisions');
                 if (localDivNode) divisions = Number(localDivNode.textContent) || divisions;
                 
                 let currentTick = 0;
                 Array.from(measureNode.children).forEach(child => {
                     const durNode = child.querySelector('duration');
                     const dur = durNode ? Number(durNode.textContent || '0') : 0;
                     if (child.tagName === 'note') {
                         const isGrace = child.querySelector('grace') !== null;
                         const isChord = child.querySelector('chord') !== null;
                         if (!isChord && !isGrace) {
                            currentTick += dur;
                         }
                         globalMaxAbsoluteBeat = Math.max(globalMaxAbsoluteBeat, currentTick / divisions);
                     } else if (child.tagName === 'backup') {
                         currentTick -= dur;
                     } else if (child.tagName === 'forward') {
                         currentTick += dur;
                         globalMaxAbsoluteBeat = Math.max(globalMaxAbsoluteBeat, currentTick / divisions);
                     }
                 });
             });
             
             // Pass 2: Fraction Generation
             const startFractions = new Set<number>();
             
             parts.forEach((part) => {
                 let divisions = 1;
                 const divNode = part.querySelector('attributes divisions');
                 if (divNode) divisions = Number(divNode.textContent) || 1;
                 
                 const measureNodes = part.querySelectorAll('measure');
                 if (elid >= measureNodes.length) return;
                 const measureNode = measureNodes[elid];
                 
                 const localDivNode = measureNode.querySelector('attributes divisions');
                 if (localDivNode) divisions = Number(localDivNode.textContent) || divisions;
                 
                 let currentTick = 0;
                 Array.from(measureNode.children).forEach(child => {
                     const durNode = child.querySelector('duration');
                     const dur = durNode ? Number(durNode.textContent || '0') : 0;
                     if (child.tagName === 'note') {
                         const isGrace = child.querySelector('grace') !== null;
                         const isChord = child.querySelector('chord') !== null;
                         const isRest = child.querySelector('rest') !== null;
                         const isPrinted = child.getAttribute('print-object') !== 'no';
                         
                         if (!isRest && isPrinted) {
                            let absoluteBeat = currentTick / divisions;
                            let fraction = absoluteBeat / globalMaxAbsoluteBeat;
                            if (isGrace) fraction -= 0.001; // gracefully position just before the beat
                            const roundedFraction = Math.round(fraction * 10000) / 10000;
                            startFractions.add(roundedFraction);
                         }
                         
                         if (!isChord && !isGrace) {
                            currentTick += dur;
                         }
                     } else if (child.tagName === 'backup') {
                         currentTick -= dur;
                     } else if (child.tagName === 'forward') {
                         currentTick += dur;
                     }
                 });
             });
             
             // Fuzzy-merge beats that are virtually identical to prevent tuplets or floating math 
             // from shattering a single chord into multiple timeline slices.
             const rawBeats = Array.from(startFractions).sort((a, b) => a - b);
             const sortedFractions: number[] = [];
             for (const f of rawBeats) {
                 if (sortedFractions.length === 0 || Math.abs(sortedFractions[sortedFractions.length - 1] - f) > 0.01) {
                     sortedFractions.push(f);
                 }
             }
             
             if (sortedFractions.length === 0) {
                newPosData.push({
                   tick: 0,
                   time: measureStartTime,
                   measure: elid,
                   page: page0,
                   x: measureEl.x,
                   y: measureEl.y,
                   width: measureEl.sx,
                   height: measureEl.sy,
                   noteCoords: [],
                });
                return;
             }
             
             // --- Cursor X Detection ---
             // Get noteheads inside this measure's bounding box (including grand staff)
             const pageNotes = allNoteCoords[page0] || [];
             const measureNotes = pageNotes.filter(n =>
               n.x >= measureEl.x - 5 && n.x <= measureEl.x + measureEl.sx + 5 &&
               n.y >= measureEl.y - 20 && n.y <= measureEl.y + (measureEl.sy * 1.40)
             );
             measureNotes.sort((a, b) => a.x - b.x);

             // Use K-1 largest gaps to split noteheads into exactly K beat columns.
             // The leftmost notehead of each column is the cursor X for that beat.
             const K = sortedFractions.length;
             const startPaddingX = (elid === 0) ? 60 : 15;
             const usableWidth = Math.max(10, measureEl.sx - startPaddingX - 10);
             let columnXPositions: number[] = [];

             if (K === 1) {
               columnXPositions = measureNotes.length > 0 ? [measureNotes[0].x] : [];
             } else if (measureNotes.length > 0) {
               const gaps = [];
               for (let gi = 1; gi < measureNotes.length; gi++) {
                 gaps.push({ index: gi, size: measureNotes[gi].x - measureNotes[gi - 1].x });
               }
               const splitIndices = [...gaps]
                 .sort((a, b) => b.size - a.size)
                 .slice(0, K - 1)
                 .map(g => g.index)
                 .sort((a, b) => a - b);

               let start = 0;
               for (const splitIdx of splitIndices) {
                 const group = measureNotes.slice(start, splitIdx);
                 columnXPositions.push(group.length > 0 ? group[0].x : measureNotes[start].x);
                 start = splitIdx;
               }
               const lastGroup = measureNotes.slice(start);
               columnXPositions.push(lastGroup.length > 0 ? lastGroup[0].x : measureNotes[measureNotes.length - 1].x);
             }

             // Pad with linear fallback if SVG gave fewer columns than XML beats
             while (columnXPositions.length < K) {
               const frac = columnXPositions.length / Math.max(1, K - 1);
               columnXPositions.push(measureEl.x + startPaddingX + (frac * usableWidth));
             }

             sortedFractions.forEach((fraction, idx) => {
                 const normalizedFraction = Math.max(0, fraction);
                 const noteTime = measureStartTime + (normalizedFraction * measureTimeDuration);
                 const finalX = columnXPositions[idx] ?? (measureEl.x + startPaddingX + (normalizedFraction * usableWidth));
                
                 newPosData.push({
                    tick: 0,
                    time: noteTime,
                   measure: elid,
                   page: page0,
                   x: finalX,
                   measureX: measureEl.x,
                   y: measureEl.y,
                   width: measureEl.sx,
                   height: measureEl.sy,
                });
             });
           });
        }
        
        if (newPosData.length > 0) {
           posData = newPosData;
        } else {
           posData = positionsRaw.events.map((ev: any) => {
             const el = elementMap.get(ev.elid);
             const page0 = el ? el.page : 0;
             return { tick: 0, time: ev.position, measure: ev.elid, page: page0, 
                      x: el ? el.x : 0, measureX: el ? el.x : 0, y: el ? el.y : 0, width: el ? el.sx : 0, height: el ? el.sy : 0 };
           });
        }
        
        posData.sort((a, b) => a.time - b.time);
        console.log(`[useWebMscore] Position mapping complete: ${posData.length} beats mapped`);
      } catch (err) {
        console.error('[useWebMscore] Positional tracking retrieval failed:', err);
        posData = [];
      }

      if (isStale()) {
        webMscoreManager.destroy(newScore);
        return;
      }

      console.log(`[useWebMscore] Visual mapping completed: ${posData.length} records`);
      
      lastIndexRef.current = 0;
      positionsRef.current = posData;
      setPositions(posData);
      setScore(newScore);
      setPlaybackState('stopped');
      currentTimeRef.current = 0;
      
      // Initialize first cursor position
      if (posData.length > 0) {
         const firstPos = posData[0];
         cursorPosRef.current = { x: firstPos.x, y: firstPos.y, height: firstPos.height, page: firstPos.page };
      }
      console.log('[useWebMscore] Load sequence finished');
    } catch (err: unknown) {
      console.error('[useWebMscore] CRITICAL LOAD ERROR:', err);
      if (!isStale()) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      }
    } finally {
      if (!isStale()) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Audio scheduling loop.
   */
  const scheduleAudio = useCallback(async () => {
    if (!isPlayingRef.current || !audioContextRef.current || !synthIteratorRef.current) return;

    const audioContext = audioContextRef.current;
    const iterator = synthIteratorRef.current;

    try {
      while (nextScheduleTimeRef.current < audioContext.currentTime + 0.5) {
        const result = await iterator();
        if (result.done) {
          isPlayingRef.current = false;
          const lastNode = scheduledNodesRef.current[scheduledNodesRef.current.length - 1];
          if (lastNode) {
            lastNode.onended = () => {
              setPlaybackState('stopped');
              currentTimeRef.current = 0;
              lastIndexRef.current = 0;
            };
          } else {
            setPlaybackState('stopped');
            currentTimeRef.current = 0;
            lastIndexRef.current = 0;
          }
          break;
        }

        // Official package returns result.chunk as Uint8Array (Float32 PCM bytes)
        const rawData = result.chunk;
        const floatData = new Float32Array(rawData.buffer, rawData.byteOffset, rawData.byteLength / 4);
        
        const halfLen = floatData.length / 2;
        const left = floatData.slice(0, halfLen);
        const right = floatData.slice(halfLen);

        const buffer = audioContext.createBuffer(2, halfLen, 44100);
        buffer.getChannelData(0).set(left);
        buffer.getChannelData(1).set(right);

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        const startTime = Math.max(nextScheduleTimeRef.current, audioContext.currentTime);
        source.start(startTime);
        
        scheduledNodesRef.current.push(source);
        nextScheduleTimeRef.current = startTime + buffer.duration;

        source.onended = () => {
          scheduledNodesRef.current = scheduledNodesRef.current.filter(n => n !== source);
        };
      }

      if (isPlayingRef.current) {
        setTimeout(scheduleAudio, 100);
      }
    } catch (err) {
      console.error('Audio scheduling error:', err);
      isPlayingRef.current = false;
      setPlaybackState('stopped');
    }
  }, []);

  /**
   * Start playback.
   */
  const play = useCallback(async () => {
    const currentScore = scoreRef.current;
    if (!currentScore) return;

    if (!audioContextRef.current) {
      const AudioContextClass =
        (window as any).AudioContext ||
        (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('Web Audio API is not available in this browser');
      }

      audioContextRef.current = new AudioContextClass({ sampleRate: 44100 });
    }
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    if (playbackState === 'playing') return;

    try {
      console.log(`[useWebMscore] Starting playback from ${currentTimeRef.current}s`);
      const iterator = await currentScore.synthAudio(currentTimeRef.current);
      synthIteratorRef.current = iterator;
      startTimeRef.current = audioContext.currentTime;
      nextScheduleTimeRef.current = audioContext.currentTime + 0.05;
      isPlayingRef.current = true;
      setPlaybackState('playing');
      scheduleAudio();
      // Start the cursor animation loop (requestAnimationFrame)
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(updatePosition);
    } catch (err: unknown) {
      console.error('Error during playback:', err);
      setError(err instanceof Error ? err.message : 'Failed to start playback');
    }
  }, [playbackState, scheduleAudio, updatePosition]);

  /**
   * Pause playback.
   */
  const pause = useCallback(async () => {
    if (playbackState !== 'playing') return;

    isPlayingRef.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    const audioContext = audioContextRef.current;
    if (audioContext) {
      currentTimeRef.current += audioContext.currentTime - startTimeRef.current;
    }

    scheduledNodesRef.current.forEach(node => {
      try {
        node.onended = null;
        node.stop();
      } catch {}
    });
    scheduledNodesRef.current = [];

    setPlaybackState('paused');
  }, [playbackState]);

  /**
   * Stop playback and reset position.
   */
  const stop = useCallback(async () => {
    isPlayingRef.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    scheduledNodesRef.current.forEach(node => {
      try {
        node.onended = null;
        node.stop();
      } catch {}
    });
    scheduledNodesRef.current = [];

    currentTimeRef.current = 0;
    lastIndexRef.current = 0;
    setPlaybackState('stopped');

    // Clear all highlights
    highlightRefs.current.forEach(group => {
      if (!group) return;
      group.innerHTML = '';
    });

    if (positions.length > 0) {
       const firstPos = positions[0];
       const group = highlightRefs.current[firstPos.page];
       if (group && firstPos.noteCoords && firstPos.noteCoords.length > 0) {
           group.innerHTML = firstPos.noteCoords.map(c => c.svgContent || '').join('');
       }
    }
  }, [positions]);

  return {
    score,
    isLoading,
    error,
    playbackState,
    cursorPosRef, 
    rawSvgTexts: rawSvgTextsRef,
    load,
    play,
    pause,
    stop
  };
}
