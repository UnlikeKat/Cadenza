import React from 'react';
import './StaffToggle.css';

interface StaffToggleProps {
  isActive: boolean;              // practice mode active?
  enabledStaves: Set<number>;     // which staves are enabled
  onToggleStaff: (staff: number) => void;
}

/**
 * Sticky staff toggles — only visible during practice mode.
 * Shows 𝄞 (treble, staff 0) and 𝄢 (bass, staff 1) toggles
 * positioned at the left edge of the score, sticky so they
 * remain visible while scrolling.
 */
const StaffToggle: React.FC<StaffToggleProps> = ({
  isActive,
  enabledStaves,
  onToggleStaff,
}) => {
  if (!isActive) return null;

  return (
    <div className="staff-toggle-container" id="staff-toggle-container">
      {/* Treble clef toggle */}
      <button
        className={`staff-toggle-btn ${enabledStaves.has(1) ? 'enabled' : 'disabled'}`}
        onClick={() => onToggleStaff(1)}
        title={enabledStaves.has(1) ? 'Disable treble clef practice' : 'Enable treble clef practice'}
        id="staff-toggle-treble"
      >
        <span className="staff-toggle-clef">𝄞</span>
        <span className="staff-toggle-indicator" />
      </button>

      {/* Bass clef toggle */}
      <button
        className={`staff-toggle-btn ${enabledStaves.has(2) ? 'enabled' : 'disabled'}`}
        onClick={() => onToggleStaff(2)}
        title={enabledStaves.has(2) ? 'Disable bass clef practice' : 'Enable bass clef practice'}
        id="staff-toggle-bass"
      >
        <span className="staff-toggle-clef">𝄢</span>
        <span className="staff-toggle-indicator" />
      </button>
    </div>
  );
};

export default StaffToggle;
