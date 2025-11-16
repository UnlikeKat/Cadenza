'use client';

import { useEffect, useRef, useState } from 'react';
import { convertMusicXmlForOsmd } from '@/lib/musicxml';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface MusicPlayerProps {
  musicxml?: string;
  midiFile?: File;
}

export default function MusicPlayer({ musicxml }: MusicPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  // Load and render MusicXML
  useEffect(() => {
    if (!musicxml || !containerRef.current) return;

    const loadMusic = async () => {
      try {
        setLoading(true);
        setError(null);

        // Process the XML
        const trimmedXml = musicxml.trim();
        let xmlToLoad = trimmedXml;

        // Add XML declaration if missing
        if (!trimmedXml.startsWith('<?xml')) {
          const rootMatch = trimmedXml.match(/<(\w+:)?score-partwise|<(\w+:)?score-timewise/);
          if (rootMatch) {
            xmlToLoad = '<?xml version="1.0" encoding="UTF-8"?>\n' + trimmedXml;
            console.log('Added XML declaration to MusicXML');
          } else {
            throw new Error('Invalid MusicXML: could not find a root score-partwise or score-timewise element.');
          }
        }

        // Convert MusicXML 4.0 to 3.1 for OSMD compatibility
        xmlToLoad = convertMusicXmlForOsmd(xmlToLoad);

        // Ensure first measure has proper tempo information for OSMD
        const firstMeasureMatch = xmlToLoad.match(/<measure[^>]*>/);
        if (firstMeasureMatch) {
          const firstMeasureContentMatch = xmlToLoad.match(/<measure[^>]*>([\s\S]*?)<\/measure>/);
          if (firstMeasureContentMatch) {
            const firstMeasureContent = firstMeasureContentMatch[1];
            const hasSoundTempo = /<sound[^>]+tempo=["'][^"']+["']/.test(firstMeasureContent);
            const hasMetronome = firstMeasureContent.includes('<metronome>');
            
            if (!hasSoundTempo || !hasMetronome) {
              const defaultTempo = `
  <direction placement="above">
    <direction-type>
      <metronome parentheses="no">
        <beat-unit>quarter</beat-unit>
        <per-minute>120</per-minute>
      </metronome>
    </direction-type>
    <sound tempo="120"/>
  </direction>`;
              xmlToLoad = xmlToLoad.replace(firstMeasureMatch[0], firstMeasureMatch[0] + defaultTempo);
              console.log('Injected default tempo (120 BPM) into the first measure for OSMD compatibility.');
              console.log('Reason: hasSoundTempo=' + hasSoundTempo + ', hasMetronome=' + hasMetronome);
            }
          }
        }

        // Final validation
        if (!xmlToLoad.includes('score-partwise') && !xmlToLoad.includes('score-timewise')) {
          throw new Error('Invalid MusicXML: file must contain a score-partwise or score-timewise root element');
        }
        
        console.log('Loading MusicXML, length:', xmlToLoad.length);
        console.log('First 1000 chars:', xmlToLoad.substring(0, 1000));

        // Create or reuse OSMD instance
        if (!osmdRef.current && containerRef.current) {
          osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
            autoResize: true,
            backend: 'svg',
            drawingParameters: 'default',
          });
        }

        if (!osmdRef.current) {
          throw new Error('Failed to initialize OSMD');
        }

        // Load and render
        await osmdRef.current.load(xmlToLoad);
        await osmdRef.current.render();

        setLoading(false);
      } catch (err: unknown) {
        console.error('Failed to render music', err);
        let errorMessage = 'Failed to render music';
        
        if (err instanceof Error) {
          errorMessage = `Error: ${err.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadMusic();
  }, [musicxml]);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-purple-600">Loading music...</div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="w-full overflow-x-auto bg-white rounded-lg shadow-sm p-4"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}

