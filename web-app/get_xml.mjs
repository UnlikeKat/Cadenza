import fs from 'fs';
import { JSDOM } from 'jsdom';
import WebMscore from 'webmscore/webmscore.js';

const dom = new JSDOM('', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

(async () => {
  const data = fs.readFileSync('../Merry-Go-Round of Life_ Howl\'s Moving Castle Piano Tutorial (3).mscz');
  const score = await WebMscore.load('mscz', data);
  await score.generateMode('MuseJazz');
  const xml = await score.saveXml();
  fs.writeFileSync('../tmp/out.xml', xml);
  console.log("XML Saved successfully");
  process.exit(0);
})();
