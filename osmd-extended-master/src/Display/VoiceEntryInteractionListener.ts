import { IUserDisplayInteractionListener } from "../Common/Interfaces/IUserDisplayInteractionListener";
import { PointF2D, Fraction } from "../Common/DataObjects";
import { InteractionType } from "../Common/Enums/InteractionType";
import { GraphicalVoiceEntry } from "../MusicalScore/Graphical";
import { SheetRenderingManager } from "./SheetRenderingManager";

export class VoiceEntryInteractionListener implements IUserDisplayInteractionListener {
    private renderingManager: SheetRenderingManager;

    constructor(renderingManager: SheetRenderingManager) {
        this.renderingManager = renderingManager;
    }

    userDisplayInteraction(relativePosition: PointF2D, positionInSheetUnits: PointF2D, type: InteractionType): void {
        switch (type) {
            case InteractionType.TouchDown:
            case InteractionType.SingleTouch:
            case InteractionType.DoubleTouch: {
                const clickVe: GraphicalVoiceEntry = this.renderingManager.GraphicalMusicSheet.GetNearestVoiceEntry(
                    positionInSheetUnits, true
                );

                // set cursor and/or start/end marker position
                if (clickVe) {
                    if (clickVe.parentStaffEntry.parentVerticalContainer !== undefined) {
                        const clickedTimeStamp: Fraction = clickVe.parentStaffEntry.parentVerticalContainer.AbsoluteTimestamp;
                        this.renderingManager.setStartPosition(clickedTimeStamp);
                        // playback clicked note
                        if (clickVe.notes[0]?.sourceNote.Pitch !== undefined) {
                            this.renderingManager.PlaybackManager?.playVoiceEntry(clickVe.parentVoiceEntry);
                        }
                    }
                }
                break;
            }
            default:
                // Do nothing
                break;
        }
    }
}
