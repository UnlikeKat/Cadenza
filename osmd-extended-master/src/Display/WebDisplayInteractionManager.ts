import { AbstractDisplayInteractionManager } from "./AbstractDisplayInteractionManager";
import { PointF2D } from "../Common/DataObjects/PointF2D";
import { Dictionary } from "typescript-collections";

export class WebDisplayInteractionManager extends AbstractDisplayInteractionManager {
    protected osmdSheetMusicContainer: HTMLElement;
    protected fullOffsetLeft: number = 0;
    protected fullOffsetTop: number = 0;
    protected fullScrollTop: number = 0;
    protected fullScrollLeft: number = 0;
    //Using map instead of collections dictionary because map supports using objects as keys properly
    protected parentScrollMap: Map<HTMLElement, number[]> = new Map<HTMLElement, number[]>();
    protected scrollCallbackMap: Map<HTMLElement, (this: HTMLElement, ev: Event) => any> =
                                 new Map<HTMLElement, (this: HTMLElement, ev: Event) => any>();

    constructor(osmdContainer: HTMLElement) {
        super();
        this.osmdSheetMusicContainer = osmdContainer;
        this.listenForInteractions();
    }

    public get FullOffsetTop(): number {
        return this.fullOffsetTop;
    }

    public get FullScrollTop(): number {
        return this.fullScrollTop;
    }

    public get FullOffsetLeft(): number {
        return this.fullOffsetLeft;
    }

    public get FullScrollLeft(): number {
        return this.fullScrollLeft;
    }

    protected timeout: NodeJS.Timeout = undefined;

    protected static resizeCallback(entries: ResizeObserverEntry[]|HTMLElement[], self: WebDisplayInteractionManager): void {
        //debounce resize callback
        clearTimeout(self.timeout);
        self.timeout = setTimeout(()=> {
            self.fullOffsetLeft = 0;
            self.fullOffsetTop = 0;
            let nextOffsetParent: HTMLElement = self.osmdSheetMusicContainer;
            while (nextOffsetParent) {
                self.fullOffsetLeft += nextOffsetParent.offsetLeft;
                self.fullOffsetTop += nextOffsetParent.offsetTop;
                nextOffsetParent = nextOffsetParent.offsetParent as HTMLElement;
            }
            self.resizeEventListener();
            self.deregisterScrollOffsets();
            self.registerScrollOffsets();
        }, 500);
    }

    protected registerScrollOffsets(): void {
        let nextScrollParent: HTMLElement = this.osmdSheetMusicContainer;
        this.fullScrollTop = 0;
        this.fullScrollLeft = 0;
        const self: WebDisplayInteractionManager = this;
        while(nextScrollParent && nextScrollParent !== document.documentElement){
            this.parentScrollMap.set(nextScrollParent, [nextScrollParent.scrollTop, nextScrollParent.scrollLeft]);
            this.fullScrollLeft += nextScrollParent.scrollLeft;
            this.fullScrollTop += nextScrollParent.scrollTop;
            if(nextScrollParent.scrollHeight > nextScrollParent.clientHeight){
                const nextScrollCallback: (this: HTMLElement, ev: Event) => any = function(scrollEvent: Event): void{
                    //@ts-ignore
                    const currentScroll: number[] = self.parentScrollMap.get(this);
                    const currentScrollTop: number = currentScroll[0];
                    const currentScrollLeft: number = currentScroll[1];
                    //@ts-ignore
                    self.fullScrollTop = self.fullScrollTop - currentScrollTop + this.scrollTop;
                    //@ts-ignore
                    self.fullScrollLeft = self.fullScrollLeft - currentScrollLeft + this.scrollLeft;
                    //@ts-ignore
                    self.parentScrollMap.set(this, [this.scrollTop, this.scrollLeft]);
                };


                this.scrollCallbackMap.set(nextScrollParent, nextScrollCallback);
                nextScrollParent.addEventListener("scroll", nextScrollCallback);
            }
            nextScrollParent = nextScrollParent.parentElement;
        }
    }

