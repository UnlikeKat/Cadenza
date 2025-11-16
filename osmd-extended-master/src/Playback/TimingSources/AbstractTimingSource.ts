import { ITimingSource } from "../../Common/Interfaces/ITimingSource";
import { Fraction } from "../../Common/DataObjects";
import { PlaybackSettings } from "../../Common/DataObjects/PlaybackSettings";

export class AbstractTimingSource implements ITimingSource {
    public Settings: PlaybackSettings;
    protected anchorTimestamp: Fraction = new Fraction();
    public setBpm(bpm: number): void {
        this.anchorTimestamp = Fraction.createFromFraction(this.getCurrentTimestamp());
        if (this.Settings !== undefined) {
            this.Settings.BeatsPerMinute = bpm;
        }
        this.reset();
    }
    public setTimeAndBpm(timestamp: Fraction, bpm?: number): void {
        this.anchorTimestamp = Fraction.createFromFraction(timestamp);
        if (this.Settings !== undefined && bpm) {
            this.Settings.BeatsPerMinute = bpm;
        }
        this.reset();
    }
    public getCurrentTimestamp(): Fraction {
        const currentMs: number = <number>this.getCurrentTimeInMs();
        const curDurationFromAnchor: Fraction = this.getDuration(currentMs);
        return Fraction.plus(curDurationFromAnchor, this.anchorTimestamp);
    }
    public getWaitingTimeForTimestampInMs(timestamp: Fraction): number {
        const currentTimestamp: Fraction = this.getCurrentTimestamp();
        const duration: Fraction = Fraction.minus(timestamp, currentTimestamp);
        return this.getDurationInMs(duration);
    }
    public getDurationInMs(duration: Fraction): number {
        return <number>Math.round(this.Settings.getDurationInMilliseconds(duration));
    }
    public getDuration(milliseconds: number): Fraction {
        if (this.Settings === undefined) {
            return new Fraction();
        }
        const result: Fraction = this.Settings.getDurationAsNoteDuration(milliseconds);
        return result;
    }
    public getCurrentTimeInMs(): number { throw new Error("not implemented"); }
    public getTimestampForTimeInMs(timesInMs: number): Fraction { throw new Error("not implemented"); }
    public start(): void { throw new Error("not implemented"); }
    public pause(): void { throw new Error("not implemented"); }
    public reset(): void { throw new Error("not implemented"); }
    public getCurrentAudioDelayRevisedTimestamp(): Fraction { throw new Error("not implemented"); }
}
