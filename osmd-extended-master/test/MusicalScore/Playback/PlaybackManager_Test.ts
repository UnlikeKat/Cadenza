import {TestUtils} from "../../Util/TestUtils";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { LinearTimingSource } from "../../../src/Playback/TimingSources/LinearTimingSource";
import { PlaybackManager } from "../../../src/Playback/PlaybackManager";
import { BasicAudioPlayer } from "../../../src/Playback/BasicAudioPlayer";

describe("PlaybackManager", () => {
    const div: HTMLElement = document.createElement("div");
    const osmd: OpenSheetMusicDisplay =
        TestUtils.createOpenSheetMusicDisplay(div);

    // for (const score of TestUtils.XmlTestSet) {
    //     testFile(score);
    // }

    // use it.only to test only this.
    //   TODO if just using it() (all tests), this can still crash the browser somehow.
    it.skip("getSheetDuration total", (done: Mocha.Done) => {
        //let currentFileIndex: number = 0;
        loadNextFile(0, done);
    }, 10000);

    function loadNextFile(fileIndex: number, done: Mocha.Done): void {
        if (fileIndex > TestUtils.XmlTestSet.length - 1) {
            done();
        }
        const score: Document = TestUtils.getScore(TestUtils.XmlTestSet[fileIndex]);
        try {
            osmd.load(score).then(
                (result) => {
                const timingSource: LinearTimingSource = new LinearTimingSource();
                timingSource.Settings = osmd.Sheet.SheetPlaybackSetting;
                timingSource.logEnabled = false;
                const playbackManager: PlaybackManager = new PlaybackManager(
                    timingSource, undefined, new BasicAudioPlayer(), undefined);
                osmd.PlaybackManager = playbackManager;
                playbackManager.initialize(osmd.Sheet.MusicPartManager);
                const timeWithoutRepeats: number = playbackManager.getSheetDurationInMs(false);
                const timeWithRepeats: number = playbackManager.getSheetDurationInMsWithRepeats();
                console.log("time with    repeats: " + timeWithRepeats.toFixed(2) + " for " + osmd.Sheet.Title.text);
                console.log("time without repeats: " + timeWithoutRepeats.toFixed(2));
                chai.expect(timeWithRepeats >= timeWithoutRepeats).to.equal(true);
                loadNextFile(fileIndex + 1, done);
            },
            (err) => {
                // couldn't read file
                if (fileIndex < TestUtils.XmlTestSet.length - 1) {
                    loadNextFile(fileIndex + 1, done);
                } else {
                    done();
                    // not sure why this if/else block is necessary, but otherwise it infinite loops when a file couldn't be loaded.
                    //   somehow the catch block doesn't seem to get executed.
                }
            });
        } catch (err) {
            console.log("error: " + err);
            loadNextFile(fileIndex + 1, done);
            // we need to catch the error and call the next file,
            //   otherwise done() never gets called and the test hangs
        }
    }

    // this variation of doing the test is similar to the loop in Xml_Test.ts,
    //   but seems to crash the browser because the for loop calls too many tests at once that are too demanding.
    //   (Xml_Test does the same, but it looks like the test is simple enough to not overload the browser)
    // function testFile(scoreName: string): void {
    //     it("getSheetDuration: " + scoreName, (done: Mocha.Done) => {
    //         //let timingSource: LinearTimingSource; // somehow this will be undefined in load().then()
    //         //let playbackManager: PlaybackManager;

    //         if (false) {
    //             initialize(osmd, undefined, undefined);
    //         }
    //         const score: Document = TestUtils.getScore(scoreName);
    //         osmd.load(score).then(() => {
    //             const timingSource: LinearTimingSource = new LinearTimingSource();
    //             timingSource.Settings = osmd.Sheet.SheetPlaybackSetting;
    //             timingSource.logEnabled = false;
    //             const playbackManager = new PlaybackManager(timingSource, undefined, new BasicAudioPlayer(), undefined);
    //             osmd.PlaybackManager = playbackManager;
    //             playbackManager.initialize(osmd.Sheet.MusicPartManager);
    //             const timeWithoutRepeats: number = playbackManager.getSheetDurationInMs(false);
    //             const timeWithRepeats: number = playbackManager.getSheetDurationInMsWithRepeats();
    //             console.log("time with    repeats: " + timeWithRepeats    + " for " + osmd.Sheet.Title.text);
    //             console.log("time without repeats: " + timeWithoutRepeats);
    //             chai.expect(timeWithRepeats >= timeWithoutRepeats).to.equal(true);
    //             done();
    //         });
    //     }).timeout(10000);
    // }

    // function initialize(osmd, timingSource, playbackManager) {
    //     timingSource = new LinearTimingSource();
    //     playbackManager = new PlaybackManager(timingSource, undefined, new BasicAudioPlayer(), undefined);
    //     // timingSource.reset();
    //     // timingSource.pause();
    //     //playbackManager.removeListener(osmd.cursor); // only necessary if no duplicate checks in addListener
    //     // playbackManager.addListener(osmd.cursor);
    //     playbackManager.reset();
    //     osmd.PlaybackManager = playbackManager;
    // }
});
