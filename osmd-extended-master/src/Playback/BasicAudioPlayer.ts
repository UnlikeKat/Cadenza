/* Partial IAudioPlayer implementation using the high level "soundfont-player" library. */

import { MidiInstrument } from "../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { IAudioPlayer } from "../Common/Interfaces/IAudioPlayer";
// import { AudioContext as SAudioContext } from "standardized-audio-context";
import * as SoundfontPlayer from "soundfont-player";
import midiNames from "./midiNames";

export class BasicAudioPlayer implements IAudioPlayer<SoundfontPlayer.Player> {

  public ac: AudioContext = new AudioContext({ latencyHint: "playback" });
  // private mainTuningRatio: number = 1.0;
  private channelVolumes: number[] = [];
  private piano: SoundfontPlayer.Player;

  protected memoryLoadedSoundFonts: Map<MidiInstrument, SoundfontPlayer.Player> = new Map();
  protected channelToSoundFont: Map<number, number> = new Map();

  public SoundfontInstrumentOptions = {
    from: "https://gleitz.github.io/midi-js-soundfonts/",
    fromPercussion: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/",
    nameToUrl: undefined // will be overwritten in constructor
  }; // e.g. set { from: "server.com/soundfonts/" } for soundfont fetching url, and set nameToUrl to undefined.

  /** Multiplicator for gain (volume output). 1 represents the maximum volume in OSMD (100%),
   *  but it looks like soundfont-player is louder with volumes > 1.
   *  E.g. set osmd.PlaybackManager.audioPlayer.GainMultiplier to 3 if you think the player is too quiet. */
  public GainMultiplier: number = 1;

  constructor() {
    if (this.SoundfontInstrumentOptions.nameToUrl === undefined) {
      this.SoundfontInstrumentOptions.nameToUrl = this.nameToSoundfontUrl;
    }
  }

  public async open(uniqueInstruments: number[], numberOfinstruments: number = 16): Promise<void> {
    // Piano-only optimization: only load acoustic grand piano
    if (this.piano === undefined) {
      this.piano = await SoundfontPlayer.instrument(
        this.ac as unknown as AudioContext,
        midiNames[MidiInstrument.Acoustic_Grand_Piano].toLowerCase() as any,
        this.SoundfontInstrumentOptions
      );
      // Map piano to all instruments for simplicity
      this.memoryLoadedSoundFonts.set(MidiInstrument.Acoustic_Grand_Piano, this.piano);
    }

    for (let i: number = 0; i < numberOfinstruments; i++) {
      this.channelVolumes[i] = 0.8;
      // Map all channels to piano
      this.channelToSoundFont.set(i, MidiInstrument.Acoustic_Grand_Piano);
    }
  }

  public close(): void {
    // Stop all piano notes
    if (this.piano) {
      this.piano.stop();
    }
  }

  public tuningChanged(tuningInHz: number): void {
    console.warn("BasicAudioPlayer tuningChanged not implemented");
    //this.mainTuningRatio = tuningInHz / 440;
  }

  public playSound(
    instrumentChannel: number,
    key: number,
    volume: number,
    lengthInMs: number
  ): void {
    if (key >= 128) { return; }

    const sampleVolume: number = Math.min(
      1,
      this.channelVolumes[instrumentChannel] * volume
    );

    // Always use piano (piano-only optimization)
    const soundFont: SoundfontPlayer.Player = this.piano;

    if (!soundFont) {
      console.warn("Piano not loaded yet");
      return;
    }

    // Pre-schedule the note using soundfont-player's schedule method
    // This handles the Web Audio API scheduling internally
    const duration: number = lengthInMs / 1000;
    const gain: number = sampleVolume * this.GainMultiplier;

    // Use schedule() with time=0 to play immediately at AudioContext.currentTime
    // The soundfont-player will handle the scheduling via Web Audio API
    soundFont.schedule(0, [
      { note: key, duration, gain },
    ]);
  }

  /** Stop sound(s) in this channel. Currently stops all of the instrument's sounds because of implementation details. */
  public stopSound(instrumentChannel: number, key: number): void {
    // Piano-only: stop all piano notes
    if (this.piano) {
      this.piano.stop();
    }
  }

  public async setSound(
    instrumentChannel: number,
    soundId: MidiInstrument,
  ): Promise<number> {
    // Piano-only optimization: always use piano regardless of requested instrument
    this.channelToSoundFont.set(instrumentChannel, MidiInstrument.Acoustic_Grand_Piano);
    return instrumentChannel;
  }

  public async loadSoundFont(soundId: MidiInstrument): Promise<SoundfontPlayer.Player> {
    // Piano-only optimization: always return piano
    if (this.piano) {
      return this.piano;
    }

    // If piano not loaded yet, load it
    this.piano = await SoundfontPlayer.instrument(
      this.ac,
      midiNames[MidiInstrument.Acoustic_Grand_Piano].toLowerCase() as any,
      this.SoundfontInstrumentOptions
    );
    this.memoryLoadedSoundFonts.set(MidiInstrument.Acoustic_Grand_Piano, this.piano);
    return this.piano;
  }

  /** Returns the url for the instrument name's soundfont to be loaded. */
  public nameToSoundfontUrl(name: string, font: string, format: string, from: string): string {
    // nameToUrl function from soundfont-player.js / lib/index.js
    format = format === "ogg" ? format : "mp3";
    font = font === "FluidR3_GM" ? font : "MusyngKite";
    const fromServer: string = from ?? "https://gleitz.github.io/midi-js-soundfonts/";
    // note that `this` is undefined when called from SoundfontPlayer.instrument(), so we have to add the `from` parameter
    let url: string =  fromServer + font + "/" + name + "-" + format + ".js";
    // end soundfont-player nameToUrl function. The following fixes bad links.

    const urlReplacements: Object = {
      "honky_tonk_piano-mp3.js": "honkytonk_piano-mp3.js",
      "synth_voice-mp3.js": "synth_choir-mp3.js",
      "lead_8_bass_lead-mp3.js": "lead_8_bass__lead-mp3.js",
    };
    for (const key of Object.keys(urlReplacements)) {
      url = url.replace(key, urlReplacements[key]);
    }
    return url;
  }

  public setVolume(instrumentChannel: number, volume: number): void {
    this.channelVolumes[instrumentChannel] = volume;
  }

  public setSoundFontFilePath(soundId: MidiInstrument, path: string): void {
    // TODO: Remove function, not needed for web. If not used to load different soundfonts from URLs?
  }

  public playbackHasStopped(): void {
    //console.warn("BasicAudioPlayer playbackHasStopped not implemented");
  }

  public getMemoryLoadedSoundFonts(): SoundfontPlayer.Player[] {
    return [...this.memoryLoadedSoundFonts.values()];
  }
}
