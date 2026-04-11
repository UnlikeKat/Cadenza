'use client';

import React from 'react';

interface ScoreCursorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export function ScoreCursor({ x, y, width, height, visible }: ScoreCursorProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute bg-blue-500/30 pointer-events-none z-10"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
