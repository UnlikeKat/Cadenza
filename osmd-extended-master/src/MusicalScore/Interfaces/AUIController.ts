import { PointF2D } from "../../Common/DataObjects";
import  * as Handlebars from "handlebars";

export abstract class AUIController<T> {
    protected parentElement: HTMLElement;
    protected insertLocation: InsertPosition;
    protected isTouchDevice: boolean;
    //TODO: This is a better pattern than annotations. Need to use this when merging
    protected eventListeners: T[] = [];
    protected abstract initialize(): void;
    public abstract show(location?: PointF2D): void;
    public abstract hideAndClear(): void;

    constructor(parentElement: HTMLElement = document.body, isTouchDevice: boolean = false, where: InsertPosition = "beforeend") {
        this.parentElement = parentElement;
        this.insertLocation = where;
        this.isTouchDevice = isTouchDevice;
        this.initialize();
    }
    public addListener(listener: T): void {
        this.eventListeners.push(listener);
    }
    protected generateHtmlTemplate(rawHtml: string, data: Object = {}): string {
        const template: HandlebarsTemplateDelegate<any> = Handlebars.compile(rawHtml);
        const html: string = template(data);
        return html;
    }
    //Utility for subclasses if html template is pretty standard
    protected generateAndInsertHtmlTemplate(rawHtml: string, data: Object = {}, where: InsertPosition = this.insertLocation,
                                            parent: HTMLElement = this.parentElement): void {
        const processedHtml: string = this.generateHtmlTemplate(rawHtml, data);
        parent.insertAdjacentHTML(where, processedHtml);
    }

    protected get downEventName(): string {
        return this.isTouchDevice ? "ontouchstart" : "onmousedown";
    }

    protected get upEventName(): string {
        return this.isTouchDevice ? "ontouchend" : "onmouseup";
    }

    protected get moveEventName(): string {
        return this.isTouchDevice ? "ontouchmove" : "onmousemove";
    }
}
