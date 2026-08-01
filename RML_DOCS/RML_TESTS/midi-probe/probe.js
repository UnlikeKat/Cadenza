const JZZ = require('jzz');

console.log('=== MIDI PROBE ===');
console.log('In attesa del pianoforte...\n');

JZZ().and(function() {
  // JZZ non ha infoInputs(), usa .info() globale
  const allInfo = JZZ().info();
  const inputs = allInfo.inputs;
  
  if (!inputs || inputs.length === 0) {
    console.log('Nessun dispositivo MIDI trovato!');
    console.log('Collega il pianoforte e riavvia.');
    return;
  }
  
  console.log(`Trovati ${inputs.length} dispositivi MIDI:`);
  inputs.forEach((input, i) => {
    console.log(`  [${i}] ${input.name}`);
  });
  console.log('');

  // Connetti al primo input
  const midiIn = JZZ().openMidiIn(0);
  
  midiIn.connect(function(msg) {
    const now = Date.now();
    
    console.log('---');
    console.log(`Timestamp: ${now}`);
    console.log(`Raw bytes: [${msg.slice().join(', ')}]`);
    console.log(`Hex: 0x${msg[0].toString(16)}`);
    
    // Note On (0x90-0x9F)
    if ((msg[0] & 0xF0) === 0x90 && msg[2] > 0) {
      const note = msg[1];
      const velocity = msg[2];
      const noteName = midiNoteToName(note);
      console.log(`>>> NOTE ON  | Note: ${noteName} (${note}) | Velocity: ${velocity}`);
    }
    // Note Off (0x80-0x8F) o Note On con velocity 0
    else if ((msg[0] & 0xF0) === 0x80 || ((msg[0] & 0xF0) === 0x90 && msg[2] === 0)) {
      const note = msg[1];
      const noteName = midiNoteToName(note);
      console.log(`<<< NOTE OFF | Note: ${noteName} (${note})`);
    }
    // Control Change (0xB0-0xBF)
    else if ((msg[0] & 0xF0) === 0xB0) {
      console.log(`--- CC       | Controller: ${msg[1]} | Value: ${msg[2]}`);
    }
    else {
      console.log(`??? UNKNOWN  | ${msg.slice()}`);
    }
  });
  
  console.log('Ascoltando... Suona il pianoforte!\n');
});

function midiNoteToName(n) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(n / 12) - 1;
  return `${names[n % 12]}${octave}`;
}