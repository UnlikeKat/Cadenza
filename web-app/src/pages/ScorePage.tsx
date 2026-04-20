import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMidi } from '../hooks/useMidi';
import { usePracticeMode } from '../hooks/usePracticeMode';
import PlaybackBar from '../components/PlaybackBar';
import StaffToggle from '../components/StaffToggle';
import './ScorePage.css';

// Module-level refs for dynamic imports
let Player: any = null;
let OpenSheetMusicDisplayRenderer: any = null;
let VerovioConverter: any = null;

const ScorePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const osmdRef = useRef<any>(null); // OSMD instance

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Preparing the score...');
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(0);

  const file = location.state?.file as File | undefined;
  const midiEnabled = location.state?.midiEnabled as boolean | undefined;
  const midiInputId = location.state?.midiInputId as string | undefined;

  // MIDI hook
  const midi = useMidi();

  // Practice mode hook — pass OSMD instance ref
  const practice = usePracticeMode(osmdRef, midi.activeNotes);

  // Re-enable MIDI from upload page state
  useEffect(() => {
    if (midiEnabled && !midi.isEnabled) {
      midi.enable().then(() => {
        if (midiInputId) {
          // Wait a tick for inputs to populate
          setTimeout(() => midi.selectInput(midiInputId), 200);
        }
      });
    }
  }, [midiEnabled, midiInputId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress tracking
  useEffect(() => {
    let animationId: number;
    const updateProgress = () => {
      if (playerRef.current && isPlaying) {
        const pos = playerRef.current.position;
        const dur = playerRef.current.duration;
        if (dur > 0) {
          setProgress((pos / dur) * 100);
        }
      }
      animationId = requestAnimationFrame(updateProgress);
    };
    if (isPlaying) {
      animationId = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying]);

  // Initialize player with OSMD renderer
  useEffect(() => {
    if (!file) {
      navigate('/upload');
      return;
    }

    let destroyed = false;

    const initPlayer = async () => {
      try {
        setLoadingMessage('Loading the music engine...');

        // Dynamically import the library
        const lib = await import('@music-i18n/musicxml-player');
        Player = lib.Player;
        OpenSheetMusicDisplayRenderer = lib.OpenSheetMusicDisplayRenderer;
        VerovioConverter = lib.VerovioConverter;

        if (destroyed) return;

        setLoadingMessage('Reading the score file...');

        // Read the file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        if (destroyed) return;

        setLoadingMessage('Rendering the notation...');

        const renderer = new OpenSheetMusicDisplayRenderer(
          {
            backend: 'svg',
            followCursor: true,
            drawCredits: false,
            drawTitle: false,
            drawComposer: false,
            drawPartNames: false,
            // Configure cursors for practice mode
            cursorsOptions: [
              {
                type: 0,         // Standard vertical line
                color: '#C5A880',
                alpha: 0.6,
                follow: true,
              },
            ],
          }
        );

        // VerovioConverter generates MIDI + timemap in-browser. 
        // We use Bravura (which is completely standard) to bypass Leipzig font loading errors.
        const converter = new VerovioConverter({
          font: 'Bravura'
        });

        // Create the player
        const player = await Player.create({
          musicXml: arrayBuffer,
          container: containerRef.current!,
          renderer,
          converter,
          followCursor: true,
          velocity: 1,
          repeat: 1,
        });

        if (destroyed) {
          player.destroy();
          return;
        }

        playerRef.current = player;
        setTitle(player.title || file.name.replace(/\.[^/.]+$/, ''));

        // Extract the OSMD instance from the renderer
        console.log('[ScorePage] Renderer keys:', Object.keys(renderer));
        const osmd = (renderer as any).osmd || (renderer as any)._osmd;
        if (osmd) {
          osmdRef.current = osmd;
          console.log('[ScorePage] OSMD instance acquired. Cursors:', osmd.cursors?.length ?? 0);

          // Rimosso l'override manuale forzato - ci affidiamo al comportamento naturale di OSMD
          // una volta risolto il caricamento del font SMuFL in Verovio


          // Ensure cursors are initialized — hide them initially
          if (osmd.cursors?.length > 0) {
            osmd.cursors[0].hide();
          }
        } else {
          console.warn('[ScorePage] OSMD instance not found on renderer._osmd');
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Player initialization error:', err);
        if (!destroyed) {
          setError(err.message || 'Failed to load the score. Please try another file.');
          setIsLoading(false);
        }
      }
    };

    initPlayer();

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      osmdRef.current = null;
    };
  }, [file, navigate]);

  // ── Playback Controls ──────────────────────────────

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || practice.isActive) return;
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, practice.isActive]);

  const handleStop = useCallback(() => {
    if (!playerRef.current || practice.isActive) return;
    playerRef.current.rewind();
    setProgress(0);
    if (isPlaying) {
      playerRef.current.pause();
    }
    setIsPlaying(false);
  }, [isPlaying, practice.isActive]);

  const handlePracticeToggle = useCallback(() => {
    if (practice.isActive) {
      practice.stop();
    } else {
      // Stop playback first if playing
      if (isPlaying && playerRef.current) {
        playerRef.current.pause();
        playerRef.current.rewind();
        setIsPlaying(false);
        setProgress(0);
      }

      if (!midi.isEnabled) {
        // Auto-enable MIDI if not already enabled
        midi.enable().then(() => {
          // Wait for MIDI to initialize
          setTimeout(() => practice.start(), 300);
        });
      } else {
        practice.start();
      }
    }
  }, [practice, isPlaying, midi]);

  // Space bar play/pause (only in playback mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isLoading && !practice.isActive) {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, isLoading, practice.isActive]);

  // ── Render ─────────────────────────────────────────

  if (error) {
    return (
      <div className="score-page container">
        <div className="score-error">
          <h2 className="heading">Unable to Load Score</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            <ArrowLeft size={18} /> Try Another File
          </button>
        </div>
      </div>
    );
  }

  const practiceComplete = practice.isActive && practice.currentStep >= practice.totalSteps && practice.totalSteps > 0;

  return (
    <div className="score-page">
      {/* Simplified Header — just back button + title + optional practice badge */}
      <div className="score-header container">
        <button className="back-btn" onClick={() => navigate('/upload')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="heading score-title">{title || 'Loading...'}</h1>

        {practice.isActive && (
          <div className="practice-status">
            <span className="practice-status-dot" />
            Practice Mode
          </div>
        )}
      </div>

      {/* Score Container */}
      <div className="score-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p className="loading-text">{loadingMessage}</p>
          </div>
        )}
        <div ref={containerRef} className="sheet-container" id="sheet-container" />

        {/* Staff toggles — overlaid on the score during practice mode */}
        {!isLoading && (
          <StaffToggle
            isActive={practice.isActive}
            enabledStaves={practice.enabledStaves}
            onToggleStaff={practice.toggleStaff}
          />
        )}
      </div>

      {/* Practice complete overlay */}
      {practiceComplete && (
        <div className="practice-complete">
          <h2 className="heading">Bravo! 🎉</h2>
          <p>You've completed the entire score.</p>
          <button className="btn btn-primary" onClick={() => practice.reset()}>
            Practice Again
          </button>
        </div>
      )}

      {/* Floating Bottom Bar — always visible */}
      {!isLoading && (
        <PlaybackBar
          isPlaying={isPlaying}
          isPracticeMode={practice.isActive}
          isLoading={isLoading}
          progress={progress}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onPracticeToggle={handlePracticeToggle}
        />
      )}
    </div>
  );
};

export default ScorePage;
