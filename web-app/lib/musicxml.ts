// web-app/lib/musicxml.ts

/**
 * Converts a MusicXML 4.0 string to a MusicXML 3.1 string for OSMD compatibility.
 * OSMD (OpenSheetMusicDisplay) has better support for MusicXML 3.1.
 *
 * @param xmlString The MusicXML string to convert.
 * @returns A MusicXML 3.1 string.
 */
export const convertMusicXmlForOsmd = (xmlString: string): string => {
  let convertedXml = xmlString;

  // Only perform conversion if the file is identified as MusicXML 4.0
  if (convertedXml.includes('version="4.0"')) {
    console.log('Converting MusicXML 4.0 to 3.1 format for OSMD compatibility');

    // 1. Replace the version attribute from 4.0 to 3.1
    convertedXml = convertedXml.replace(/version=(["'])4\.0\1/g, 'version="3.1"');

    // 2. Define the regular expressions for the 4.0 DOCTYPEs using the RegExp constructor
    const doctypePartwiseRegex = new RegExp('<!DOCTYPE\\s+score-partwise\\s+PUBLIC\\s+"-//Recordare//DTD\\s+MusicXML\\s+4\\.0\\s+Partwise\\/\\/EN"\\s+"[^"]*">', 'g');
    const doctypeTimewiseRegex = new RegExp('<!DOCTYPE\\s+score-timewise\\s+PUBLIC\\s+"-//Recordare//DTD\\s+MusicXML\\s+4\\.0\\s+Timewise\\/\\/EN"\\s+"[^"]*">', 'g');

    // 3. Define the correct 3.1 DOCTYPE strings
    const partwiseDOCTYPE_3_1 = '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">';
    const timewiseDOCTYPE_3_1 = '<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 3.1 Timewise//EN" "http://www.musicxml.org/dtds/timewise.dtd">';

    // 4. Replace the DOCTYPEs
    convertedXml = convertedXml.replace(doctypePartwiseRegex, partwiseDOCTYPE_3_1);
    convertedXml = convertedXml.replace(doctypeTimewiseRegex, timewiseDOCTYPE_3_1);

    console.log('Successfully converted MusicXML to version 3.1');
  }

  return convertedXml;
};
