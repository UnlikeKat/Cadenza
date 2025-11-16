import { IZoomView } from "../Common/Interfaces/IZoomView";
import {    MusicSheetDrawer, GraphicalMusicSheet, BoundingBox, DrawingParameters,
            MusicSystem, EngravingRules} from "../MusicalScore/Graphical";
import { ScreenViewingRegion } from "./ScreenViewingRegion";
import { PointF2D, Fraction, SizeF2D } from "../Common/DataObjects";
import { AbstractZoomView } from "./AbstractZoomView";
import { InteractionType } from "../Common/Enums/InteractionType";
import { AbstractDisplayInteractionManager } from "./AbstractDisplayInteractionManager";
import { IUserDisplayInteractionListener } from "../Common/Interfaces/IUserDisplayInteractionListener";
import { PlaybackManager } from "../Playback";
import { VoiceEntryInteractionListener } from "./VoiceEntryInteractionListener";

export class SheetRenderingManager extends AbstractZoomView implements IZoomView {
    protected musicSheetDrawer: MusicSheetDrawer;
    protected graphicalMusicSheet: GraphicalMusicSheet;
    protected mainViewingRegion: ScreenViewingRegion = ScreenViewingRegion.createWithDefaults();
    protected tryAgainToRenderCount: number = 0;
    private yOffsetMouseDown: number = Number.MIN_VALUE;
    private unlockCursorDistancePixel: number = 50.0;
    private relativeTopPosition: number = 0.06;
    /* The preview images are supersampled (because of our drawing mechanism with more than 1 rasterization stage,
     * this increases the output image quality significantly)
     **/
    protected internalPreviewImageScale: number = 3.0;
    protected listeners: IUserDisplayInteractionListener[] = [];
    public PlaybackManager: PlaybackManager;
    private rules: EngravingRules;

    constructor(displayInteractionManager: AbstractDisplayInteractionManager, rules: EngravingRules) {
        super(displayInteractionManager);
        this.rules = rules;
        this.addZoomView(this);
        this.lockRanges = true;
        this.TopBarHeightInPixel = 70;
        this.BottomBarHeightInPixel = 0;

        if (this.rules.UseDefaultVoiceInteractionListener) { // default: true
            // OSMD default listener (play voice entry, set playback position at voice entry). Can be removed.
            this.listeners.push(new VoiceEntryInteractionListener(this));
        }
    }

    public addListener(listener: IUserDisplayInteractionListener): void {
        this.listeners.push(listener);
    }
    public get Listeners(): IUserDisplayInteractionListener[] {
        return this.listeners;
    }
    public SingleTouchDisabled: boolean;
    public DoubleTouchDisabled: boolean;
    public LockDisplayToCursor: boolean = true;
    public ZoomActive: boolean = false;
    protected convertToUnitsReady(): boolean {
        return this.graphicalMusicSheet !== undefined;
    }
    protected unitPosTouched(PosInUnits: PointF2D, relPosX: number, relPosY: number): void {
        // Pass mouse click to click listener
        if (!this.SingleTouchDisabled) {
            const relPos: PointF2D = new PointF2D(relPosX, relPosY);
            this.handleUserDisplayInteraction(relPos, PosInUnits, InteractionType.SingleTouch);
        }
    }
    protected unitPosDoubleTouched(PosInUnits: PointF2D, relPosX: number, relPosY: number): void {
        if (!this.DoubleTouchDisabled) {
            const relPos: PointF2D = new PointF2D(relPosX, relPosY);
            this.handleUserDisplayInteraction(relPos, PosInUnits, InteractionType.DoubleTouch);
        }
    }
    protected unitPosTouchDown(PosInUnits: PointF2D, relPosX: number, relPosY: number): void {
        const relPos: PointF2D = new PointF2D(relPosX, relPosY);
        this.handleUserDisplayInteraction(relPos, PosInUnits, InteractionType.TouchDown);
        this.yOffsetMouseDown = PosInUnits.y;
    }
    protected unitPosTouchUp(PosInUnits: PointF2D, relPosX: number, relPosY: number): void {
        const relPos: PointF2D = new PointF2D(relPosX, relPosY);
        this.handleUserDisplayInteraction(relPos, PosInUnits, InteractionType.TouchUp);
        if (this.displayInteractionManager.WasZoomGestureActive === false) {
            this.unlockFromCursorIfNecessary(PosInUnits);
        }
        this.yOffsetMouseDown = Number.MIN_VALUE;
    }
    protected unitPosMove(PosInUnits: PointF2D, relPosX: number, relPosY: number): void {
        const relPos: PointF2D = new PointF2D(relPosX, relPosY);
        this.handleUserDisplayInteraction(relPos, PosInUnits, InteractionType.Move);
        this.unlockFromCursorIfNecessary(PosInUnits);
    }