    protected deregisterScrollOffsets(): void {
        for(const key of this.scrollCallbackMap.keys()){
            key.removeEventListener("scroll", this.scrollCallbackMap.get(key));
        }
        this.scrollCallbackMap.clear();
    }

    protected disposeResizeListener: Function;
    protected resizeObserver: ResizeObserver = undefined;

    protected initialize(): void {
        this.fullOffsetLeft = 0;
        this.fullOffsetTop = 0;
        let nextOffsetParent: HTMLElement = this.osmdSheetMusicContainer;

        const entries: HTMLElement[] = [];
        const self: WebDisplayInteractionManager = this;
        if(window.ResizeObserver){ // if(ResizeObserver) throws if ResizeObserver not found (browserless)
            this.resizeObserver = new ResizeObserver((observedElements: ResizeObserverEntry[]) => {
                WebDisplayInteractionManager.resizeCallback(observedElements, self);
            });
        }
        while (nextOffsetParent) {
            this.fullOffsetLeft += nextOffsetParent.offsetLeft;
            this.fullOffsetTop += nextOffsetParent.offsetTop;
            if(!this.resizeObserver){
                entries.push(nextOffsetParent);
            } else {
                this.resizeObserver.observe(nextOffsetParent);
            }
            nextOffsetParent = nextOffsetParent.offsetParent as HTMLElement;
        }

        if(!this.resizeObserver){
            let resizeListener: (this: Window, ev: UIEvent) => any = (): void => {
                WebDisplayInteractionManager.resizeCallback(entries, self);
            };
            //Resize observer not avail. on this browser, default to window event
            window.addEventListener("resize", resizeListener);

            this.disposeResizeListener = (): void => {
                window.removeEventListener("resize", resizeListener);
                resizeListener = undefined;
            };
        } else {
            this.disposeResizeListener = (): void => {
                self.resizeObserver.disconnect();
                self.resizeObserver = undefined;
            };
        }
        self.registerScrollOffsets();
    }

    protected dispose(): void {
        if (this.disposeResizeListener) {
            this.disposeResizeListener();
        }
        for(const eventName of this.EventCallbackMap.keys()){
            const result: [HTMLElement|Document, EventListener] = this.EventCallbackMap.getValue(eventName);
            result[0].removeEventListener(eventName, result[1]);
        }
        this.EventCallbackMap.clear();
        this.deregisterScrollOffsets();
        this.scrollCallbackMap.clear();
        this.parentScrollMap.clear();
    }

    //TODO: Much of this pulled from annotations code. Once we get the two branches together, combine common code
    private isTouch(): boolean {
        if (("ontouchstart" in window) || (window as any).DocumentTouch) {
            return true;
        }
        if (!window.matchMedia) {
            return false; // if running browserless / in nodejs (generateImages / visual regression tests)
        }
        // include the 'heartz' as a way to have a non matching MQ to help terminate the join
        // https://git.io/vznFH
        const prefixes: string[] = ["-webkit-", "-moz-", "-o-", "-ms-"];
        const query: string = ["(", prefixes.join("touch-enabled),("), "heartz", ")"].join("");
        return window.matchMedia(query).matches;
    }

    protected get downEventName(): string {
        return this.isTouch() ? "touchstart" : "mousedown";
    }

    protected get moveEventName(): string {
        return this.isTouch() ? "touchmove" : "mousemove";
    }
    protected EventCallbackMap: Dictionary<string, [HTMLElement|Document, EventListener]> =
                new Dictionary<string, [HTMLElement|Document, EventListener]>();

    private listenForInteractions(): void {
        const downEvent: (clickEvent: MouseEvent | TouchEvent) => void = this.downEventListener.bind(this);
        const endTouchEvent: (clickEvent: TouchEvent) => void = this.touchEndEventListener.bind(this);
        const moveEvent: (clickEvent: MouseEvent | TouchEvent) => void = this.moveEventListener.bind(this);
        this.osmdSheetMusicContainer.addEventListener("mousedown", downEvent);
        this.osmdSheetMusicContainer.addEventListener("touchend", endTouchEvent);
        document.addEventListener(this.moveEventName, moveEvent);
        this.EventCallbackMap.setValue("mousedown", [this.osmdSheetMusicContainer, downEvent]);
        this.EventCallbackMap.setValue("touchend", [this.osmdSheetMusicContainer, endTouchEvent]);
        this.EventCallbackMap.setValue(this.moveEventName, [document, moveEvent]);
    }

