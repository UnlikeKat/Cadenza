import { useState, useEffect, useCallback, useRef } from 'react';
import { WebMidi, type Input } from 'webmidi';

export interface MidiNote {
  name: string;       // e.g. "C", "D#"
  octave: number;     // e.g. 4
  identifier: string; // e.g. "C4"
  number: number;     // MIDI note number 0-127
  velocity: number;   // 0-1
  timestamp: number;
}

export interface UseMidiReturn {
  isEnabled: boolean;
  isSupported: boolean;
  inputs: Input[];
  selectedInput: Input | null;
  activeNotes: Map<number, MidiNote>;
  lastNote: MidiNote | null;
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
  const [error, setError] = useState<string | null>(null);
  const selectedInputRef = useRef<Input | null>(null);

  // Store listener references so we can remove ONLY ours on cleanup
  // (WebMidi is a global singleton — calling removeListener() kills ALL hooks)
  const connectedListenerRef = useRef<((...args: any[]) => void) | null>(null);
  const disconnectedListenerRef = useRef<((...args: any[]) => void) | null>(null);

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
    });

    // Note Off
    input.addListener('noteoff', (e) => {
      setActiveNotes(prev => {
        const next = new Map(prev);
        next.delete(e.note.number);
        return next;
      });
    });
  }, []);

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
    error,
    enable,
    selectInput,
    disable,
  };
}
