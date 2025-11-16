import {GraphicalMeasure} from "./GraphicalMeasure";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {MusicSystem} from "./MusicSystem";
import {SystemLinesEnum} from "./SystemLinesEnum";
import { MusicSystemBuilder, SystemBuildParameters } from "./MusicSystemBuilder";

export class JustifiedMusicSystemBuilder extends MusicSystemBuilder {

    public buildMusicSystems(): MusicSystem[] {
        this.currentSystemParams = new SystemBuildParameters();
        const blocksToJustify: {startIndex: number, endIndex: number}[] = [];
        let blockStartIndex: number = 0;
        let blockEndIndex: number = -1;
        // 1. Find blocks that shall be justified:
        // Every:
        // - user requested system break
        // - user requested page break
        // - end barline
        // starts a new block afterwards:
        for (let idx: number = 0, len: number = this.measureList.length; idx < len; ++idx) {
            this.measureListIndex = idx;
            const graphicalMeasures: GraphicalMeasure[] = this.measureList[idx];
            if (!graphicalMeasures || !graphicalMeasures[0]) {
                continue; // previous measure was probably multi-rest, skip this one
            }
            for (let i: number = 0, len2: number = graphicalMeasures.length; i < len2; ++i) {
                graphicalMeasures[i].resetLayout();
            }
            const sourceMeasure: SourceMeasure = graphicalMeasures[0].parentSourceMeasure;
            const doXmlPageBreak: boolean = this.rules.NewPageAtXMLNewPageAttribute && sourceMeasure.printNewPageXml;
            const doXmlLineBreak: boolean = this.rules.NewSystemAtXMLNewSystemAttribute && sourceMeasure.printNewSystemXml;

            if ((doXmlLineBreak || doXmlPageBreak) && idx > 0) {
                // the current measure shall open up a new system or new page:
                blockEndIndex = idx - 1;
                blocksToJustify.push({startIndex: blockStartIndex, endIndex: blockEndIndex});
                blockStartIndex = idx;
            } else {
                const measureEndsPart: boolean = sourceMeasure.HasEndLine && this.rules.NewPartAndSystemAfterFinalBarline;
                if (measureEndsPart) {
                    // the current measure shall end the system:
                    blockEndIndex = idx;
                    blocksToJustify.push({startIndex: blockStartIndex, endIndex: blockEndIndex});
                    blockStartIndex = idx + 1;
                }
            }

        }
        // Create the final block up to the last measure:
        // will happen, if there was no block created up to the last measure
        if (blockStartIndex < this.measureList.length &&
            blockEndIndex < blockStartIndex) {
                blocksToJustify.push({startIndex: blockStartIndex, endIndex: this.measureList.length - 1});
        }

        const systemsMeasureCount: number [] = [];
        const measureXWidths: number[] = [];
        const measureCenterXPositions: number[] = [];
        // 2. do the justification algorithm for every block:
        // The algo scales the whole chain of measures of the block up to fill up also the last system of the block
        for (const block of blocksToJustify) {
            // 2a. calculate the complete width of every measure (including begin and end instructions):
            //      as well as the x-position of their center:
            let xPosition: number = 0;
            for (let idx: number = block.startIndex; idx <= block.endIndex; ++idx) {
                this.measureListIndex = idx;
                const graphicalMeasures: GraphicalMeasure[] = this.measureList[idx];
                if (!graphicalMeasures || !graphicalMeasures[0]) {
                    measureXWidths.push(0);
                    measureCenterXPositions.push(0);
                    continue; // previous measure was probably multi-rest, skip this one
                }
                for (let i: number = 0, len2: number = graphicalMeasures.length; i < len2; ++i) {
                    graphicalMeasures[i].resetLayout();
                }
                const sourceMeasure: SourceMeasure = graphicalMeasures[0].parentSourceMeasure;
                const isFirstSourceMeasure: boolean = sourceMeasure === this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
                let currentMeasureBeginInstructionsWidth: number = this.rules.MeasureLeftMargin;
                let currentMeasureEndInstructionsWidth: number = 0;

                // calculate the current Measure Width:
                // The width of a measure is build up from
                // 1. the begin instructions (clef, Key, Rhythm),
                // 2. the staff entries (= notes) and
                // 3. the end instructions (actually only clefs)
                const measureStartLine: SystemLinesEnum = this.getMeasureStartLine();
                currentMeasureBeginInstructionsWidth += this.getLineWidth(graphicalMeasures[0], measureStartLine, false);
                if (!this.leadSheet) {
                    currentMeasureBeginInstructionsWidth += this.addBeginInstructions(graphicalMeasures, false, isFirstSourceMeasure);
                    currentMeasureEndInstructionsWidth += this.addEndInstructions(graphicalMeasures);
                }
                let currentMeasureVarWidth: number = 0;
                for (let i: number = 0; i < this.numberOfVisibleStaffLines; i++) {
                    currentMeasureVarWidth = Math.max(currentMeasureVarWidth, graphicalMeasures[i].minimumStaffEntriesWidth);
                }

                // take into account the LineWidth after each Measure
                const measureEndLine: SystemLinesEnum = this.getMeasureEndLine();
                currentMeasureEndInstructionsWidth += this.getLineWidth(graphicalMeasures[0], measureEndLine, false);
                //let nextMeasureBeginInstructionWidth: number = this.rules.MeasureLeftMargin;

                // Check if there are key or rhythm change instructions within the next measure:
                // let nextSourceMeasure: SourceMeasure = undefined;
                // if (this.measureListIndex + 1 < this.measureList.length) {
                //     const nextGraphicalMeasures: GraphicalMeasure[] = this.measureList[this.measureListIndex + 1];
                //     nextSourceMeasure = nextGraphicalMeasures[0].parentSourceMeasure;
                //     if (nextSourceMeasure.hasBeginInstructions()) {
                //         nextMeasureBeginInstructionWidth += this.addBeginInstructions(nextGraphicalMeasures, false, false);
                //     }
                // }
                const totalMeasureWidth: number = currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth + currentMeasureVarWidth;
                measureXWidths.push(totalMeasureWidth);
                measureCenterXPositions.push(xPosition + totalMeasureWidth / 2);
                xPosition += totalMeasureWidth;
            }

            // 2b. Calculate the scale factor for upscaling all measures in x-direction to completely fill out all needed systems:
            const completeMeasuresXWidth: number = xPosition;
            const systemMaxWidth: number = this.getFullPageSystemWidth();
            const systemBeginInstructionDefaultWidth: number = 8;
            const systemSpace: number = systemMaxWidth - systemBeginInstructionDefaultWidth;
            const requiredNumSystems: number = Math.ceil(completeMeasuresXWidth / systemSpace);
            const scaleFactor: number = requiredNumSystems * systemSpace / completeMeasuresXWidth;
            // 2c. Find out to which system every measure shall belong now after the stretching
            //      and store the final number of measures for every system.
            //      This will be needed later for the build-up of the systems.
            let systemNumber: number = 1;
            let currentSystemMeasureCount: number = 0;
            for (let idx: number = block.startIndex; idx <= block.endIndex; ++idx) {
                const measureCenterX: number = measureCenterXPositions[idx];
                if (measureCenterX === 0) { // measure not rendered (middle of multi rest)
                    continue;
                }
                const measureWidth: number = measureXWidths[idx];
                let currentSystemNumber: number = measureCenterX * scaleFactor / systemSpace;
                if(measureWidth > systemSpace){//Measure is bigger than the available system space
                    //Simply have 1 measure per system
                    currentSystemNumber = idx + 1;
                } else {
                    currentSystemNumber = Math.ceil(currentSystemNumber);
                }
                if (systemNumber === currentSystemNumber) {
                    currentSystemMeasureCount += 1;
                } else {
                    systemsMeasureCount.push(currentSystemMeasureCount);
                    systemNumber = currentSystemNumber;
                    currentSystemMeasureCount = 1;
                }
            }
            systemsMeasureCount.push(currentSystemMeasureCount);
        }
        return this.buildPreparedMusicSystems(systemsMeasureCount);
    }

