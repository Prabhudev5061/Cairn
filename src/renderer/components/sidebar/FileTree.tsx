import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useVaultStore } from '../../stores/vaultStore';
import { VaultTreeNode } from '@shared/ipc';
import { getFormatPlugin, stripNoteExtension } from '@shared/formats/registry';

interface TreeNodeItemProps {
  node: VaultTreeNode;
  level: number;
  onSelect: (path: string) => void;
  onRename: (node: VaultTreeNode) => void;
  onDelete: (node: VaultTreeNode) => void;
  activePath: string | null;
}

function IndentGuides({ level }: { level: number }) {
  if (level <= 0) return null;
  const guides: React.ReactNode[] = [];
  for (let i = 0; i < level; i++) {
    guides.push(
      <span
        key={i}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${8 + i * 14 + 6}px`,
          width: '1px',
          backgroundColor: 'var(--border-subtle)',
          pointerEvents: 'none'
        }}
      />
    );
  }
  return <>{guides}</>;
}

function TreeNodeItem({
  node,
  level,
  onSelect,
  onRename,
  onDelete,
  activePath
}: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const isSelected = activePath === node.path;

  if (node.isDirectory) {
    return (
      <div style={{ minWidth: 0, width: '100%' }}>
        <div
          role="treeitem"
          aria-expanded={isExpanded}
          tabIndex={0}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            } else if (e.key === 'ArrowRight' && !isExpanded) {
              setIsExpanded(true);
            } else if (e.key === 'ArrowLeft' && isExpanded) {
              setIsExpanded(false);
            }
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: `4px 8px 4px ${8 + level * 14}px`,
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            userSelect: 'none',
            fontSize: '13px',
            backgroundColor: isHovered ? 'var(--bg-hover)' : 'transparent',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <IndentGuides level={level} />
          <span style={{ marginRight: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span
            style={{
              marginRight: '6px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              flexShrink: 0
            }}
          >
            {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>
          <span
            title={node.name}
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {node.name}
          </span>
        </div>
        {isExpanded && node.children && (
          <div style={{ minWidth: 0, width: '100%' }}>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                level={level + 1}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                activePath={activePath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File item
  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      tabIndex={0}
      data-testid={`file-tree-item-${node.name}`}
      onClick={() => onSelect(node.path)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSelect(node.path);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: `4px 8px 4px ${8 + level * 14 + 18}px`,
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
        backgroundColor: isSelected
          ? 'var(--accent-subtle)'
          : isHovered
            ? 'var(--bg-hover)'
            : 'transparent',
        borderLeft: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
        userSelect: 'none',
        fontSize: '13px',
        minWidth: 0,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <IndentGuides level={level} />
      <span
        style={{
          marginRight: '6px',
          display: 'flex',
          alignItems: 'center',
          color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
          flexShrink: 0
        }}
      >
        <FileText size={14} />
      </span>
      <span
        title={stripNoteExtension(node.name)}
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {stripNoteExtension(node.name)}
      </span>
      {(() => {
        const plugin = getFormatPlugin(node.name);
        if (plugin.id === 'markdown') return null;
        return (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              padding: '1px 4px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-hover)',
              color: isSelected ? 'var(--bg-app)' : 'var(--accent-primary)',
              marginLeft: '6px',
              flexShrink: 0,
              lineHeight: '12px',
              textTransform: 'uppercase'
            }}
          >
            {plugin.badgeLabel}
          </span>
        );
      })()}
      {isHovered && (
        <span
          style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '4px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            title="Rename note"
            aria-label={`Rename ${node.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onRename(node);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Edit2 size={12} />
          </button>
          <button
            title="Delete note"
            aria-label={`Delete ${node.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Trash2 size={12} />
          </button>
        </span>
      )}
    </div>
  );
}

export function FileTree() {
  const tree = useVaultStore((s) => s.tree);
  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const openNote = useVaultStore((s) => s.openNote);
  const createNote = useVaultStore((s) => s.createNote);
  const renameNote = useVaultStore((s) => s.renameNote);
  const deleteNote = useVaultStore((s) => s.deleteNote);
  const refreshTree = useVaultStore((s) => s.refreshTree);
  const setVaultSwitcherOpen = useVaultStore((s) => s.setVaultSwitcherOpen);

  const [isCreating, setIsCreating] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');
  const [renamingNode, setRenamingNode] = useState<VaultTreeNode | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNoteName.trim();
    if (trimmed) {
      await createNote(trimmed);
      setNewNoteName('');
      setIsCreating(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingNode) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingNode.name) {
      const parts = renamingNode.path.split('/');
      parts.pop();
      const parentDir = parts.join('/');
      const newPath = parentDir ? `${parentDir}/${trimmed}` : trimmed;
      await renameNote(renamingNode.path, newPath);
    }
    setRenamingNode(null);
    setRenameValue('');
  };

  const handleDelete = async (node: VaultTreeNode) => {
    const confirmed = window.confirm(`Move "${node.name}" to trash?`);
    if (confirmed) {
      await deleteNote(node.path);
    }
  };

  return (
    <nav
      aria-label="Files"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minWidth: 0,
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)'
          }}
        >
          Files
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            title="Switch Vault (Mod+Shift+O)"
            aria-label="Switch Vault"
            data-testid="filetree-switch-vault"
            onClick={() => setVaultSwitcherOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Folder size={14} />
          </button>
          <button
            title="New Note (Mod+N)"
            aria-label="New Note"
            data-testid="new-note-button"
            onClick={() => {
              setIsCreating(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Plus size={16} />
          </button>
          <button
            title="Refresh Tree"
            aria-label="Refresh Tree"
            onClick={() => void refreshTree()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* New Note Input Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <input
            autoFocus
            type="text"
            data-testid="new-note-input"
            value={newNoteName}
            placeholder="Note name..."
            onChange={(e) => setNewNoteName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsCreating(false);
                setNewNoteName('');
              }
            }}
            style={{
              width: '100%',
              padding: '4px 8px',
              backgroundColor: 'var(--bg-raised)',
              border: '1px solid var(--border-focus)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          />
        </form>
      )}

      {/* Rename Input Modal / Form */}
      {renamingNode && (
        <form
          onSubmit={handleRenameSubmit}
          style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <input
            autoFocus
            type="text"
            data-testid="rename-note-input"
            value={renameValue}
            placeholder="New name..."
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setRenamingNode(null);
                setRenameValue('');
              }
            }}
            style={{
              width: '100%',
              padding: '4px 8px',
              backgroundColor: 'var(--bg-raised)',
              border: '1px solid var(--border-focus)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          />
        </form>
      )}

      {/* Tree Content */}
      <div
        role="tree"
        tabIndex={0}
        data-testid="file-tree-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minWidth: 0,
          padding: '6px 4px'
        }}
      >
        {tree && tree.children && tree.children.length > 0 ? (
          tree.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              level={0}
              onSelect={(path) => void openNote(path)}
              onRename={(node) => {
                setRenamingNode(node);
                setRenameValue(node.name);
              }}
              onDelete={(node) => void handleDelete(node)}
              activePath={activeNotePath}
            />
          ))
        ) : (
          <div
            style={{
              padding: '16px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              textAlign: 'center'
            }}
          >
            No markdown notes in vault
          </div>
        )}
      </div>
    </nav>
  );
}
