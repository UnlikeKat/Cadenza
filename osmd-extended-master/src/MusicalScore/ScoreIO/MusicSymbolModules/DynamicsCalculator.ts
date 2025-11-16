import { IAfterSheetReadingModule } from "../../Interfaces";
import { MusicSheet, SourceMeasure, Staff, Fraction } from "../../..";
import { DynamicsContainer } from "../../VoiceData/HelperObjects";
import { MultiExpression, PlacementEnum, InstantaneousDynamicExpression } from "../../VoiceData/Expressions";
//import { ContinuousDynamicExpression, ContDynamicEnum } from "../../VoiceData/Expressions/ContinuousExpressions";

export class DynamicsCalculator implements IAfterSheetReadingModule {
    /**
     * Adds existing expressions in the given source measure to the expression-lists (one list per staff):
     * @param musicSheet the current musicsheet
     * @param sourceMeasure the current source measure
     * @param dynListStaves lists per staff to store the expressions
     */
    private static fillDynamicsList(musicSheet: MusicSheet, sourceMeasure: SourceMeasure, dynListStaves: DynamicsContainer[][]): void {
        for (let staffIndex: number = 0; staffIndex < sourceMeasure.StaffLinkedExpressions.length; staffIndex++) {
            for (let idx: number = 0, len: number = sourceMeasure.StaffLinkedExpressions[staffIndex].length; idx < len; ++idx) {
                const multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
                // check if this expression holds any dynamic expression:
                if ((multiExpression.InstantaneousDynamic === undefined) && (multiExpression.StartingContinuousDynamic === undefined)) {
                    continue;
                }
                multiExpression.StaffNumber = staffIndex;
                // Is it a Wedge but has no length -> ignore it.
                if ((multiExpression.StartingContinuousDynamic !== undefined) &&
                    multiExpression.StartingContinuousDynamic.isWedge() && multiExpression.StartingContinuousDynamic.EndMultiExpression !== undefined) {
                    const t: Fraction = multiExpression.AbsoluteTimestamp;
                    const t2: Fraction = multiExpression.StartingContinuousDynamic.EndMultiExpression.AbsoluteTimestamp;
                    if (t.Equals(t2)) {
                        continue;
                    }
                }
                // if there is an instantaneous dynamic present:
                if (multiExpression.InstantaneousDynamic !== undefined) {
                    dynListStaves[staffIndex].push(new DynamicsContainer(multiExpression.InstantaneousDynamic,
                                                                         multiExpression.StaffNumber));
                    // check if this expression could be meant for both staves:
                    const otherStaffIndex: number = this.getOtherStaffIndexIfLinkedStavesAreDetected(musicSheet, staffIndex,
                                                                                                     multiExpression.InstantaneousDynamic.Placement);
                    if (otherStaffIndex >= 0) {
                        dynListStaves[otherStaffIndex].push(new DynamicsContainer(multiExpression.InstantaneousDynamic,
                                                                                  otherStaffIndex));
                    }
                }
                // if there is (as well..) a continuous dynamic present:
                if (multiExpression.StartingContinuousDynamic !== undefined) {
                    dynListStaves[staffIndex].push(new DynamicsContainer(multiExpression.StartingContinuousDynamic, multiExpression.StaffNumber));
                    // check if this expression could be meant for both staves:
                    const otherStaffIndex: number = this.getOtherStaffIndexIfLinkedStavesAreDetected(musicSheet, staffIndex,
                                                                                                     multiExpression.StartingContinuousDynamic.Placement);
                    if (otherStaffIndex >= 0) {
                        dynListStaves[otherStaffIndex].push(new DynamicsContainer(multiExpression.StartingContinuousDynamic,
                                                                                  otherStaffIndex));
                    }
                }
            }
        }
    }
    private static getOtherStaffIndexIfLinkedStavesAreDetected(musicSheet: MusicSheet, staffIndex: number, dynamicExpressionPlacement: PlacementEnum): number {
        const currentStaff: Staff = musicSheet.getStaffFromIndex(staffIndex);
        const instrumentRelativeStaffIndex: number = currentStaff.ParentInstrument.Staves.indexOf(currentStaff);
        const currentInstrumentNumberOfStaves: number = currentStaff.ParentInstrument.Staves.length;
        if (currentInstrumentNumberOfStaves > 1 && instrumentRelativeStaffIndex === 0 && dynamicExpressionPlacement === PlacementEnum.Below) {
            return staffIndex + 1;
        }
        if (currentInstrumentNumberOfStaves > 1 && instrumentRelativeStaffIndex === 1 && dynamicExpressionPlacement === PlacementEnum.Above) {
            return staffIndex - 1;
        }
        return -1;
    }
    // private static allContinuousInSameDirection(contDynList: ContinuousDynamicExpression[]): boolean {
    //     const firstDir: ContDynamicEnum = contDynList[0].DynamicType;
    //     for (let idx: number = 0, len: number = contDynList.length; idx < len; ++idx) {
    //         const continuousDynamicExpression: ContinuousDynamicExpression = contDynList[idx];
    //         if (continuousDynamicExpression.DynamicType === firstDir) {
    //             continue;
    //         }
    //         return false;
    //     }
    //     return true;
    // }
    // private static instantaneousExprIsCloselyAfterContinuousExpr(contDynamic: ContinuousDynamicExpression,
    //                                                              instDynamic: InstantaneousDynamicExpression): boolean {
    //     if (instDynamic.ParentMultiExpression.SourceMeasureParent.MeasureNumber - contDynamic.EndMultiExpression.SourceMeasureParent.MeasureNumber < 2) {
    //         return true;
    //     }
    //     return false;
    // }
    // private static getStepCountFromMeasureDistance(dynExpr: ContinuousDynamicExpression): number {
    //     let measureDiff: number;
    //     if (dynExpr.EndMultiExpression === undefined) {
    //         measureDiff = 1;
    //     } else {
    //         measureDiff = dynExpr.EndMultiExpression.SourceMeasureParent.MeasureNumber - dynExpr.StartMultiExpression.SourceMeasureParent.MeasureNumber;
    //     }
    //     return (Math.max(1, measureDiff) / 4 + 1);
    // }
    // private static doOneStepPerWedgeOrEachFourMeasures(contDynList: ContinuousDynamicExpression[], startDynamic: DynamicEnum): void {
    //     const listSize: number = InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.length;
    //     const value: number;
    //     const currentRelativeDynamic: number = InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[startDynamic];
    //     let currIndex: number = 0;
    //     Object.keys(InstantaneousDynamicExpression.dynamicToRelativeVolumeDict).forEach(key => {
    //         const volumeValue: number = InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[key];
    //         if (Math.abs(volumeValue - currentRelativeDynamic) < 0.0001) {
    //             break;
    //         }
    //         currIndex++;
    //     });
    //     let currentDynamic: number = currentRelativeDynamic;
    //     for (let idx: number = 0, len: number = contDynList.length; idx < len; ++idx) {
    //         const continuousDynamicExpression: ContinuousDynamicExpression = contDynList[idx];
    //         continuousDynamicExpression.StartVolume = currentDynamic;
    //         if (continuousDynamicExpression.isWedge()) {
    //             if (continuousDynamicExpression.DynamicType === ContDynamicEnum.crescendo) {
    //                 currIndex = Math.min(currIndex + 1, listSize - 1);
    //             } else {
    //                 currIndex = Math.max(currIndex - 1, 0);
    //             }
    //         } else {
    //             const steps: number = DynamicsCalculator.getStepCountFromMeasureDistance(continuousDynamicExpression);
    //             if (continuousDynamicExpression.DynamicType === ContDynamicEnum.crescendo) {
    //                 currIndex = Math.min(currIndex + steps, listSize - 1);
    //             } else {
    //                 currIndex = Math.max(currIndex - steps, 0);
    //             }
    //         }
    //         InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.TryGetValue(
    //             InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.Keys.ElementAt(currIndex), value);
    //         continuousDynamicExpression.EndVolume = value;
    //         currentDynamic = value;
    //     }
    // }
    // private static calculateInBeetweenVolumes(contDynList: ContinuousDynamicExpression[],
    //                                           startDynamic: DynamicEnum, instDynEnd: InstantaneousDynamicExpression): void {
    //     // as a basic principle: wedge = one step (... - pp - p - mp - mf - f - ff - ...), word = one step per each four measures
    //     if (contDynList.length === 0) {
    //         return;
    //     }
    //     const rangeStartVolume: number = InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[startDynamic];
    //     const lastCont: ContinuousDynamicExpression = contDynList[contDynList.length - 1];
    //     if ((instDynEnd === undefined) || !DynamicsCalculator.instantaneousExprIsCloselyAfterContinuousExpr(lastCont, instDynEnd)) {
    //         DynamicsCalculator.doOneStepPerWedgeOrEachFourMeasures(contDynList, startDynamic);
    //         return;
    //     }
    //     const rangeEndVolume: number = InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[instDynEnd.DynEnum];
    //     contDynList[0].StartVolume = rangeStartVolume;
    //     if (contDynList.length === 1) {
    //         if (((contDynList[0].DynamicType === ContDynamicEnum.crescendo)
    //             && (InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[startDynamic] <
    //                 InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[instDynEnd.DynEnum]))
    //             || ((contDynList[0].DynamicType === ContDynamicEnum.diminuendo)
    //             && (InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[startDynamic] >
    //                 InstantaneousDynamicExpression.dynamicToRelativeVolumeDict[instDynEnd.DynEnum]))) {
    //             contDynList[0].EndVolume = rangeEndVolume;
    //         } else {
    //             DynamicsCalculator.doOneStepPerWedgeOrEachFourMeasures(contDynList, startDynamic);
    //         }
    //     } else if (DynamicsCalculator.allContinuousInSameDirection(contDynList)) {
    //         if (((rangeStartVolume < rangeEndVolume) && (contDynList[0].DynamicType === ContDynamicEnum.crescendo))
    //         || ((rangeStartVolume > rangeEndVolume) && (contDynList[0].DynamicType === ContDynamicEnum.diminuendo))) {
    //             const rangeForEachContinuous: number = (rangeEndVolume - rangeStartVolume) / contDynList.length;
    //             let currentDyn: number = rangeStartVolume;
    //             for (let idx: number = 0, len: number = contDynList.length; idx < len; ++idx) {
    //                 const continuousDynamicExpression: ContinuousDynamicExpression = contDynList[idx];
    //                 continuousDynamicExpression.StartVolume = currentDyn;
    //                 currentDyn += rangeForEachContinuous;
    //                 continuousDynamicExpression.EndVolume = currentDyn;
    //             }
    //         } else {
    //             DynamicsCalculator.doOneStepPerWedgeOrEachFourMeasures(contDynList, startDynamic);
    //         }
    //     } else {
    //         DynamicsCalculator.doOneStepPerWedgeOrEachFourMeasures(contDynList, startDynamic);
    //         const tmpFinalVolume: number = lastCont.EndVolume;
    //         if (tmpFinalVolume > rangeEndVolume) {
    //             let sumDiminuendos: number = 0;
    //             for (let idx: number = 0, len: number = contDynList.length; idx < len; ++idx) {
    //                 const continuousDynamicExpression: ContinuousDynamicExpression = contDynList[idx];
    //                 if (continuousDynamicExpression.DynamicType === ContDynamicEnum.diminuendo) {
    //                     sumDiminuendos += (continuousDynamicExpression.EndVolume - continuousDynamicExpression.StartVolume);
    //                 }
    //             }
    //             let adjustingFactor: number = 1.0;
    //             if (Math.abs(sumDiminuendos - 0) > 0.0001) {
    //                 adjustingFactor = (sumDiminuendos + (rangeEndVolume - tmpFinalVolume)) / sumDiminuendos;
    //             }
    //             let tmpVolume: number = rangeStartVolume;
    //             for (let idx: number = 0, len: number = contDynList.length; idx < len; ++idx) {
    //                 const continuousDynamicExpression: ContinuousDynamicExpression = contDynList[idx];
    //                 let volumeRange: number = continuousDynamicExpression.EndVolume - continuousDynamicExpression.StartVolume;
    //                 if (continuousDynamicExpression.DynamicType === ContDynamicEnum.diminuendo) {
    //                     volumeRange *= adjustingFactor;
    //                 }
    //                 continuousDynamicExpression.StartVolume = tmpVolume;
    //                 tmpVolume += volumeRange;
    //                 continuousDynamicExpression.EndVolume = tmpVolume;
    //             }
    //         } else {
    //             let sumCrescendos: number = 0;
    //             for (let idx: number = 0, len: number = contDynList.length; idx < len; ++idx) {
    //                 const continuousDynamicExpression: ContinuousDynamicExpression = contDynList[idx];
    //                 if (continuousDynamicExpression.DynamicType === ContDynamicEnum.crescendo) {
    //                     sumCrescendos += (continuousDynamicExpression.EndVolume - continuousDynamicExpression.StartVolume);
    //                 }
    //             }
    //             let adjustingFactor: number = 1.0;
    //             if (Math.abs(sumCrescendos - 0) > 0.0001) {
    //                 adjustingFactor = (sumCrescendos + (rangeEndVolume - tmpFinalVolume)) / sumCrescendos;
    //             }
    //             let tmpVolume: number = rangeStartVolume;
    //             for (let idx: number = 0, len: number = contDynList.length; idx < len; ++idx) {
    //                 const continuousDynamicExpression: ContinuousDynamicExpression = contDynList[idx];
    //                 let volumeRange: number = continuousDynamicExpression.EndVolume - continuousDynamicExpression.StartVolume;
    //                 if (continuousDynamicExpression.DynamicType === ContDynamicEnum.crescendo) {
    //                     volumeRange *= adjustingFactor;
    //                 }
    //                 continuousDynamicExpression.StartVolume = tmpVolume;
    //                 tmpVolume += volumeRange;
    //                 continuousDynamicExpression.EndVolume = tmpVolume;
    //             }
    //         }
    //     }
    // }


