declare module '@tonejs/piano' {
  import type { ToneAudioNode } from 'tone';

  export interface PianoOptions {
    velocities?: number;
    minNote?: number;
    maxNote?: number;
    pedal?: boolean;
    release?: boolean;
    url?: string;
  }

  export interface PianoKeyEvent {
    note: string | number;
    time?: number;
    velocity?: number;
  }

  export class Piano extends ToneAudioNode {
    constructor(options?: PianoOptions);

    /** Gain stage for overall output level. */
    volume: { value: number };

    /**
     * Connect this instrument to additional nodes and destination.
     */
    chain(...nodes: Array<ToneAudioNode | AudioNode>): this;

    /**
     * Load the underlying multi-sampled buffers.
     */
    load(): Promise<void>;

    /**
     * Sync scheduled events with the Tone.js Transport.
     */
    sync(): this;

    keyDown(event: PianoKeyEvent): void;

    keyUp(event: PianoKeyEvent): void;

    releaseAll(time?: number): void;

    dispose(): void;
  }
}
