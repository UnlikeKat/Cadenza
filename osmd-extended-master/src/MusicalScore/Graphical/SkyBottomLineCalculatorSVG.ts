import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import parse from "d-path-parser";
import { unitInPixels } from "./VexFlow/VexFlowMusicSheetDrawer";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import { SvgVexFlowBackend } from "./VexFlow/SvgVexFlowBackend";

export class SkyBottomLineCalculatorSVG extends SkyBottomLineCalculator {
        private recursiveUpdate(node: SVGGraphicsElement, staveLineData: {top: number, bottom: number},
                            measureBoundingBox: DOMRect, arrayStruct: number[][]): void {
        const nodeBoundingBox: DOMRect = node.getBBox();
        const nodeTop: number = nodeBoundingBox.y / unitInPixels;
        const nodeBottom: number = nodeBoundingBox.height / unitInPixels + nodeTop;
        const [measureSkylineArray, measureBottomLineArray]: number[][] = arrayStruct;
        if (nodeTop < staveLineData.top || nodeBottom > staveLineData.bottom) {
            //This node's top is above the staveline top, or the bottom is below the staveline bottom.
            //If we are a group element, one or several of our child elements is the culprit.
            //Otherwise, we have the node itself
            switch (node.tagName.toLowerCase()) {
                case "g":
                    for (const child of node.children) {
                        this.recursiveUpdate(child as SVGGraphicsElement, staveLineData, measureBoundingBox, arrayStruct);
                    }
                break;
                //VF seems to only use path, but just in case
                case "circle":
                case "rect":
                case "line":
                case "path":
                    let nodeLeft: number = Math.floor((nodeBoundingBox.x - measureBoundingBox.x) / unitInPixels * this.mRules.SamplingUnit);
                    const nodeRight: number = nodeLeft + (Math.ceil(nodeBoundingBox.width / unitInPixels * this.mRules.SamplingUnit));

                    if (node.parentElement.classList.contains("vf-beams") && node.hasAttribute("d")) {
                        const dCommands: Array<{code: string, end: {x: number, y: number}, relative: boolean}> = parse(node.getAttribute("d"));
                        //VF Beams consist of 5 commands, M, L, L, L, Z
                        if (dCommands.length === 5) {
                            const M: {code: string, end: {x: number, y: number}, relative: boolean} = dCommands[0];
                            const endL: {code: string, end: {x: number, y: number}, relative: boolean} = dCommands[3];
                            const slope: number = (endL.end.y - M.end.y)/(endL.end.x - M.end.x);
                            let currentY: number = M.end.y / unitInPixels;
                            for (nodeLeft; nodeLeft <= nodeRight; nodeLeft++) {
                                if (currentY < measureSkylineArray[nodeLeft]) {
                                    measureSkylineArray[nodeLeft] = currentY;
                                }
                                if (currentY > measureBottomLineArray[nodeLeft]) {
                                    measureBottomLineArray[nodeLeft] = currentY;
                                }
                                currentY += slope / this.mRules.SamplingUnit;
                            }
                        }
                    } else {
                        for (nodeLeft; nodeLeft <= nodeRight; nodeLeft++) {
                            if (nodeTop < measureSkylineArray[nodeLeft]) {
                                measureSkylineArray[nodeLeft] = nodeTop;
                            }
                            if (nodeBottom > measureBottomLineArray[nodeLeft]) {
                                measureBottomLineArray[nodeLeft] = nodeBottom;
                            }
                        }
                    }
                break;
                default:
                break;
            }
        }
    }
    /*TODO: This polyfill might go away. Not using it now with the 'performance mode' setting.
    Retaining for a little while just in case.
    protected getBBox(element: SVGGraphicsElement): DOMRect {
        if (this.hasBBox) {
            return element.getBBox();
        } else if ((element as any).cachedBBox) {
            return (element as any).cachedBBox;
        }
        let x: number = Number.POSITIVE_INFINITY, y: number = Number.POSITIVE_INFINITY,
            width: number = 0, height: number = 0;
        switch (element.tagName.toLowerCase()) {
            case "g":
            case "a":
                for (const child of element.children) {
                    const childRect: DOMRect = this.getBBox(child as SVGGraphicsElement);
                    if (childRect.x !== Number.POSITIVE_INFINITY && childRect.y !== Number.POSITIVE_INFINITY){
                        x = Math.min(x, childRect.x);
                        y = Math.min(y, childRect.y);
                        const childRight: number = childRect.x + childRect.width;
                        const childBottom: number = childRect.y + childRect.height;
                        width = Math.max(width, childRight - x);
                        height = Math.max(height, childBottom - y);
                    }
                }
            break;
            // Maybe TODO. For now VF seems to just use path and rect
            //case "text":
            //case "polyline":
            //case "polygon":
            //case "ellipse":
            //case "circle":
            //case "line":
            //break;
            case "rect":
                x = parseFloat(element.getAttribute("x"));
                y = parseFloat(element.getAttribute("y"));
                width = parseFloat(element.getAttribute("width"));
                height = parseFloat(element.getAttribute("height"));
            break;
            case "path":
                //For now just track end points... Calc bezier curves may be necessary
                const dCommands: Array<{code: string, end: {x: number, y: number}, relative: boolean}> = parse(element.getAttribute("d"));
                for (const dCommand of dCommands) {
                    if (!dCommand.end) {
                        continue;
                    }
                    x = Math.min(x, dCommand.end.x);
                    y = Math.min(y, dCommand.end.y);
                    width = Math.max(width, dCommand.end.x - x);
                    height = Math.max(height, dCommand.end.y - y);
                }
            break;
            default:
            break;
        }
        //Due to our JSDOM tests, we can't instantiate DOMRECT directly.
        //So we have to do it like this. Typing is enforced via the return type though.
        (element as any).cachedBBox = {x, y, width, height};
        return (element as any).cachedBBox;
    } */