    /**
     * check for special case: an instrument (typ. piano) given as 2 separate Instruments with one staff (instead of 1 Instrument with 2 staves)
     * if so, let expressions react on both staves:
     */
    // private static checkForSplittedStavesFromOneInstrument(dynListStaves: DynamicsContainer[][], completeNumberOfStaves: number, staffList: Staff[]): void {
    //     for (let i: number = 1; i < completeNumberOfStaves; i++) {
    //         let splittedStaves: boolean = true;
    //         if (!SubInstrument.isPianoInstrument(staffList[i].ParentInstrument.MidiInstrumentId)
    //         || !SubInstrument.isPianoInstrument(staffList[i - 1].ParentInstrument.MidiInstrumentId)) {
    //             continue;
    //         }
    //         if ((staffList[i].ParentInstrument.Staves.length > 1) && (staffList[i] === staffList[i].ParentInstrument.Staves[1])) {
    //             continue;
    //         }
    //         for (let idx: number = 0, len: number = dynListStaves[i - 1].length; idx < len; ++idx) {
    //             const dynamicsContainer: DynamicsContainer = dynListStaves[i - 1][idx];
    //             if (((dynamicsContainer.instantaneousDynamicExpression !== undefined)
    //             && (dynamicsContainer.instantaneousDynamicExpression.Placement === PlacementEnum.Above))
    //             || ((dynamicsContainer.continuousDynamicExpression !== undefined)
    //             && (dynamicsContainer.continuousDynamicExpression.Placement === PlacementEnum.Above))) {
    //                 splittedStaves = false;
    //             }
    //         }
    //         for (let idx: number = 0, len: number = dynListStaves[i].length; idx < len; ++idx) {
    //             const dynamicsContainer: DynamicsContainer = dynListStaves[i][idx];
    //             if (((dynamicsContainer.instantaneousDynamicExpression !== undefined)
    //             && (dynamicsContainer.instantaneousDynamicExpression.Placement === PlacementEnum.Below))
    //             || ((dynamicsContainer.continuousDynamicExpression !== undefined)
    //             && (dynamicsContainer.continuousDynamicExpression.Placement === PlacementEnum.Below))) {
    //                 splittedStaves = false;
    //             }
    //         }
    //         if (splittedStaves) {
    //             for (let idx: number = 0, len: number = dynListStaves[i].length; idx < len; ++idx) {
    //                 const dynamicsContainer: DynamicsContainer = dynListStaves[i][idx];
    //                 if (dynamicsContainer.instantaneousDynamicExpression !== undefined) {
    //                     dynListStaves[i - 1].push(new DynamicsContainer(dynamicsContainer.instantaneousDynamicExpression, i - 1));
    //                 } else {
    //                     dynListStaves[i - 1].push(new DynamicsContainer(dynamicsContainer.continuousDynamicExpression, i - 1));
    //                 }
    //             }
    //             for (let idx: number = 0, len: number = dynListStaves[i - 1].length; idx < len; ++idx) {
    //                 const dynamicsContainer: DynamicsContainer = dynListStaves[i - 1][idx];
    //                 if (dynamicsContainer.instantaneousDynamicExpression !== undefined) {
    //                     dynListStaves[i].push(new DynamicsContainer(dynamicsContainer.instantaneousDynamicExpression, i));
    //                 } else {
    //                     dynListStaves[i].push(new DynamicsContainer(dynamicsContainer.continuousDynamicExpression, i));
    //                 }
    //             }
    //         }
    //     }
    // }

