import { Fraction } from "../DataObjects";
import { CursorPosChangedData } from "../DataObjects/CursorPosChangedData";

export interface IPlaybackListener {
    cursorPositionChanged(timestamp: Fraction, data: CursorPosChangedData): void;
    pauseOccurred(o: object): void;
    selectionEndReached(o: object): void;
    resetOccurred(o: object): void;
    notesPlaybackEventOccurred(o: object): void;
    metronomeSoundOccurred(o: MetronomeSoundOccuredData): void;
    soundLoaded(instrumentId?: number, instrumentName?: string): void;
    /** When all sound fonts for all instruments are loaded and playback is ready. */
    allSoundsLoaded(): void;
}

export type MetronomeSoundOccuredData = {
    volume?: number;
    firstBeat?: boolean;
};
