import {Instrument} from "./Instrument";
import {InstrumentNames} from "./InstrumentNames";
import {MidiInstrument} from "./VoiceData/Instructions/ClefInstruction";
import log from "loglevel";

export class SubInstrument {

    constructor(parentInstrument: Instrument) {
        this.parentInstrument = parentInstrument;
        this.fixedKey = -1;
        this.name = this.parseMidiInstrument(this.parentInstrument.Name);
        this.midiInstrumentID = InstrumentNames.MidiInstrument[this.name];
        this.volume = 1.0;
    }

    public idString: string;
    public midiInstrumentID: MidiInstrument;
    public volume: number;
    public pan: number;
    public fixedKey: number;
    public name: string;
    public instrumentSound: string;

    private parentInstrument: Instrument;

    public get ParentInstrument(): Instrument {
        return this.parentInstrument;
    }
    public static isPianoInstrument(instrument: MidiInstrument): boolean {
        return (instrument === MidiInstrument.Acoustic_Grand_Piano
          || instrument === MidiInstrument.Bright_Acoustic_Piano
          || instrument === MidiInstrument.Electric_Grand_Piano
          || instrument === MidiInstrument.Electric_Piano_1
          || instrument === MidiInstrument.Electric_Piano_2);
    }

    public setMidiInstrumentSound(instrumentType: string): void {
        this.midiInstrumentID = InstrumentNames.MidiInstrumentSounds[instrumentType];
    }

    public setMidiInstrument(instrumentType: string): void {
        this.midiInstrumentID = InstrumentNames.MidiInstrument[this.parseMidiInstrument(instrumentType)];
    }

    private parseMidiInstrument(instrumentType: string): string {
        // FIXME: test this function
        try {
            // find the best match for the given instrumentType:
            if (instrumentType) {
                const tmpName: string = instrumentType.toLowerCase().trim();
                for (const key in InstrumentNames.MidiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
            // if the instrumentType didn't work, use the name:
            if (this.parentInstrument.Name) {
                const tmpName: string = this.parentInstrument.Name.toLowerCase().trim();
                for (const key in InstrumentNames.MidiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
        } catch (e) {
            log.error("Error parsing MIDI Instrument. Default to Grand Piano.");
        }
        return "unnamed";
    }
}
