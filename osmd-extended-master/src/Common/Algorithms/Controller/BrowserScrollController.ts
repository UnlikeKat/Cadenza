import { IControllerOutputListener } from "../../Interfaces/IControllerOutputListener";
import { AbstractNumberController } from "./AbstractNumberController";

export class BrowserScrollController implements AbstractNumberController {
    private listener: IControllerOutputListener;

    constructor(listener: IControllerOutputListener) {
        this.listener = listener;
    }

    private currentValue: number;
    public setDirectly(newValue: number): void {
        this.currentValue = newValue;
        this.listener.outputChanged(true, this.currentValue, newValue); // TODO just filled out for now
        // TODO do browser smooth scroll
        // scroll-behavior: smooth;
    }

    public setExpectedValue(newValue: number): void {
        this.currentValue = newValue;
        this.listener.outputChanged(false, this.currentValue, newValue); // TODO just filled out for now
        // TODO do browser smooth scroll
        // scroll-behavior: smooth;
    }

    public CurrentValue(): number {
        return this.currentValue;
    }

    public startControlling(): void {
        // TODO
    }

    public stopControlling(): void {
        // TODO
    }
}
