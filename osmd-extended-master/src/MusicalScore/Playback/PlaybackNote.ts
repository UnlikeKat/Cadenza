import { Note, MidiInstrument, NoteHeadShape } from "../VoiceData";
import { PlaybackEntry } from "./PlaybackEntry";
import { Fraction, NoteEnum } from "../../Common/DataObjects";

export class PlaybackNote {
    private parentEntry: PlaybackEntry;
    private parentNote: Note;

    constructor(playbackEntry: PlaybackEntry, parentNote: Note) {
        this.parentEntry = playbackEntry;
        this.parentNote = parentNote;
        this.ParentNote.PlaybackNote = this;
        // ToDo: needs to be changed as this doesn't work for tied notes..
        this.Length = this.ParentNote.Length;

        if (parentNote.Pitch !== undefined) {
            const isPercussion: boolean = this.ParentNote.ParentStaff.ParentInstrument.MidiInstrumentId === MidiInstrument.Percussion;
            if (isPercussion) {
                this.MidiKey = PlaybackNote.noteToMidiDrumKey(parentNote);
            } else {
                this.MidiKey = parentNote.Pitch.getHalfTone() + 12;
            }
        } else {
            this.MidiKey = 0;
        }
    }
    /** needs to be done later, when also ties are known */
    public setLength(): void {
        //ToDo: this needs to be changed, as grace notes on tied notes would be wrong!
        if (this.ParentNote.NoteTie !== undefined && this.ParentNote.NoteTie.StartNote === this.ParentNote) {
            this.Length = this.ParentNote.NoteTie.Duration;
        }
        // else {
        //     this.Length = this.ParentNote.Length;
        // }
    }
    public get ParentEntry(): PlaybackEntry {
        return this.parentEntry;
    }
    public get ParentNote(): Note {
        return this.parentNote;
    }
    public MidiKey: number;
    public Length: Fraction;
    private static noteToMidiDrumKey(note: Note): number {
        const defaultHalfTone: number = note.Pitch.getHalfTone() - 12;
        const shape: NoteHeadShape = note.Notehead?.Shape; // Notehead can be undefined, see #35 (osmd-extended)
        switch (note.Pitch.Octave) {
            case 1:
                switch (note.Pitch.FundamentalNote) {
                    case NoteEnum.D:
                        switch (shape) {
                            default:
                                return 44; // Hihat foot (pressed)
                        }
                    case NoteEnum.E:
                        switch (shape) {
                            default:
                                return 35; // Bass (left)
                        }
                    case NoteEnum.F:
                        switch (shape) {
                            default:
                                return 36; // Bass (std)
                        }
                    case NoteEnum.G:
                        switch (shape) {
                            default:
                                return 41; // Floor Tom 2
                        }
                    case NoteEnum.A:
                        switch (shape) {
                            default:
                                return 43; // Floor Tom 1
                        }
                    case NoteEnum.B:
                        switch (shape) {
                            case NoteHeadShape.TRIANGLE:
                                return 54; // tambourine
                            default:
                                return 47; // Tom 3
                        }
                    default:
                        return defaultHalfTone;
                }
            case 2:
                switch (note.Pitch.FundamentalNote) {
                    case NoteEnum.C:
                        switch (shape) {
                            case NoteHeadShape.X:
                                return 37; // Rim kick
                            default:
                                return 38; // Snare
                        }
                    case NoteEnum.D:
                        switch (shape) {
                            case NoteHeadShape.X:
                                return 59; // Ride 2
                            default:
                                return 48; // Rack Tom 2
                        }
                    case NoteEnum.E:
                        switch (shape) {
                            case NoteHeadShape.X:
                                return 42; // HiHat
                            case NoteHeadShape.CIRCLEX:
                                return 46; // HiHat Open
                            case NoteHeadShape.TRIANGLE:
                                return 56; // Cowbell
                            default:
                                return 50; // Rack Tom 1
                        }
                    case NoteEnum.F:
                        switch (shape) {
                            case NoteHeadShape.DIAMOND:
                                return 53; // Ride Bell
                            default:
                                return 51; // Ride
                        }
                    case NoteEnum.G:
                        switch (shape) {
                            case NoteHeadShape.CIRCLEX:
                            case NoteHeadShape.DIAMOND:
                                return 46; // HiHat Open
                            default:
                                return 42; // HiHat
                        }
                    case NoteEnum.A:
                        switch (shape) {
                            default:
                                return 49; // Crash 1
                        }
                    case NoteEnum.B:
                        switch (shape) {
                            default:
                                return 57; // Crash 2
                        }
                    default:
                        return defaultHalfTone;
                }
            case 3:
                switch (note.Pitch.FundamentalNote) {
                    case NoteEnum.C:
                        switch (shape) {
                            case NoteHeadShape.CIRCLEX:
                                return 52; // China
                            default:
                                return 55; // Splash
                        }
                    default:
                        return defaultHalfTone;
                }
            default:
                return defaultHalfTone;
        }
    }
}
