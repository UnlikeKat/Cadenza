import { ITimingSource } from "../Common/Interfaces/ITimingSource";
import { IMessageViewer } from "../Common/Interfaces/IMessageViewer";
import { IAudioPlayer } from "../Common/Interfaces/IAudioPlayer";
import { MusicPartManager, MusicPartManagerIterator } from "../MusicalScore/MusicParts";
import { PlaybackIterator } from "../MusicalScore/Playback/PlaybackIterator";
import { Dictionary } from "typescript-collections";
import { Staff, SourceMeasure, VoiceEntry, Note, MidiInstrument } from "../MusicalScore/VoiceData";
import { Fraction } from "../Common/DataObjects";
import { MetronomeInstrument } from "./MetronomeInstrument";
import { CursorPosChangedData } from "../Common/DataObjects/CursorPosChangedData";
import { Repetition } from "../MusicalScore/MusicSource";
import { TextTranslation } from "../Common/Strings/TextTranslation";
import { NoteState, Instrument, SubInstrument, MusicSheet, PlaybackNoteGenerator } from "../MusicalScore";
import { DynamicsContainer } from "../MusicalScore/VoiceData/HelperObjects";
import { PlaybackEntry } from "../MusicalScore/Playback/PlaybackEntry";
import { ContinuousDynamicExpression } from "../MusicalScore/VoiceData/Expressions/ContinuousExpressions";
import { PlaybackNote } from "../MusicalScore/Playback/PlaybackNote";
import log from "loglevel";
import { IAudioMetronomePlayer } from "../Common/Interfaces/IAudioMetronomePlayer";
import { PlaybackState, MessageBoxType } from "../Common/Enums/PsEnums";
import { IPlaybackListener } from "../Common/Interfaces/IPlaybackListener";
import { IPlaybackParametersListener } from "../Common/Interfaces/IPlaybackParametersListener";
import { AbstractExpression } from "../MusicalScore/VoiceData/Expressions";

export class ChannelNote {
    public note: PlaybackNote;
    public key: number;
    public channel: number;

    constructor(k: number, c: number, n: PlaybackNote = undefined) {
        this.note = n;
        this.key = k;
        this.channel = c;
    }
}

export class PlaybackManager implements IPlaybackParametersListener {
    public timingSource: ITimingSource;
    protected resetRequested: boolean;
    protected loopTriggeredReset: boolean;
    protected tempoUserFactor: number;
    public currentBPM: number;
    protected overrideBPM: number = undefined;
    protected listeners: IPlaybackListener[] = [];
    public addListener(listener: IPlaybackListener): void {
        if (this.listeners.includes(listener)) {
            return;
        }
        this.listeners.push(listener);
    }
    public removeListener(listenerToRemove: IPlaybackListener): void {
        const index: number = this.listeners.indexOf(listenerToRemove);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }
    private readonly percussionChannel: number = 10; // this is a definition of the midi interface (cannot be changed)
    private readonly metronomeChannel: number = 9;
    private messageViewer: IMessageViewer;
    private audioMetronomePlayer: IAudioMetronomePlayer;
    public audioPlayer: IAudioPlayer<any>;
    private musicPartManager: MusicPartManager;
    private cursorIterator: MusicPartManagerIterator;
    get CursorIterator(): MusicPartManagerIterator {
        return this.cursorIterator;
    }
    private playbackIterator: PlaybackIterator;
    //private Dictionary<int, MidiChannelInfo> instrumentsPerMidiSoundDict = new Dictionary<int, MidiChannelInfo>();
    //private Dictionary<int, int> midiSoundToChannelMappingDict = new Dictionary<int, int>();
    //private int[] midiChannelToSoundArray = new int[16];
    //Staff is not considered Unique for key purposes here. Had to use something unique - staff ID
    private instrumentToStaffToMidiChannelDict: Dictionary<Staff, number> = new Dictionary<Staff, number>();
    //store this data just in case
    private instrumentIdMapping: Dictionary<number, Instrument> = new Dictionary<number, Instrument>();
    public get InstrumentIdMapping(): Dictionary<number, Instrument> {
        return this.instrumentIdMapping;
    }
    //private List<int> staffIndexToMidiChannelMapping = new List<int>();
    private freeMidiChannels: number[] = [];
    private notesToStop: Dictionary<Fraction, ChannelNote[]> = new Dictionary<Fraction, ChannelNote[]>();

    private metronomeNote: ChannelNote = new ChannelNote(88, this.metronomeChannel);
    private metronomeNoteFirstBeat: ChannelNote = new ChannelNote(64, this.metronomeChannel);


    private currentMeasure: SourceMeasure = undefined;
    private currentTimestamp: Fraction = undefined;
    private closestNextTimestamp: Fraction = undefined;
    private currentMetronomeBaseTimestamp: Fraction = undefined;
    private currentBeatDuration: Fraction = undefined;
    private currentIteratorSourceTimeStamp: Fraction = undefined;
    private beatCounter: number = 0;

    protected runningState: PlaybackState = PlaybackState.Stopped;
    private isRunning: boolean = false;
    private isInitialized: boolean = false;     // make sure midi device gets opened only once
    private nextIteratorTimestamp: Fraction;
    private playNextMetronomeAt: Fraction;
    // private masterTranspose: number = 0;

    private isPlaying: boolean = false;
    private metronome: MetronomeInstrument;
    private metronomeSoundPlayed: boolean = false;
    /** Whether a dummy sound was played to initialize the audio context / enable sound (on iOS). */
    public DummySoundPlayed: boolean = false;
    public StopAtUnrenderedMeasures: boolean = true; // stop when not in rendering range. automatically set to false if playing without rendering
    public drumsLoaded: boolean = false;
    public metronomeLoaded: boolean = false;

    private tempoImpactFactor: number = 1.0;
    private sheetStartBPM: number;
    private currentReferenceBPM: number;
    private readonly defaultVolume: number = 0.8;
    private currentVolume: number = this.defaultVolume;
    private dynamicImpactFactor: number = 0.6;
    private scorePositionChangedData: CursorPosChangedData = new CursorPosChangedData();
    private tooManyInstruments: boolean = false;

    private currentRepetition: Repetition;
    private currentMeasureIndex: number;
    private metronomeOnlyBPM: number = 100;
    // private playbackThreadSyncObject = new object(); // TODO MB: Handle this.
    private readonly highlightPlayedNotes: boolean = false;

    private startRhythmBeats: number;
    private startRhythmDenominator: number;
    private isPreCounting: boolean;
    public MoveCursorDuringPrecount: boolean = true;
    private fermataActive: boolean;
    private doPreCount: boolean = true;
    public IgnoreFixedInstrumentKeysForPercussion: boolean = true;

    constructor (timingSource: ITimingSource, audioMetronomePlayer: IAudioMetronomePlayer, audioPlayer: IAudioPlayer<any>, messageViewer: IMessageViewer) {
        const metronomeLabel: string = TextTranslation.translateText("Playback/LabelMetronome", "Metronome");
        this.metronome = new MetronomeInstrument(-1, metronomeLabel, false, true, 0.0, MidiInstrument.Percussion);
        this.timingSource = timingSource;
        this.audioMetronomePlayer = audioMetronomePlayer;
        this.audioPlayer = audioPlayer;
        this.messageViewer = messageViewer;
    }

    public get RunningState(): PlaybackState {
        return this.runningState;
    }
    public set RunningState(value: PlaybackState) {
        this.runningState = value;
    }

    public DoPlayback: boolean;

    /** Do the initial pre-count */
    public get DoPreCount(): boolean {
        return this.doPreCount;
    }
    public set DoPreCount(value: boolean) {
        if (this.doPreCount !== value) {
            this.doPreCount = value;
        }
    }

    public PreCountMeasures: number;
    public PreCountBeats: number;

    public get Metronome(): MetronomeInstrument {
        return this.metronome;
        // this previously returned type ISettableInstrument instead of MetronomeInstrument, seemingly for no reason.
        //   that makes it harder to call Metronome.PreCountVolume, needing to cast Metronome to MetronomeInstrument.
    }

    public get MetronomeOnlyBPM(): number {
        return this.metronomeOnlyBPM;
    }
    public set MetronomeOnlyBPM(value: number) {
        this.metronomeOnlyBPM = value;
    }

    // public get Transpose(): number {
    //     return this.masterTranspose;
    // }
    // public set Transpose(value: number) {
    //     this.masterTranspose = value;
    // }

    public get OriginalBpm(): number {
        return this.currentReferenceBPM;
    }

