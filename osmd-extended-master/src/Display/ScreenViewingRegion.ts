import { BoundingBox } from "../MusicalScore/Graphical";
import { SizeF2D, PointF2D } from "../Common/DataObjects";

/* This class is used as a simple 2D graphic pipeline to apply the resizing and positioning of drawing elements due to user interaction.
 * This is achieved by defining a Screen Viewing Region, which represents the current region of the score that appears on the screen.
 * Resizing this Viewing Region allows to zoom in and out, and moving it allows panning.
 * The resizing considers also the modification of the current aspect ratio.
 **/
export class ScreenViewingRegion {
    // TODO MB: Handle constructor overload
    // Tried handling this with static create...() functions below, check if working.
    //constructor() {
    //    this(new SizeF2D(1, 1), new SizeF2D(1, 1), new PointF2D(0, 0), 1);

    //}
    //constructor(displaySizeInPixel: SizeF2D, regionWidthInUnits: number) {
    //    this(displaySizeInPixel, new SizeF2D(1, 1), new PointF2D(0, 0), regionWidthInUnits);

    //}

    //Initial region shows the page WIDTH completely. The point 'position' corresponds to the left-upper corner of the viewing region
    constructor(displaySizeInPixel: SizeF2D, relativeSizeOfRegionInDisplay: SizeF2D, relativePositionOfRegionInDisplay: PointF2D, regionWidthInUnits: number) {
       this.psi = new BoundingBox(undefined);
       //Change to internal value since the setters each depend on each other being defined. Which they won't be at this stage
       this.displaySizeInPixel = displaySizeInPixel;
       this.RelativeDisplaySize = relativeSizeOfRegionInDisplay;
       this.RelativeDisplayPosition = relativePositionOfRegionInDisplay;
       this.WidthInUnits = regionWidthInUnits;
    }

    // TODO MB: Give this a better name maybe
    public static createWithRelativeDefaults(displaySizeInPixel: SizeF2D, regionWidthInUnits: number): ScreenViewingRegion {
        return new ScreenViewingRegion(displaySizeInPixel, new SizeF2D(1, 1), new PointF2D(0, 0), regionWidthInUnits);
    }

    public static createWithDefaults(): ScreenViewingRegion {
        return new ScreenViewingRegion(new SizeF2D(1, 1), new SizeF2D(1, 1), new PointF2D(0, 0), 1);
    }

    public RelativeDisplayPosition: PointF2D;
    // /**
    //  * Clip the whole object also if it lies inside the region but intersects this border.
    //  */
    // public ClipOnLeftBorderIntersection: boolean;
    // /**
    //  * Clip the whole object also if it lies inside the region but intersects this border.
    //  */
    // public ClipOnRightBorderIntersection: boolean;
    // /**
    //  * Clip the whole object also if it lies inside the region but intersects this border.
    //  */
    // public ClipOnTopBorderIntersection: boolean;
    // /**
    //  * Clip the whole object also if it lies inside the region but intersects this border.
    //  */
    // public ClipOnBottomBorderIntersection: boolean;
    public get UpperLeftPositionInUnits(): PointF2D {
        return this.psi.AbsolutePosition;
    }
    public set UpperLeftPositionInUnits(value: PointF2D) {
        this.psi.AbsolutePosition = value;
    }
    public get DisplaySizeInPixel(): SizeF2D {
        return this.displaySizeInPixel;
    }
    public set DisplaySizeInPixel(value: SizeF2D) {
        this.displaySizeInPixel = value;
        this.regionSizeInPixel = new SizeF2D(
            this.displaySizeInPixel.width * this.relativeRegionSize.width,
            this.displaySizeInPixel.height * this.relativeRegionSize.height
            );
        this.recalculateDependentVariables();
    }
    public get RelativeDisplaySize(): SizeF2D {
        return this.relativeRegionSize;
    }
    public set RelativeDisplaySize(value: SizeF2D) { // TODO: pixelSize, pixelposition and their relative pendants should depend on each other
        this.relativeRegionSize = value;
        this.regionSizeInPixel = new SizeF2D(
            this.displaySizeInPixel.width * this.relativeRegionSize.width,
            this.displaySizeInPixel.height * this.relativeRegionSize.height
            );
        this.recalculateDependentVariables();
    }
    public get RegionSizeInPixel(): SizeF2D {
        return this.regionSizeInPixel;
    }
    public get WidthInUnits(): number {
        return this.psi.BorderRight;
    }
    public set WidthInUnits(value: number) {
        this.psi.BorderRight = value;
        this.recalculateDependentVariables();
    }
    public get ViewRegionInUnits(): SizeF2D {
        return new SizeF2D(this.psi.BorderRight, this.psi.BorderBottom);
    }
    public isVisible(psi: BoundingBox, isCompletelyInside: boolean): boolean {
        const psiInScreen: boolean = this.psi.collisionDetection(psi);
        isCompletelyInside = this.psi.liesInsideBorders(psi);
        return psiInScreen;
    }
    /** This visible check takes care of the 4 ClipOnIntersectionWith.... flags
     * If a flag is set, all objects that reach over the corresponding border will not be "visible" and the method returns false.
     */
    // public isVisibleWithIntersectionClipping(psi: BoundingBox, isCompletelyInside: boolean): boolean {
    //     const psiInScreen: boolean = this.psi.collisionDetection(psi);
    //     // TODO MB: C# uses out keyword in .liesInsideBorders. Needs to be handled differently here.
    //     // Original C# for reference:
    //     // isCompletelyInside = this.psi.liesInsideBorders(psi, out leftBorderInside, out rightBorderInside, out topBorderInside, out bottomBorderInside);
    //     // Commented to not offend linter. End of where I commented marked below

