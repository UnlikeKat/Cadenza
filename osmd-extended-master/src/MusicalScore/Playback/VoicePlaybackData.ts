import { Voice } from "../VoiceData";
import { Fraction } from "../../Common/DataObjects";
import { PlaybackEntry } from "./PlaybackEntry";
import { EngravingRules } from "../Graphical/EngravingRules";

export class VoicePlaybackData {
    private parentVoice: Voice;
    private readonly playbackEntries: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry }[] = [];
    private readonly dueEntries: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry }[] = [];
    private nextEntryTimestamp: Fraction;
    private rules: EngravingRules;

    /**
     * Holds the list of all (enrolled) playback entries for a certain voice within a part in the musicsheet.
     * The list is sorted by the enrolled timestamp and a playback entry can be in the list more than once (due to repetitions)
     */
    constructor (voice: Voice, playbackEntries: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry}[],
        rules: EngravingRules) {
        this.parentVoice = voice;
        this.playbackEntries = playbackEntries;
        this.rules = rules;
    }

    public get ParentVoice(): Voice {
        return this.parentVoice;
    }

    public get PlaybackEntries(): { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry }[] {
        return this.playbackEntries;
    }

    /** the index of the current entry to play */
    public playbackIndex: number;

    /** holds all playback entries that shall or should have been played */
    public get DueEntries(): { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry }[] {
        return this.dueEntries;
    }

    /** the timestamp of the next entry which needs to be awaiten */
    public get NextEntryTimestamp(): Fraction {
        return this.nextEntryTimestamp;
    }

    public isAudible(): boolean {
        return this.ParentVoice.Audible;
        // TODO also check parentStaff.audible. Currently not referenced / reachable in this class.
    }

    public reset(absoluteTimestamp: Fraction): Fraction {
        this.playbackIndex = 0;
        this.nextEntryTimestamp = undefined;
        this.dueEntries.clear();

        if (!this.ParentVoice.Audible) {
            this.playbackIndex = 0;
            return undefined;
        }

        let entryFound: boolean = false;
        for (let i: number = this.playbackIndex; i < this.playbackEntries.length; i++) {
            const entry: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry } = this.playbackEntries[i];

            if (entry.playbackEntry.ParentVoiceEntry.ParentSourceStaffEntry.AbsoluteTimestamp.RealValue > absoluteTimestamp.RealValue ||
                absoluteTimestamp.RealValue === 0
                // with only "> RealValue", sometimes the first note of a piece is not played (test_repeat_left_barline_simple).
                //   with ">= RealValue", sometimes with precount a note before the cursor position is played.
                //   hence leaving "> RealValue" and checking for RealValue === 0 seems to solve both problems.
                //   see osmd-extended issue 136
            ) {
                this.nextEntryTimestamp = entry.enrolledTimestamp;
                this.playbackIndex = Math.max(0, i - 1);
                entryFound = true;
                break;
            }
        }

        // fix for starting from last note playing all notes (#28 osmd-extended):
        if (!entryFound && this.playbackEntries.length > 0) {
            this.playbackIndex = this.playbackEntries.length - 1;
        }

        return this.nextEntryTimestamp;
    }

    public update(enrolledTimestamp: Fraction): Fraction {
        this.nextEntryTimestamp = undefined;
        this.dueEntries.clear();
        if (!this.ParentVoice.Audible) {
            return undefined;
        }

        // TODO if playback is paused and the cursor set to the last note in Beethoven - Geliebte, there are 5 playback entries.
        //   this is fixed below in the continue statements, but ideally we'd filter them out beforehand.
        for (let i: number = this.playbackIndex; i < this.playbackEntries.length; i++) {
            const entry: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry } = this.playbackEntries[i];

            if (entry.enrolledTimestamp.RealValue > enrolledTimestamp.RealValue) {
                this.nextEntryTimestamp = entry.enrolledTimestamp;
                this.playbackIndex = i;
                break;
            }
            const maxEntryTimestamp: Fraction = entry.enrolledTimestamp.clone();
            maxEntryTimestamp.Add(entry.playbackEntry.Notes[0].Length);
            if (entry.enrolledTimestamp.lt(enrolledTimestamp)) {
                if (!this.rules.PlayAlreadyStartedNotesFromCursorPosition) {
                    const safetyInterval: number = this.rules.PlaybackSkipNotesSafetyInterval; // usually 0.02
                    if (Math.abs(entry.enrolledTimestamp.RealValue - enrolledTimestamp.RealValue) > safetyInterval) {
                        continue; // don't play notes that started before current cursor position
                        // note that we'd ideally check entry < enrolled, but enrolled is imprecise,
                        //   so e.g. if you start at a timestamp 5.5, enrolled will be ~5.5019
                        //   so we have to add this tolerance interval for allowing a max timestamp,
                        //   otherwise the current notes under the cursor wouldn't even be played.
                    }
                }
                if (maxEntryTimestamp.lt(enrolledTimestamp)) {
                    continue; // don't play notes that have already ended
                }
            }
            this.dueEntries.push(entry);
        }

        if (this.nextEntryTimestamp === undefined) {
            if (this.playbackEntries.length > 0) {
                const lastEntry: {enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry} = this.playbackEntries.last();
                const lastEntryEndTs: Fraction = Fraction.plus(lastEntry.enrolledTimestamp, lastEntry.playbackEntry.Length);
                if (lastEntryEndTs.RealValue > enrolledTimestamp.RealValue) {
                    this.nextEntryTimestamp = lastEntryEndTs;
                }
            }

            this.playbackIndex = Number.MAX_SAFE_INTEGER;
        }

        return this.nextEntryTimestamp;
    }

}
