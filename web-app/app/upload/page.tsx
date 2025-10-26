'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import MusicPlayer from '@/app/components/MusicPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UploadPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [musicxml, setMusicxml] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'musicxml' | 'midi' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();

    if (extension === 'xml' || extension === 'musicxml') {
      // Read MusicXML
      const text = await selectedFile.text();
      setMusicxml(text);
      setFileType('musicxml');
      setFile(selectedFile);
    } else if (extension === 'mid' || extension === 'midi') {
      // MIDI file
      setFileType('midi');
      setFile(selectedFile);
      setMusicxml(null);
    } else {
      alert('Please upload a MusicXML (.xml) or MIDI (.mid) file');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileChange(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  return (
    <div className="min-h-screen cosmic-bg text-white relative overflow-hidden">
      <div className="fixed inset-0 cosmic-grid opacity-40 pointer-events-none" />

      {/* Floating musical notes background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[10%] left-[5%] text-6xl text-purple-400 animate-float" style={{ animationDelay: "0s", animationDuration: "8s" }}>
          ♪
        </div>
        <div className="absolute top-[20%] right-[10%] text-7xl text-cyan-400 animate-float" style={{ animationDelay: "1s", animationDuration: "10s" }}>
          ♫
        </div>
        <div className="absolute bottom-[30%] left-[15%] text-8xl text-pink-400 animate-float" style={{ animationDelay: "0.5s", animationDuration: "9s" }}>
          ♬
        </div>
        <div className="absolute top-[50%] right-[20%] text-6xl text-blue-300 animate-float" style={{ animationDelay: "1.5s", animationDuration: "11s" }}>
          ♩
        </div>
        <div className="absolute bottom-[15%] right-[8%] text-7xl text-purple-300 animate-float" style={{ animationDelay: "2s", animationDuration: "8s" }}>
          𝄞
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">Upload Your Music</span>
          </h1>
          <p className="text-xl text-white">
            Welcome back, <span className="text-purple-400 font-semibold">{session?.user?.name || session?.user?.email}</span>
          </p>
        </div>

        {/* Upload Card */}
        <Card className="glass-card border-purple-400/40 mb-8" style={{ borderWidth: "2px" }}>
          <CardHeader>
            <CardTitle className="text-2xl gradient-text-subtle">Upload Music File</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                isDragging
                  ? 'border-purple-400 bg-purple-500/10 scale-105'
                  : 'border-purple-400/50 hover:border-purple-400'
              }`}
            >
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-purple-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <p className="text-xl font-semibold mb-2 text-white">
                  Drag & drop your music file here
                </p>
                <p className="text-gray-400 mb-4">or</p>
              </div>

              <label htmlFor="file-upload">
                <Button
                  type="button"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Browse Files
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </label>

              <p className="text-sm text-gray-400 mt-4">
                Supported formats: MusicXML (.xml, .musicxml), MIDI (.mid, .midi)
              </p>

              {file && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 font-semibold break-words">
                    ✅ {file.name}
                  </p>
                  <p className="text-sm text-white mt-1">
                    Type: {fileType?.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Music Player */}
        {file && (
          <Card className="glass-card border-purple-400/40" style={{ borderWidth: "2px" }}>
            <CardContent className="p-6">
              <MusicPlayer 
                musicxml={musicxml || undefined}
                midiFile={fileType === 'midi' ? file : undefined}
              />
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!file && (
          <Card className="glass-card border-purple-400/40" style={{ borderWidth: "2px" }}>
            <CardHeader>
              <CardTitle className="text-2xl gradient-text-subtle">How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                    📂
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-white">1. Upload Your File</h3>
                    <p className="text-gray-400">
                      Drag & drop or browse for a MusicXML or MIDI file
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                    🎼
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-white">2. View Sheet Music</h3>
                    <p className="text-gray-400">
                      The sheet music will be displayed automatically
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center text-2xl">
                    ▶️
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-white">3. Play the Music</h3>
                    <p className="text-gray-400">
                      Click play to hear your music come to life
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center text-2xl">
                    🎹
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-white">4. Practice Along</h3>
                    <p className="text-gray-400">
                      Follow the highlighted notes as you practice
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