    public calculateLinesForMeasure(measure: VexFlowMeasure, measureNode: SVGGElement): number[][] {
        const measureBoundingBox: DOMRect = measureNode.getBBox();
        const svgArrayLength: number = Math.max(Math.round(measure.PositionAndShape.Size.width * this.mRules.SamplingUnit), 1);
        const measureHeight: number = measureBoundingBox.height / unitInPixels;
        const staveLineNode: SVGGElement = measureNode.getElementsByClassName("vf-stave")[0] as SVGGElement;
        const staveLineBoundingBox: DOMRect = staveLineNode.getBBox();
        let staveLineHeight: number = staveLineBoundingBox?.height / unitInPixels;
        let staveLineTop: number = staveLineBoundingBox?.y / unitInPixels;
        const vfStave: Vex.Flow.Stave = measure.getVFStave();
        let numLines: number = (vfStave.options?.num_lines ? vfStave.options.num_lines : 5) - 1;
        let topLine: number = -1;
        let lineIndex: number = 0;
        const bottomLineQueue: number[] = [numLines];
        for (const config of (vfStave.options as any)?.line_config) {
            if (!config.visible) {
                numLines--;
            } else {
                if (topLine === -1) {
                    topLine = lineIndex;
                }
                bottomLineQueue.push(lineIndex);
            }
            lineIndex++;
        }
        const bottomLine: number = bottomLineQueue.pop();
        if (topLine === -1) {
            topLine = 0;
        }
        numLines = bottomLine - topLine;

        const lineSpacing: number = vfStave.options?.spacing_between_lines_px;
        const vfLinesHeight: number = numLines * lineSpacing / unitInPixels;
        if ((staveLineHeight - vfLinesHeight) > 0.2) {
            staveLineHeight = vfLinesHeight;
            staveLineTop = topLine * lineSpacing / unitInPixels;
        }

        const staveLineBottom: number = staveLineTop + staveLineHeight;
        const measureSkylineArray: number[] = new Array(svgArrayLength).fill(staveLineTop);
        const measureBottomlineArray: number[] = new Array(svgArrayLength).fill(staveLineBottom);
        const arrayStruct: number[][] = [measureSkylineArray, measureBottomlineArray];
        if (measureHeight > staveLineHeight) {
            for(const child of measureNode.children){
                    this.recursiveUpdate(child as SVGGraphicsElement, {top: staveLineTop, bottom: staveLineBottom},
                                         measureBoundingBox, [measureSkylineArray, measureBottomlineArray]);

            }
        }
        return arrayStruct;
    }

    /**
     * This method calculates the Sky- and BottomLines for a StaffLine using SVG
     */
    public calculateLines(): void {
        this.mSkyLine = [];
        this.mBottomLine = [];
        const invisibleSVG: HTMLDivElement = document.createElement("div");
        document.body.append(invisibleSVG);
        const svgBackend: SvgVexFlowBackend = new SvgVexFlowBackend(this.mRules);
        svgBackend.initialize(invisibleSVG, 1, "0");
        const context: Vex.Flow.SVGContext = svgBackend.getContext();
        // search through all Measures
        const stafflineNode: SVGGElement = context.openGroup() as SVGGElement;
        stafflineNode.classList.add("staffline");
        for (const measure of this.StaffLineParent.Measures as VexFlowMeasure[]) {
            // must calculate first AbsolutePositions
            measure.PositionAndShape.calculateAbsolutePositionsRecursive(0, 0);
            measure.setAbsoluteCoordinates(
                measure.PositionAndShape.AbsolutePosition.x * unitInPixels,
                measure.PositionAndShape.AbsolutePosition.y * unitInPixels
            );
            const measureElement: SVGGElement = measure.draw(context) as SVGGElement;
            const [measureSkylineArray, measureBottomLineArray]: number[][] = this.calculateLinesForMeasure(measure, measureElement);
            this.mSkyLine.push(...measureSkylineArray);
            this.mBottomLine.push(...measureBottomLineArray);
        }
        context.closeGroup();
        //Since ties can span multiple measures, process them after the whole staffline has been processed
        for (const tieGroup of stafflineNode.getElementsByClassName("vf-ties")) {
            for (const tie of tieGroup.childNodes) {
                if (tie.nodeName.toLowerCase() === "path") {
                    //TODO: calculate bezier curve? Probably not necessary since ties by their nature will not slope widely
                    const nodeBoundingBox: DOMRect = (tie as SVGPathElement).getBBox();
                    let nodeLeft: number = Math.floor(nodeBoundingBox.x / unitInPixels * this.mRules.SamplingUnit);
                    const nodeRight: number = nodeLeft + (Math.ceil(nodeBoundingBox.width / unitInPixels * this.mRules.SamplingUnit));
                    const nodeTop: number = nodeBoundingBox.y / unitInPixels;
                    const nodeBottom: number = nodeBoundingBox.height / unitInPixels + nodeTop;

                    for (nodeLeft; nodeLeft <= nodeRight; nodeLeft++) {
                        if (nodeTop < this.mSkyLine[nodeLeft]) {
                            this.mSkyLine[nodeLeft] = nodeTop;
                        }
                        if (nodeBottom > this.mBottomLine[nodeLeft]) {
                            this.mBottomLine[nodeLeft] = nodeBottom;
                        }
                    }
                }
            }
        }
        svgBackend.clear();
        invisibleSVG.remove();
    }
}
