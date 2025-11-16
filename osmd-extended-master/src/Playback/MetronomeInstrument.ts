import { MidiInstrument } from "../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { ISettableInstrument } from "../Common/Interfaces/ISettableInstrument";

export class MetronomeInstrument implements ISettableInstrument {
    constructor(id: number, name: string, visible: boolean, audible: boolean, volume: number, midiInstrumentId: MidiInstrument) {
        this.id = id;
        this.name = name;
        this.visible = visible;
        this.audible = audible;
        this.Volume = volume;
        this.MidiInstrumentId = midiInstrumentId;
    }
    public Following: boolean;
    public PitchMonitor: boolean;
    public Highlight: boolean;
    public Volume: number;
    private preCountVolume: number;
    public get PreCountVolume(): number {
        if (this.preCountVolume >= 0) {
            return this.preCountVolume;
        }
        return this.Volume; // if preCountVolume is undefined, use the main volume
    }
    public set PreCountVolume(value: number) {
        this.preCountVolume = value;
    }
    public MidiInstrumentId: MidiInstrument;
    public get Audible(): boolean {
        return this.audible;
    }
    public set Audible(value: boolean) {
        this.audible = value;
    }
    public Solo: boolean;
    public get Visible(): boolean {
        return this.visible;
    }
    public set Visible(value: boolean) {
        this.visible = value;
    }
    public get Mute(): boolean {
        return !this.Audible;
    }
    public set Mute(value: boolean) {
        this.Audible = !value;
    }
    public get Name(): string {
        return this.name;
    }
    public setVoiceAudible(voiceId: number, audible: boolean): void {
        throw new Error("Method not implemented.");
    }
    public setStaffAudible(staffId: number, audible: boolean): void {
        throw new Error("Method not implemented.");
    }
    public setVoiceFollowing(voiceId: number, follow: boolean): void {
        throw new Error("Method not implemented.");
    }
    public setStaffFollow(staffId: number, follow: boolean): void {
        throw new Error("Method not implemented.");
    }
    public setVoicePitchMonitor(voiceId: number, pitchMonitor: boolean): void {
        throw new Error("Method not implemented.");
    }
    public setStaffPitchMonitor(staffId: number, pitchMonitor: boolean): void {
        throw new Error("Method not implemented.");
    }
    public InstrumentParameterChanged: any;
    public setInstrumentParameter(parameter: any, value: Object): void {
        throw new Error("Method not implemented.");
    }
    // public setVoiceAudible(voiceId: number, audible: boolean): void {

    // }
    // public setStaffAudible(staffId: number, audible: boolean): void {

    // }
    private id: number;
    private name: string;
    private visible: boolean;
    private audible: boolean;
    public get Id(): number {
        return this.id;
    }
}
