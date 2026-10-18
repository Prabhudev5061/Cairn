import React, { useCallback, useEffect, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { expandTemplate, NoteTemplate, STARTER_TEMPLATES } from '../../../shared/templates/expander';
import { useLayoutStore } from '../../stores/layoutStore';
import { useVaultStore } from '../../stores/vaultStore';

interface TemplatePickerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function TemplatePickerDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const activeNoteContent = useVaultStore((s) => s.activeNoteContent);
  const writeNote = useVaultStore((s) => s.saveActiveNote);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = useCallback(
    async (tmpl: NoteTemplate) => {
      onClose();
      if (!activeNotePath) return;

      const baseTitle = activeNotePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Untitled';
      const expanded = expandTemplate(tmpl.content, {
        title: baseTitle,
        now: new Date()
      });

      // If active note is empty, replace; otherwise append with blank line
      const newContent = activeNoteContent.trim()
        ? `${activeNoteContent}\n\n${expanded}`
        : expanded;

      useVaultStore.setState({ activeNoteContent: newContent, isDirty: true });
      await writeNote();
    },
    [activeNoteContent, activeNotePath, onClose, writeNote]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % STARTER_TEMPLATES.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + STARTER_TEMPLATES.length) % STARTER_TEMPLATES.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = STARTER_TEMPLATES[selectedIndex];
        if (selected) {
          void handleSelect(selected);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelect, onClose, selectedIndex]);

  return (
    <div
      data-testid="template-picker-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Insert Note Template"
        style={{
          width: '480px',
          maxWidth: '92vw',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-raised)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-primary)" />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Insert Note Template
            </h2>
          </div>
          <button
            onClick={onClose}
            data-testid="template-picker-close-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Template List */}
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {STARTER_TEMPLATES.map((tmpl, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={tmpl.id}
                data-testid="template-picker-item"
                data-selected={isSelected}
                onClick={() => handleSelect(tmpl)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--border-focus)' : '1px solid transparent',
                  transition: 'background-color 0.1s ease'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {tmpl.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {tmpl.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>↵</kbd> to insert</span>
          <span><kbd>esc</kbd> to cancel</span>
        </div>
      </div>
    </div>
  );
}

export function TemplatePickerModal(props: TemplatePickerModalProps = {}): React.JSX.Element | null {
  const storeIsOpen = useLayoutStore((s) => s.isTemplatePickerOpen);
  const storeClose = useLayoutStore((s) => s.closeTemplatePicker);
  const isOpen = props.isOpen !== undefined ? props.isOpen : storeIsOpen;
  const onClose = props.onClose || storeClose;

  if (!isOpen) return null;
  return <TemplatePickerDialog onClose={onClose} />;
}