    public get MainViewingRegion(): ScreenViewingRegion {
        return this.mainViewingRegion;
    }
    public TopBarHeightInPixel: number;
    public BottomBarHeightInPixel: number;
    public setMusicSheet(musicSheet: GraphicalMusicSheet): void {
        this.graphicalMusicSheet = musicSheet;
        this.adaptDisplayLimitsToSheet();
        this.setYOffset(0, true);
    }
    public viewportXChanged(offsetX: number, rangeX: number): void {
        if (this.graphicalMusicSheet === undefined) {
            return;
        }
        this.horizontalViewportChanged(offsetX, rangeX);
    }
    /**
     * Sets the vertical position and viewing height of the displayed area on the music score.
     */
    public viewportYChanged(offsetY: number, rangeY: number): void {
        if (this.graphicalMusicSheet === undefined) {
            return;
        }
        if (this.yOffsetMouseDown <= Number.MIN_VALUE + 0.5) {
            this.yOffsetMouseDown = offsetY;
        }
        this.verticalViewportChanged(offsetY, rangeY);
    }
    public displaySizeChanged(width: number, height: number): void {
        super.viewSizeChanged(width, height);
        if (Math.abs(width - 0) < 0.0000001 || Math.abs(height - 0) < 0.0000001) {
            return;
        }
        if (this.graphicalMusicSheet !== undefined) {
            this.graphicalMusicSheet.EnforceRedrawOfMusicSystems(); // probably not necessary, already handled by OSMD
        }
        this.mainViewingRegion.DisplaySizeInPixel = new SizeF2D (width, height);
        this.adaptDisplayLimitsToSheet();
    }
    public calcDisplayYPosition(system: MusicSystem): number {
        return  system.PositionAndShape.AbsolutePosition.y + system.PositionAndShape.BorderMarginTop -
                this.topBarHeightInUnits() - this.relativeTopPosition * this.heightWithoutTopBottomBarsInUnits();
    }
    /**
     * The display scroll y-position to show the given system completely on the bottom of the screen
     */
    public yPositionForLastSystem(lastSystem: MusicSystem): number {
        return  lastSystem.PositionAndShape.AbsolutePosition.y + lastSystem.PositionAndShape.BorderMarginBottom -
                this.topBarHeightInUnits() - (1 - this.relativeTopPosition) * this.heightWithoutTopBottomBarsInUnits();
    }
    // TODO MB: What is up with the unused variables here? Also: formatting of parameters.
    public scorePositionChanged(upperCursorPoint: PointF2D, enrolledTimeStamp: Fraction, sheetTimeStamp: Fraction,
                                system: MusicSystem, resetOccurred: boolean, smoothAnimation: boolean): void {
        const positionY: number = this.calcDisplayYPosition(system);
        this.setYPosition(positionY, smoothAnimation);
    }
    public setXPosition(positionXInUnits: number, animated: boolean): void {
        if (this.LockDisplayToCursor) {
            this.setXOffset(positionXInUnits, animated);
        }
    }
    public setYPosition(positionYInUnits: number, animated: boolean): void {
        if (this.LockDisplayToCursor) {
            this.setYOffset(positionYInUnits, animated);
        }
    }
    public get DrawingParameters(): DrawingParameters {
        return this.musicSheetDrawer.drawingParameters;
    }
    public topBarHeightInUnits(): number {
        return this.mainViewingRegion.transformLengthYToUnitCoordinates(this.TopBarHeightInPixel);
    }
    public bottomBarHeightInUnits(): number {
        return this.mainViewingRegion.transformLengthYToUnitCoordinates(this.BottomBarHeightInPixel);
    }
    public heightWithoutTopBottomBarsInUnits(): number {
        return this.mainViewingRegion.ViewRegionInUnits.height - this.topBarHeightInUnits() - this.bottomBarHeightInUnits();
    }
    public activePositionToBottomBarHeight(): number {
        return  (this.mainViewingRegion.ViewRegionInUnits.height - this.topBarHeightInUnits() - this.bottomBarHeightInUnits()) *
                (1 - 2 * this.relativeTopPosition);
    }
    public getClickPosition(relativePositionX: number, relativePositionY: number): PointF2D {
        return this.mainViewingRegion.transformToUnitCoordinates(new PointF2D(relativePositionX, relativePositionY));
    }
    public graphicalObjectIsVisible(boundingBox: BoundingBox): boolean {
        const isCompletelyInside: boolean = false;
        return this.mainViewingRegion.isVisible(boundingBox, isCompletelyInside);
    }
    /**
     * sets the size of the maximal musicpage seen including the extensions on top resp. bottom
     * !Caution!: settings/offsets have been changed for ScrollIndicator.. won't work anymore if changed again
     */
    public adaptDisplayLimitsToSheet(): void {
        if (   this.graphicalMusicSheet === undefined
            || this.graphicalMusicSheet.MusicPages.length === 0
            || this.graphicalMusicSheet.MusicPages[0].MusicSystems.length === 0) {
            return;
        }

        // set the new limits for viewing:
        this.offsetXMin = 0;
        this.rangeXMin = this.graphicalMusicSheet.MinAllowedSystemWidth;
        this.rangeXMax = 300;
        this.offsetYMin = -0.3 * this.RangeY;
        const lastPagePsi: BoundingBox = this.graphicalMusicSheet.MusicPages.last().PositionAndShape;
        this.offsetYMax = Math.max(0, lastPagePsi.BorderMarginBottom - 0.7 * this.RangeY);
        if (this.OffsetY > this.offsetYMax) {
            this.setYOffset(this.offsetYMax, true);
        }
    }
    protected horizontalViewportChanged(offsetX: number, rangeX: number): void {
        if (this.mainViewingRegion.WidthInUnits !== rangeX) {
            this.mainViewingRegion.WidthInUnits = rangeX;
        }
    }

