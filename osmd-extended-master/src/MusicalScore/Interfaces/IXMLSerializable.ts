//Tags a class that has the ability to be serialized to XML
export interface IXMLSerializable {
    SerializeToXML(document: XMLDocument, args: Object): Node;
}
