const JZZ = require('jzz');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'events.json');

// Clear previous output
fs.writeFileSync(OUTPUT_FILE, '');

console.log('=== MIDI PROBE (webmidi-compatible output) ===');
console.log(`Output file: ${OUTPUT_FILE}`);
console.log('In attesa del pianoforte...\n');

// ── Note number → name/accidental/octave (same logic as webmidi v3) ──
// webmidi uses sharps by default; C4 = 60 (scientific pitch notation)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function buildNote(number, attackRaw, releaseRaw) {
  const name = NOTE_NAMES[number % 12];
  const accidental = name.length > 1 ? name.slice(1) : '';  // "#" or ""
  const letter = name[0];
  const octave = Math.floor(number / 12) - 1;  // C4 = 60 → octave 4

  return {
    name: letter,
    accidental: accidental,
    octave: octave,
    identifier: letter + accidental + octave,
    number: number,
    attack: attackRaw !== null ? attackRaw / 127 : 0.5,       // webmidi default
    rawAttack: attackRaw !== null ? attackRaw : 64,
    release: releaseRaw !== null ? releaseRaw / 127 : 0.5,
    rawRelease: releaseRaw !== null ? releaseRaw : 64,
    duration: Infinity,  // webmidi default for input notes
  };
}

JZZ().and(function() {
  const allInfo = JZZ().info();
  const inputs = allInfo.inputs;

  if (!inputs || inputs.length === 0) {
    console.log('Nessun dispositivo MIDI trovato!');
    return;
  }

  console.log(`Trovati ${inputs.length} dispositivi MIDI:`);
  inputs.forEach((input, i) => {
    console.log(`  [${i}] ${input.name}`);
  });
  console.log('');

  const midiIn = JZZ().openMidiIn(0);

  midiIn.connect(function(msg) {
    const timestamp = performance.now();  // DOMHighResTimeStamp equivalent
    const statusByte = msg[0];
    const statusHigh = statusByte & 0xF0;  // upper nibble
    const channel = (statusByte & 0x0F) + 1;  // webmidi: 1-16

    let eventObj = null;

    // ── Note On (0x90-0x9F) with velocity > 0 ──
    if (statusHigh === 0x90 && msg[2] > 0) {
      const note = buildNote(msg[1], msg[2], null);
      eventObj = {
        type: 'noteon',
        note: note,
        channel: channel,
        timestamp: timestamp,
        rawBytes: Array.from(msg.slice()),
      };
    }
    // ── Note Off (0x80-0x8F) or Note On with velocity 0 ──
    else if (statusHigh === 0x80 || (statusHigh === 0x90 && msg[2] === 0)) {
      const releaseVel = statusHigh === 0x80 ? msg[2] : 0;
      const note = buildNote(msg[1], null, releaseVel);
      eventObj = {
        type: 'noteoff',
        note: note,
        channel: channel,
        timestamp: timestamp,
        rawBytes: Array.from(msg.slice()),
      };
    }
    // ── Control Change (0xB0-0xBF) ──
    else if (statusHigh === 0xB0) {
      eventObj = {
        type: 'controlchange',
        controller: msg[1],
        value: msg[2],  // webmidi v3: raw 0-127, NOT normalized
        channel: channel,
        timestamp: timestamp,
        rawBytes: Array.from(msg.slice()),
      };
    }
    // ── Program Change (0xC0-0xCF) ──
    else if (statusHigh === 0xC0) {
      eventObj = {
        type: 'programchange',
        value: msg[1],
        channel: channel,
        timestamp: timestamp,
        rawBytes: Array.from(msg.slice()),
      };
    }
    // ── Channel Aftertouch / Channel Pressure (0xD0-0xDF) ──
    else if (statusHigh === 0xD0) {
      eventObj = {
        type: 'channelaftertouch',
        value: msg[1] / 127,  // normalized 0-1
        channel: channel,
        timestamp: timestamp,
        rawBytes: Array.from(msg.slice()),
      };
    }
    // ── Pitch Bend (0xE0-0xEF) ──
    else if (statusHigh === 0xE0) {
      const raw14 = msg[1] + (msg[2] << 7);  // 14-bit: 0-16383
      eventObj = {
        type: 'pitchbend',
        value: (raw14 - 8192) / 8192,  // normalized -1..+1
        channel: channel,
        timestamp: timestamp,
        rawBytes: Array.from(msg.slice()),
      };
    }
    // ── System Real-Time / Common ──
    else {
      const typeNames = {
        0xF0: 'sysex', 0xF1: 'timecode', 0xF2: 'songposition',
        0xF3: 'songselect', 0xF6: 'tunerequest', 0xF8: 'clock',
        0xFA: 'start', 0xFB: 'continue', 0xFC: 'stop',
        0xFE: 'activesensing', 0xFF: 'reset',
      };
      eventObj = {
        type: typeNames[statusByte] || 'unknown',
        channel: undefined,
        timestamp: timestamp,
        rawBytes: Array.from(msg.slice()),
      };
    }

    // ── Write to JSON file (one JSON object per line = JSONL) ──
    fs.appendFileSync(OUTPUT_FILE, JSON.stringify(eventObj) + '\n');

    // ── Console output (human-readable) ──
    console.log('---');
    console.log(`Timestamp: ${timestamp.toFixed(3)} ms`);

    if (eventObj.type === 'noteon') {
      console.log(`>>> NOTE ON  | ${eventObj.note.identifier} (MIDI ${eventObj.note.number}) | attack: ${eventObj.note.attack.toFixed(3)} (raw ${eventObj.note.rawAttack}) | ch${eventObj.channel}`);
    } else if (eventObj.Type === 'noteoff') {
      console.log(`<<< NOTE OFF | ${eventObj.note.identifier} (MIDI ${eventObj.note.number}) | release: ${eventObj.note.release.toFixed(3)} (raw ${eventObj.note.rawRelease}) | ch${eventObj.channel}`);
    } else if (eventObj.type === 'controlchange') {
      console.log(`--- CC       | controller: ${eventObj.controller} | value: ${eventObj.value} | ch${eventObj.channel}`);
    } else {
      console.log(`??? ${eventObj.type.toUpperCase()} | raw: [${eventObj.rawBytes.join(', ')}]`);
    }
  });

  console.log('Ascoltando... Suona il pianoforte!');
  console.log('I eventi vengono salvati in events.json (formato JSONL)\n');
});
