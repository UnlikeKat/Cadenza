import { IAfterSheetReadingModule } from "../Interfaces";
import { MusicSheet } from "../MusicSheet";
import { MusicPartManagerIterator } from "../MusicParts";
import { Fraction } from "../../Common/DataObjects";
import { VoiceEntry, Voice } from "../VoiceData";
import { PlaybackEntry } from "./PlaybackEntry";

export class PlaybackNoteGenerator implements IAfterSheetReadingModule {
    public calculate(musicSheet: MusicSheet): void {
        const iterator: MusicPartManagerIterator = new MusicPartManagerIterator(musicSheet);

        while (!iterator.EndReached) {
            const enrolledTime: Fraction = iterator.CurrentEnrolledTimestamp;
            const audibleVEs: VoiceEntry[] = iterator.CurrentAudibleVoiceEntries();
            for (const ve of audibleVEs) {
                this.handleVoiceEntry(musicSheet, ve, enrolledTime);
            }

            // now move to the next entry
            iterator.moveToNext();
        }
    }

    private handleVoiceEntry(musicSheet: MusicSheet, ve: VoiceEntry, enrolledTimestamp: Fraction): void {
        if (ve.IsGrace) {
            return;
        }

        const voice: Voice = ve.ParentVoice;
        let playbackEntries: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry }[];
        if (!musicSheet.PlaybackDataDict.containsKey(voice)) {
            playbackEntries = [];
            musicSheet.PlaybackDataDict.setValue(voice, playbackEntries);
        } else {
            playbackEntries = musicSheet.PlaybackDataDict.getValue(voice);
        }
        for (const pe of ve.PlaybackEntries) {
            if (pe.HasNotes) {
                // 1. preparations:
                // set the final audible length of the notes (e.g. needed for ties)
                for (const pbNote of pe.Notes) {
                    pbNote.setLength();
                }

                // 2. add and place correctly in time:
                const peEnrolledTimestamp: Fraction = Fraction.plus(enrolledTimestamp, pe.TimestampShift);
                PlaybackNoteGenerator.addEntrySorted(playbackEntries, pe, peEnrolledTimestamp);
            }
        }
    }

    private static addEntrySorted(  playbackEntries: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry }[],
                                    pbEntry: PlaybackEntry, enrolledTimestamp: Fraction): void {
        if (playbackEntries.length === 0) {
            playbackEntries.push({ enrolledTimestamp: enrolledTimestamp, playbackEntry: pbEntry });
        } else {
            for (let i: number = playbackEntries.length - 1; i >= 0; i--) {
                const entry: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry } = playbackEntries[i];
                if (enrolledTimestamp.RealValue > entry.enrolledTimestamp.RealValue) {
                    if (i === playbackEntries.length - 1) {
                        playbackEntries.push({ enrolledTimestamp: enrolledTimestamp, playbackEntry: pbEntry });
                        break;
                    } else {
                        playbackEntries.splice(i + 1, 0, { enrolledTimestamp: enrolledTimestamp, playbackEntry: pbEntry });
                        break;
                    }
                }
            }
        }
    }
}
