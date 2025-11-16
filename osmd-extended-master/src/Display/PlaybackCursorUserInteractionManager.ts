import { PointF2D } from "../Common/DataObjects";
import { InteractionType } from "../Common/Enums/InteractionType";
import { IUserDisplayInteractionListener } from "../Common/Interfaces/IUserDisplayInteractionListener";
import { GraphicalMusicSheet, GraphicalVoiceEntry } from "../MusicalScore";
import { Cursor } from "../OpenSheetMusicDisplay/Cursor";

export class PlaybackCursorUserInteractionManager implements IUserDisplayInteractionListener {
    private graphic: GraphicalMusicSheet;
   // private cursor: Cursor;

    constructor(graphic: GraphicalMusicSheet, cursor: Cursor) {
        this.graphic = graphic;
        //this.cursor = cursor;
    }
    public userDisplayInteraction(relativePosition: PointF2D, positionInSheetUnits: PointF2D, type: InteractionType): void {
        switch (type) {
            case InteractionType.SingleTouch:
                const nearestVoiceEntry: GraphicalVoiceEntry = this.graphic.GetNearestVoiceEntry(positionInSheetUnits, true);
                console.log(nearestVoiceEntry);
                //TODO: This will change
                //this.cursor.cursorPositionChanged(nearestVoiceEntry.parentStaffEntry.getAbsoluteTimestamp(), undefined);
                break;
            default:
            break;
        }
    }
}
