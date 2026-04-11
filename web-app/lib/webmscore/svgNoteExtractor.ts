/**
 * svgNoteExtractor.ts
 * 
 * Parses WebMscore SVG output to extract individual notehead positions
 * from `path.Note` elements. Each notehead has a `transform` attribute
 * containing a matrix with (tx, ty) translation coordinates.
 */

export interface NoteCoord {
  /** X position in SVG coordinate space */
  x: number;
  /** Y position in SVG coordinate space */
  y: number;
  /** Page index (0-based) */
  page: number;
  /** Exact SVG element outerHTML for pixel-perfect glow highlights */
  svgContent?: string;
}

export interface MeasureNotes {
  /** Measure index */
  measureIdx: number;
  /** All notehead positions within this measure */
  notes: NoteCoord[];
}

/**
 * Extract notehead coordinates from raw SVG text.
 * 
 * WebMscore SVG contains elements like:
 *   <path class="Note" transform="matrix(0.992,0,0,0.992,519.413,758.198)" d="..."/>
 * 
 * The transform matrix(a,b,c,d,tx,ty) gives us tx=x, ty=y positions.
 */
export function extractNotePositions(svgText: string, pageIndex: number): NoteCoord[] {
  const notes: NoteCoord[] = [];

  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = svgDoc.documentElement;

    // Find all elements with class "Note" (can be <path>, <use>, etc.)
    const noteElements = svg.querySelectorAll('.Note');

    noteElements.forEach((el) => {
      let x = 0;
      let y = 0;
      let foundCoords = false;

      // 1. Try to get x/y from attributes (common in <use> elements)
      if (el.hasAttribute('x') && el.hasAttribute('y')) {
        x = parseFloat(el.getAttribute('x') || '0');
        y = parseFloat(el.getAttribute('y') || '0');
        // We consider this sufficient, but transform might also apply
        foundCoords = true;
      }

      // 2. Add coordinates from transform if present
      const transform = el.getAttribute('transform');
      if (transform) {
        const coords = parseTransformCoords(transform);
        if (coords) {
          x += coords.x;
          y += coords.y;
          foundCoords = true;
        }
      }

      // 3. If no explicit x/y or transform, parse the 'd' attribute directly for native paths
      if (!foundCoords && el.tagName.toLowerCase() === 'path') {
        const d = el.getAttribute('d');
        if (d) {
          const bounds = getPathBounds(d);
          if (bounds) {
             // Use the center or min bounds as the anchor coordinate
             x = bounds.minX;
             y = bounds.minY;
             foundCoords = true;
          }
        }
      }

      if (foundCoords) {
        let clone: Element | null = null;
        
        // If it's a <use> element, its <defs> won't exist in our overlay layer.
        // We MUST unroll it by finding the referenced element and cloning it deeply into a <g> wrapper!
        const isUse = el.tagName.toLowerCase() === 'use';
        if (isUse) {
          const href = el.getAttribute('href') || el.getAttribute('xlink:href');
          if (href && href.startsWith('#')) {
             const target = svgDoc.getElementById(href.substring(1));
             if (target) {
                // Create a literal <g> wrapper
                clone = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                
                // Construct a new transform that encapsulates the <use> attributes.
                // SVG spec: the 'transform' attribute applies AFTER the local x/y translations. 
                // So the resultant string should be: "outer_transform translate(x, y)"
                let combinedTransform = '';
                const ut = el.getAttribute('transform');
                if (ut) combinedTransform += ut + ' ';
                
                const ux = parseFloat(el.getAttribute('x') || '0');
                const uy = parseFloat(el.getAttribute('y') || '0');
                if (ux !== 0 || uy !== 0) combinedTransform += `translate(${ux}, ${uy})`;
                
                if (combinedTransform.trim()) {
                   clone.setAttribute('transform', combinedTransform.trim());
                }
                
                // Embed the actual geometric shape inside the wrapper
                clone.appendChild(target.cloneNode(true));
             }
          }
        }
        
        // Fallback: if not a <use> (e.g. native <path>) or missing href target, clone normally
        if (!clone) {
           clone = el.cloneNode(true) as Element;
        }

        // Remove IDs to prevent duplicates in the DOM
        clone.removeAttribute('id');
        // If the clone contains children (e.g. unrolled <g>), remove their IDs too
        clone.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
        
        // Apply glow styles universally
        const glowColor = 'rgba(168, 85, 247, 0.6)';
        const glowStroke = 'rgba(168, 85, 247, 0.8)';
        
        clone.setAttribute('fill', glowColor);
        clone.setAttribute('filter', 'url(#noteGlow)');
        clone.setAttribute('style', 'pointer-events: none; transition: opacity 0.08s ease-out;');
        clone.setAttribute('class', 'Note-Highlight');
        
        // Handle elements that might be using stroke instead of fill
        if (clone.hasAttribute('stroke') && clone.getAttribute('stroke') !== 'none') {
            clone.setAttribute('stroke', glowStroke);
        }
        
        // Force highlight color on all internal paths of unrolled targets
        clone.querySelectorAll('*').forEach(child => {
            if (child.hasAttribute('fill') && child.getAttribute('fill') !== 'none') {
                child.setAttribute('fill', glowColor);
            }
            if (child.hasAttribute('stroke') && child.getAttribute('stroke') !== 'none') {
                child.setAttribute('stroke', glowStroke);
            }
        });

        notes.push({
          x,
          y,
          page: pageIndex,
          svgContent: clone.outerHTML
        });
      }
    });
  } catch (err) {
    console.warn(`[svgNoteExtractor] Failed to parse SVG for page ${pageIndex}:`, err);
  }

  // Sort notes left-to-right, top-to-bottom for consistent ordering
  notes.sort((a, b) => {
    // Group by staff line (Y within ~40 SVG units = same staff)
    const yBand = Math.round(a.y / 40) - Math.round(b.y / 40);
    if (yBand !== 0) return yBand;
    return a.x - b.x;
  });

  return notes;
}

