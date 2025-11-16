import { AbstractTimingSource } from "./AbstractTimingSource";
// import { AudioContext } from "standardized-audio-context";
import { Fraction } from "../../Common/DataObjects";

export class LinearTimingSource extends AbstractTimingSource {
    private audioContext: AudioContext = new AudioContext();
    private audioInputDelay: number = 320;
    private lastResetTime: number = 0;
    public logEnabled: boolean = true;
    constructor() {
        super();
        this.audioContext.suspend();
        this.lastResetTime = this.audioContext.currentTime;
    }

    public getCurrentTimeInMs(): number {
        return (this.audioContext.currentTime - this.lastResetTime) * 1000;
    }

    public getCurrentAudioDelayRevisedTimestamp(): Fraction {
        return Fraction.plus(this.getDuration(<number>(this.getCurrentTimeInMs() - this.audioInputDelay)), this.anchorTimestamp);
    }

    public getTimestampForTimeInMs(timesInMs: number): Fraction {
        const diff: number = this.getCurrentTimeInMs() - timesInMs;
        const curFraction: Fraction = this.getCurrentTimestamp();
        const fractionFiff: Fraction = this.Settings.getDurationAsNoteDuration(diff);
        const timestamp: Fraction = Fraction.minus(curFraction, fractionFiff);
        return timestamp;
    }

    public start(): Promise<void> {
        if (this.logEnabled) {
            console.log("Start linear timing source");
        }
        return this.audioContext.resume();
    }

    public pause(): Promise<void> {
        if (this.logEnabled) {
            console.log("Pause linear timing source");
        }
        return this.audioContext.suspend();
    }

    public reset(): void {
        if (this.logEnabled) {
            console.log("Reset linear timing source");
        }
        this.lastResetTime = this.audioContext.currentTime;
    }
}