    //     let leftBorderInside: boolean;
    //     let rightBorderInside: boolean;
    //     let topBorderInside: boolean;
    //     let bottomBorderInside: boolean;
    //     isCompletelyInside = this.psi.liesInsideBorders(psi, leftBorderInside, rightBorderInside, topBorderInside, bottomBorderInside);
    //     if ((   (!leftBorderInside && this.ClipOnLeftBorderIntersection) ||
    //             (!rightBorderInside && this.ClipOnRightBorderIntersection) ||
    //             (!topBorderInside && this.ClipOnTopBorderIntersection) ||
    //             (!bottomBorderInside && this.ClipOnBottomBorderIntersection)) ||
    //             !psiInScreen) {
    //         return false;
    //     }
    //     // *** End of commenting
    //     return true;

    // }
    public isInsideDisplayArea(relativeDisplayPosX: number, relativeDisplayPosY: number): boolean {
        const inside: boolean =
            (this.RelativeDisplayPosition.x <= relativeDisplayPosX) &&
            (relativeDisplayPosX <= this.RelativeDisplayPosition.x + this.RelativeDisplaySize.width) &&
            (this.RelativeDisplayPosition.y <= relativeDisplayPosY) &&
            (relativeDisplayPosY <= this.RelativeDisplayPosition.y + this.RelativeDisplaySize.height);
        return inside;
    }
    // public transformBoundingBoxToScreenCoordinates(psiInUnits: BoundingBox): BoundingBox {
    //     const pixelPsi: BoundingBox = new BoundingBox(psiInUnits.DataObject);
    //     // TODO MB: Linter doesn't like long lines, reformat this to an agreed standard.
    //     const leftBorderInPixel: number =
    //         ((psiInUnits.AbsolutePosition.x + psiInUnits.BorderLeft) - this.psi.AbsolutePosition.x) * this.horizontalUnitToPixelRatio +
    //         this.RelativeDisplayPosition.x * this.DisplaySizeInPixel.width;
    //     const topBorderInPixel: number =
    //         ((psiInUnits.AbsolutePosition.y + psiInUnits.BorderTop) - this.psi.AbsolutePosition.y) * this.verticalUnitToPixelRatio +
    //         this.RelativeDisplayPosition.y * this.DisplaySizeInPixel.height;
    //     pixelPsi.AbsolutePosition = new PointF2D(leftBorderInPixel, topBorderInPixel);
    //     pixelPsi.BorderRight = psiInUnits.BorderRight * this.horizontalUnitToPixelRatio;
    //     pixelPsi.BorderBottom = psiInUnits.BorderBottom * this.verticalUnitToPixelRatio;
    //     return pixelPsi;
    // }
    // public transformRectangleToScreenCoordinates(rectInUnits: RectangleF2D): RectangleF2D {
    //     const rectInPixels: RectangleF2D = new RectangleF2D(
    //         this.transformPositionXToScreenCoordinates(rectInUnits.x),
    //         this.transformPositionYToScreenCoordinates(rectInUnits.y),
    //         rectInUnits.width * this.horizontalUnitToPixelRatio,
    //         rectInUnits.height * this.verticalUnitToPixelRatio
    //     );
    //     // TODO MB: Moved below 4 lines into Rectangle initialization. Should have same result, check this.
    //     // rectInPixels.x = this.transformPositionXToScreenCoordinates(rectInUnits.x);
    //     // rectInPixels.y = this.transformPositionYToScreenCoordinates(rectInUnits.y);
    //     // rectInPixels.width = rectInUnits.width * this.horizontalUnitToPixelRatio;
    //     // rectInPixels.height = rectInUnits.height * this.verticalUnitToPixelRatio;
    //     return rectInPixels;
    // }
    // public transformSizeToScreenCoordinates(sizeInUnits: SizeF2D): SizeF2D {
    //     return new SizeF2D(sizeInUnits.width * this.horizontalUnitToPixelRatio, sizeInUnits.height * this.verticalUnitToPixelRatio);
    // }
    // public transformPointsToScreenCoordinates(pointInUnits: PointF2D): PointF2D {
    //     return new PointF2D(this.transformPositionXToScreenCoordinates(pointInUnits.x), this.transformPositionYToScreenCoordinates(pointInUnits.y));
    // }
    // public transformPositionXToScreenCoordinates(posXInUnits: number): number {
    //     return (posXInUnits - this.psi.AbsolutePosition.x) * this.horizontalUnitToPixelRatio
    //      + this.RelativeDisplayPosition.x * this.DisplaySizeInPixel.width;
    // }
    // public transformPositionYToScreenCoordinates(posYInUnits: number): number {
    //     return (posYInUnits - this.psi.AbsolutePosition.y) * this.verticalUnitToPixelRatio + this.RelativeDisplayPosition.y * this.DisplaySizeInPixel.height;
    // }
    // public transformLengthXToScreenCoordinates(lengthXInUnits: number): number {
    //     return lengthXInUnits * this.horizontalUnitToPixelRatio;
    // }
    // public transformLengthYToScreenCoordinates(lengthYInUnits: number): number {
    //     return lengthYInUnits * this.verticalUnitToPixelRatio;
    // }

