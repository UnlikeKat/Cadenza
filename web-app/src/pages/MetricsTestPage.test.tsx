// @vitest-environment jsdom
/**
 * MetricsTestPage — Task 2.2.1 regression harness.
 *
 * Verifies the identity-anchor cursor over the bounded `midi.events` stream:
 *  1. Append — new tail objects are consumed exactly once
 *  2. Identity resume — re-rendering with the same objects (new array ref)
 *     drains zero events; StrictMode's double-invoked effect is idempotent
 *  3. Cap eviction — after the head object leaves the window, surviving
 *     objects are not re-consumed and only the new tail is processed
 *  4. disable() clear/repopulate — an empty stream resets the anchor, and a
 *     repopulated stream of fresh objects is consumed exactly once
 *
 * One dedicated serial test; explicit vitest imports; no Testing Library.
 * Rendering uses react-dom/client + act inside StrictMode to match main.tsx.
 */
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MidiEvent, UseMidiReturn } from '../hooks/useMidi';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Hoisted so the vi.mock factory below can close over it safely.
const midiState = vi.hoisted(() => ({
  current: null as UseMidiReturn | null,
}));

vi.mock('../hooks/useMidi', () => ({
  useMidi: () => midiState.current,
}));

import MetricsTestPage from './MetricsTestPage';

function makeMidi(events: MidiEvent[]): UseMidiReturn {
  return {
    isEnabled: false,
    isSupported: true,
    inputs: [],
    selectedInput: null,
    activeNotes: new Map(),
    lastNote: null,
    lastEvent: null,
    events,
    error: null,
    enable: async () => {},
    selectInput: () => {},
    disable: () => {},
  };
}

function noteOn(timestamp: number, note: number, rawAttack: number): MidiEvent {
  return { type: 'noteon', note, timestamp, rawAttack, velocity: rawAttack / 127 };
}

let container: HTMLDivElement;
let root: Root;

function renderPage(): void {
  act(() => {
    root.render(
      <StrictMode>
        <MemoryRouter>
          <MetricsTestPage />
        </MemoryRouter>
      </StrictMode>,
    );
  });
}

function setEvents(events: MidiEvent[]): void {
  midiState.current = makeMidi(events);
  renderPage();
}

function getEventCount(): number {
  const match = container.textContent?.match(/(\d+)\s+eventi ricevuti/);
  if (!match) {
    throw new Error(`event count label not found in: ${container.textContent ?? ''}`);
  }
  return Number(match[1]);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  midiState.current = null;
});

describe('MetricsTestPage — task 2.2.1: bounded midi.events identity cursor', () => {
  test('consumes each stream object exactly once across append, cap eviction, and clear/repopulate', () => {
    const e1 = noteOn(100, 60, 96);
    const e2 = noteOn(150, 64, 88);
    const e3 = noteOn(200, 67, 72);
    const e4 = noteOn(250, 72, 100);

    // Phase 1 — initial append (2+ element batch; StrictMode double-effect
    // must drain zero on the second pass and report 2, not 4).
    setEvents([e1, e2]);
    expect(getEventCount()).toBe(2);
    expect(container.textContent).toContain('LIVE TRACE');

    // Phase 2 — identity resume: fresh array reference, same objects.
    setEvents([e1, e2]);
    expect(getEventCount()).toBe(2);

    // Phase 3 — append only the new tail.
    setEvents([e1, e2, e3]);
    expect(getEventCount()).toBe(3);

    // Phase 4 — cap eviction: e1 leaves the window; survivors keep identity;
    // only e4 is unconsumed.
    setEvents([e2, e3, e4]);
    expect(getEventCount()).toBe(4);

    // Phase 5 — disable()-style clear: anchor resets, nothing new drains.
    setEvents([]);
    expect(getEventCount()).toBe(4);

    // Phase 6 — repopulate with fresh objects (multi-element batch).
    const f1 = noteOn(300, 55, 90);
    const f2 = noteOn(340, 57, 100);
    setEvents([f1, f2]);
    expect(getEventCount()).toBe(6);

    // Phase 7 — identity resume on the repopulated stream drains zero.
    setEvents([f1, f2]);
    expect(getEventCount()).toBe(6);
  });
});
