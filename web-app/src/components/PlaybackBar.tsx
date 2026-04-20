import React from 'react';
import './PlaybackBar.css';

interface PlaybackBarProps {
  isPlaying: boolean;
  isPracticeMode: boolean;
  isLoading: boolean;
  progress: number; // 0–100
  onPlayPause: () => void;
  onStop: () => void;
  onPracticeToggle: () => void;
}

/** Stopwatch SVG — matches the practice icon from code.html */
const PracticeIcon: React.FC = () => (
  <div className="bar-btn-icon-wrap">
    <svg
      className="practice-stopwatch"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="13" r="8" />
      <circle cx="12" cy="13" r="7.2" strokeDasharray="0.5 1.5" />
      <rect height="2" rx="0.5" width="3" x="10.5" y="2" />
      <path d="M12 4V5" />
      <path d="M15.5 4.5L16.5 5.5" />
      <path d="M8.5 4.5L7.5 5.5" />
      <path d="M12 13L12 9" strokeLinecap="round" />
      <path d="M12 13L15 15" strokeLinecap="round" strokeWidth="0.5" />
      <path d="M12 5.5V6.5" />
      <path d="M12 19.5V20.5" />
      <path d="M4.5 13H5.5" />
      <path d="M18.5 13H19.5" />
      <circle cx="12" cy="13" fill="currentColor" r="0.8" />
    </svg>
  </div>
);

const PlaybackBar: React.FC<PlaybackBarProps> = ({
  isPlaying,
  isPracticeMode,
  isLoading,
  progress,
  onPlayPause,
  onStop,
  onPracticeToggle,
}) => {
  return (
    <div className="playback-bar" id="playback-bar">
      {/* Thin progress line at the top of the pill */}
      {!isPracticeMode && (
        <div className="bar-progress">
          <div className="bar-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Play / Pause */}
      <button
        className={`bar-btn ${isPlaying ? 'active' : ''}`}
        onClick={onPlayPause}
        disabled={isLoading || isPracticeMode}
        title={isPlaying ? 'Pause' : 'Play'}
        id="bar-play-btn"
      >
        <span
          className="material-symbols-outlined bar-icon vintage-icon"
          style={{
            fontVariationSettings: "'FILL' 0, 'wght' 100, 'GRAD' 0, 'opsz' 48",
          }}
        >
          {isPlaying ? 'pause_circle' : 'play_circle'}
        </span>
        <span className="bar-btn-label">{isPlaying ? 'Pause' : 'Play'}</span>
      </button>

      {/* Stop / Rewind */}
      <button
        className="bar-btn"
        onClick={onStop}
        disabled={isLoading || isPracticeMode}
        title="Stop & Rewind"
        id="bar-stop-btn"
      >
        <span
          className="material-symbols-outlined bar-icon vintage-icon"
          style={{
            fontVariationSettings: "'FILL' 0, 'wght' 100, 'GRAD' 0, 'opsz' 48",
          }}
        >
          stop_circle
        </span>
        <span className="bar-btn-label">Stop</span>
      </button>

      {/* Practice Mode */}
      <button
        className={`bar-btn ${isPracticeMode ? 'practice-active' : ''}`}
        onClick={onPracticeToggle}
        disabled={isLoading}
        title={isPracticeMode ? 'Exit Practice Mode' : 'Practice Mode'}
        id="bar-practice-btn"
      >
        <PracticeIcon />
        <span className="bar-btn-label">Practice</span>
      </button>
    </div>
  );
};

export default PlaybackBar;
