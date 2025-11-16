import { MusicSheet } from "../MusicSheet";
import { Dictionary } from "typescript-collections";
import { Fraction } from "../../Common/DataObjects";
import { Voice } from "../VoiceData";
import { PlaybackEntry } from "./PlaybackEntry";
import { VoicePlaybackData } from "./VoicePlaybackData";

export class PlaybackIterator {
    private musicSheet: MusicSheet;
    private voiceCursors: Dictionary<Voice, VoicePlaybackData> = new Dictionary<Voice, VoicePlaybackData>();
    private nextEntryTimestamp: Fraction;
    private dueEntries: {enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry}[];

    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
        for (const v of musicSheet.PlaybackDataDict.keys()) {
            const data: VoicePlaybackData = new VoicePlaybackData(v, musicSheet.PlaybackDataDict.getValue(v), musicSheet.Rules);
            this.voiceCursors.setValue(v, data);
        }
        this.Reset();
    }

    public get NextEntryTimestamp(): Fraction {
        return this.nextEntryTimestamp;
    }

    public get DueEntries(): {enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry}[] {
        return this.dueEntries;
    }

    public Update(enrolledTimestamp: Fraction): {enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry}[] {
        const dueEntries: {enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry}[] = [];
        let closestNextTimestamp: Fraction = undefined;
        for (const cursor of this.voiceCursors.values()) {
            const cursorNextTimestamp: Fraction = cursor.update(enrolledTimestamp);
            dueEntries.push(...cursor.DueEntries);
            if (cursorNextTimestamp !== undefined && (closestNextTimestamp === undefined || closestNextTimestamp.RealValue > cursorNextTimestamp.RealValue)) {
                closestNextTimestamp = cursorNextTimestamp;
            }
        }
        this.nextEntryTimestamp = closestNextTimestamp;
        this.dueEntries = dueEntries;
        return this.DueEntries;
    }

    public Reset(): Fraction {
        this.nextEntryTimestamp = undefined;
        const dueEntries: {enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry}[]  = [];
        let closestNextTimestamp: Fraction = undefined;
        for (const cursor of this.voiceCursors.values()) {
            const cursorNextTimestamp: Fraction = cursor.reset(this.musicSheet.SelectionStart);
            dueEntries.push(...cursor.DueEntries);
            if (cursorNextTimestamp !== undefined && (closestNextTimestamp === undefined || closestNextTimestamp.RealValue > cursorNextTimestamp.RealValue)) {
                closestNextTimestamp = cursorNextTimestamp;
            }
        }
        this.nextEntryTimestamp = closestNextTimestamp;
        this.dueEntries = dueEntries;
        return this.nextEntryTimestamp;
    }
}
