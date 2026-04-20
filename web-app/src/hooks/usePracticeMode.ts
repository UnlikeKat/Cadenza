import { useCallback, useEffect, useRef, useState } from 'react';
import type { MidiNote } from './useMidi';

/**
 * Practice-mode hook that drives note-by-note navigation via OSMD's native
 * cursor API.  The hook:
 *
 *  1. Hides the musicxml-player playback clock
 *  2. Resets OSMD's cursor to the start
 *  3. Reads GNotesUnderCursor() for the expected pitches
 *  4. Matches incoming MIDI notes (with 250 ms chord-tolerance)
 *  5. Colors matched notes green via the OSMD SVG DOM
 *  6. Advances the cursor when all enabled-staff pitches are matched
 *  7. Auto-advances over rests and tied-to-previous notes
 *  8. Provides treble / bass staff toggles
 */

// ── Helpers ─────────────────────────────────────────────

/** Convert a GraphicalNote's Pitch → standard MIDI note number. */
function pitchToMidi(gNote: any): number | null {
  const sn = gNote.sourceNote;
  if (!sn || sn.isRest()) return null;

  const pitch = sn.Pitch;
  if (!pitch) return null;

  // OSMD's getHalfTone() calculates MIDI number but offset by 1 octave.
  // Add 12 to bring it to standard MIDI (C4 = 60).
  return pitch.getHalfTone() + 12;
}

/** Check if a note is tied (i.e. continuation of a previous tie). */
function isTiedContinuation(gNote: any): boolean {
  const tie = gNote.sourceNote?.NoteTie;
  if (!tie) return false;
  // If this note is NOT the first note in the tie, it's a continuation
  const notes: any[] = tie.Notes ?? tie.notes ?? [];
  if (notes.length < 2) return false;
  return notes[0] !== gNote.sourceNote;
}

/** Get staff index for a graphical note (0 = top/treble, 1 = bottom/bass). */
function staffIndex(gNote: any): number {
  try {
    return gNote.sourceNote.ParentVoiceEntry.ParentStaff.idInMusicSheet ?? 1;
  } catch {
    return 1;
  }
}

// Color notes in the SVG via OSMD's setColor API
function colorNote(gNote: any, color: string) {
  try {
    gNote.setColor(color, {
      applyToNoteheads: true,
      applyToStem: true,
      applyToBeams: true,
      applyToFlag: true,
    });
  } catch {
    // If setColor isn't available, fall back to SVG DOM
    try {
      const svgEl = (gNote as any).getSVGGElement?.();
      if (svgEl) {
        svgEl.querySelectorAll('*').forEach((el: SVGElement) => {
          if ((el as any).style) {
            (el as any).style.fill = color;
            (el as any).style.stroke = color;
          }
        });
      }
    } catch { /* best-effort */ }
  }
}

function resetNoteColor(gNote: any) {
  try {
    // Reset to black (default)
    gNote.setColor('#000000', {
      applyToNoteheads: true,
      applyToStem: true,
      applyToBeams: true,
      applyToFlag: true,
    });
  } catch {
    try {
      const svgEl = (gNote as any).getSVGGElement?.();
      if (svgEl) {
        svgEl.querySelectorAll('*').forEach((el: SVGElement) => {
          if ((el as any).style) {
            (el as any).style.fill = '';
            (el as any).style.stroke = '';
          }
        });
      }
    } catch { /* best-effort */ }
  }
}

// ── Hook ────────────────────────────────────────────────

interface PracticeModeReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  enabledStaves: Set<number>;
  start: () => void;
  stop: () => void;
  reset: () => void;
  toggleStaff: (staff: number) => void;
}

