'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import JSZip from 'jszip';

const MusicPlayer = dynamic(() => import('@/app/components/MusicPlayer'), {
  ssr: false,
  loading: () => <div className="text-center py-8">Loading player...</div>
});

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [musicxml, setMusicxml] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'musicxml' | 'midi' | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();

    if (extension === 'xml' || extension === 'musicxml') {
      // Read MusicXML
      const text = await selectedFile.text();
      setMusicxml(text);
      setFileType('musicxml');
      setFile(selectedFile);
    } else if (extension === 'mxl') {
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Find the first XML file that isn't container.xml
        const xmlFile = Object.values(zip.files).find(file => 
          (file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) && 
          !file.name.includes('META-INF')
        );

        if (xmlFile) {
          const text = await xmlFile.async('string');
          setMusicxml(text);
          setFileType('musicxml');
          setFile(selectedFile);
        } else {
          alert('Invalid .mxl file: No MusicXML file found inside.');
        }
      } catch (error) {
        console.error('Error reading .mxl file:', error);
        alert('Error reading .mxl file. Please try again.');
      }
    } else {
      alert('Please upload a MusicXML (.xml, .musicxml, .mxl) file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold mb-8">
          🎵 Upload & Play Music
        </h1>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <label className="block mb-4">
            <span className="text-xl font-semibold mb-4 block">
              Choose a MusicXML file
            </span>
            <input
              type="file"
              accept=".xml,.musicxml,.mxl"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                cursor-pointer"
            />
          </label>

          {file && (
            <div className="mt-4 text-green-400">
              ✅ Loaded: {file.name}
            </div>
          )}
        </div>

        {/* Player */}
        {file && (
          <MusicPlayer 
            musicxml={musicxml || undefined}
          />
        )}

        {/* Instructions */}
        {!file && (
          <div className="bg-gray-800 rounded-lg p-8 border-2 border-dashed border-gray-700">
            <h2 className="text-2xl font-bold mb-4">How to use</h2>
            <ol className="space-y-3 text-gray-400">
              <li>1. 📂 Click above to upload a MusicXML file</li>
              <li>2. 🎼 The sheet music will be displayed automatically</li>
              <li>3. ▶️ Click &quot;Play&quot; to hear the music</li>
              <li>4. 🎹 Follow along with the highlighted notes</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}