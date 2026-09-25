// @vitest-environment jsdom
/**
 * MetricsTestPage — Task 2.2.2 verification harness.
 *
 * Verifies metric consumption on the live event stream (FR-002..FR-006):
 *  FR-002 dynamics     — rawAttack < 80 FAIL, rawAttack >= 80 PASS
 *  FR-003 pedal toggle — literal predicate `value===127||value===0` preserved
 *  FR-004 chord jitter — complementary C4/E4 pair FAILs at >= 30ms, either order
 *  FR-005 pedal timing — press measures the most recent pending noteon; every
 *                        press yields a verdict (no invented timing state);
 *                        non-positive delta FAILs; consumed pending state cleared
 *  FR-006 articulation — legato (delta <= 0) PASS, staccato (delta > 0) FAIL
 *
 * The Task 2.2.1 identity cursor is exercised as the transport (append-only
 * growth of the same event objects); its dedicated regression lives in
 * MetricsTestPage.test.tsx.
 *
 * One serial describe block; explicit vitest imports; no Testing Library.
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

const PITCH = 'Pitch Range';
const DYNAMICS = 'Dynamics Adherence';
const PEDAL = 'Pedal Toggle';
const CHORD = 'Chord Jitter';
const SYNC = 'Syncopated Pedal';
const ARTICULATION = 'Articulation';

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

function noteOn(timestamp: number, note: number, rawAttack?: number): MidiEvent {
  return rawAttack === undefined
    ? { type: 'noteon', note, timestamp }
    : { type: 'noteon', note, timestamp, rawAttack, velocity: rawAttack / 127 };
}

function noteOff(timestamp: number, note: number): MidiEvent {
  return { type: 'noteoff', note, timestamp, velocity: 0 };
}

function sustain(timestamp: number, value: number): MidiEvent {
  return { type: 'controlchange', controller: 64, value, timestamp };
}

function control(timestamp: number, controller: number, value: number): MidiEvent {
  return { type: 'controlchange', controller, value, timestamp };
}

type CardStatus = 'pass' | 'fail' | 'waiting';
type CardView = { status: CardStatus; label: string; detail: string };

function readCard(name: string): CardView {
  const cards = Array.from(container.querySelectorAll('article.metric-card'));
  const card = cards.find((c) => c.querySelector('.metric-name')?.textContent === name);
  if (!card) {
    throw new Error(`metric card "${name}" not found in: ${container.textContent ?? ''}`);
  }
  const className = card.className;
  const status = (['pass', 'fail', 'waiting'] as const).find((s) => className.includes(`metric-${s}`));
  if (!status) {
    throw new Error(`unrecognized metric card class: ${className}`);
  }
  const label = card.querySelector('.metric-status')?.textContent ?? '';
  const detail = card.querySelector('small')?.textContent ?? '';
  return { status, label, detail };
}

function expectCard(name: string, status: CardStatus, detail: string): void {
  const card = readCard(name);
  const expectedLabel = status === 'pass' ? 'OK' : status === 'fail' ? 'VIOLATION' : 'WAITING';
  expect(card.status).toBe(status);
  expect(card.label).toBe(expectedLabel);
  expect(card.detail).toBe(detail);
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

describe('MetricsTestPage — task 2.2.2: metric consumption (FR-002..FR-006)', () => {
  test('renders the six metric cards in order with waiting placeholders (visual structure preserved)', () => {
    setEvents([]);

    const names = Array.from(container.querySelectorAll('.metric-name')).map((el) => el.textContent);
    expect(names).toEqual([PITCH, DYNAMICS, PEDAL, CHORD, SYNC, ARTICULATION]);

    expectCard(PITCH, 'waiting', 'No note received yet');
    expectCard(DYNAMICS, 'waiting', 'No note received yet');
    expectCard(PEDAL, 'waiting', 'No sustain event received yet');
    expectCard(CHORD, 'waiting', 'Waiting for C4 + E4');
    expectCard(SYNC, 'waiting', 'Waiting for note + pedal');
    expectCard(ARTICULATION, 'waiting', 'Waiting for note-off → note-on');

    const text = container.textContent ?? '';
    expect(text).toContain('Piano Metrics Lab');
    expect(text).toContain('LIVE TRACE');
    expect(text).toContain('0 eventi ricevuti');
  });

  test('FR-002: dynamics fail below rawAttack 80 and pass at or above it', () => {
    // Threshold property: PASS iff rawAttack >= 80, over both sides of the boundary.
    const samples = [0, 1, 79, 80, 81, 100, 127];
    for (const [index, attack] of samples.entries()) {
      setEvents([noteOn(100 + index * 10, 60, attack)]);
      if (attack < 80) {
        expectCard(DYNAMICS, 'fail', `rawAttack ${attack} is below the forte threshold (>= 80)`);
      } else {
        expectCard(DYNAMICS, 'pass', `Strong note accepted: rawAttack ${attack}`);
      }
    }
  });

  test('FR-002: a missing rawAttack is treated as 0 and fails', () => {
    setEvents([noteOn(100, 60)]);
    expectCard(DYNAMICS, 'fail', 'rawAttack 0 is below the forte threshold (>= 80)');
  });

  test('FR-002: the most recent noteon owns the dynamics verdict across appends', () => {
    const e1 = noteOn(100, 60, 90);
    const e2 = noteOn(200, 62, 79);
    const e3 = noteOn(300, 64, 80);

    setEvents([e1]);
    expectCard(DYNAMICS, 'pass', 'Strong note accepted: rawAttack 90');

    setEvents([e1, e2]);
    expectCard(DYNAMICS, 'fail', 'rawAttack 79 is below the forte threshold (>= 80)');

    setEvents([e1, e2, e3]);
    expectCard(DYNAMICS, 'pass', 'Strong note accepted: rawAttack 80');
  });

  test('FR-003: pedal toggle keeps the literal value===127||value===0 predicate', () => {
    const samples = [0, 1, 63, 64, 65, 126, 127];
    for (const [index, value] of samples.entries()) {
      setEvents([control(100 + index * 10, 64, value)]);
      if (value === 127) {
        expectCard(PEDAL, 'pass', 'Sustain pedal pressed (CC64=127)');
      } else if (value === 0) {
        expectCard(PEDAL, 'pass', 'Sustain pedal released (CC64=0)');
      } else {
        expectCard(PEDAL, 'fail', `Unexpected sustain value ${value}; expected 0 or 127`);
      }
    }
  });

  test('FR-003: non-sustain controllers leave the pedal card untouched', () => {
    setEvents([control(100, 65, 127), control(200, 7, 64)]);
    expectCard(PEDAL, 'waiting', 'No sustain event received yet');
  });

  test('FR-005: a press 50ms after the most recent noteon passes', () => {
    setEvents([noteOn(1000, 60, 90), sustain(1050, 127)]);
    expectCard(SYNC, 'pass', 'Pedal pressed 50ms after the note');
  });

  test('FR-005: a press with no pending noteon fails without inventing timing state', () => {
    setEvents([sustain(1000, 127)]);
    expectCard(SYNC, 'fail', 'Sustain pressed with no pending note-on');
    // No fabricated measurement: the detail carries no millisecond delta.
    expect(readCard(SYNC).detail).not.toContain('ms');
  });

  test('FR-005: a non-positive pedal-minus-note delta fails and consumed state is cleared', () => {
    const n1 = noteOn(1000, 60, 90);
    const p0 = sustain(1000, 127);
    const p1 = sustain(1200, 127);

    setEvents([n1]);
    expectCard(SYNC, 'waiting', 'Waiting for note + pedal');

    // Delta exactly 0 → violation, not silent acceptance.
    setEvents([n1, p0]);
    expectCard(SYNC, 'fail', 'Pedal timestamp is 0ms from the note (must be > 0ms and < 200ms)');

    // The consumed pending noteon is cleared: the next press sees no pending state.
    setEvents([n1, p0, p1]);
    expectCard(SYNC, 'fail', 'Sustain pressed with no pending note-on');
  });

  test('FR-005: a negative pedal-minus-note delta fails', () => {
    setEvents([noteOn(1000, 60, 90), sustain(900, 127)]);
    expectCard(SYNC, 'fail', 'Pedal timestamp is -100ms from the note (must be > 0ms and < 200ms)');
  });

  test('FR-005: a delta at or beyond 200ms fails, then a fresh note recovers', () => {
    const n1 = noteOn(1000, 60, 90);
    const late = sustain(1200, 127);
    const n2 = noteOn(3000, 62, 90);
    const ok = sustain(3050, 127);

    // Boundary: exactly 200ms is a violation (limit is strictly < 200ms).
    setEvents([n1, late]);
    expectCard(SYNC, 'fail', 'Pedal was 200ms after the note (limit: <200ms)');

    setEvents([n1, late, n2, ok]);
    expectCard(SYNC, 'pass', 'Pedal pressed 50ms after the note');
  });

  test('FR-005: with 2+ pending noteons the press measures the newest note, never the older one', () => {
    const older = noteOn(1000, 60, 90);
    const newer = noteOn(1950, 64, 90);

    setEvents([older, newer]);
    expectCard(SYNC, 'waiting', 'Waiting for note + pedal');

    // Newest delta = 40ms → PASS. Older delta would be 990ms → FAIL, so this
    // assertion proves the queue tail (not the head) was consumed.
    const press = sustain(1990, 127);
    setEvents([older, newer, press]);
    expectCard(SYNC, 'pass', 'Pedal pressed 40ms after the note');

    // Consumed state cleared: a second press with no fresh noteon fails.
    const secondPress = sustain(2100, 127);
    setEvents([older, newer, press, secondPress]);
    expectCard(SYNC, 'fail', 'Sustain pressed with no pending note-on');

    // Inverse case: the newest note fails where the older one would pass.
    // newest delta = 600ms → FAIL; older delta = 100ms → would PASS.
    const older2 = noteOn(5000, 65, 90);
    const newer2 = noteOn(4500, 67, 90);
    setEvents([older, newer, press, secondPress, older2, newer2]);
    expectCard(SYNC, 'fail', 'Sustain pressed with no pending note-on');

    const press2 = sustain(5100, 127);
    setEvents([older, newer, press, secondPress, older2, newer2, press2]);
    expectCard(SYNC, 'fail', 'Pedal was 600ms after the note (limit: <200ms)');
  });

  test('FR-004: C4 then E4 within 30ms passes', () => {
    setEvents([noteOn(1000, 60, 90), noteOn(1029, 64, 90)]);
    expectCard(CHORD, 'pass', 'C4 + E4 detected within 29ms');
  });

  test('FR-004: E4 then C4 within 30ms passes (either order)', () => {
    setEvents([noteOn(1000, 64, 90), noteOn(1010, 60, 90)]);
    expectCard(CHORD, 'pass', 'C4 + E4 detected within 10ms');
  });

  test('FR-004: a complementary note >= 30ms after the stored note fails', () => {
    const first = noteOn(1000, 60, 90);
    setEvents([first]);
    expectCard(CHORD, 'waiting', 'Waiting for the other chord note within 30ms');

    const second = noteOn(1040, 64, 90);
    setEvents([first, second]);
    expectCard(CHORD, 'fail', 'C4 + E4 arrived 40ms apart (limit: <30ms)');
  });

  test('FR-004: a complementary note at exactly 30ms fails (boundary)', () => {
    setEvents([noteOn(1000, 60, 90), noteOn(1030, 64, 90)]);
    expectCard(CHORD, 'fail', 'C4 + E4 arrived 30ms apart (limit: <30ms)');
  });

  test('FR-004: repeating the same chord note stays waiting', () => {
    setEvents([noteOn(1000, 60, 90), noteOn(1010, 60, 90)]);
    expectCard(CHORD, 'waiting', 'Waiting for the other chord note within 30ms');
  });

  test('FR-006: a next note coinciding with the note-off passes legato', () => {
    setEvents([noteOff(1000, 60), noteOn(1000, 64, 90)]);
    expectCard(ARTICULATION, 'pass', 'Legato: next note starts 0ms from note-off');
  });

  test('FR-006: a next note starting before the note-off passes legato', () => {
    setEvents([noteOff(1000, 60), noteOn(970, 64, 90)]);
    expectCard(ARTICULATION, 'pass', 'Legato: next note starts -30ms from note-off');
  });

  test('FR-006: a positive gap fails staccato and the note-off cursor resets', () => {
    const off = noteOff(1000, 60);
    setEvents([off]);
    expectCard(ARTICULATION, 'waiting', 'Waiting for note-off → note-on');

    const gap = noteOn(1050, 64, 90);
    setEvents([off, gap]);
    expectCard(ARTICULATION, 'fail', 'Staccato gap detected: 50ms');

    // The note-off cursor is consumed by that verdict: a further noteon with
    // no intervening noteoff leaves the articulation verdict unchanged.
    const later = noteOn(1100, 65, 90);
    setEvents([off, gap, later]);
    expectCard(ARTICULATION, 'fail', 'Staccato gap detected: 50ms');
  });

  test('FR-006: a noteon with no preceding noteoff leaves articulation waiting', () => {
    setEvents([noteOn(1000, 60, 90)]);
    expectCard(ARTICULATION, 'waiting', 'Waiting for note-off → note-on');
  });
});
