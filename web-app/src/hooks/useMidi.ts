import { useState, useEffect, useCallback, useRef } from 'react';
import { WebMidi, type Input } from 'webmidi';

export interface MidiNote {
  name: string;
  octave: number;
  identifier: string;
  number: number;
  velocity: number;
  timestamp: number;
}

export interface MidiEvent {
  type: 'noteon' | 'noteoff' | 'controlchange';
  timestamp: number;
  note?: number;
  velocity?: number;
  /** Raw MIDI velocity 0-127 (noteon only; webmidi v3 e.note.rawAttack) */
  rawAttack?: number;
  controller?: number;
  value?: number;
}

/** Maximum number of events retained in the bounded stream (oldest dropped first). */
const EVENTS_CAP = 500;

export interface UseMidiReturn {
  isEnabled: boolean;
  isSupported: boolean;
  inputs: Input[];
  selectedInput: Input | null;
  activeNotes: Map<number, MidiNote>;
  lastNote: MidiNote | null;
  lastEvent: MidiEvent | null;
  events: MidiEvent[];
  error: string | null;
  enable: () => Promise<void>;
  selectInput: (inputId: string) => void;
  disable: () => void;
}

export function useMidi(): UseMidiReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [selectedInput, setSelectedInput] = useState<Input | null>(null);
  const [activeNotes, setActiveNotes] = useState<Map<number, MidiNote>>(new Map());
  const [lastNote, setLastNote] = useState<MidiNote | null>(null);
  const [lastEvent, setLastEvent] = useState<MidiEvent | null>(null);
  const [events, setEvents] = useState<MidiEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const selectedInputRef = useRef<Input | null>(null);

  // Store listener references so we can remove ONLY ours on cleanup
  // (WebMidi is a global singleton — calling removeListener() kills ALL hooks)
  const connectedListenerRef = useRef<((...args: any[]) => void) | null>(null);
  const disconnectedListenerRef = useRef<((...args: any[]) => void) | null>(null);

  // Append to the bounded stream with functional setState so rapid chord-speed
  // input is never dropped between React renders (never reads stale state).
  const appendEvent = useCallback((event: MidiEvent) => {
    setEvents(prev => {
      const next = [...prev, event];
      return next.length > EVENTS_CAP ? next.slice(next.length - EVENTS_CAP) : next;
    });
  }, []);

  // Check browser support
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setIsSupported(false);
    }
  }, []);

  const attachListeners = useCallback((input: Input) => {
    // Clear any existing listeners on this specific input
    input.removeListener();

    // Note On
    input.addListener('noteon', (e) => {
      const note: MidiNote = {
        name: e.note.name + (e.note.accidental || ''),
        octave: e.note.octave,
        identifier: e.note.identifier,
        number: e.note.number,
        velocity: e.note.attack,
        timestamp: e.timestamp,
      };

      setActiveNotes(prev => {
        const next = new Map(prev);
        next.set(note.number, note);
        return next;
      });
      setLastNote(note);
      const event: MidiEvent = {
        type: 'noteon',
        note: note.number,
        velocity: note.velocity,
        rawAttack: e.note.rawAttack,
        timestamp: note.timestamp,
      };
      setLastEvent(event);
      appendEvent(event);
    });

    // Note Off
    input.addListener('noteoff', (e) => {
      setActiveNotes(prev => {
        const next = new Map(prev);
        next.delete(e.note.number);
        return next;
      });
      const event: MidiEvent = { type: 'noteoff', note: e.note.number, timestamp: e.timestamp };
      setLastEvent(event);
      appendEvent(event);
    });

    input.addListener('controlchange', (e) => {
      const event: MidiEvent = {
        type: 'controlchange',
        controller: e.controller.number,
        value: e.rawValue,
        timestamp: e.timestamp,
      };
      setLastEvent(event);
      appendEvent(event);
    });
  }, [appendEvent]);

  const enable = useCallback(async () => {
    try {
      setError(null);
      await WebMidi.enable();
      setIsEnabled(true);
      setInputs([...WebMidi.inputs]);

      // Auto-select first input if available
      if (WebMidi.inputs.length > 0) {
        const firstInput = WebMidi.inputs[0];
        setSelectedInput(firstInput);
        selectedInputRef.current = firstInput;
        attachListeners(firstInput);
      }

      // Remove any previous global listeners from this instance
      if (connectedListenerRef.current) {
        WebMidi.removeListener('connected', connectedListenerRef.current);
      }
      if (disconnectedListenerRef.current) {
        WebMidi.removeListener('disconnected', disconnectedListenerRef.current);
      }

      // Create and store new listener references
      const onConnected = () => {
        setInputs([...WebMidi.inputs]);
        if (!selectedInputRef.current && WebMidi.inputs.length > 0) {
          const firstInput = WebMidi.inputs[0];
          setSelectedInput(firstInput);
          selectedInputRef.current = firstInput;
          attachListeners(firstInput);
        }
      };

      const onDisconnected = () => {
        setInputs([...WebMidi.inputs]);
        if (selectedInputRef.current && !WebMidi.inputs.find(i => i.id === selectedInputRef.current?.id)) {
          selectedInputRef.current?.removeListener();
          setSelectedInput(null);
          selectedInputRef.current = null;
          setActiveNotes(new Map());
        }
      };

      connectedListenerRef.current = onConnected;
      disconnectedListenerRef.current = onDisconnected;

      WebMidi.addListener('connected', onConnected);
      WebMidi.addListener('disconnected', onDisconnected);
    } catch (err: any) {
      console.error('MIDI enable error:', err);
      setError(err.message || 'Failed to enable MIDI. Ensure your browser supports Web MIDI.');
      setIsEnabled(false);
    }
  }, [attachListeners]);

  const selectInput = useCallback((inputId: string) => {
    if (selectedInputRef.current) {
      selectedInputRef.current.removeListener();
    }

    const input = WebMidi.getInputById(inputId);
    if (input) {
      setSelectedInput(input);
      selectedInputRef.current = input;
      setActiveNotes(new Map());
      attachListeners(input);
    }
  }, [attachListeners]);

  const disable = useCallback(() => {
    if (selectedInputRef.current) {
      selectedInputRef.current.removeListener();
    }
    // Remove only THIS instance's global listeners
    if (connectedListenerRef.current) {
      WebMidi.removeListener('connected', connectedListenerRef.current);
      connectedListenerRef.current = null;
    }
    if (disconnectedListenerRef.current) {
      WebMidi.removeListener('disconnected', disconnectedListenerRef.current);
      disconnectedListenerRef.current = null;
    }
    WebMidi.disable();
    setIsEnabled(false);
    setInputs([]);
    setSelectedInput(null);
    selectedInputRef.current = null;
    setActiveNotes(new Map());
    setLastNote(null);
    setLastEvent(null);
    setEvents([]);
  }, []);

  // Cleanup on unmount — only remove THIS instance's listeners
  useEffect(() => {
    return () => {
      if (selectedInputRef.current) {
        selectedInputRef.current.removeListener();
      }
      // Remove only our specific global listeners, not ALL
      if (connectedListenerRef.current && WebMidi.enabled) {
        WebMidi.removeListener('connected', connectedListenerRef.current);
        connectedListenerRef.current = null;
      }
      if (disconnectedListenerRef.current && WebMidi.enabled) {
        WebMidi.removeListener('disconnected', disconnectedListenerRef.current);
        disconnectedListenerRef.current = null;
      }
    };
  }, []);

  return {
    isEnabled,
    isSupported,
    inputs,
    selectedInput,
    activeNotes,
    lastNote,
    lastEvent,
    events,
    error,
    enable,
    selectInput,
    disable,
  };
}
