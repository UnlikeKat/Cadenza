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
  // private activeSamples: Map<number, any> = new Map();
  private piano: SoundfontPlayer.Player;
  private activeNodes: Map<number, { node: AudioNode, endTime: number }> = new Map();
  private cleanupInterval: number | undefined;
  private nodeIdCounter: number = 0;

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
    // Aggressive cleanup every 500ms for real-time performance
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupOldNodes();
    }, 500);
  }

  public async open(uniqueInstruments: number[], numberOfinstruments: number = 16): Promise<void> {
    if (this.piano === undefined) {
      this.piano = await SoundfontPlayer.instrument(
        this.ac as unknown as AudioContext,
        midiNames[MidiInstrument.Acoustic_Grand_Piano].toLowerCase() as any,
        this.SoundfontInstrumentOptions
      );
    }

    for (let i: number = 0; i < numberOfinstruments; i++) {
      this.channelVolumes[i] = 0.8;
    }
  }

  public close(): void {
    // Clear cleanup interval
    if (this.cleanupInterval !== undefined) {
      window.clearInterval(this.cleanupInterval);
    }
    // Clear all active nodes
    this.activeNodes.clear();
    // _activeSamples.Clear();
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

    const soundFont: SoundfontPlayer.Player = this.memoryLoadedSoundFonts.get(
      this.channelToSoundFont.get(instrumentChannel)
    );

    const audioNode: AudioNode = soundFont.schedule(0, [
      { note: key, duration: lengthInMs / 1000, gain: sampleVolume * this.GainMultiplier },
    ]) as unknown as AudioNode;

    // Track active nodes with their end times for time-based cleanup
    if (audioNode) {
      const nodeId: number = this.nodeIdCounter++;
      const endTime: number = this.ac.currentTime + (lengthInMs / 1000);
      this.activeNodes.set(nodeId, { node: audioNode, endTime });

      // Immediate cleanup when node limit is reached
      if (this.activeNodes.size > 20) {
        this.cleanupOldNodes();
      }
    }
  }

  private cleanupOldNodes(): void {
    const currentTime: number = this.ac.currentTime;
    const nodesToDelete: number[] = [];

    // Remove all nodes that have finished playing
    for (const [id, nodeData] of this.activeNodes) {
      if (currentTime >= nodeData.endTime) {
        nodesToDelete.push(id);
      }
    }

    // Delete finished nodes
    nodesToDelete.forEach((id: number) => this.activeNodes.delete(id));

    // If still too many nodes, force delete oldest ones
    if (this.activeNodes.size > 15) {
      const sortedNodes: Array<[number, { node: AudioNode, endTime: number }]> = Array.from(this.activeNodes.entries())
        .sort((a: [number, { node: AudioNode, endTime: number }], b: [number, { node: AudioNode, endTime: number }]) => a[1].endTime - b[1].endTime);

      const toRemove: number = this.activeNodes.size - 15;
      for (let i: number = 0; i < toRemove; i++) {
        this.activeNodes.delete(sortedNodes[i][0]);
      }
    }
  }

  /** Stop sound(s) in this channel. Currently stops all of the instrument's sounds because of implementation details. */
  public stopSound(instrumentChannel: number, key: number): void {
    const soundFont: SoundfontPlayer.Player = this.memoryLoadedSoundFonts.get(
      this.channelToSoundFont.get(instrumentChannel)
    );
    soundFont?.stop();
    // this is somewhat abrupt, but continuing to play long notes on pause button hit is worse.
    // this will stop all notes in this channel. Otherwise we probably need a map of keys to AudioNode
  }

  public async setSound(
    instrumentChannel: number,
    soundId: MidiInstrument,
  ): Promise<number> {
    if (this.memoryLoadedSoundFonts.get(soundId) === undefined) {
      await this.loadSoundFont(soundId);
    }
    this.channelToSoundFont.set(instrumentChannel, soundId);
    return instrumentChannel;
  }

  public async loadSoundFont(soundId: MidiInstrument): Promise<SoundfontPlayer.Player> {
    if (this.memoryLoadedSoundFonts.get(soundId) !== undefined) {
      return this.memoryLoadedSoundFonts.get(soundId);
    }

    let nameOrUrl: any = midiNames[soundId].toLowerCase();
    if (soundId === MidiInstrument.Percussion) {
      // percussion unfortunately doesn't exist in the original soundfonts
      nameOrUrl = this.SoundfontInstrumentOptions.fromPercussion + "percussion-mp3.js";
    }
    const player: SoundfontPlayer.Player = await SoundfontPlayer.instrument(
      this.ac,
      nameOrUrl,
      this.SoundfontInstrumentOptions
    );
    this.memoryLoadedSoundFonts.set(soundId, player);
    return player;
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