    /** will be activated when any solo flag of an Instrument, Voice or Staff is set to true. */
    public SoloActive: boolean;
    public SoloAttenuationValue: number = 0;

    // Only used for debug and scheduling precision measurements
    //private wantedNextIteratorTimestampMs: number = 0;

    /** Play dummy sound to initialize audio context (e.g. on user click for iOS) */
    public playDummySound(): void {
        const context: AudioContext = this.audioPlayer.ac;
        // create empty buffer and play it (to initialize context on user click)
        const buffer: AudioBuffer = context.createBuffer(1, 1, 22050);
        const source: AudioBufferSourceNode = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);

        // play the buffer. noteOn is the older version of start()
        if (source.start) {
            source.start(0);
        } else {
            (source as any).noteOn(0); // this was the old way to start a sound
        }

        this.DummySoundPlayed = true;
    }

    /** Play all notes that are under the cursor (highlighted), across all instruments. */
    public playNotesUnderCursor(stopCurrentlyPlayingNotes: boolean = true, useActualNoteLength: boolean = false): void {
        if (stopCurrentlyPlayingNotes) {
            this.stopAllCurrentlyPlayingNotes();
        }
        for (const ve of this.CursorIterator.CurrentVoiceEntries) {
            this.playVoiceEntry(ve, false, useActualNoteLength);
        }
    }

    /** Play a voice entry, which usually contains a single note or a chord (e.g. playVoiceEntry(gNote.parentVoiceEntry)).
     * To play a single note of a chord, use playNote().
     */
    public playVoiceEntry(voiceEntry: VoiceEntry,
        stopCurrentlyPlayingNotes: boolean = true,
        useActualNoteLength: boolean = false
    ): void {
        const ve: VoiceEntry = voiceEntry;
        if (ve !== undefined) {
            // lock(this.playbackThreadSyncObject) {
                if (stopCurrentlyPlayingNotes) {
                    this.stopAllCurrentlyPlayingNotes();
                }

                if (this.highlightPlayedNotes) {
                    const notes: Note[] = [];
                    for (const note of ve.Notes) {
                        note.state = NoteState.Selected;
                        notes.push(note);
                    }
                    //this.NotesPlaybackEventOccurred(notes);
                }

                //int staffIndex = this.musicPartManager.MusicSheet.getIndexFromStaff(ve.Notes[0].ParentStaff);
                for (const note of ve.MainPlaybackEntry.Notes.filter(n => n.MidiKey !== 0)) {
                    this.playNote(note.ParentNote, useActualNoteLength);
                }

                // TODO MB: Handle this
                // Task stopper = new Task(() => {
                //     EventWaitHandle waiter = new EventWaitHandle(false, EventResetMode.AutoReset);
                //     waiter.WaitOne(200);
                //     lock(this.playbackThreadSyncObject) {
                //         if (this.audioPlayer !== undefined) {
                //             foreach(var n in notesToPlay) {
                //                 this.audioPlayer.stopSound(n.channel, n.key);
                //             }
                //     }
                //     }

                //     // redraw to color notes normal if highlighted in playback
                //     //this.phonicScoreInterface.RedrawGraphicalMusicSheet();
                // });
                // stopper.Start();
            // }
        }
    }

    /** Play a single note (e.g. osmd.cursor.GNotesUnderCursor()[0].sourceNote) */
    public playNote(note: Note, useActualNoteLength: boolean = false): void {
        const channel: number = this.instrumentToStaffToMidiChannelDict.getValue(note.ParentStaff);
        const instrument: Instrument = note.ParentVoiceEntry?.ParentVoice.Parent;
        const isPercussion: boolean = instrument?.MidiInstrumentId === MidiInstrument.Percussion;
        const volume: number = 0.8;

        const playbackNote: PlaybackNote = note.PlaybackNote;
        if (!playbackNote) { // e.g. for rests
            log.info("restNote!");
            return;
        }
        const transpose: number = this.musicPartManager.MusicSheet.Transpose;
        const instrumentPlaybackTranspose: number = instrument.PlaybackTranspose;

        let key: number = playbackNote.MidiKey;
        if (!isPercussion) {
            key += instrumentPlaybackTranspose + transpose;
        }
        if (note.PlaybackInstrumentId !== undefined) {
            const notePlaybackInstrument: SubInstrument =
                instrument.getSubInstrument(note.PlaybackInstrumentId);
            if (notePlaybackInstrument !== undefined) {
                if (notePlaybackInstrument.fixedKey >= 0) {
                    key = notePlaybackInstrument.fixedKey;
                }
            }
        }

        // calculate stop time and remember it
        // const stopAt: Fraction = Fraction.plus(this.cursorIterator.CurrentEnrolledTimestamp, note.Length);
        try {
            if (this.audioPlayer !== undefined) {
                //const noteLengthFraction: Fraction = Fraction.createFromFraction(note.Length);
                let length: number = 500; // default length, as before (500ms)
                if (useActualNoteLength) {
                    length = this.timingSource.getDurationInMs(note.Length);
                }
                this.audioPlayer.playSound(channel, key, volume, length);
            }
        } catch (ex) {
            log.info("PlaybackManager.playVoiceEntry: ", ex);
        }
    }

    /** Stop playing a note. Will currently stop all notes in the channel because of implementation details. */
    public stopNote(note: Note): void {
        const instrument: Instrument = note.ParentVoiceEntry.ParentVoice.Parent;
        const staff: Staff = note.ParentVoiceEntry.Notes[0].ParentStaff;
        // const staffIndex: number =
        //     MusicSheet.getIndexFromStaff(staff);
        let channel: number = this.instrumentToStaffToMidiChannelDict.getValue(staff);
        const isPercussion: boolean = instrument.MidiInstrumentId === MidiInstrument.Percussion;
        // choose percussion channel if Selected
        if (isPercussion) {
            channel = this.percussionChannel;
        }
        this.audioPlayer.stopSound(channel, 0);
    }

    public initialize(musicPartMng: MusicPartManager): void {
        // lock(this.playbackThreadSyncObject) {
        if (this.isInitialized) {
            this.stopAllCurrentlyPlayingNotes();
            if (this.audioPlayer !== undefined) {
                this.audioPlayer.close();
            }

            this.cursorIterator = undefined;
            this.playbackIterator = undefined;
        }

        this.isInitialized = false;

        this.musicPartManager = musicPartMng;
        if (this.musicPartManager !== undefined) {
            const musicSheet: MusicSheet = this.musicPartManager.MusicSheet;
            // TODO MB: Converted musicSheetParameterChanged to setBpm in this file. Handle following line.
            //musicSheet.MusicSheetParameterChanged += this.musicSheetParameterChanged;

            this.cursorIterator = this.musicPartManager.getIterator();
            this.playbackIterator = new PlaybackIterator(musicSheet);

            if (this.audioPlayer !== undefined) {
                const uniqueMidiInstruments: MidiInstrument[] = Array.from(new Set(musicSheet.Instruments.map(item => item.MidiInstrumentId)));

                this.audioPlayer.open(uniqueMidiInstruments, 16);
                // set drums:
                // TODO don't load drums in non-drum sheets
                this.audioPlayer.setSound(this.percussionChannel, MidiInstrument.Percussion).then(() => {
                    this.drumsLoaded = true;
                    for (const listener of this.listeners) {
                        listener.soundLoaded(undefined, "drums");
                        const instruments: Instrument[] = this.instrumentIdMapping.values();
                        if (instruments.length === 1 && instruments[0].MidiInstrumentId === MidiInstrument.Percussion) {
                            instruments[0].soundfontLoaded = true;
                            listener.allSoundsLoaded(); // TODO maybe need to wait for metronome? see below
                        }
                    }
                });

                // TODO might be unnecessary to use another channel,
                //   if we find sounds in the percussion channel that match these for metronomeNote (88 and 64 for woodblock):
                if (!this.metronomeLoaded) {
                    this.audioPlayer.setSound(this.metronomeChannel, MidiInstrument.Woodblock).then(() => {
                        this.metronomeLoaded = true;
                        for (const listener of this.listeners) {
                            listener.soundLoaded(undefined, "metronome");
                        }
                    });
                }
            }

            this.currentReferenceBPM = this.sheetStartBPM = musicSheet.getExpressionsStartTempoInBPM();
            this.tempoUserFactor = musicSheet.userStartTempoInBPM / this.sheetStartBPM;
            let instrumentId: number = 0;
            this.tooManyInstruments = false;

            // reset the dicts and channel mappings
            //this.staffIndexToMidiChannelMapping.Clear();
            this.instrumentToStaffToMidiChannelDict.clear();
            this.instrumentIdMapping.clear();
            for (let i: number = 0; i < 16; i++) {
                if (i !== this.percussionChannel && i !== this.metronomeChannel) {
                    // make sure not to overwrite metronome or percussion channel (#131)
                    this.freeMidiChannels.push(i);
                }
            }

            for (const instrument of musicSheet.Instruments) {
                this.instrumentIdMapping.setValue(instrumentId, instrument);

                for (const staff of instrument.Staves) {
                    // just add a list element - calcMidiChannel() will provide the right value.
                    //this.staffIndexToMidiChannelMapping.Add(-1);
                    this.instrumentToStaffToMidiChannelDict.setValue(staff, -1);
                }
                this.setSound(instrumentId, instrument.MidiInstrumentId);

                instrumentId++;
            }

            if (this.audioPlayer !== undefined && this.tooManyInstruments) {
                const errorMsg: string = TextTranslation.translateText(
                    "MidiNumberError",
                    "This music sheet has more parts than are supported for midi playback. " +
                    "Some parts will not be played with the desired instrument sounds."
                    );
                if (this.messageViewer !== undefined && this.messageViewer.MessageOccurred !== undefined) {
                    this.messageViewer.MessageOccurred(MessageBoxType.Warning, errorMsg);
                }
            }

            this.checkForSoloDeactivated();
        }

        this.isInitialized = true;
        // }

        this.reset();
    }

    public async play(): Promise<void> {
        const sheet: MusicSheet = this.musicPartManager.MusicSheet;

        // when drawFroMeasureNumber > 1 with pickup measure: fix playback stopping (and cursor not set to first rendered measure)
        const firstRenderedMeasure: SourceMeasure = sheet.SourceMeasures[sheet.Rules.MinMeasureToDrawIndex];
        if (sheet.Rules.NeverPlayUnrenderedMeasures &&
            sheet.Rules.RenderCount > 0 &&
            this.playbackIterator.NextEntryTimestamp?.lt(firstRenderedMeasure.AbsoluteTimestamp)
            // null check on NextEntryTimestamp: see test_breath_mark_end_measure_simple.musicxml, null error otherwise
        ) {
            sheet.SelectionStart = firstRenderedMeasure.AbsoluteTimestamp;
            this.currentTimestamp = sheet.SelectionStart;
            this.setPlaybackStart(sheet.SelectionStart); // when drawing range set e.g. to min measure 2
            // this could be too intrusive if you want to play unrendered measures, so it's disabled
            this.updateScoreCursorPosition(false);
        }

        if (this.cursorIterator !== undefined && this.cursorIterator.EndReached && this.currentTimestamp.gte(this.cursorIterator.CurrentEnrolledTimestamp)) {
            console.log("End reached, resetting");
            this.reset();
        }

        this.isPlaying = true;
        this.RunningState = PlaybackState.Running;
        if (sheet.Rules.RenderCount === 0) { // playback without rendering
            this.StopAtUnrenderedMeasures = false;
        }
        await this.timingSource.start();
        this.loop();
    }

    public async pause(): Promise<void> {
        // lock(this.playbackThreadSyncObject) {
            this.isPlaying = false;
            // stop all active midi notes:
            this.stopAllCurrentlyPlayingNotes();

            // inform sample player to e.g. dispose used samples:
            if (this.audioPlayer !== undefined) {
                this.audioPlayer.playbackHasStopped();
            }

            // notify delegates (coreContainer) that the playing has finished:
            this.RunningState = PlaybackState.Stopped;
            await this.timingSource.pause();
            try {
                //bool endReached = this.iterator !== undefined && this.iterator.EndReached;
                for (const listener of this.listeners) {
                    listener?.pauseOccurred(undefined);
                }
            } catch (ex) {
                log.debug("PlaybackManager.pause: ", ex);
            }
        // }
    }

    /** Effectively resets the playback to osmd.Sheet.SelectionStart.
     *  If you want to reset to the start of the sheet,
     *    call osmd.Sheet.SelectionStart = osmd.Sheet.sourceMeasures[0].AbsoluteTimestamp beforehand.
     * resetIterator will also reset the state of repetitions (whether / how many times they have been played).
     */
    public reset(resetIterator: boolean = true): void {
        // lock(this.playbackThreadSyncObject) {
        //this.resetRequested = true;
        this.doReset(this.DoPreCount, this.PreCountMeasures, resetIterator); // resetIterator will reset repetitions

        if (this.musicPartManager === undefined) {
            return;
        }

        if (this.RunningState === PlaybackState.Stopped) {
            //this.isPlaying = true;
        }
        for (const listener of this.listeners) {
            listener?.resetOccurred(undefined);
        }
        // }
    }

    /** Starts play() from a time in milliseconds. Now handles repeats correctly.
     * So, if the piece is 5 measures lasting 1 second each, with a full repeat,
     *   playing from 5 seconds on will start on the first note, in the second repeat, not repeating again.
     * If you don't want the targetTime to include repeats, use playFromMsIgnoringRepeats().
     */
    public async playFromMs(targetTimeInMs: number, startPlay: boolean = true): Promise<void> {
        await this.pause();
        this.playbackIterator.Reset();
        this.cursorIterator = new MusicPartManagerIterator(this.musicPartManager.MusicSheet);
        let lastInMeasureTimeStamp: Fraction = new Fraction(0, 1);
        let lastMeasureDuration: Fraction;
        let currentTimeStamp: Fraction = this.cursorIterator.currentTimeStamp;
        let lastTimeStamp: Fraction;
        let currentMs: number = 0;
        this.timingSource.setBpm(this.cursorIterator.CurrentBpm);
        while (currentMs < targetTimeInMs) {
            lastTimeStamp = this.cursorIterator.currentTimeStamp;
            lastInMeasureTimeStamp = this.cursorIterator.CurrentRelativeInMeasureTimestamp;
            lastMeasureDuration = this.cursorIterator.CurrentMeasure.Duration.clone();
            this.cursorIterator.moveToNext();
            currentTimeStamp = this.cursorIterator.currentTimeStamp;
            const inMeasureTimeStamp: Fraction = this.cursorIterator.CurrentRelativeInMeasureTimestamp;
            let timePassed: Fraction;
            if (inMeasureTimeStamp.gt(lastInMeasureTimeStamp)) {
                timePassed = inMeasureTimeStamp.clone().Sub(lastInMeasureTimeStamp);
            } else { // jumped to a new measure
                timePassed = lastMeasureDuration.clone().Sub(lastInMeasureTimeStamp);
            }
            const timePassedMs: number = this.timingSource.getDurationInMs(timePassed);
            // only update bpm after the last note, since we might have jumped to a new measure only after it.
            this.timingSource.setBpm(this.cursorIterator.CurrentBpm);
            currentMs += timePassedMs;
            if (currentMs > targetTimeInMs) {
                currentTimeStamp = lastTimeStamp;
                break;
            }
            if (this.cursorIterator.EndReached) {
                // this.cursorIterator.moveToPrevious();
                this.currentTimestamp = currentTimeStamp; // TODO this is otherwise undefined, leading to an error in play() (gte)
                break;
            }
        }
        // const timestamp: Fraction = this.getTimestampFromMs(targetTimeInMs); // ignores repeats
        const previousSelectionStart: Fraction = this.musicPartManager.MusicSheet.SelectionStart.clone();
        this.musicPartManager.MusicSheet.SelectionStart = currentTimeStamp;
        this.reset(false); // false: don't reset repetition status (if a repetition has already been played)
        // this.playbackIterator.Update(currentTimeStamp); // this is done in play() already.
        //   if we do it here too, VoicePlaybackData.playbackIndex will be one increment too high, leading to the note not being played.
        //   e.g. in test_repeat_volta_simple, this will not play the note on the second call of osmd.PlaybackManager.playFromMs(1000).
        // this.playbackIterator.Reset();
        if (startPlay) {
            this.play();
        }
        this.musicPartManager.MusicSheet.SelectionStart = previousSelectionStart; // restore previous start point
    }

    /** Starts play() from a time in milliseconds, ignoring repeats.
     * This is mostly obsolete since playFromMs() handles repeats correctly now,
     * but may be useful for legacy purposes or as instructive code.
     * For sheets without repeats, this works, starting from the correct timestamp.
     */
    public async playFromMsIgnoringRepeats(targetTimeInMs: number): Promise<void> {
        await this.pause();
        const timestamp: Fraction = this.getTimestampFromMs(targetTimeInMs);
        const previousSelectionStart: Fraction = this.musicPartManager.MusicSheet.SelectionStart.clone();
        this.musicPartManager.MusicSheet.SelectionStart = timestamp;
        this.reset();
        this.play();
        this.musicPartManager.MusicSheet.SelectionStart = previousSelectionStart; // restore previous start point
    }

    public getTimestampFromMs(timeInMs: number): Fraction {
        return this.timingSource.Settings.getDurationAsNoteDuration(timeInMs);
    }

    /** Sets the cursor and MusicSheet.SelectionStart to the target timestamp (fraction),
     *  but does not start playback if it was not started already.
     *  To get the timestamp from milliseconds, use getTimestampFromMs().
     *  To set the playback start in milliseconds including repeats, use playFromMs(targetTimeInMs, false).
     *  To reset the playback start to the beginning of the sheet, call the function without arguments.
     */
    public setPlaybackStart(timestamp?: Fraction): void {
        if (!timestamp) {
            timestamp = this.musicPartManager.MusicSheet.SourceMeasures[0].AbsoluteTimestamp; // start of sheet
        }
        this.musicPartManager.MusicSheet.SelectionStart = timestamp;
        this.reset();
    }

    public Dispose(): void {
        // lock(this.playbackThreadSyncObject) {
            this.listeners = [];
            this.isRunning = false;
            // stop all active midi notes:
            if (this.isInitialized) {
                this.stopAllCurrentlyPlayingNotes();
                if (this.audioPlayer !== undefined) {
                    this.audioPlayer.close();
                }
            }

    //         this.musicPartManager = undefined;
    //     // }
    }

    public setSound(instrumentId: number, newSoundId: MidiInstrument): boolean {
        if (newSoundId <= MidiInstrument.None || newSoundId > MidiInstrument.Percussion) {
            return false;
        }

        // lock(this.playbackThreadSyncObject) {
        try {
            const isPercussionNow: boolean = newSoundId === MidiInstrument.Percussion;

            if (instrumentId === -1) { // Metronome
                if (this.audioPlayer !== undefined && !isPercussionNow) {
                    this.audioPlayer.setSound(0, newSoundId).then((instrumentChannel: number) => {
                        for (const listener of this.listeners) {
                            listener.soundLoaded(instrumentId, "metronome");
                        }
                    });
                }
            } else {
                let neededLastChannel: boolean = false;
                const musicSheet: MusicSheet = this.musicPartManager.MusicSheet;
                let instrument: Instrument;

                if (instrumentId === -2) {
                    instrument = musicSheet.Instruments.find(x => x.Id === instrumentId);
                } else {
                    instrument = musicSheet.Instruments[instrumentId];
                }

                this.instrumentIdMapping.setValue(instrument.Id, instrument);

                for (const staff of instrument.Staves) {
                    //int staffIndex = musicSheet.getIndexFromStaff(staff);
                    //int channel = this.staffIndexToMidiChannelMapping[staffIndex];
                    let channel: number = this.instrumentToStaffToMidiChannelDict.getValue(staff);
                    const wasPercussion: boolean = channel === this.percussionChannel;

                    if (isPercussionNow) { // if is now a percussion
                        const oldChannel: number = channel;
                        channel = this.percussionChannel;
                        // check if this instrument has been initialized and was no percussion instrument:
                        if (oldChannel > 0 && !wasPercussion) {
                            this.freeMidiChannels.push(oldChannel);
                            this.freeMidiChannels.sort((a, b) => a - b); //TODO MB: Does this .sort do the same thing as C# .Sort()?
                        }
                    } else {
                        if (channel < 0 || wasPercussion) { // if is not initialized or was a percussion:
                            if (this.freeMidiChannels.length > 0) { // if still a free channel exists
                                // get the channel and remove in from the free channels list
                                channel = this.freeMidiChannels[0];
                                this.freeMidiChannels.shift();
                            } else { // if no channel is free any more:
                                this.tooManyInstruments = true;
                                // use last channel
                                channel = 15;
                                this.instrumentToStaffToMidiChannelDict.setValue(staff, channel);

                                //// use piano sound
                                //newSoundId = 0;
                                neededLastChannel = true;
                            }
                        }
                    }
                    this.instrumentToStaffToMidiChannelDict.setValue(staff, channel);
                    if (this.audioPlayer !== undefined && !isPercussionNow) {
                        // TODO: Uncomment when panaroma is supported in audio player
                        // this.audioPlayer.setPanorama(channel, instrument.SubInstruments[0].pan);

                        // Note: make sure not to overwrite metronome or percussion channel. this is ensured where this.freeMidiChannels.push is used.
                        this.audioPlayer.setSound(channel, newSoundId).then((instrumentChannel: number) => {
                            instrument.soundfontLoaded = true;
                            let allSoundsLoaded: boolean = true;
                            for (const sheetInstrument of this.instrumentIdMapping.values()) {
                                if (sheetInstrument.MidiInstrumentId === MidiInstrument.Percussion) {
                                    sheetInstrument.soundfontLoaded = this.drumsLoaded;
                                }
                                if (!sheetInstrument.soundfontLoaded) {
                                    allSoundsLoaded = false;
                                    break;
                                }
                            }
                            for (const listener of this.listeners) {
                                listener.soundLoaded(instrument.Id, this.instrumentIdMapping.getValue(instrument.Id)?.Name);
                                if (allSoundsLoaded) {
                                    listener.allSoundsLoaded();
                                }
                            }
                        });
                        // } else {
                            // play all as piano:
                        //    this.audioPlayer.setSound(channel, 0);
                        // }
                    }
                }
                if (neededLastChannel) {
                    return false;
                }
            }

            return true;
        } catch (ex) {
            log.info("PlaybackManager.setSound: ", ex);
            return false;
        }
        // }
    }

    // public mainParameterChanged(client: IPhonicScoreClient, settingType: ProgramParameters, currentValue, previousValue): void {
    //     switch (settingType) {
    //         case ProgramParameters.DynamicInstructionsImpact:
    //             this.dynamicImpactFactor = Convert.ToSingle(currentValue);
    //             break;
    //         case ProgramParameters.TempoInstructionsImpact: {
    //             this.tempoImpactFactor = Convert.ToSingle(currentValue);
    //             this.setTempo();
    //             break;
    //         }
    //     }
    // }

    // TODO MB: Check if function setBpm() is sufficient for doing what commented function below does.
    // protected musicSheetParameterChanged(client: IPhonicScoreClient, parameter: MusicSheetParameters, currentValue, previousValue): void {
    //     switch (parameter) {
    //         case MusicSheetParameters.StartTempoInBPM: {
    //             this.tempoUserFactor = Convert.ToSingle(currentValue) / this.sheetStartBPM;
    //             this.setTempo();
    //             break;
    //         }
    //     }
    // }
    protected setBpm(bpm: number): void {
        this.tempoUserFactor = bpm / this.sheetStartBPM;
        this.setTempo();
    }

    public handlePlaybackEvent(): void {
        // lock(this.playbackThreadSyncObject) {
            // initialize flags:
            const resetOccurred: boolean = this.resetRequested;
            this.resetRequested = false;
            // const resetMetronomeBeatCounter: boolean = resetOccurred;
            // @ts-ignore
            const resetMetronomeBeatCounter: boolean = resetOccurred;
            let updateCursorPosition: boolean = resetOccurred;
            let endHasBeenReached: boolean = false;
            if (resetOccurred) {
                const shallPrecount: boolean = this.DoPreCount;
                this.doReset(shallPrecount);
            }

            if (this.musicPartManager === undefined) {
                return;
            }

            /**********************************************/
            // set the current values:
            this.currentTimestamp = this.timingSource.getCurrentTimestamp();
            // console.log("TS ms: " + this.timingSource.getCurrentTimeInMs());
            // console.log("TS ts: " + this.currentTimestamp);
            endHasBeenReached = this.cursorIterator.EndReached;
            // TODO cursorIterator.CurrentMeasure can be undefined (at the end of the piece?)
            const currentMeasure: SourceMeasure = this.cursorIterator.CurrentMeasure;
            if (this.StopAtUnrenderedMeasures && currentMeasure &&
                !currentMeasure.WasRendered && !currentMeasure.isReducedToMultiRest) {
                // stop if current measure is not rendered, but not if it's part of a multi-measure rest
                endHasBeenReached = true;
            }

            /**********************************************/
            // handle the currently pending instructions:
            // stop the notes that are already over now:
            this.stopFinishedNotes();

            this.processTempoInstructions();

            if (this.RunningState === PlaybackState.Running) { // needed when resetting when in pause
                const newCursorTimestampReached: boolean = this.currentTimestamp.gte(this.cursorIterator.CurrentEnrolledTimestamp)
                    && !endHasBeenReached;
                if (newCursorTimestampReached) {

                    this.isPreCounting = false;

                    /***** Metronome Beat Calculations *****/
                    // check if the measure has changed:
                    if (this.currentMeasure !== this.cursorIterator.CurrentMeasure &&
                        this.cursorIterator.CurrentMeasure !== undefined) {
                        // set current measure to the new measure
                        this.currentMeasure = this.cursorIterator.CurrentMeasure;

                        this.startRhythmBeats = this.currentMeasure.ActiveTimeSignature.Numerator;
                        this.startRhythmDenominator = this.currentMeasure.ActiveTimeSignature.Denominator;

                        // get the enrolled timestamp of this measure start:
                        const relativeToMeasureTimestamp: Fraction = this.cursorIterator.CurrentRelativeInMeasureTimestamp;
                        this.currentMetronomeBaseTimestamp = Fraction.minus(this.cursorIterator.CurrentEnrolledTimestamp, relativeToMeasureTimestamp);
                        // calculate the new beat duration
                        this.currentBeatDuration = new Fraction(1, this.currentMeasure.Duration.Denominator);

                        const currentMeasureBPM: number = this.currentMeasure.TempoInBPM;
                        if (currentMeasureBPM !== this.currentBPM && currentMeasureBPM > 0) {
                            // TODO the default value for measure.TempoInBPM is 0, probably not a good default setup. But we also catch it in bpmChanged().
                            this.bpmChanged(currentMeasureBPM, false); // update playback speed/bpm
                        }

                        // calculate which beat is next:
                        const relativeNextMetronomeBeatTimestamp: Fraction = new Fraction();
                        this.beatCounter = 0;
                        while (relativeNextMetronomeBeatTimestamp.lt(relativeToMeasureTimestamp)) {
                            relativeNextMetronomeBeatTimestamp.Add(this.currentBeatDuration);
                            this.beatCounter++;
                        }

                        this.playNextMetronomeAt = Fraction.plus(
                            this.currentMetronomeBaseTimestamp,
                            new Fraction(this.beatCounter, this.currentMeasure.Duration.Denominator)
                            );
                    }

                    /***** process dynamic instructions: *****/
                    const dynamicEntries: DynamicsContainer[] = this.cursorIterator.getCurrentDynamicChangingExpressions();
                    for (const dynamicEntry of dynamicEntries) {
                        const staff: Staff = this.musicPartManager.MusicSheet.getStaffFromIndex(dynamicEntry.staffNumber);
                        const channel: number =
                                this.instrumentToStaffToMidiChannelDict.getValue(staff);
                        //int channel = this.staffIndexToMidiChannelMapping[dynamicEntry.StaffNumber];
                        let volume: number = this.currentVolume;
                        if (dynamicEntry.parMultiExpression().StartingContinuousDynamic !== undefined) {
                            // dynamic expression is continuous:
                            const currentDynamicValue: number =
                                dynamicEntry.parMultiExpression().StartingContinuousDynamic.getInterpolatedDynamic(
                                    this.cursorIterator.CurrentSourceTimestamp);
                            if (currentDynamicValue >= 0) {
                                volume = this.calculateFinalVolume(currentDynamicValue);
                            }
                        } else { // dynamic Expression is instantanious - immediately set the volume:
                            volume = this.calculateFinalVolume(dynamicEntry.parMultiExpression().InstantaneousDynamic.Volume);
                        }

                        try {
                            if (this.audioPlayer !== undefined) {
                                this.audioPlayer.setVolume(channel, volume);
                            }
                        } catch (ex) {
                            log.info("PlaybackManager.handlePlaybackEvent: ", ex);
                        }
                    }

                    dynamicEntries.clear();
                }

                // check if the time has come to process the pending instructions:
                const dueEntries: { enrolledTimestamp: Fraction, playbackEntry: PlaybackEntry }[] = this.playbackIterator.Update(this.currentTimestamp);
                if (dueEntries.length > 0) {
                    // play new notes
                    if (this.DoPlayback) {
                        const playbackedNotes: PlaybackNote[] = [];

                        for (const entry of dueEntries) {
                            if (!entry.playbackEntry.ParentVoiceEntry.ParentSourceStaffEntry.ParentStaff.audible) {
                                // TODO don't create the entries in the first place.
                                //   currently VoicePlaybackData doesn't know the parentStaff though.
                                continue;
                            }
                            if (this.StopAtUnrenderedMeasures &&
                                !entry.playbackEntry.ParentVoiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.WasRendered) {
                                    continue; // don't play back entry that isn't visible. (e.g. first note in measure after maxMeasureToDraw)
                            }
                            const playbackEntry: PlaybackEntry = entry.playbackEntry;
                            const voiceEntry: VoiceEntry = playbackEntry.ParentVoiceEntry;
                            if (playbackEntry.Notes.length === 0) {
                                continue;
                            }

                            const instrument: Instrument = voiceEntry.ParentVoice.Parent;
                            const staff: Staff = voiceEntry.Notes[0].ParentStaff;
                            const staffIndex: number =
                                MusicSheet.getIndexFromStaff(staff);
                            let channel: number = this.instrumentToStaffToMidiChannelDict.getValue(staff);
                            const isPercussion: boolean = instrument.MidiInstrumentId === MidiInstrument.Percussion;
                            // choose percussion channel if Selected
                            if (isPercussion) {
                                channel = this.percussionChannel;
                            }

                            const currentlyActiveExpression: AbstractExpression = this.cursorIterator.ActiveDynamicExpressions[staffIndex];

                            // adapt volume level for continuous expressions
                            if (currentlyActiveExpression instanceof ContinuousDynamicExpression) {
                                const currentDynamicValue: number =
                                    currentlyActiveExpression.getInterpolatedDynamic(
                                        this.cursorIterator.CurrentSourceTimestamp);
                                if (currentDynamicValue >= 0) {
                                    const channelVolume: number = this.calculateFinalVolume(currentDynamicValue);
                                    try {
                                        if (this.audioPlayer !== undefined) {
                                            this.audioPlayer.setVolume(channel, channelVolume);
                                        }
                                    } catch (ex) {
                                        log.info("PlaybackManager.handlePlaybackEvent: ", ex);
                                    }
                                }
                            }

                            // calculate volume from instrument volume, staff volume and voice volume:
                            let volume: number = instrument.Volume * staff.Volume * voiceEntry.ParentVoice.Volume;

                            // attenuate if in Solo mode an this voice is not soloed:
                            const soloAttenuate: boolean = this.SoloActive &&
                                !(instrument.Solo || voiceEntry.ParentVoice.Solo || staff.Solo);
                            if (soloAttenuate) {
                                volume *= this.SoloAttenuationValue;
                            }

                            // increase volume if this is an accent:
                            const entryIsAccent: boolean = voiceEntry.VolumeModifier !== undefined;
                            if (entryIsAccent) {
                                volume *= 1.3;
                                volume = Math.min(1, volume);
                            }

                            const transpose: number = this.musicPartManager.MusicSheet.Transpose;
                            const instrumentPlaybackTranspose: number = instrument.PlaybackTranspose ?? 0;

                            for (const note of playbackEntry.Notes.filter(n => n.MidiKey !== 0)) {
                                // play the note
                                let key: number = note.MidiKey;
                                if (!isPercussion) {
                                    key += instrumentPlaybackTranspose + transpose;
                                }

                                // if note has another explicitly given playback instrument:
                                if (note.ParentNote.PlaybackInstrumentId !== undefined) {
                                    // playback with other instrument:
                                    const notePlaybackInstrument: SubInstrument =
                                        instrument.getSubInstrument(note.ParentNote.PlaybackInstrumentId);
                                    if (notePlaybackInstrument !== undefined) {
                                        if (notePlaybackInstrument.fixedKey >= 0 && !(isPercussion && this.IgnoreFixedInstrumentKeysForPercussion)) {
                                            key = notePlaybackInstrument.fixedKey;
                                        }
                                    }

                                    // recalculate Volume for this instrument:
                                    const instrumentVolume: number = notePlaybackInstrument?.volume ?? 1;
                                    // TODO notePlaybackInstrument can be undefined, e.g. issue 42
                                    volume = instrumentVolume * staff.Volume * voiceEntry.ParentVoice.Volume;

                                    // attenuate if in Solo mode an this voice is not soloed:
                                    if (soloAttenuate) {
                                        volume *= this.SoloAttenuationValue;
                                    }

                                    if (entryIsAccent) {
                                        volume *= 1.3;
                                        volume = Math.min(1, volume);
                                    }
                                }

                                // calculate stop time and remember it
                                let noteLength: Fraction = Fraction.createFromFraction(note.Length);
                                let stopAt: Fraction;

                                // ToDo MU: move this to PlaybackEntry
                                const entryIsStaccato: boolean = voiceEntry.DurationModifier !== undefined;
                                if (entryIsStaccato) {
                                    // Reduce length and stopAt time:
                                    noteLength = new Fraction(noteLength.Numerator * 2, noteLength.Denominator * 3);
                                    stopAt = Fraction.plus(entry.enrolledTimestamp, noteLength);
                                } else {
                                    stopAt = Fraction.plus(entry.enrolledTimestamp, noteLength);
                                }

                                try {
                                    if (this.audioPlayer !== undefined) {
                                        this.audioPlayer.playSound( channel,
                                                                    key,
                                                                    volume,
                                                                    this.timingSource.getDurationInMs(noteLength));
                                    }
                                } catch (ex) {
                                    log.info("PlaybackManager.handlePlaybackEvent. Failed playing sound: ", ex);
                                }

                                if (!this.notesToStop.containsKey(stopAt)) {
                                    // this.notesToStop.Add(stopAt, new List<ChannelNote>());
                                    this.notesToStop.setValue(stopAt, []);
                                }

                                this.notesToStop.getValue(stopAt).push(new ChannelNote(key, channel, note));

                                if (this.highlightPlayedNotes) {
                                    note.ParentNote.state = NoteState.Selected;
                                }
                                playbackedNotes.push(note);
                            }
                        }

                        /*** Inform about which notes are now played ***
                         * e.g. for updating graphics
                         */
                        // TODO: Replace with generic event system
                        // if (this.highlightPlayedNotes && this.NotesPlaybackEventOccurred !== undefined) {
                        this.NotesPlaybackEventOccurred(playbackedNotes);
                    }
                }

                if (newCursorTimestampReached) {
                    // store current iterator parameters:
                    this.currentIteratorSourceTimeStamp = this.cursorIterator.CurrentSourceTimestamp;
                    this.currentMeasureIndex = this.cursorIterator.CurrentMeasureIndex;
                    // this.currentRepetition = this.cursorIterator.CurrentRepetition;

                    /************ Move to next sheet position ************/
                    // move iterator already to next position, to find out how long to wait or if the End has been reached:
                    this.cursorIterator.moveToNext();
                    this.nextIteratorTimestamp = this.cursorIterator.CurrentEnrolledTimestamp;

                    updateCursorPosition = true;
                }

                // Stop the sound of the last played metronome
                this.stopMetronomeSound();

                // Check for "end has been reached"
                if (endHasBeenReached && this.currentTimestamp.gte(this.cursorIterator.CurrentEnrolledTimestamp)) {
                    // notify possible listeners:
                    for (const listener of this.listeners) {
                        listener?.selectionEndReached(undefined);
                    }
                    this.handleEndReached();
                } else {
                    /******
                    * Play Metronome if needed
                    */
                    if (this.currentTimestamp.gte(this.playNextMetronomeAt)) {
                        updateCursorPosition = true;
                        const playFirstBeatSample: boolean = this.beatCounter % this.startRhythmBeats === 0;

                        this.playMetronomeSound(playFirstBeatSample);

                        this.beatCounter++;
                    }

                    // calculate the next metronome beat timestamp
                    if (this.currentMetronomeBaseTimestamp !== undefined) {
                        this.playNextMetronomeAt = Fraction.plus(
                            this.currentMetronomeBaseTimestamp,
                            new Fraction(this.beatCounter, this.startRhythmDenominator)
                            );
                    }

                    /*************************************/
                    this.calculateClosestNextTimestamp();
                }

            } else {
                // needed when a reset was requested: reset parameters, fire score position changed and finally stop again
                this.isPlaying = false;
            }

            // Check for "updating the display"
            if (currentMeasure.Rules.RenderCount > 0 && ( // only update cursor if we've rendered (can play without rendering)
                updateCursorPosition ||
                endHasBeenReached && !this.loopTriggeredReset)) {
                // set the play cursor in the display
                this.updateScoreCursorPosition(resetOccurred);
            }
        // }
    }

    private NotesPlaybackEventOccurred(notes: PlaybackNote[]): void {
        for (const listener of this.listeners) {
            listener?.notesPlaybackEventOccurred(notes);
        }
    }

    public calculateFinalVolume(volume: number): number {
        return ((volume - this.defaultVolume) * this.dynamicImpactFactor + this.defaultVolume);
    }

    /** Main playback loop. Not a sheet music loop, but checks for new notes to be played. */
    private loop(): void {
        // start playing:
        try {
            this.isRunning = true;
            // @ts-ignore
            const reset: boolean = false;

            if (this.isPlaying) {
                try {
                    if (this.isRunning && this.isInitialized) {

//console.log(`handlePlayback, timing deviation: ${Math.round(this.timingSource.getCurrentTimeInMs()) - Math.round(this.wantedNextIteratorTimestampMs)}`);

                        this.handlePlaybackEvent();

                        if (this.closestNextTimestamp !== undefined) {
                            const wantedNextElapsedMs: number = this.timingSource.getWaitingTimeForTimestampInMs(this.closestNextTimestamp);
                            //this.wantedNextIteratorTimestampMs = this.timingSource.getCurrentTimeInMs() + wantedNextElapsedMs;
                            window.setTimeout(() => { this.loop(); }, Math.max(0, wantedNextElapsedMs));
                            //this.interruptWaiting.WaitOne(Math.max(0, wantedNextElapsedMs));
                        }
                    }
                } catch (ex) {
                    this.pause();
                    this.reset();
                    const errorMsg: string = TextTranslation.translateText(
                        "MidiPlaybackError",
                        "An error occurred at the Midi Playback."
                        );
                    log.info("PlaybackManager.loop: " + errorMsg + " ", ex);
                    if (this.messageViewer !== undefined && this.messageViewer.MessageOccurred !== undefined) {
                        this.messageViewer.MessageOccurred(MessageBoxType.Error, errorMsg);
                    }
                }
            }
        } catch (ex) {
            const errorMsg: string = TextTranslation.translateText(
                "MidiPlaybackLoopError",
                "An error occurred at the Midi Playback. Please restart the program in order for the Playback to be availiable again."
                );
            log.info("PlaybackManager.loop: " + errorMsg + " ", ex);
            if (this.messageViewer !== undefined && this.messageViewer.MessageOccurred !== undefined) {
                this.messageViewer.MessageOccurred(MessageBoxType.Error, errorMsg);
            }
        }
        this.isRunning = false;
    }

    private stopAllCurrentlyPlayingNotes(): void {
        try {
            // lock(this.playbackThreadSyncObject) {
                if (this.audioPlayer !== undefined) {
                    // stop active metronome sound
                    this.audioPlayer.stopSound(this.metronomeNoteFirstBeat.channel, this.metronomeNoteFirstBeat.key);
                    this.audioPlayer.stopSound(this.metronomeNote.channel, this.metronomeNote.key);

                    // stop active notes
                    // TODO MB: check if port of following for..of is correct
                    // check same in for..of below
                    // for (const entry of this.notesToStop) {
                    //     for (const note of entry.Value) {
                    //         this.audioPlayer.stopSound(note.channel, note.key);
                    //     }
                    // }
                    for (const entry of this.notesToStop.values()) {
                        for (const note of entry) {
                            this.audioPlayer.stopSound(note.channel, note.key);
                        }
                    }
                }

                /*** Inform about which notes are now stopped ***
                * e.g. for updating graphics
                */
                const notes: Note[] = [];
                for (const entry of this.notesToStop.values()) {
                    for (const note of entry) {
                        note.note.ParentNote.state = NoteState.Normal;
                        notes.push(note.note.ParentNote);
                    }
                }

                if (this.highlightPlayedNotes) {
                    // TODO: Replace with generic even system
                    // if (this.NotesPlaybackEventOccurred !== undefined) {
                    //     this.NotesPlaybackEventOccurred(notes);
                    // }
                }
                this.notesToStop.clear();
            // }
        } catch (ex) {
            log.info("PlaybackManager.stoppAllCurrentlyPlayingNotes: ", ex);
        }
    }

    protected doReset(shallPrecount: boolean, preCountMeasures: number = 1, resetIterator: boolean = true): void {
        this.nextIteratorTimestamp = undefined;
        this.playNextMetronomeAt = undefined;
        this.closestNextTimestamp = undefined;
        this.currentMeasure = undefined;
        this.beatCounter = 0;
        this.fermataActive = false;

        this.stopAllCurrentlyPlayingNotes();

        if (this.musicPartManager !== undefined && resetIterator) {
            this.cursorIterator = this.musicPartManager.getIterator();
        }

        if (this.cursorIterator === undefined) {
            return;
        }

        this.playbackIterator.Reset();
        this.currentIteratorSourceTimeStamp = this.cursorIterator.CurrentSourceTimestamp;
        this.nextIteratorTimestamp = this.cursorIterator.CurrentEnrolledTimestamp;

        this.currentMeasure = this.cursorIterator.CurrentMeasure;
        this.currentMeasureIndex = this.cursorIterator.CurrentMeasureIndex;
        // this.currentRepetition = this.cursorIterator.CurrentRepetition;

        this.startRhythmBeats = this.cursorIterator.currentPlaybackSettings().Rhythm.Numerator;
        this.startRhythmDenominator = this.cursorIterator.currentPlaybackSettings().Rhythm.Denominator;

        let preCountDuration: Fraction = new Fraction();
        if (shallPrecount) {
            this.isPreCounting = true;
            const rhythmDuration: Fraction = new Fraction(this.startRhythmBeats * preCountMeasures, this.startRhythmDenominator);
            const sourceMeasureDuration: Fraction = this.musicPartManager.MusicSheet.SourceMeasures[this.currentMeasureIndex].Duration;
            const beats: number = sourceMeasureDuration.Numerator + sourceMeasureDuration.WholeValue * sourceMeasureDuration.Denominator;
            // for 5/4 time or any time signature with RealValue > 1, Numerator / Denominator is not accurate for measure duration
            //   because of the Fraction.simplify() method reducing 5/4 to 1/4 + wholeValue 1
            const measureDuration: Fraction = new Fraction(beats * preCountMeasures, sourceMeasureDuration.Denominator);
            const duration: Fraction =
                Fraction.plus(this.musicPartManager.MusicSheet.SourceMeasures[this.currentMeasureIndex].AbsoluteTimestamp,
                    measureDuration).Sub(this.currentIteratorSourceTimeStamp);

            preCountDuration = rhythmDuration;

            if (rhythmDuration.gte(duration)) { // make sure that missing duration can't be negative (e.g. if measure is longer than given rhythm)
                const missingDuration: Fraction = Fraction.minus(rhythmDuration, duration);

                if (missingDuration.RealValue / rhythmDuration.RealValue < 0.5) {
                    preCountDuration.Add(missingDuration);
                } else {
                    preCountDuration = missingDuration;
                }
            }
        }

        this.currentMetronomeBaseTimestamp = this.playNextMetronomeAt = Fraction.minus(this.cursorIterator.CurrentEnrolledTimestamp, preCountDuration);
        //this.timingSource.reset();
        this.timingSource.setTimeAndBpm(this.currentMetronomeBaseTimestamp,
                                        this.cursorIterator.currentPlaybackSettings().BeatsPerMinute);

        this.calculateClosestNextTimestamp();
    }

        /// <summary>
        /// Calculate the closest next timestamp at which the next instruction has to be processed
        /// </summary>
    private calculateClosestNextTimestamp(): void {
        const timestamps: Fraction[] = [];

        // add next timestamp for stopping notes
        if (this.notesToStop.size() > 0) {
            // timestamps.push(this.notesToStop.keys().Min());
            // TODO MB: Check if line below does what line above is supposed to do
            timestamps.push(this.notesToStop.keys().reduce( (a, b) => a.lt(b) ? a : b));
        }
        // add next timestamp for next notes or other sheet instruction
        if (this.playbackIterator.NextEntryTimestamp !== undefined) {
            timestamps.push(this.playbackIterator.NextEntryTimestamp);
        }
        if (this.nextIteratorTimestamp !== undefined) {
            timestamps.push(this.nextIteratorTimestamp);
        }
        // add next timestamp for metronome tick
        if (this.playNextMetronomeAt !== undefined) {
            timestamps.push(this.playNextMetronomeAt);
        }
        // get the closest next timestamp
        if (timestamps.length > 0) {
            // this.closestNextTimestamp = timestamps.Min();
            // TODO MB: Check if line below does what line above is supposed to do
            this.closestNextTimestamp = timestamps.reduce( (a, b) => a.lt(b) ? a : b);
        } else {
            this.closestNextTimestamp = undefined;
        }
    }

        /// <summary>
        /// Called when the end of the sheet or the selection has been reached
        /// </summary>
        protected handleEndReached(): void {
            this.pause();
        }

        /// <summary>
        /// Fire a delegate to inform the display, that the cursor position has changed
        /// </summary>
        /// <param name="resetOccurred"></param>
        private updateScoreCursorPosition(resetOccurred: boolean): void {
            if (this.isPreCounting && !this.MoveCursorDuringPrecount) {
                return;
            }
            this.scorePositionChangedData.CurrentMeasureIndex = this.currentMeasureIndex;
            this.scorePositionChangedData.CurrentRepetition = this.currentRepetition;
            if (!this.currentTimestamp) {
                this.currentTimestamp = this.musicPartManager.MusicSheet.SelectionStart;
            }
            this.scorePositionChangedData.PredictedPosition = this.currentTimestamp;
            this.scorePositionChangedData.CurrentBpm = this.musicPartManager.MusicSheet.SheetPlaybackSetting.BeatsPerMinute;
            this.scorePositionChangedData.ResetOccurred = resetOccurred;
            for (const listener of this.listeners) {
                listener?.cursorPositionChanged(this.currentIteratorSourceTimeStamp, this.scorePositionChangedData);
            }
        }

        private stopMetronomeSound(): void {
            if (this.metronomeSoundPlayed) {
                if (this.audioPlayer !== undefined) {
                    this.audioPlayer.stopSound(this.metronomeNoteFirstBeat.channel, this.metronomeNoteFirstBeat.key);
                    this.audioPlayer.stopSound(this.metronomeNote.channel, this.metronomeNote.key);
                }
                this.metronomeSoundPlayed = false;
            }
        }

        private playMetronomeSound(playFirstBeatSample: boolean): void {
            // play the metronome if needed:
            if (this.metronome.Audible ||
                this.metronome.Solo ||
                this.isPreCounting) {
                let volume: number = this.isPreCounting ? this.metronome.PreCountVolume : this.metronome.Volume;
                if (!this.isPreCounting && this.SoloActive && !this.metronome.Solo) {
                    volume *= this.SoloAttenuationValue;
                }
                for (const listener of this.listeners) {
                    if (listener?.metronomeSoundOccurred) {
                        listener.metronomeSoundOccurred({
                            volume: volume,
                            firstBeat: playFirstBeatSample
                        });
                    }
                }

                if (volume > 0) {
                    if (playFirstBeatSample) {
                        try {
                            if (this.audioPlayer !== undefined) {
                                this.audioPlayer.playSound(this.metronomeNoteFirstBeat.channel, this.metronomeNoteFirstBeat.key, volume, 1000);
                            }

                            if (this.audioMetronomePlayer !== undefined) {
                                this.audioMetronomePlayer.playFirstBeatSample(volume);
                            }
                        } catch (ex) {
                            log.info("PlaybackManager.playMetronomeSound: ", ex);
                        }
                    } else {
                        try {
                            if (this.audioPlayer !== undefined) {
                                this.audioPlayer.playSound(this.metronomeNote.channel, this.metronomeNote.key, volume, 1000);
                            }

                            if (this.audioMetronomePlayer !== undefined) {
                                this.audioMetronomePlayer.playBeatSample(volume);
                            }
                        } catch (ex) {
                            log.info("PlaybackManager.playMetronomeSound: ", ex);
                        }
                    }
                    this.metronomeSoundPlayed = true;
                }
            }
        }

        private stopFinishedNotes(): void {
            // do the pending note stops:
            let expiredKeys: Fraction[];

            if (this.currentTimestamp !== undefined) {
                expiredKeys = this.notesToStop.keys().filter(ts => ts.lte(this.currentTimestamp));
            } else {
                expiredKeys = this.notesToStop.keys();
            }

            for (const timestamp of expiredKeys) {
                const notesToStop: ChannelNote[] = this.notesToStop.getValue(timestamp);
                if (this.audioPlayer !== undefined) {
                    for (const note of notesToStop) {
                        this.audioPlayer.stopSound(note.channel, note.key);
                    }
                }

                /*** Inform about which notes are now stopped ***
                * e.g. for updating graphics
                */
                const notes: Note[] = [];
                for (const note of notesToStop) {
                    note.note.ParentNote.state = NoteState.Normal;
                    notes.push(note.note.ParentNote);
                }

                if (this.highlightPlayedNotes) {
                    // TODO: Replace with generic event system
                    // if (this.NotesPlaybackEventOccurred !== undefined) {
                    //     this.NotesPlaybackEventOccurred(notes);
                    // }
                }

                this.notesToStop.remove(timestamp);
            }
        }

    private processTempoInstructions(): void {
        // 1. check if the current bpm of the iterator have changed (significantly):
        if (!this.musicPartManager.MusicSheet.IgnoreTempoInstructions) {
            if (Math.abs(this.currentReferenceBPM - this.cursorIterator.CurrentBpm) > 0.001) {
                this.changeTempo(this.cursorIterator.CurrentBpm);
            }
        }

        // 2. check for possible fermatas and slow down for that entry:
        this.handleFermata();
    }

    private handleFermata(): void {
        // check for fermatas:
        let fermataFound: boolean = false;

        if (!this.cursorIterator.EndReached) {
            if (this.currentTimestamp.gte(this.cursorIterator.CurrentEnrolledTimestamp)) {
                for (const ve of this.cursorIterator.CurrentVoiceEntries) {
                    fermataFound = ve.Fermata !== undefined;
                }
            }
        }

        if (fermataFound) {
            if (!this.fermataActive) {
                this.fermataActive = true;
                this.changeTempo(this.cursorIterator.CurrentBpm / 3);
            }
        } else {
            if (this.fermataActive) {
                this.fermataActive = false;
                this.changeTempo(this.cursorIterator.CurrentBpm);
            }
        }
    }

    public bpmChanged(newBpm: number, sheetOverride: boolean): void {
        if (!(newBpm > 0)) {
            // only accept valid bpm (> 0)
            //   TODO one sample has bpm 0 for measure 5: love again - dua lipa
            log.info("invalid bpm set: " + newBpm + ". Ignoring.");
            return;
        }
        if(sheetOverride && this.musicPartManager?.MusicSheet.SourceMeasures?.length > 0){
            this.overrideBPM = newBpm;
            this.musicPartManager.MusicSheet.SourceMeasures.forEach(measure => {
                measure.TempoInBPM = newBpm;
            });
            this.musicPartManager.MusicSheet.IgnoreTempoInstructions = true; // so that metronome marks don't change it again
        }
        this.currentBPM = newBpm;
        this.timingSource.setBpm(newBpm);
    }
    public volumeChanged(instrument: number, newVolume: number): void {
        this.currentVolume = newVolume / 100;
        if (instrument === -1) {
            this.metronome.Volume = this.currentVolume;
        } else {
            this.instrumentIdMapping.getValue(instrument).Volume = this.currentVolume;
        }
    }

    public volumeMute(instrument: number): void {
        if (instrument === -1) {
            this.metronome.Mute = true;
        } else {
            this.instrumentIdMapping.getValue(instrument).Audible = false;
        }
    }
    public volumeUnmute(instrument: number): void {
        if (instrument === -1) {
            this.metronome.Mute = false;
        } else {
            this.instrumentIdMapping.getValue(instrument).Audible = true;
        }
    }

    private changeTempo(newTempoInBPM: number): void {
        log.debug("PlaybackManager.changeTempo", `current tempo in BPM: ${newTempoInBPM}`);
        //Console.WriteLine(currTempoInBPM.ToString());

        if (newTempoInBPM > 0) {
            this.currentReferenceBPM = newTempoInBPM;
            this.setTempo();
        }
    }

    protected setTempo(): void {
        this.currentBPM = this.tempoUserFactor * this.getCurrentReferenceBPM();
        this.cursorIterator.CurrentBpm = this.currentBPM;

        this.timingSource.setBpm(this.currentBPM);
    }

    protected getCurrentReferenceBPM(): number {
        return ((this.currentReferenceBPM - this.sheetStartBPM) * this.tempoImpactFactor + this.sheetStartBPM);
    }

    public checkForSoloDeactivated(): void {
        if (this.musicPartManager.MusicSheet === undefined) {
            this.SoloActive = false;
            return;
        }

        let state: boolean = false;
        for (const instrument of this.musicPartManager.MusicSheet.Instruments) {
            for (const staff of instrument.Staves) {
                state = state || staff.Solo;
            }
            for (const voice of instrument.Voices) {
                state = state || voice.Solo;
            }
        }

        state = state || this.Metronome.Solo;

        if (!state) {
            this.SoloActive = false;
        }
    }

    /** Returns the duration of the piece in ms (by each measure's bpm, without repeats).
     *  The result may be inaccurate if you haven't set the bpm to the first measure's bpm before playback (or the other way round).
     *  In that case, getSheetDurationInMsEvenBpm() can be more accurate (previous version of this method)
     */
    public getSheetDurationInMs(withRepeats: boolean = true): number {
        if (withRepeats) {
            return this.getSheetDurationInMsWithRepeats();
        }
        let totalDuration: number = 0;
        // code similar to PlaybackSettings.getDurationInMilliseconds()
        const beatRealValue: number = 1.0 / 4.0;
        for (const measure of this.musicPartManager.MusicSheet.SourceMeasures) {
            let tempoInBPM: number = measure.TempoInBPM;
            if (tempoInBPM === 0) { // happens in Saltarello -> Infinity duration otherwise
                tempoInBPM = this.sheetStartBPM;
            }
            const beatLengthInMs: number = 60000.0 / tempoInBPM;
            totalDuration += measure.Duration.RealValue * beatLengthInMs / beatRealValue;
        }
        return totalDuration;
    }

    public getSheetDurationInMsWithRepeats(): number {
        // code similar to getSheetDurationInMs, but for repeats we need to use an iterator.
        let totalDuration: number = 0;
        const beatRealValue: number = 0.25;
        const iterator: MusicPartManagerIterator = new MusicPartManagerIterator(this.musicPartManager.MusicSheet);
        const maxSteps: number = 10e6; // safety maximum loop count to prevent infinite loops
        let loopSteps: number = 0;
        while (!iterator.EndReached) {
            const measure: SourceMeasure = iterator.CurrentMeasure;
            let tempoInBPM: number = measure.TempoInBPM;
            if (tempoInBPM === 0) {
                tempoInBPM = this.sheetStartBPM;
            }
            const beatLengthInMs: number = 60000.0 / tempoInBPM;
            totalDuration += measure.Duration.RealValue * beatLengthInMs / beatRealValue;
            while (!iterator.EndReached) {
                iterator.moveToNext();
                if (iterator.CurrentMeasure !== measure || iterator.backJumpOccurred) {
                    break; // hit a new measure or jump back (perhaps to same measure), add duration again
                }
                loopSteps++;
                if (loopSteps >= maxSteps) {
                    log.error("getSheetDuration: hit maximum loop limit");
                    return totalDuration;
                }
            }
        }
        return totalDuration;
    }

    /** Returns the sheet duration of the piece in ms given the tempo set via setBpm() doesn't change. */
    public getSheetDurationInMsEvenBpm(): number {
        return this.timingSource.getDurationInMs(this.musicPartManager.MusicSheet.SheetEndTimestamp);
    }

    /** Recalculates playback entries. If you've set UserNumberOfRepetitions (or SkipRepetition) on a repetition,
     * this is necessary to skip repetitions in playback. */
    public recalculatePlaybackEntriesAndRepetitions(): void {
        const sheet: MusicSheet = this.musicPartManager.MusicSheet;
        sheet.PlaybackDataDict.clear();
        this.cursorIterator = new MusicPartManagerIterator(sheet);
        const playbackNoteGenerator: PlaybackNoteGenerator = new PlaybackNoteGenerator();
        playbackNoteGenerator.calculate(sheet);
        this.playbackIterator = new PlaybackIterator(sheet);
        sheet.MusicPartManager.init();
    }

        //private class MidiChannelInfo
        //{
        //    public List<IInstrument> subscribers = new List<IInstrument>();
        //    public int channel;
        //}

}
