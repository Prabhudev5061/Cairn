import { EditorSelection } from '@codemirror/state';

/**
 * Checks whether any range in the editor selection overlaps with [from, to].
 * Boundaries are inclusive so that moving the cursor onto the mark immediately reveals it.
 */
export function selectionOverlaps(
  selection: EditorSelection,
  from: number,
  to: number
): boolean {
  for (const range of selection.ranges) {
    if (range.to >= from && range.from <= to) {
      return true;
    }
  }
  return false;
}