    /**
     * Main function for calculating all volumes for all expressions
     * @param musicSheet
     */
    private static fillDynamicExpressions(musicSheet: MusicSheet): void {
        const dynListStaves: DynamicsContainer[][] = musicSheet.DynListStaves;
        const completeNumberOfStaves: number = musicSheet.getCompleteNumberOfStaves();
        const timestampSortedDynamicExpressionsList: DynamicsContainer[] = musicSheet.TimestampSortedDynamicExpressionsList;
        // 1. create empty lists for expressions for every staff:
        for (let i: number = 0; i < completeNumberOfStaves; i++) {
            dynListStaves.push([]);
        }
        // 2. fill lists with existing expressions:
        for (let idx: number = 0, len: number = musicSheet.SourceMeasures.length; idx < len; ++idx) {
            const sourceMeasure: SourceMeasure = musicSheet.SourceMeasures[idx];
            DynamicsCalculator.fillDynamicsList(musicSheet, sourceMeasure, dynListStaves);
        }

        // 3. check for special case: an instrument (typ. piano) given as 2 separate Instruments with one staff (instead of 1 Instrument with 2 staves)
        // if so, let expressions react on both staves:
        //const staffList: Staff[] = musicSheet.Staves;
        //DynamicsCalculator.checkForSplittedStavesFromOneInstrument(dynListStaves, completeNumberOfStaves, staffList);

        // 4. calculate volumes for continuous expressions:
        // get all continuous between two instantanious
        // for (let idx: number = 0, len: number = dynListStaves.length; idx < len; ++idx) {
        //     const dynamicsContainerList: DynamicsContainer[] = dynListStaves[idx];
        //     let lastDynamicEnum: DynamicEnum = DynamicEnum.mp;
        //     const listContinuousExprInBetween: ContinuousDynamicExpression[] = [];
        //     for (let idx2: number = 0, len2: number = dynamicsContainerList.length; idx2 < len2; ++idx2) {
        //         const dynamicsContainer: DynamicsContainer = dynamicsContainerList[idx2];
        //         if (dynamicsContainer.instantaneousDynamicExpression === undefined) {
        //             listContinuousExprInBetween.push(dynamicsContainer.continuousDynamicExpression);
        //         } else if (InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.containsKey(
        //                    dynamicsContainer.instantaneousDynamicExpression.DynEnum)) {
        //             this.calculateInBeetweenVolumes(listContinuousExprInBetween, lastDynamicEnum, dynamicsContainer.instantaneousDynamicExpression);
        //             lastDynamicEnum = dynamicsContainer.instantaneousDynamicExpression.DynEnum;
        //             listContinuousExprInBetween.clear();
        //         }
        //     }
        //     // if there are still continuous expressions until the end (= a floating end),
        //     // calculate these continuous expressions here:
        //     if ((listContinuousExprInBetween.length > 0)
        //     && (InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.containsKey(lastDynamicEnum))) {
        //         DynamicsCalculator.calculateInBeetweenVolumes(listContinuousExprInBetween, lastDynamicEnum, undefined);
        //     }
        // }

        // 5. put all dynamic expressions into a list and sort it by timestamp:
        // this is needed for the iterator to always find the currently active expressions:
        for (let index: number = 0; index < dynListStaves.length; index++) {
            for (let idx: number = 0, len: number = dynListStaves[index].length; idx < len; ++idx) {
                const dynamicsContainer: DynamicsContainer = dynListStaves[index][idx];
                if (!((dynamicsContainer.instantaneousDynamicExpression !== undefined)
                && (!InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.containsKey(dynamicsContainer.instantaneousDynamicExpression.DynEnum)))) {
                    timestampSortedDynamicExpressionsList.push(dynamicsContainer);
                }
            }
        }
        timestampSortedDynamicExpressionsList.sort(DynamicsContainer.Compare);
    }

    /**
     * The interface main function: called when the musicsheet has been read.
     * @param musicSheet
     */
    public calculate(musicSheet: MusicSheet): void {
        DynamicsCalculator.fillDynamicExpressions(musicSheet);
    }
}