export function usePracticeMode(
  osmdRef: React.RefObject<any>,   // Reference to the OSMD instance
  activeNotes: Map<number, MidiNote>,
): PracticeModeReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [enabledStaves, setEnabledStaves] = useState<Set<number>>(new Set([1, 2]));

  // Refs for matching logic
  const matchedRef = useRef<Set<number>>(new Set());
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coloredNotesRef = useRef<any[]>([]);
  const isActiveRef = useRef(false);
  const enabledStavesRef = useRef<Set<number>>(new Set([1, 2]));
  const stepCountRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    enabledStavesRef.current = enabledStaves;
  }, [enabledStaves]);

  // ── Get the primary cursor ──
  const getCursor = useCallback(() => {
    const osmd = osmdRef.current;
    if (!osmd) return null;
    // cursors[0] is our main navigation cursor
    return osmd.cursors?.[0] ?? osmd.cursor ?? null;
  }, [osmdRef]);

  // ── Read expected MIDI pitches under cursor, filtered by enabled staves ──
  const getExpectedPitches = useCallback((): { midi: number; gNote: any; staff: number }[] => {
    const cursor = getCursor();
    if (!cursor) return [];

    const gNotes: any[] = cursor.GNotesUnderCursor?.() ?? [];
    const results: { midi: number; gNote: any; staff: number }[] = [];

    for (const gn of gNotes) {
      // Skip rests and tied continuations
      if (gn.sourceNote?.isRest?.()) continue;
      if (isTiedContinuation(gn)) continue;

      const si = staffIndex(gn);
      if (!enabledStavesRef.current.has(si)) continue;

      const midi = pitchToMidi(gn);
      if (midi !== null) {
        results.push({ midi, gNote: gn, staff: si });
      }
    }
    return results;
  }, [getCursor]);

  // ── Check if all notes under cursor are rests or tied continuations ──
  const isRestOrTiedStep = useCallback((): boolean => {
    const cursor = getCursor();
    if (!cursor) return false;

    const gNotes: any[] = cursor.GNotesUnderCursor?.() ?? [];
    if (gNotes.length === 0) return false;

    // Check only enabled staves
    const relevantNotes = gNotes.filter(gn => {
      const si = staffIndex(gn);
      return enabledStavesRef.current.has(si);
    });

    if (relevantNotes.length === 0) return true; // no notes on enabled staves = skip

    return relevantNotes.every(gn =>
      gn.sourceNote?.isRest?.() || isTiedContinuation(gn)
    );
  }, [getCursor]);

  // ── Highlight current expected notes (gold) ──
  const highlightCurrentNotes = useCallback(() => {
    // Reset previously colored notes
    for (const gn of coloredNotesRef.current) {
      resetNoteColor(gn);
    }
    coloredNotesRef.current = [];

    const expected = getExpectedPitches();
    for (const { gNote } of expected) {
      colorNote(gNote, '#C5A880'); // gold/accent
      coloredNotesRef.current.push(gNote);
    }
  }, [getExpectedPitches]);

  // ── Advance cursor, auto-skip rests/ties, then highlight next ──
  const advanceCursor = useCallback(() => {
    const cursor = getCursor();
    if (!cursor) return;

    // Clear match state
    matchedRef.current.clear();

    // Move to next position
    cursor.next();
    stepCountRef.current++;
    setCurrentStep(stepCountRef.current);

    // Check if we reached the end
    if (cursor.Iterator?.EndReached) {
      setIsActive(false);
      isActiveRef.current = false;
      // Clean up colored notes
      for (const gn of coloredNotesRef.current) {
        resetNoteColor(gn);
      }
      coloredNotesRef.current = [];
      return;
    }

    // Auto-advance through rests and tied continuations
    let safetyCount = 0;
    while (isRestOrTiedStep() && !cursor.Iterator?.EndReached && safetyCount < 200) {
      cursor.next();
      stepCountRef.current++;
      setCurrentStep(stepCountRef.current);
      safetyCount++;
    }

    if (cursor.Iterator?.EndReached) {
      setIsActive(false);
      isActiveRef.current = false;
      for (const gn of coloredNotesRef.current) {
        resetNoteColor(gn);
      }
      coloredNotesRef.current = [];
      return;
    }

    // Highlight the new expected notes
    highlightCurrentNotes();
  }, [getCursor, isRestOrTiedStep, highlightCurrentNotes]);

  // ── MIDI matching effect ──
  useEffect(() => {
    if (!isActiveRef.current) return;

    const expected = getExpectedPitches();
    if (expected.length === 0) return;

    // Get the MIDI pitches currently pressed
    const pressedPitches = new Set(activeNotes.keys());

    // Check for newly matched notes
    let newMatch = false;
    for (const { midi, gNote } of expected) {
      if (pressedPitches.has(midi) && !matchedRef.current.has(midi)) {
        matchedRef.current.add(midi);
        colorNote(gNote, '#4CAF50'); // green for correct
        newMatch = true;
      }
    }

    if (!newMatch) return;

    // Check if all expected notes are matched
    const allExpectedMidis = expected.map(e => e.midi);
    const allMatched = allExpectedMidis.every(m => matchedRef.current.has(m));

    if (allMatched) {
      // Clear any pending chord timer
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
      // Small delay before advancing (let the user see the green)
      chordTimerRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          advanceCursor();
        }
      }, 150);
    } else {
      // Partial match — start/restart chord tolerance timer (250ms window)
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
      }
      // Don't auto-advance on partial match — wait for remaining notes
    }
  }, [activeNotes, getExpectedPitches, advanceCursor]);

  // ── Start practice mode ──
  const start = useCallback(() => {
    const osmd = osmdRef.current;
    if (!osmd) {
      console.warn('[PracticeMode] No OSMD instance available');
      return;
    }

    // Configure cursors if not done yet
    if (!osmd.cursors || osmd.cursors.length === 0) {
      osmd.cursorsOptions = [
        {
          type: 0, // Standard (vertical line)
          color: '#C5A880',
          alpha: 0.6,
          follow: true,
        },
      ];
      osmd.enableOrDisableCursors(true);
    }

    const cursor = osmd.cursors?.[0] ?? osmd.cursor;
    if (!cursor) {
      console.warn('[PracticeMode] Cursor not available');
      return;
    }

    // Reset cursor to start
    cursor.reset();
    cursor.show();

    // Count total steps for progress display
    let count = 0;
    // We'll estimate total steps from the iterator
    // (Can't easily count without iterating — use a rough estimate)
    try {
      const tempCursor = osmd.cursors.length > 1 ? osmd.cursors[1] : null;
      if (!tempCursor) {
        // Use sheet measures * avg voices as estimate
        const sheet = osmd.Sheet;
        if (sheet?.SourceMeasures) {
          count = sheet.SourceMeasures.length * 4; // rough estimate
        } else {
          count = 100; // fallback
        }
      }
    } catch {
      count = 100;
    }

    // Reset cursor back to start after counting
    cursor.reset();
    cursor.show();

    stepCountRef.current = 0;
    setCurrentStep(0);
    setTotalSteps(count);
    matchedRef.current.clear();
    coloredNotesRef.current = [];

    // Auto-skip leading rests
    let safetyCount = 0;
    while (isRestOrTiedStep() && !cursor.Iterator?.EndReached && safetyCount < 200) {
      cursor.next();
      stepCountRef.current++;
      safetyCount++;
    }
    setCurrentStep(stepCountRef.current);

    setIsActive(true);
    isActiveRef.current = true;

    // Highlight the first notes
    highlightCurrentNotes();

    console.log('[PracticeMode] Started. Enabled staves:', [...enabledStavesRef.current]);
  }, [osmdRef, getCursor, isRestOrTiedStep, highlightCurrentNotes]);

  // ── Stop practice mode ──
  const stop = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;

    if (chordTimerRef.current) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }

    // Reset colored notes
    for (const gn of coloredNotesRef.current) {
      resetNoteColor(gn);
    }
    coloredNotesRef.current = [];
    matchedRef.current.clear();

    // Hide cursor
    const cursor = getCursor();
    if (cursor) {
      cursor.hide();
    }
  }, [getCursor]);

  // ── Reset (for "Practice Again") ──
  const reset = useCallback(() => {
    stop();
    setTimeout(() => start(), 100);
  }, [stop, start]);

  // ── Toggle a staff (treble = 0, bass = 1) ──
  const toggleStaff = useCallback((staff: number) => {
    setEnabledStaves(prev => {
      const next = new Set(prev);
      if (next.has(staff)) {
        // Don't allow disabling BOTH staves
        if (next.size > 1) {
          next.delete(staff);
        }
      } else {
        next.add(staff);
      }
      return next;
    });

    // Re-highlight with new staves filter if active
    if (isActiveRef.current) {
      // Slight delay to let state propagate
      setTimeout(() => {
        highlightCurrentNotes();
      }, 50);
    }
  }, [highlightCurrentNotes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
      }
    };
  }, []);

  return {
    isActive,
    currentStep,
    totalSteps,
    enabledStaves,
    start,
    stop,
    reset,
    toggleStaff,
  };
}
