import { AUIController } from "../../../MusicalScore/Interfaces/AUIController";
import rawHtml from "./ControlPanel.html";
import rawVolumeItemHtml from "./VolumeItem.html";
import rawPlaybackButtonHtml from "./PlaybackButtons.html";
import {MDCSlider} from "@material/slider";
import { IPlaybackParametersListener } from "../../../Common/Interfaces/IPlaybackParametersListener";
import { PlayPauseButton } from "./PlayPauseButton";
import { MDCTabBar } from "@material/tab-bar";
import {MDCRipple} from "@material/ripple";
import {MDCIconButtonToggle} from "@material/icon-button";
import { Dictionary } from "typescript-collections";
import { CursorPosChangedData } from "../../../Common/DataObjects/CursorPosChangedData";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { IPlaybackListener } from "../../../Common/Interfaces/IPlaybackListener";
import { PlaybackManager } from "../../PlaybackManager";
import log from "loglevel";

export class ControlPanel extends AUIController<IPlaybackParametersListener>
implements IPlaybackParametersListener, IPlaybackListener {
    //TODO: We need this to be updated if the score changes these parameters as well
    public volumeMute(instrument: number): void {
        throw new Error("Method not implemented.");
    }
    public volumeUnmute(instrument: number): void {
        throw new Error("Method not implemented.");
    }
    public bpmChanged(newNpm: number, sheetOverride: boolean): void {
        this.bpmValue = newNpm;
        if (this.bpmSlider) {
            this.bpmSlider.value = this.bpmValue;
        }
    }
    public volumeChanged(channels: number, newVolume: number): void {
        throw new Error("Method not implemented.");
    }
    public play(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public pause(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public reset(): void {
        throw new Error("Method not implemented.");
    }
    public playbackManager: PlaybackManager;
    private controlPanelElement: HTMLDivElement;
    private playbackButtonsContainerElement: HTMLDivElement;
    private metronomeToolbarElement: HTMLDivElement;
    private volumeToolbarElement: HTMLDivElement;
    private bpmValue: number = 80;
    private bpmSlider: MDCSlider;
    private volumeSliders: Dictionary<number, MDCSlider> = new Dictionary<number, MDCSlider>();
    private volumeSliderElements: Dictionary<number, HTMLDivElement> = new Dictionary<number, HTMLDivElement>();
    private playPauseButton: PlayPauseButton;
    private resetButton: HTMLButtonElement;
    private titleContentElement: HTMLHeadingElement;
    private closeButtonElement: HTMLButtonElement;
    public get IsClosed(): boolean {
        return this.controlPanelElement.classList.contains("hide");
    }

    public clearVolumeTracks(): void {
        for (const slider of this.volumeSliders.values()) {
            slider.destroy();
        }
        this.volumeSliders.clear();
        for (const element of this.volumeSliderElements.values()) {
            element.parentElement.remove();
        }
        this.volumeSliderElements.clear();
    }

    public addVolumeTrack(name: string, id: number, value: number = 80): void {
        const newVolumeItem: string = this.generateHtmlTemplate(rawVolumeItemHtml, {name: name, id: id.toString()});
        this.volumeToolbarElement.insertAdjacentHTML("beforeend", newVolumeItem);
        const volSliderParentElement: HTMLDivElement = this.volumeToolbarElement.lastChild as HTMLDivElement;
        const volSliderElement: HTMLDivElement = volSliderParentElement.getElementsByClassName("volume-slider")[0] as HTMLDivElement;
        const volMuteButtonElement: HTMLButtonElement = volSliderParentElement.getElementsByClassName("mute-button")[0] as HTMLButtonElement;
        const iconToggle: MDCIconButtonToggle = new MDCIconButtonToggle(volMuteButtonElement);
        iconToggle.initialize();
        this.volumeSliderElements.setValue(id, volSliderElement);
        const volumeSlider: MDCSlider = new MDCSlider(volSliderElement);
        volumeSlider.value = value;
        volumeSlider.initialize();
        const self: ControlPanel = this;
        iconToggle.listen("MDCIconButtonToggle:change", function(event: CustomEvent): void {
            event.preventDefault();
            for (const listener of self.eventListeners) {
                if (event.detail.isOn) {
                    listener.volumeMute(id);
                } else {
                    listener.volumeUnmute(id);
                    volMuteButtonElement.classList.remove("mdc-ripple-upgraded--background-focused");
                }
            }
        });
        iconToggle.on = false;
        volumeSlider.listen("MDCSlider:input", () => {
            for (const listener of self.eventListeners) {
                listener.volumeChanged(id, volumeSlider.value);
            }
        });
        this.volumeSliders.setValue(id, volumeSlider);
    }

    protected initialize(): void {
        this.generateAndInsertHtmlTemplate(rawHtml);
        this.controlPanelElement = this.parentElement.lastChild as HTMLDivElement;
        this.generateAndInsertHtmlTemplate(rawPlaybackButtonHtml);
        this.playbackButtonsContainerElement = this.parentElement.lastChild as HTMLDivElement;
        this.resetButton = this.playbackButtonsContainerElement.getElementsByClassName("reset-button")[0] as HTMLButtonElement;
        this.playPauseButton = new PlayPauseButton(this.playbackButtonsContainerElement.getElementsByClassName("playpause-button")[0] as HTMLButtonElement);
        this.playPauseButton.listen((state) => {
            if (state === "playing") {
                for (const listener of self.eventListeners) {
                    if (listener instanceof PlaybackManager) {
                        if (!listener.DummySoundPlayed) {
                            listener.playDummySound();
                        }
                    }
                    listener.play();
                }
            } else {
                for (const listener of self.eventListeners) {
                    listener.pause();
                }
            }
        });
        this.resetButton.addEventListener("click", () => {
            for (const listener of self.eventListeners) {
                listener.reset();
            }
        });
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.code === "ArrowLeft") {
              for (const listener of self.eventListeners) {
                listener.reset();
              }
            }
        });

        this.metronomeToolbarElement = this.controlPanelElement.getElementsByClassName("metronome-toolbar")[0] as HTMLDivElement;
        this.volumeToolbarElement = this.controlPanelElement.getElementsByClassName("volume-toolbar")[0] as HTMLDivElement;
        const tabBar: MDCTabBar = new MDCTabBar(this.controlPanelElement.getElementsByClassName("playback-tabs")[0]);
        tabBar.initialize();

        this.titleContentElement = this.controlPanelElement.getElementsByClassName("playback-title")[0] as HTMLHeadingElement;
        this.closeButtonElement = this.controlPanelElement.getElementsByClassName("close-playback")[0] as HTMLButtonElement;
        const buttonRipple: MDCRipple = new MDCRipple(this.closeButtonElement);
        buttonRipple.unbounded = true;
        buttonRipple.initialize();

        const self: ControlPanel = this;
        this.closeButtonElement[this.upEventName] = function(): void {
            self.hideAndClear();
            //self.eventListener.onClose();
        };
        tabBar.activateTab(0);
        tabBar.listen("MDCTabBar:activated", function(event: CustomEvent): void {
            switch (event.detail.index) {
                case 0:
                    self.metronomeToolbarElement.classList.remove("hide");
                    self.volumeToolbarElement.classList.add("hide");
                    self.bpmSlider?.destroy();
                    self.bpmSlider = new MDCSlider(self.controlPanelElement.getElementsByClassName("metronome-slider")[0]);
                    self.bpmSlider.initialize();
                    self.bpmSlider.value = self.bpmValue;
                    self.bpmSlider.listen("MDCSlider:input", () => {
                        self.bpmValue = self.bpmSlider.value;
                        for (const listener of self.eventListeners) {
                            listener.bpmChanged(self.bpmValue, true);
                        }
                    });
                    self.titleContentElement.innerText = "Tempo (BPM)";
                    break;
                case 1:
                    self.metronomeToolbarElement.classList.add("hide");
                    self.volumeToolbarElement.classList.remove("hide");
                    for (const midiIds of self.volumeSliders.keys()) {
                        let slider: MDCSlider = self.volumeSliders.getValue(midiIds);
                        slider.destroy();
                        slider = new MDCSlider(self.volumeSliderElements.getValue(midiIds));
                        slider.initialize();
                        slider.listen("MDCSlider:input", () => {
                            for (const listener of self.eventListeners) {
                                listener.volumeChanged(midiIds, slider.value);
                            }
                        });
                    }
                    self.titleContentElement.innerText = "Volume Mixer";
                    break;
                default:
                    break;
            }
        });
    }

    public hideAndClear(): void {
        this.controlPanelElement.classList.add("hide");
    }

    public show(): void {
        this.controlPanelElement.classList.remove("hide");
        const self: ControlPanel = this;
        if (this.metronomeToolbarElement.classList.contains("hide")) {
            for (const midiIds of self.volumeSliders.keys()) {
                let slider: MDCSlider = self.volumeSliders.getValue(midiIds);
                slider.destroy();
                slider = new MDCSlider(self.volumeSliderElements.getValue(midiIds));
                slider.initialize();
                slider.listen("MDCSlider:input", () => {
                    for (const listener of self.eventListeners) {
                        listener.volumeChanged(midiIds, slider.value);
                    }
                });
            }
        } else {
            this.bpmSlider?.destroy();
            this.bpmSlider = new MDCSlider(this.controlPanelElement.getElementsByClassName("metronome-slider")[0]);
            this.bpmSlider.initialize();
            this.bpmSlider.value = this.bpmValue;
            this.bpmSlider.listen("MDCSlider:input", () => {
                this.bpmValue = self.bpmSlider.value;
                for (const listener of self.eventListeners) {
                    listener.bpmChanged(self.bpmSlider.value, true);
                }
            });
        }
    }

    public cursorPositionChanged(timestamp: Fraction, data: CursorPosChangedData): void {
        return;
    }

    public pauseOccurred(o: object): void {
        return;
    }
    public metronomeSoundOccurred(o: object): void {
        // do nothing
    }

    public selectionEndReached(o: object): void {
        this.playPauseButton.reset();
    }

    public resetOccurred(o: object): void {
        return;
    }

    public notesPlaybackEventOccurred(o: object): void {
        return;
    }

    public soundLoaded(instrumentId?: number, instrumentName?: string): void {
        if (instrumentName === "drums") {
            return; // TODO don't load drums in non-drum sheets
        }
        let instrumentString: string = instrumentName ?? instrumentId?.toString() ?? "undefined";
        if (this.playbackManager && instrumentId !== undefined) {
            instrumentString = this.playbackManager.InstrumentIdMapping.getValue(instrumentId)?.Name ?? instrumentString;
        }
        log.info(`Sound loaded for instrument ${instrumentString}.`);
    }

    public allSoundsLoaded(): void {
        log.info("All sounds loaded. Ready for playback.");
    }
}
