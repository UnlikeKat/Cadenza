import WebMscore from 'webmscore';

export type PlaybackState = 'playing' | 'paused' | 'stopped';

export interface ScorePosition {
  measure: number;
  tick: number;
  tempo: number;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface PositionData {
  tick: number;
  time: number;
  measure: number;
  page: number;
  x: number;
  measureX: number;
  y: number;
  width: number;
  height: number;
}

export interface SynthChunk {
  done: boolean;
  chunk: Float32Array;
}

export type SynthIterator = (cancel?: boolean) => Promise<SynthChunk>;

export interface WebMscoreState {
  score: WebMscore | null;
  isLoading: boolean;
  error: string | null;
  playbackState: PlaybackState;
  position: ScorePosition;
}

// Re-export WebMscore type
export type { WebMscore };
