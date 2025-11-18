import { Midi } from '@tonejs/midi';
import { create } from 'xmlbuilder2';

export async function convertMidiToMusicXml(midiFile: File | ArrayBuffer): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  if (midiFile instanceof File) {
    arrayBuffer = await midiFile.arrayBuffer();
  } else {
    arrayBuffer = midiFile;
  }

  const midi = new Midi(arrayBuffer);
  
  // Basic MusicXML structure
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('score-partwise', { version: '3.1' });

  // Part List
  const partList = root.ele('part-list');
  midi.tracks.forEach((track, index) => {
    if (track.notes.length > 0) {
      const partId = `P${index + 1}`;
      const scorePart = partList.ele('score-part', { id: partId });
      scorePart.ele('part-name').txt(track.name || `Instrument ${index + 1}`);
    }
  });

  // Parts
  midi.tracks.forEach((track, index) => {
    if (track.notes.length === 0) return;

    const partId = `P${index + 1}`;
    const part = root.ele('part', { id: partId });

    // Global settings from header
    const ppq = midi.header.ppq;
    const tsEvent = midi.header.timeSignatures[0];
    const numerator = tsEvent?.timeSignature[0] ?? 4;
    const denominator = tsEvent?.timeSignature[1] ?? 4;
    
    // Calculate measure length in ticks
    // PPQ = Pulses Per Quarter note
    // Measure length = (Numerator * PPQ) * (4 / Denominator)
    const ticksPerBeat = ppq;
    const ticksPerMeasure = (numerator * ticksPerBeat) * (4 / denominator);

    // Group notes by measure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notesByMeasure: { [key: number]: any[] } = {};
    let maxMeasure = 0;

    track.notes.forEach(note => {
      const startTick = note.ticks;
      const measureIndex = Math.floor(startTick / ticksPerMeasure);
      if (!notesByMeasure[measureIndex]) notesByMeasure[measureIndex] = [];
      notesByMeasure[measureIndex].push(note);
      if (measureIndex > maxMeasure) maxMeasure = measureIndex;
    });

    // Generate measures
    for (let m = 0; m <= maxMeasure; m++) {
      const measure = part.ele('measure', { number: (m + 1).toString() });
      const measureNotes = notesByMeasure[m] || [];

      // Attributes for first measure
      if (m === 0) {
        const attributes = measure.ele('attributes');
        attributes.ele('divisions').txt(ppq.toString());
        
        const key = attributes.ele('key');
        key.ele('fifths').txt('0'); // Default to C major for now
        
        const time = attributes.ele('time');
        time.ele('beats').txt(numerator.toString());
        time.ele('beat-type').txt(denominator.toString());
        
        const clef = attributes.ele('clef');
        // Simple heuristic: if average pitch < 60 (Middle C), use F clef
        const avgPitch = track.notes.reduce((sum, n) => sum + n.midi, 0) / track.notes.length;
        if (avgPitch < 53) { // F3
          clef.ele('sign').txt('F');
          clef.ele('line').txt('4');
        } else {
          clef.ele('sign').txt('G');
          clef.ele('line').txt('2');
        }
      }

      // Add notes
      // This is a simplified quantization. 
      // Real conversion requires handling chords, rests, and voice layers.
      // For now, we just list notes sequentially sorted by time, which might look messy but displays something.
      
      // Sort notes by time
      measureNotes.sort((a, b) => a.ticks - b.ticks);

      let currentTick = m * ticksPerMeasure;

      measureNotes.forEach(note => {
        // Add rest if there is a gap
        if (note.ticks > currentTick) {
          const restDuration = note.ticks - currentTick;
          if (restDuration > 0) {
             // TODO: Add rest logic (simplified for now, skipping rests to avoid clutter)
             // Ideally we should add <note><rest/><duration>...</duration></note>
          }
        }

        const noteEle = measure.ele('note');
        const pitch = noteEle.ele('pitch');
        
        // MIDI note to Step/Octave/Alter
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const midiVal = note.midi;
        const octave = Math.floor(midiVal / 12) - 1;
        const noteName = noteNames[midiVal % 12];
        const step = noteName.replace('#', '');
        const alter = noteName.includes('#') ? 1 : 0;

        pitch.ele('step').txt(step);
        if (alter !== 0) pitch.ele('alter').txt(alter.toString());
        pitch.ele('octave').txt(octave.toString());

        noteEle.ele('duration').txt(note.durationTicks.toString());
        noteEle.ele('type').txt(getNoteType(note.durationTicks, ppq));
        
        currentTick = note.ticks + note.durationTicks;
      });
    }
  });

  return root.end({ prettyPrint: true });
}

function getNoteType(ticks: number, ppq: number): string {
  const durationInBeats = ticks / ppq;
  if (durationInBeats >= 4) return 'whole';
  if (durationInBeats >= 2) return 'half';
  if (durationInBeats >= 1) return 'quarter';
  if (durationInBeats >= 0.5) return 'eighth';
  if (durationInBeats >= 0.25) return '16th';
  if (durationInBeats >= 0.125) return '32nd';
  return 'quarter'; // Default
}