    //Millis of how long is valid for the next click of a double click
    private readonly DOUBLE_CLICK_WINDOW: number = 200;
    private clickTimeout: NodeJS.Timeout;
    private lastClick: number = 0;
    private downEventListener(clickEvent: MouseEvent | TouchEvent): void {
        //clickEvent.preventDefault();
        const currentTime: number = new Date().getTime();
        const clickLength: number = currentTime - this.lastClick;
        clearTimeout(this.clickTimeout);
        let x: number = 0;
        let y: number = 0;
        if (this.isTouch() && clickEvent instanceof TouchEvent) {
            x = clickEvent.touches[0].pageX;
            y = clickEvent.touches[0].pageY;
        } else if (clickEvent instanceof MouseEvent) {
            x = clickEvent.pageX;
            y = clickEvent.pageY;
        }
        const clickMinusOffset: PointF2D = this.getOffsetCoordinates(x, y);

        if (clickLength < this.DOUBLE_CLICK_WINDOW && clickLength > 0) {
            //double click
            this.doubleClick(clickMinusOffset.x, clickMinusOffset.y);
        } else {
            const self: WebDisplayInteractionManager = this;
            this.clickTimeout = setTimeout(function(): void {
                clearTimeout(this.clickTimeout);
                if (self.isTouch()) {
                    self.touchDown(clickMinusOffset.x, clickMinusOffset.y, undefined);
                } else {
                    self.click(clickMinusOffset.x, clickMinusOffset.y);
                }
            },                             this.DOUBLE_CLICK_WINDOW);
        }
        this.lastClick = currentTime;
    }

    private moveEventListener(mouseMoveEvent: MouseEvent | TouchEvent): void {

        let x: number = 0;
        let y: number = 0;
        if (this.isTouch() && mouseMoveEvent instanceof TouchEvent) {
            let touch: Touch = undefined;
            if(mouseMoveEvent.touches && mouseMoveEvent.touches.length > 0){
                touch = mouseMoveEvent.touches[0];
            } else if(mouseMoveEvent.changedTouches && mouseMoveEvent.changedTouches.length > 0){
                touch = mouseMoveEvent.changedTouches[0];
            }
            x = touch?.clientX;
            y = touch?.clientY;
        } else if (mouseMoveEvent instanceof MouseEvent) {
            x = mouseMoveEvent.clientX;
            y = mouseMoveEvent.clientY;
        }
        const clickMinusOffset: PointF2D = this.getOffsetCoordinates(x, y);
        this.move(clickMinusOffset.x, clickMinusOffset.y);
    }

    private touchEndEventListener(clickEvent: TouchEvent): void {
        let touch: Touch = undefined;
        if(clickEvent.touches && clickEvent.touches.length > 0){
            touch = clickEvent.touches[0];
        } else if(clickEvent.changedTouches && clickEvent.changedTouches.length > 0){
            touch = clickEvent.changedTouches[0];
        }
        const touchMinusOffset: PointF2D = this.getOffsetCoordinates(touch?.pageX, touch?.pageY);
        this.touchUp(touchMinusOffset.x, touchMinusOffset.y);
    }


    private resizeEventListener(): void {
        this.displaySizeChanged(this.osmdSheetMusicContainer.clientWidth, this.osmdSheetMusicContainer.clientHeight);
    }

    private getOffsetCoordinates(clickX: number, clickY: number): PointF2D {
        const sheetX: number = clickX - this.fullOffsetLeft + this.fullScrollLeft;
        const sheetY: number = clickY - this.fullOffsetTop + this.fullScrollTop;
        return new PointF2D(sheetX, sheetY);
    }
}