    /**
     * @param relativeScreenPosition The relative position on the whole screen,
     * not on the ScreenViewingRegion (only if the region stretches over the whole screen).
     */
    public transformToUnitCoordinates(relativeScreenPosition: PointF2D): PointF2D {
        const position: PointF2D = new PointF2D(this.UpperLeftPositionInUnits.x + this.ViewRegionInUnits.width *
                                                ((relativeScreenPosition.x - this.RelativeDisplayPosition.x) / this.RelativeDisplaySize.width),
                                                this.UpperLeftPositionInUnits.y + this.ViewRegionInUnits.height *
                                                ((relativeScreenPosition.y - this.RelativeDisplayPosition.y) / this.RelativeDisplaySize.height));
        return position;
    }
    // public transformToUnitCoordinates(sizeInPixels: SizeF2D): SizeF2D {
    //     return new SizeF2D(sizeInPixels.width / this.horizontalUnitToPixelRatio, sizeInPixels.height / this.verticalUnitToPixelRatio);
    // }
    public transformLengthXToUnitCoordinates(lengthXInPixels: number): number {
        return lengthXInPixels / this.horizontalUnitToPixelRatio;
    }
    public transformLengthYToUnitCoordinates(lengthYInPixels: number): number {
        return lengthYInPixels / this.verticalUnitToPixelRatio;
    }
    private recalculateDependentVariables(): void {
        const aspectRatio: number = this.regionSizeInPixel.width / this.regionSizeInPixel.height;
        this.psi.BorderBottom = this.psi.BorderRight / aspectRatio;
        this.horizontalUnitToPixelRatio = this.regionSizeInPixel.width / this.ViewRegionInUnits.width;
        this.verticalUnitToPixelRatio = this.regionSizeInPixel.height / this.ViewRegionInUnits.height;
    }
    private displaySizeInPixel: SizeF2D; // Size of the display
    private regionSizeInPixel: SizeF2D; // Size of the Region on the display
    private relativeRegionSize: SizeF2D;
    private horizontalUnitToPixelRatio: number;
    private verticalUnitToPixelRatio: number;
    private psi: BoundingBox;
}
