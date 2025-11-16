import { PointF2D } from "../Common/DataObjects/PointF2D";
import { SheetRenderingManager } from "./SheetRenderingManager";

export class WebSheetRenderingManager extends SheetRenderingManager {
    //The AbstractZoomView version of this doesn't seem to work right
    public mouseMove(relativeDisplayPositionX: number, relativeDisplayPositionY: number, deltaX: number, deltaY: number): void {
        const clickPosition: PointF2D = this.getPositionInUnits(relativeDisplayPositionX, relativeDisplayPositionY);
        this.unitPosMove(clickPosition, relativeDisplayPositionX, relativeDisplayPositionY);
    }
}
