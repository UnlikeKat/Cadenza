import { VoiceEntry } from "../VoiceData";
import { Fraction } from "../../Common/DataObjects";
import { PlaybackNote } from "./PlaybackNote";

export class PlaybackEntry {
    private parentVoiceEntry: VoiceEntry;
    private notes: PlaybackNote[] = [];

    constructor(parentVoiceEntry: VoiceEntry) {
        this.parentVoiceEntry = parentVoiceEntry;

        // typically a voice entry has no notes when this is called,
        // but there are cases when the voice entry is already completed and filled with notes
        for (const n of parentVoiceEntry.Notes) {
            this.Notes.push(new PlaybackNote(this, n));
        }
    }
    public get ParentVoiceEntry(): VoiceEntry {
        return this.parentVoiceEntry;
    }
    /** The relative timestamp shift compared to the parent voice entry (graphical) timestamp */
    public TimestampShift: Fraction = new Fraction();
    public get Notes(): PlaybackNote[] {
        return this.notes;
    }
    public get Length(): Fraction {
        if (this.Notes.length > 0) {
            return this.Notes[0].Length;
        }
        return undefined;
    }
    public set Length(value: Fraction) {
        for (const n of this.Notes) {
            n.Length = value;
        }
    }
    public get HasNotes(): boolean {
        return this.Notes.length > 0;
    }
}
