import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import {TestUtils} from "../../Util/TestUtils";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

// Test XML simple document
const xmlTestData: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 2.0 Partwise//EN\" \"http://www.musicxml.org/dtds/partwise.dtd\">\
<score-partwise>  <identification>    <encoding>      <software>Example Software name</software>      \
<encoding-date>2016-04-04</encoding-date>      </encoding>    </identification>   <credit page=\"1\"> \
<credit-words justify=\"center\" valign=\"top\">Example Credit Words</credit-words> </credit>  </score-partwise>";


describe("XML interface", () => {
    const parser: DOMParser = new DOMParser();
    const doc: Document = parser.parseFromString(xmlTestData, "text/xml");
    const documentElement: IXmlElement = new IXmlElement(doc.documentElement);

    // test all test files
    for (const score of TestUtils.XmlTestSet) {
        testFile(score);
    }

    // Generates a test for a mxl file name
    function testFile(scoreName: string): void {
        it(scoreName, (done: Mocha.Done) => {
            // Load the xml file content
            const score: Document = TestUtils.getScore(scoreName);
            const div: HTMLElement = document.createElement("div");
            const openSheetMusicDisplay: OpenSheetMusicDisplay =
                TestUtils.createOpenSheetMusicDisplay(div);
            openSheetMusicDisplay.load(score);
            done();
        }, 30000);
    }

    it("test IXmlElement", (done: Mocha.Done) => {
        // Test name attribute
        chai.expect(documentElement.name).to.equal("score-partwise");
        // Test element method
        chai.should().exist(documentElement.element("identification"));
        // Test value attribute
        chai.expect(documentElement
            .element("identification")
            .element("encoding")
            .element("software").value).to.equal("Example Software name");
        done();
    });

    it("test IXmlAttribute", (done: Mocha.Done) => {
        // Test attributes method
        chai.expect(
            documentElement.element("credit").attributes()[0].name
        ).to.equal("page");

        const creditWords: IXmlElement =
            documentElement.element("credit").element("credit-words");
        // Test attributes method
        chai.expect(creditWords.attributes().length).to.equal(2);
        // Test value attribute
        chai.expect(creditWords.attribute("justify").value).to.equal("center");
        done();
    });
});
