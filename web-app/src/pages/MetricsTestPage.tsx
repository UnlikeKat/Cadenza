import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Piano, RotateCcw, Usb } from 'lucide-react';
import { useMidi, type MidiEvent } from '../hooks/useMidi';
import './MetricsTestPage.css';

type Status = 'waiting' | 'pass' | 'fail';
type Metric = { id: string; name: string; description: string; status: Status; detail: string };

/** FR-006: max silence between a note-off and the next note-on that still counts as legato. */
const LEGATO_GAP_MS = 30;

const initialStatus: Record<string, Status> = Object.fromEntries(
  ['pitch', 'dynamics', 'pedal', 'chord', 'syncopated', 'articulation'].map((id) => [id, 'waiting']),
);

function MetricCard({ metric }: { metric: Metric }) {
  const label = metric.status === 'pass' ? 'OK' : metric.status === 'fail' ? 'VIOLATION' : 'WAITING';
  return (
    <article className={`metric-card metric-${metric.status}`}>
      <div className="metric-card-top">
        <span className="metric-name">{metric.name}</span>
        <span className="metric-status">{label}</span>
      </div>
      <p>{metric.description}</p>
      <small>{metric.detail}</small>
    </article>
  );
}

function MetricsTestPage() {
  const midi = useMidi();
  const [status, setStatus] = useState(initialStatus);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [eventCount, setEventCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<MidiEvent | null>(null);
  const [trace, setTrace] = useState<MidiEvent[]>([]);
  const previousNoteOff = useRef<number | null>(null);
  // FR-006: note numbers still physically down. A note-on arriving while another
  // key is held IS legato by definition, and no timestamp comparison can detect
  // it — see the note-off/note-on block in processEvent.
  const heldNotes = useRef<Set<number>>(new Set());
  const lastChordNote = useRef<{ number: number; timestamp: number } | null>(null);
  const pendingNotes = useRef<number[]>([]);
  // Identity anchor: the last MidiEvent object this page consumed. Numeric
  // indices desync when the bounded stream evicts the head or disable() clears
  // it; object identity resynchronizes across append, shrink, and repopulate.
  const lastProcessedEvent = useRef<MidiEvent | null>(null);
  const [seenNotes, setSeenNotes] = useState(false);

  const update = useCallback((id: string, next: Status, detail: string) => {
    setStatus((current) => ({ ...current, [id]: next }));
    setDetails((current) => ({ ...current, [id]: detail }));
  }, []);

  const processEvent = useCallback((event: MidiEvent) => {
    setEventCount((count) => count + 1);
    setLastEvent(event);
    setTrace((current) => [...current.slice(-49), event]);

    if (event.type === 'noteon' && event.note !== undefined) {
      setSeenNotes(true);
      // FR-001: A0..C8, exactly as pitch-range.rml.
      if (event.note < 21 || event.note > 108) {
        update('pitch', 'fail', `MIDI ${event.note} is outside A0 (21)–C8 (108)`);
      } else {
        update('pitch', 'pass', `Last note ${event.note} is inside the 88-key range`);
      }

      // FR-002: strong notes must have rawAttack >= 80.
      const attack = event.rawAttack ?? 0;
      if (attack < 80) {
        update('dynamics', 'fail', `rawAttack ${attack} is below the forte threshold (>= 80)`);
      } else {
        update('dynamics', 'pass', `Strong note accepted: rawAttack ${attack}`);
      }

      // FR-004: C4/E4 pair within 30ms, either order.
      if (event.note === 60 || event.note === 64) {
        const previous = lastChordNote.current;
        if (previous && previous.number !== event.note) {
          const delta = event.timestamp - previous.timestamp;
          if (delta >= 30) {
            update('chord', 'fail', `C4 + E4 arrived ${delta}ms apart (limit: <30ms)`);
          } else {
            update('chord', 'pass', `C4 + E4 detected within ${delta}ms`);
          }
        } else {
          update('chord', 'waiting', 'Waiting for the other chord note within 30ms');
        }
        lastChordNote.current = { number: event.note, timestamp: event.timestamp };
      }

      // FR-005: every note must be followed by sustain-on within 200ms.
      pendingNotes.current.push(event.timestamp);
    }

    if (event.type === 'controlchange' && event.controller === 64) {
      if (event.value === 127 || event.value === 0) {
        update('pedal', 'pass', event.value === 127 ? 'Sustain pedal pressed (CC64=127)' : 'Sustain pedal released (CC64=0)');
      } else {
        update('pedal', 'fail', `Unexpected sustain value ${event.value}; expected 0 or 127`);
      }

      // FR-005: a press is measured against the most recent note-on that no
      // earlier press has consumed. Every press yields a verdict: with no
      // pending note-on there is no timing state to invent, and a delta that
      // is not strictly positive is a violation. Consumed state is always
      // cleared so a later press cannot reuse a stale note timestamp.
      if (event.value === 127) {
        const notes = pendingNotes.current;
        const recent = notes[notes.length - 1];
        if (recent === undefined) {
          update('syncopated', 'fail', 'Sustain pressed with no pending note-on');
        } else {
          const delta = event.timestamp - recent;
          if (delta >= 200) {
            update('syncopated', 'fail', `Pedal was ${delta}ms after the note (limit: <200ms)`);
          } else if (delta <= 0) {
            update('syncopated', 'fail', `Pedal timestamp is ${delta}ms from the note (must be > 0ms and < 200ms)`);
          } else {
            update('syncopated', 'pass', `Pedal pressed ${delta}ms after the note`);
          }
          pendingNotes.current = [];
        }
      }
    }

    // FR-006: legato = the next note starts while the previous one is still held
    // (true overlap), or within LEGATO_GAP_MS of its note-off.
    // The original spec compared only `delta <= 0`, which a live MIDI stream can
    // never satisfy: by the time the next note-on is evaluated the previous
    // note-off is already in the past, so delta is always positive. Overlap is
    // the opposite ordering (note-on first) and so was never even measured.
    if (event.type === 'noteoff' && event.note !== undefined) {
      heldNotes.current.delete(event.note);
      previousNoteOff.current = event.timestamp;
    }
    if (event.type === 'noteon' && event.note !== undefined) {
      if (heldNotes.current.size > 0) {
        update('articulation', 'pass', `Legato: next note overlaps ${heldNotes.current.size} still-held note(s)`);
        previousNoteOff.current = null;
      } else if (previousNoteOff.current !== null) {
        const delta = event.timestamp - previousNoteOff.current;
        if (delta <= LEGATO_GAP_MS) {
          update('articulation', 'pass', `Legato: next note starts ${delta}ms from note-off (limit: <=${LEGATO_GAP_MS}ms)`);
        } else {
          update('articulation', 'fail', `Staccato gap detected: ${delta}ms (limit: <=${LEGATO_GAP_MS}ms)`);
        }
        previousNoteOff.current = null;
      }
      heldNotes.current.add(event.note);
    }
  }, [update]);

  // Deliberate: this drains an EXTERNAL bounded stream (the MIDI hook's event
  // buffer), which is the documented job of an effect — subscribe to an
  // external system, setState in the callback. Deriving during render would
  // either replay the whole buffer every render or move the FR-001..006
  // verdicts into a reducer and rewrite the reset path.
  // ponytail: the anchor ref below is what keeps this incremental instead of
  // O(n) per render; drop it only if the stream becomes unbounded.
  /* eslint-disable react-hooks/set-state-in-effect -- drains the MIDI hook's external event buffer; see the ponytail above */
  useEffect(() => {
    const events = midi.events;
    const anchor = lastProcessedEvent.current;
    let start = 0;
    if (anchor !== null) {
      const anchorIndex = events.indexOf(anchor);
      // Anchor missing => head was evicted or the stream was cleared and
      // replaced; every surviving/new object is still unconsumed.
      start = anchorIndex === -1 ? 0 : anchorIndex + 1;
    }
    for (let i = start; i < events.length; i += 1) {
      processEvent(events[i]);
    }
    // StrictMode re-runs this effect without cleanup: the anchor now points
    // at the tail, so the second pass starts past the end and drains zero.
    lastProcessedEvent.current = events.length > 0 ? events[events.length - 1] : null;
  }, [midi.events, processEvent]);

  const metrics: Metric[] = useMemo(() => [
    { id: 'pitch', name: 'Pitch Range', description: 'Every note must be between A0 and C8.', status: status.pitch, detail: details.pitch ?? 'No note received yet' },
    { id: 'dynamics', name: 'Dynamics Adherence', description: 'Strong notes use velocity ≥ 80.', status: status.dynamics, detail: details.dynamics ?? 'No note received yet' },
    { id: 'pedal', name: 'Pedal Toggle', description: 'Sustain CC64 must use 127 for press and 0 for release.', status: status.pedal, detail: details.pedal ?? 'No sustain event received yet' },
    { id: 'chord', name: 'Chord Jitter', description: 'C4 + E4 must arrive within 30ms, in either order.', status: status.chord, detail: details.chord ?? 'Waiting for C4 + E4' },
    { id: 'syncopated', name: 'Syncopated Pedal', description: 'Sustain press must follow a note within 200ms.', status: status.syncopated, detail: details.syncopated ?? 'Waiting for note + pedal' },
    { id: 'articulation', name: 'Articulation', description: `Next note must overlap a held note, or start within ${LEGATO_GAP_MS}ms of the previous note-off.`, status: status.articulation, detail: details.articulation ?? 'Waiting for note-off → note-on' },
  ], [details, status]);

  const reset = () => {
    setStatus(initialStatus);
    setDetails({});
    setEventCount(0);
    setLastEvent(null);
    setTrace([]);
    previousNoteOff.current = null;
    heldNotes.current.clear();
    lastChordNote.current = null;
    pendingNotes.current = [];
    lastProcessedEvent.current = midi.events.length > 0 ? midi.events[midi.events.length - 1] : null;
    setSeenNotes(false);
  };

  return (
    <div className="metrics-page">
      <div className="metrics-container">
        <div className="metrics-header">
          <div>
            <Link to="/" className="metrics-back">← Cadenza</Link>
            <p className="metrics-kicker">RML · LIVE TEST</p>
            <h1 className="heading">Piano Metrics Lab</h1>
            <p className="metrics-intro">Collega il pianoforte MIDI e suona liberamente. Questa sandbox è separata dal normale flusso di Cadenza e mostra in tempo reale le sei specifiche RML.</p>
          </div>
          <div className="metrics-header-icon"><Piano size={42} strokeWidth={1.2} /></div>
        </div>

        <section className="connection-card">
          <div className="connection-copy">
            <span className={`connection-dot ${midi.isEnabled ? 'connected' : ''}`} />
            <div><strong>{midi.isEnabled ? 'MIDI enabled' : 'MIDI non collegato'}</strong><span>{midi.selectedInput?.name ?? 'Collega il tuo pianoforte USB/MIDI'}</span></div>
          </div>
          <div className="connection-actions">
            {midi.inputs.length > 0 && <select value={midi.selectedInput?.id ?? ''} onChange={(e) => midi.selectInput(e.target.value)} aria-label="MIDI input"><option value="">Seleziona dispositivo</option>{midi.inputs.map((input) => <option key={input.id} value={input.id}>{input.name}</option>)}</select>}
            {!midi.isEnabled ? <button className="btn btn-primary" onClick={() => void midi.enable()}><Usb size={16} /> Connetti MIDI</button> : <button className="btn btn-outline" onClick={midi.disable}>Disconnetti</button>}
          </div>
          {midi.error && <div className="midi-error">{midi.error}</div>}
        </section>

        <div className="metrics-toolbar"><div><Activity size={17} /> <span>{eventCount} eventi ricevuti</span></div><button onClick={reset}><RotateCcw size={15} /> Reset test</button></div>

        <section className="metrics-grid">{metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</section>

        <section className="trace-card">
          <div className="trace-title"><div><span className="metrics-kicker">LIVE TRACE</span><h2 className="heading">Ultimo evento</h2></div><span>{seenNotes ? 'monitor attivo' : 'in attesa'}</span></div>
          <div className="last-event">{lastEvent ? <><strong>{lastEvent.type}</strong><code>{JSON.stringify(lastEvent)}</code></> : <span>Suona una nota o usa il pedale per iniziare.</span>}</div>
          {trace.length > 0 && <div className="trace-list">{trace.slice(-8).reverse().map((event, index) => <div key={`${event.timestamp}-${index}`}><span>{event.type}</span><code>{event.timestamp.toFixed(0)}ms {event.note !== undefined ? `note=${event.note}` : `value=${event.value}`}</code></div>)}</div>}
        </section>

        <p className="metrics-footnote">Le soglie e i pattern mostrati qui corrispondono alle specifiche in <code>RML_DOCS/RML_TESTS/metrics/</code>. La pagina è un adapter browser realtime delle sei specifiche; la compilazione/esecuzione del monitor RML resta quella documentata nel PoC.</p>
      </div>
    </div>
  );
}

export default MetricsTestPage;