    protected verticalViewportChanged(offsetY: number, rangeY: number): void {
        this.mainViewingRegion.UpperLeftPositionInUnits = new PointF2D(this.mainViewingRegion.UpperLeftPositionInUnits.x, offsetY);
    }

    private unlockFromCursorIfNecessary(PosInUnits: PointF2D): void {
        if (this.LockDisplayToCursor === false || this.ZoomActive) {
            return;
        }

        if (this.displayInteractionManager.ZoomGestureActive || this.displayInteractionManager.WasZoomGestureActive) {
            return;
        }
        // finally check for the movement distance, to not unlock already at little finger pressure changes...
        // TODO MB: Fix formatting.
        const ydiff: number = Math.abs((PosInUnits.y - this.yOffsetMouseDown) *
                                this.mainViewingRegion.RegionSizeInPixel.height /
                                this.mainViewingRegion.ViewRegionInUnits.height);
        if (ydiff > this.unlockCursorDistancePixel) {
            this.LockDisplayToCursor = false;
        }
    }

    protected getPositionInUnits(relativePositionX: number, relativePositionY: number): PointF2D {
        const position: PointF2D = new PointF2D(relativePositionX, relativePositionY);
        if (this.rules.RenderSingleHorizontalStaffline) {
            position.x += this.rules.Container.scrollLeft / this.displayInteractionManager.displayWidth;
            // TODO move this to mouseMoved() mouseUp() positionTouched() or sth.
            //   Also, scrollLeft should probably be set in WebDisplayInteractionManager.fullScrollLeft instead
        }
        return this.mainViewingRegion.transformToUnitCoordinates(position);
    }

    protected handleUserDisplayInteraction( relativePositionOnDisplay: PointF2D, positionOnMusicSheet: PointF2D,
                                            type: InteractionType): void {
        switch (type) {
            case InteractionType.TouchDown:
            case InteractionType.SingleTouch:
            case InteractionType.DoubleTouch:
            case InteractionType.TouchUp:
            case InteractionType.TouchDown:
            case InteractionType.Move:
                for (const listener of this.listeners) {
                    listener.userDisplayInteraction(relativePositionOnDisplay, positionOnMusicSheet, type);
                }
                break;
            default:
                throw new Error("type");
        }
    }

    public setStartPosition(newStartPosition: Fraction): void {
        if (this.graphicalMusicSheet === undefined) {
            return;
        }

        this.graphicalMusicSheet.ParentMusicSheet.SelectionStart = newStartPosition;
        this.PlaybackManager?.reset();
    }

    public get GraphicalMusicSheet(): GraphicalMusicSheet {
        return this.graphicalMusicSheet;
    }
}
