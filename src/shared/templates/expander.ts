export interface TemplateContext {
  title?: string;
  now?: Date;
  vars?: Record<string, string>;
}

function formatDate(date: Date, offsetDays = 0): string {
  const d = new Date(date);
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Expands placeholders inside a template string:
 * - {{title}} -> context.title (default: 'Untitled')
 * - {{date}} -> YYYY-MM-DD
 * - {{date:FORMAT}} -> custom format (YYYY, MM, DD)
 * - {{time}} -> HH:mm
 * - {{datetime}} -> YYYY-MM-DD HH:mm
 * - {{yesterday}} -> yesterday's date
 * - {{tomorrow}} -> tomorrow's date
 * - {{var}} -> custom vars from context.vars
 */
export function expandTemplate(template: string, context: TemplateContext): string {
  const now = context.now || new Date();
  const dateStr = formatDate(now, 0);
  const timeStr = formatTime(now);
  const datetimeStr = `${dateStr} ${timeStr}`;
  const yesterdayStr = formatDate(now, -1);
  const tomorrowStr = formatDate(now, 1);

  let result = template
    .replace(/\{\{\s*title\s*\}\}/gi, context.title ?? 'Untitled')
    .replace(/\{\{\s*date\s*\}\}/gi, dateStr)
    .replace(/\{\{\s*time\s*\}\}/gi, timeStr)
    .replace(/\{\{\s*datetime\s*\}\}/gi, datetimeStr)
    .replace(/\{\{\s*yesterday\s*\}\}/gi, yesterdayStr)
    .replace(/\{\{\s*tomorrow\s*\}\}/gi, tomorrowStr);

  // Custom date formatting: {{date:FORMAT}}
  result = result.replace(/\{\{\s*date:([^}]+)\s*\}\}/gi, (_match, fmt) => {
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return fmt
      .replace(/YYYY/g, yyyy)
      .replace(/MM/g, mm)
      .replace(/DD/g, dd);
  });

  // Custom variables from context.vars
  if (context.vars) {
    for (const [key, val] of Object.entries(context.vars)) {
      const reg = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(reg, val);
    }
  }

  return result;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

export const STARTER_TEMPLATES: NoteTemplate[] = [
  {
    id: 'daily-note',
    name: 'Daily Note',
    description: 'Structure for daily task planning, notes, and reflections',
    content: `# {{date}} - {{title}}

## Priorities
- [ ] 
- [ ] 

## Notes & Thoughts
- 

## Completed
- [x] Started daily note
`
  },
  {
    id: 'meeting-note',
    name: 'Meeting Note',
    description: 'Template for team syncs, agenda items, and action items',
    content: `# Meeting: {{title}}
**Date**: {{date}} {{time}}
**Attendees**: 

## Agenda
1. 

## Discussion Notes
- 

## Action Items
- [ ] Action item 1
`
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Comprehensive project outline with goals, milestones, and deliverables',
    content: `# Project: {{title}}
Created: {{date}}

## Objectives
- 

## Milestones
- [ ] Milestone 1 (Target: {{date}})
- [ ] Milestone 2

## Resources & Links
- 
`
  }
];
