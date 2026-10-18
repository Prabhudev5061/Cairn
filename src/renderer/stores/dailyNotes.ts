import { createNoteFile, writeNoteFile } from '../ipc';
import { expandTemplate, STARTER_TEMPLATES } from '../../shared/templates/expander';
import { useVaultStore } from './vaultStore';

export function formatDailyNoteName(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}.md`;
}

export function parseDailyNoteDate(filename: string): Date | null {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/i);
  if (!match) return null;
  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10) - 1;
  const day = parseInt(match[3]!, 10);
  return new Date(year, month, day);
}

/**
 * Opens today's daily note, creating it with the Daily Note template if it doesn't exist yet.
 */
export async function openOrCreateDailyNote(targetDate = new Date()): Promise<void> {
  const filename = formatDailyNoteName(targetDate);
  const openNote = useVaultStore.getState().openNote;
  const tree = useVaultStore.getState().tree;

  // Check if file exists in tree
  const exists = Boolean(
    tree?.children?.some((child) => !child.isDirectory && child.name.toLowerCase() === filename.toLowerCase())
  );

  if (exists) {
    await openNote(filename);
    return;
  }

  // Create new daily note with starter template
  const createRes = await createNoteFile(filename);
  if (createRes.ok) {
    const dailyTmpl = STARTER_TEMPLATES.find((t) => t.id === 'daily-note');
    const content = dailyTmpl
      ? expandTemplate(dailyTmpl.content, {
          title: 'Daily Note',
          now: targetDate
        })
      : `# ${formatDailyNoteName(targetDate).replace('.md', '')}\n\n## Notes\n- \n`;

    await writeNoteFile(filename, content);
    await openNote(filename);
  }
}

/**
 * Navigates to the previous daily note relative to the currently active note (or today).
 */
export async function openPreviousDailyNote(): Promise<void> {
  const activePath = useVaultStore.getState().activeNotePath;
  const baseDate = activePath ? parseDailyNoteDate(activePath) || new Date() : new Date();
  const prevDate = new Date(baseDate);
  prevDate.setDate(prevDate.getDate() - 1);
  await openOrCreateDailyNote(prevDate);
}

/**
 * Navigates to the next daily note relative to the currently active note (or today).
 */
export async function openNextDailyNote(): Promise<void> {
  const activePath = useVaultStore.getState().activeNotePath;
  const baseDate = activePath ? parseDailyNoteDate(activePath) || new Date() : new Date();
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + 1);
  await openOrCreateDailyNote(nextDate);
}