    private buildPreparedMusicSystems(systemsMeasureCount: number []): MusicSystem[] {
        let prevMeasureEndsPart: boolean = false;
        this.currentSystemParams = new SystemBuildParameters();

        // the first System - create also its Labels
        this.currentSystemParams.currentSystem = this.initMusicSystem();


        // go through measures and add to system until system gets too long -> finish system and start next system [line break, new system].
        //let syst: number = 0;
        for (let idx: number = 0, len: number = this.measureList.length; idx < len; ++idx) {
            this.measureListIndex = idx;
            const graphicalMeasures: GraphicalMeasure[] = this.measureList[idx];
            if (!graphicalMeasures || !graphicalMeasures[0]) {
                continue; // previous measure was probably multi-rest, skip this one
            }
            const doXmlPageBreak: boolean = this.rules.NewPageAtXMLNewPageAttribute && graphicalMeasures[0].parentSourceMeasure.printNewPageXml;
            // check if the current system has already as much measures as has been precalculated:
            // if yes, create a new system to put the current measures now in:
            if (this.currentSystemParams.currentSystem.GraphicalMeasures.length === systemsMeasureCount[this.musicSystems.length - 1]) {
                // always do here a full stretch:  second parameter (systemEndsPart) needs to be false:
                this.finalizeCurrentAndCreateNewSystem(graphicalMeasures, false, !prevMeasureEndsPart, doXmlPageBreak);
            }

            for (let idx2: number = 0, len2: number = graphicalMeasures.length; idx2 < len2; ++idx2) {
                graphicalMeasures[idx2].resetLayout();
            }
            const sourceMeasure: SourceMeasure = graphicalMeasures[0].parentSourceMeasure;
            const sourceMeasureEndsPart: boolean = sourceMeasure.HasEndLine;
            const isSystemStartMeasure: boolean = this.currentSystemParams.IsSystemStartMeasure();
            const isFirstSourceMeasure: boolean = sourceMeasure === this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
            let currentMeasureBeginInstructionsWidth: number = this.rules.MeasureLeftMargin;
            let currentMeasureEndInstructionsWidth: number = 0;

            // calculate the current Measure Width:
            // The width of a measure is build up from
            // 1. the begin instructions (clef, Key, Rhythm),
            // 2. the staff entries (= notes) and
            // 3. the end instructions (actually only clefs)
            const measureStartLine: SystemLinesEnum = this.getMeasureStartLine();
            currentMeasureBeginInstructionsWidth += this.getLineWidth(graphicalMeasures[0], measureStartLine, isSystemStartMeasure);
            if (!this.leadSheet) {
                let forceShowRhythm: boolean = false;
                if (prevMeasureEndsPart && this.rules.ShowRhythmAgainAfterPartEndOrFinalBarline) {
                    forceShowRhythm = true;
                }
                currentMeasureBeginInstructionsWidth += this.addBeginInstructions(  graphicalMeasures,
                                                                                    isSystemStartMeasure,
                                                                                    isFirstSourceMeasure || forceShowRhythm);
                currentMeasureEndInstructionsWidth += this.addEndInstructions(graphicalMeasures);
            }
            let currentMeasureVarWidth: number = 0;
            for (let i: number = 0; i < this.numberOfVisibleStaffLines; i++) {
                currentMeasureVarWidth = Math.max(currentMeasureVarWidth, graphicalMeasures[i].minimumStaffEntriesWidth);
            }

            // take into account the LineWidth after each Measure
            const measureEndLine: SystemLinesEnum = this.getMeasureEndLine();
            currentMeasureEndInstructionsWidth += this.getLineWidth(graphicalMeasures[0], measureEndLine, isSystemStartMeasure);
            // let nextMeasureBeginInstructionWidth: number = this.rules.MeasureLeftMargin;

            // // Check if there are key or rhythm change instructions within the next measure:
            // let nextSourceMeasure: SourceMeasure = undefined;
            // if (this.measureListIndex + 1 < this.measureList.length) {
            //     const nextGraphicalMeasures: GraphicalMeasure[] = this.measureList[this.measureListIndex + 1];
            //     nextSourceMeasure = nextGraphicalMeasures[0].parentSourceMeasure;
            //     if (nextSourceMeasure.hasBeginInstructions()) {
            //         nextMeasureBeginInstructionWidth += this.addBeginInstructions(nextGraphicalMeasures, false, false);
            //     }
            // }
            const totalMeasureWidth: number = currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth + currentMeasureVarWidth;
            // const doXmlPageBreak: boolean = this.rules.NewPageAtXMLNewPageAttribute && sourceMeasure.printNewPageXml;
            // const doXmlLineBreak: boolean = doXmlPageBreak || // also create new system if doing page break
            //     (this.rules.NewSystemAtXMLNewSystemAttribute && sourceMeasure.printNewSystemXml);
            this.addMeasureToSystem(
                graphicalMeasures, measureStartLine, measureEndLine, totalMeasureWidth,
                currentMeasureBeginInstructionsWidth, currentMeasureVarWidth, currentMeasureEndInstructionsWidth
            );
            this.updateActiveClefs(sourceMeasure, graphicalMeasures);

            prevMeasureEndsPart = sourceMeasureEndsPart;
        }
        // last system: do here a full stretch as well:  second parameter (systemEndsPart) needs to be false:
        this.finalizeCurrentAndCreateNewSystem(undefined, false, false);
        return this.musicSystems;
    }
}