/**
 * Calculates a loose bounding box by interpreting all numbers in the 'd' string
 * as sequence of (x, y) pairs. This is very accurate for Musescore paths because
 * they consist exclusively of absolute M, L, C commands.
 */
function getPathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const numberMatches = d.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!numberMatches || numberMatches.length < 2) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < numberMatches.length; i += 2) {
      if (i + 1 >= numberMatches.length) break;
      const vx = parseFloat(numberMatches[i]);
      const vy = parseFloat(numberMatches[i + 1]);
      if (vx < minX) minX = vx;
      if (vx > maxX) maxX = vx;
      if (vy < minY) minY = vy;
      if (vy > maxY) maxY = vy;
  }
  
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Parse (tx, ty) from a CSS/SVG transform string.
 * Supports: matrix(a,b,c,d,tx,ty) and translate(tx,ty)
 */
function parseTransformCoords(transform: string): { x: number; y: number } | null {
  // matrix(a,b,c,d,tx,ty)
  const matrixMatch = transform.match(
    /matrix\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,)]+)\)/
  );
  if (matrixMatch) {
    return {
      x: parseFloat(matrixMatch[5]),
      y: parseFloat(matrixMatch[6]),
    };
  }

  // translate(tx, ty)
  const translateMatch = transform.match(
    /translate\(\s*([^,]+),\s*([^,)]+)\)/
  );
  if (translateMatch) {
    return {
      x: parseFloat(translateMatch[1]),
      y: parseFloat(translateMatch[2]),
    };
  }

  return null;
}

/**
 * Map note positions to measure bounding boxes.
 * 
 * Given the extracted note coordinates and measure bounding boxes from
 * measurePositions(), assigns each note to the measure whose X range contains it.
 */
export function mapNotesToMeasures(
  notes: NoteCoord[],
  measures: Array<{ measureIdx: number; page: number; x: number; sx: number; y: number; sy: number }>
): MeasureNotes[] {
  const result: MeasureNotes[] = [];
  const measureMap = new Map<number, NoteCoord[]>();

  for (const note of notes) {
    // Find the measure that contains this note's X position
    let bestMeasure = -1;
    let bestDist = Infinity;

    for (const m of measures) {
      if (m.page !== note.page) continue;

      // Check if note Y is within the measure's vertical range (with generous padding)
      const yInRange = note.y >= m.y - 30 && note.y <= m.y + m.sy + 30;
      if (!yInRange) continue;

      // Check if note X is within the measure's horizontal range
      if (note.x >= m.x - 5 && note.x <= m.x + m.sx + 5) {
        const dist = Math.abs(note.x - (m.x + m.sx / 2));
        if (dist < bestDist) {
          bestDist = dist;
          bestMeasure = m.measureIdx;
        }
      }
    }

    if (bestMeasure >= 0) {
      if (!measureMap.has(bestMeasure)) {
        measureMap.set(bestMeasure, []);
      }
      measureMap.get(bestMeasure)!.push(note);
    }
  }

  // Build result sorted by measure index
  for (const [measureIdx, noteList] of measureMap.entries()) {
    // Sort notes within each measure by X position
    noteList.sort((a, b) => a.x - b.x);
    result.push({ measureIdx, notes: noteList });
  }

  result.sort((a, b) => a.measureIdx - b.measureIdx);
  return result;
}

/**
 * Group notes that occur at the same X position (within tolerance) as chords.
 * Returns groups where each group is notes at the same beat position.
 */
export function groupNotesByBeat(notes: NoteCoord[], toleranceX: number = 8): NoteCoord[][] {
  if (notes.length === 0) return [];

  const groups: NoteCoord[][] = [];
  let currentGroup: NoteCoord[] = [notes[0]];

  for (let i = 1; i < notes.length; i++) {
    if (Math.abs(notes[i].x - currentGroup[0].x) <= toleranceX) {
      // Same beat position (chord)
      currentGroup.push(notes[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [notes[i]];
    }
  }
  groups.push(currentGroup);

  return groups;
}
