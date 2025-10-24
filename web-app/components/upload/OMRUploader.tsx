'use client';

/**
 * OMR Uploader Component
 * UI for uploading sheet music and converting to MusicXML
 */

import { useState, useRef } from 'react';

export default function OMRUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPPORTED_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.pdf', '.tif', '.tiff'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large (max ${formatFileSize(MAX_FILE_SIZE)})`
      };
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!SUPPORTED_FILE_TYPES.includes(extension)) {
      return {
        valid: false,
        error: `Unsupported file type. Supported: ${SUPPORTED_FILE_TYPES.join(', ')}`
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(false);
  };

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setError(null);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 2000);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/omr/convert', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const musicxml = await response.text();
      const filename = `${file.name}.musicxml`;
      
      // Download MusicXML
      const blob = new Blob([musicxml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        setSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🎵 Sheet Music to MusicXML</h2>
      <p className="text-gray-600 mb-6">
        Upload a sheet music image or PDF to convert it to MusicXML format
      </p>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Select File
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={converting}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Supported: PNG, JPG, PDF, TIFF (max 10MB)
        </p>
      </div>

      {file && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Selected:</p>
          <p className="text-sm text-blue-700">{file.name}</p>
          <p className="text-xs text-blue-600">{formatFileSize(file.size)}</p>
        </div>
      )}

      {converting && (
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-blue-700">Converting...</span>
            <span className="text-sm font-medium text-blue-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            This may take 30-120 seconds depending on complexity
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">Error:</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800">✓ Success!</p>
          <p className="text-sm text-green-700">MusicXML downloaded</p>
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={!file || converting}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          !file || converting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {converting ? 'Converting...' : 'Convert to MusicXML'}
      </button>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>How it works:</strong> Your file is sent to an open-source OMR service 
          (Audiveris) running on DigitalOcean. The conversion happens server-side and 
          the MusicXML file is downloaded automatically.
        </p>
      </div>
    </div>
  );
}
