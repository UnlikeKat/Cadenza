import { v4 as uuidv4 } from "uuid";
import { GraphicalObject } from "./GraphicalObject";

export class GraphicalLayer<T extends GraphicalObject> {
    public readonly UUID: string;
    public Name: string;
    public MemberObjects: T[];

    constructor(layerName?: string, UUID?: string) {
        this.Name = layerName;
        if (UUID) {
            this.UUID = UUID;
        } else {
            this.UUID = uuidv4();
        }
        this.MemberObjects = [];
    }

    public Equals(otherLayer: GraphicalLayer<T>): boolean {
        return this.UUID === otherLayer.UUID;
    }
}
