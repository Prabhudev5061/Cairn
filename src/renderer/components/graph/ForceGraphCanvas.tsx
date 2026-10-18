import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph, { type LinkObject } from 'force-graph';
import type { GraphData, GraphNode } from '@shared/linking/types';
import { assignNodeColors, getLinkId } from '@shared/linking/graph';

export interface ForceGraphCanvasProps {
  data: GraphData;
  activeNodeId?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  showLabels?: boolean;
  nodeSizeMultiplier?: number;
  linkDistance?: number;
  isLocal?: boolean;
  testId?: string;
}

interface TooltipState {
  node: GraphNode;
  x: number;
  y: number;
}

interface LabelBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type ForceGraphInstance = ForceGraph<GraphNode>;

export function ForceGraphCanvas({
  data,
  activeNodeId = null,
  onNodeClick,
  showLabels = true,
  nodeSizeMultiplier = 1.0,
  linkDistance = 45,
  isLocal = false,
  testId = 'graph-canvas'
}: ForceGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphInstanceRef = useRef<ForceGraphInstance | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const lastHoveredIdRef = useRef<string | null>(null);

  // Compute node color mapping
  const nodeColors = useMemo(() => assignNodeColors(data.nodes), [data.nodes]);

  // Pre-compute adjacency map once when links change, enabling instant O(1) hover lookups
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const node of data.nodes) {
      map.set(node.id, new Set());
    }
    for (const link of data.links) {
      const s = getLinkId(link.source);
      const t = getLinkId(link.target);
      map.get(s)?.add(t);
      map.get(t)?.add(s);
    }
    return map;
  }, [data.nodes, data.links]);

  // Instant O(1) neighbor set for hovered node
  const neighborIds = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const neighbors = new Set(adjacencyMap.get(hoveredNode.id) || []);
    neighbors.add(hoveredNode.id);
    return neighbors;
  }, [hoveredNode, adjacencyMap]);

  // Keep references fresh for canvas render callbacks
  const stateRef = useRef({
    hoveredNode,
    neighborIds,
    activeNodeId,
    nodeColors,
    showLabels,
    nodeSizeMultiplier,
    isLocal
  });

  useEffect(() => {
    stateRef.current = {
      hoveredNode,
      neighborIds,
      activeNodeId,
      nodeColors,
      showLabels,
      nodeSizeMultiplier,
      isLocal
    };

    // When visual props update (such as node size slider or label toggle) after the physics
    // engine has settled, force-graph's autoPauseRedraw(true) prevents rendering until a pointer
    // event occurs. Calling zoom() with the current zoom level sets internal needsRedraw = true,
    // immediately triggering a smooth redraw on the next frame without moving the camera or reheating physics.
    if (graphInstanceRef.current) {
      const curZoom = graphInstanceRef.current.zoom();
      if (typeof curZoom === 'number') {
        graphInstanceRef.current.zoom(curZoom);
      }
    }
  }, [
    hoveredNode,
    neighborIds,
    activeNodeId,
    nodeColors,
    showLabels,
    nodeSizeMultiplier,
    isLocal
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const width = el.clientWidth || 400;
    const height = el.clientHeight || 300;

    // ForceGraph constructor invocation
    const fg = new ForceGraph<GraphNode>(el);
    graphInstanceRef.current = fg;

    // Bounding box collision tracker to prevent overlapping labels
    const frameLabelBoxes: LabelBox[] = [];
    fg.onRenderFramePre(() => {
      frameLabelBoxes.length = 0;
    });

    // Configure core physics and lifecycle
    fg.width(width)
      .height(height)
      .backgroundColor('#0e0f12')
      .nodeId('id')
      .linkSource('source')
      .linkTarget('target')
      .warmupTicks(30) // Pre-calculate 30 iterations so initial render is smooth and positioned
      .cooldownTicks(100) // Settle efficiently in 100 ticks
      .cooldownTime(2500)
      .d3AlphaDecay(0.03) // Smooth faster decay to 0% idle CPU
      .d3VelocityDecay(0.4)
      .autoPauseRedraw(true)
      .enableNodeDrag(true);

    // Optimized Node rendering with anti-collision text labels
    fg.nodeCanvasObject((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const {
        hoveredNode: curHover,
        neighborIds: curNeighbors,
        activeNodeId: curActive,
        nodeColors: curColors,
        showLabels: curShowLabels,
        nodeSizeMultiplier: curMult,
        isLocal: curIsLocal
      } = stateRef.current;

      const nid = node.id || '';
      const isHovered = curHover?.id === nid;
      const isActive = curActive === nid;
      const isNeighbor = curNeighbors.has(nid);
      const isDimmed = Boolean(curHover && !isHovered && !isNeighbor);

      // Square-root based smooth radius scaling: singletons ~2.2px, hubs ~6.5px max
      const degree = node.degree ?? node.val ?? 1;
      const baseRadius = 2.2 + Math.min(5.0, Math.sqrt(Math.max(0, degree - 1)) * 1.1);
      const radius = Math.max(1.8, baseRadius * curMult * (curIsLocal ? 0.9 : 1.0));
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;

      // Draw node circle (avoid ctx.save/restore in hot loop)
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, 2 * Math.PI, false);

      const color = curColors[nid] || '#8b5cf6';
      ctx.fillStyle = isHovered ? '#c4b5fd' : isActive ? '#a78bfa' : color;
      ctx.globalAlpha = isDimmed ? 0.15 : 1.0;
      ctx.fill();

      // Border ring / halo for active / hovered
      if (isHovered || isActive) {
        ctx.lineWidth = isActive ? 2 : 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        if (isActive) {
          ctx.beginPath();
          ctx.arc(nx, ny, radius + 2.5, 0, 2 * Math.PI, false);
          ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // Draw text label:
      // 1. Smaller, cleaner font size (7.2px - 10px).
      // 2. Truncate long titles unless hovered or active to keep label footprints compact.
      // 3. Collision detection: suppress labels that would collide with previously drawn labels.
      const shouldCheckLabel =
        isHovered ||
        isActive ||
        isNeighbor ||
        (curShowLabels && (curIsLocal ? globalScale >= 0.85 : globalScale >= 0.75));

      if (shouldCheckLabel) {
        const rawTitle = node.title || nid;
        const label =
          isHovered || isActive
            ? rawTitle
            : rawTitle.length > 15
              ? `${rawTitle.slice(0, 13)}…`
              : rawTitle;

        const fontSize = Math.max(7.2, Math.min(10.0, Math.round(8.8 / Math.max(0.5, globalScale))));
        const fontStr = `500 ${fontSize}px Inter, -apple-system, sans-serif`;
        if (ctx.font !== fontStr) {
          ctx.font = fontStr;
        }

        const textWidth = ctx.measureText(label).width;
        const box: LabelBox = {
          x1: nx - textWidth / 2 - 3,
          y1: ny + radius + 1,
          x2: nx + textWidth / 2 + 3,
          y2: ny + radius + fontSize + 2
        };

        const collides = frameLabelBoxes.some(
          (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
        );

        // Active and hovered nodes always draw. Other nodes only draw if non-colliding.
        if (isHovered || isActive || (!collides && curShowLabels)) {
          frameLabelBoxes.push(box);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isDimmed
            ? 'rgba(150, 155, 170, 0.2)'
            : isHovered || isActive
              ? '#ffffff'
              : 'rgba(200, 205, 218, 0.82)';
          ctx.fillText(label, nx, ny + radius + 2);
        }
      }
      ctx.globalAlpha = 1.0;
    });

    // Pointer area for hit testing (generous hit target for easy clicking)
    fg.nodePointerAreaPaint((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
      const { nodeSizeMultiplier: curMult, isLocal: curIsLocal } = stateRef.current;
      const degree = node.degree ?? node.val ?? 1;
      const baseRadius = 2.2 + Math.min(5.0, Math.sqrt(Math.max(0, degree - 1)) * 1.1);
      const radius = Math.max(1.8, baseRadius * curMult * (curIsLocal ? 0.9 : 1.0));
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(nx, ny, Math.max(6, radius + 3), 0, 2 * Math.PI, false);
      ctx.fill();
    });

    // Link styling - zero allocation O(1) checks per frame
    fg.linkColor((link: LinkObject) => {
      const { hoveredNode: curHover } = stateRef.current;
      if (curHover) {
        const hid = curHover.id;
        const s = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
        const t = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
        if (s === hid || t === hid) {
          return '#8b5cf6'; // Highlighted edge
        }
        return 'rgba(40, 44, 56, 0.15)'; // Dimmed edge
      }
      return 'rgba(100, 108, 128, 0.35)'; // Default edge
    });

    fg.linkWidth((link: LinkObject) => {
      const { hoveredNode: curHover } = stateRef.current;
      if (curHover) {
        const hid = curHover.id;
        const s = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
        const t = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
        if (s === hid || t === hid) {
          return 1.8;
        }
      }
      return 0.8;
    });

    // Interaction callbacks
    fg.onNodeClick((node: GraphNode) => {
      if (node && onNodeClick) {
        onNodeClick(node);
      }
    });

    // Hover handler throttled by node ID changes
    fg.onNodeHover((node: GraphNode | null) => {
      const newId = node?.id || null;
      if (newId === lastHoveredIdRef.current) return;
      lastHoveredIdRef.current = newId;

      if (node && typeof node.x === 'number' && typeof node.y === 'number') {
        stateRef.current.hoveredNode = node;
        setHoveredNode(node);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const coords = fg.graph2ScreenCoords(node.x, node.y);
          setTooltip({
            node: node as GraphNode,
            x: Math.min(rect.width - 200, Math.max(10, coords.x + 12)),
            y: Math.min(rect.height - 120, Math.max(10, coords.y - 12))
          });
        }
      } else {
        stateRef.current.hoveredNode = null;
        setHoveredNode(null);
        setTooltip(null);
      }
    });

    // Window focus/blur listeners to halt simulation loop when window unfocused
    const handleBlur = () => {
      graphInstanceRef.current?.pauseAnimation();
    };
    const handleFocus = () => {
      graphInstanceRef.current?.resumeAnimation();
    };
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Resize observer to ensure responsive canvas
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && graphInstanceRef.current) {
          graphInstanceRef.current.width(w).height(h);
        }
      }
    });
    resizeObserver.observe(el);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      resizeObserver.disconnect();
      if (graphInstanceRef.current) {
        graphInstanceRef.current._destructor?.();
        graphInstanceRef.current = null;
      }
    };
  }, [onNodeClick]);

  // Update graph data whenever data changes
  useEffect(() => {
    if (!graphInstanceRef.current) return;
    const fg = graphInstanceRef.current;

    // Clone nodes and links to keep immutability safe from force-graph mutations
    const clonedNodes = data.nodes.map((n) => ({ ...n }));
    if (activeNodeId) {
      clonedNodes.sort((a, b) => (a.id === activeNodeId ? -1 : b.id === activeNodeId ? 1 : 0));
    }
    const clonedLinks = data.links.map((l) => ({
      source: getLinkId(l.source),
      target: getLinkId(l.target)
    }));

    fg.graphData({ nodes: clonedNodes, links: clonedLinks });

    // Configure link distance force
    const linkForce = fg.d3Force('link') as unknown as { distance?: (d: number) => void } | undefined;
    if (linkForce && typeof linkForce.distance === 'function') {
      linkForce.distance(isLocal ? Math.min(35, linkDistance * 0.8) : linkDistance);
    }

    const chargeForce = fg.d3Force('charge') as unknown as { strength?: (s: number) => void } | undefined;
    if (chargeForce && typeof chargeForce.strength === 'function') {
      chargeForce.strength(isLocal ? -70 : -120);
    }

    fg.d3ReheatSimulation();

    // Auto-fit after slight delay so positions settle
    const timer = setTimeout(() => {
      if (graphInstanceRef.current) {
        graphInstanceRef.current.zoomToFit(350, isLocal ? 30 : 45);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [data, activeNodeId, linkDistance, isLocal]);

  // Public zoom control handlers
  const handleZoomIn = () => {
    if (!graphInstanceRef.current) return;
    const currentZoom = graphInstanceRef.current.zoom();
    graphInstanceRef.current.zoom(currentZoom * 1.35, 300);
  };

  const handleZoomOut = () => {
    if (!graphInstanceRef.current) return;
    const currentZoom = graphInstanceRef.current.zoom();
    graphInstanceRef.current.zoom(currentZoom / 1.35, 300);
  };

  const handleFit = () => {
    if (!graphInstanceRef.current) return;
    graphInstanceRef.current.zoomToFit(400, isLocal ? 35 : 50);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)',
        userSelect: 'none'
      }}
      data-testid={testId}
    >
      {/* 2D Canvas Target */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Canvas Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          zIndex: 10
        }}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
          data-testid="graph-zoom-in"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          data-testid="graph-zoom-out"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          -
        </button>
        <button
          onClick={handleFit}
          title="Reset Zoom / Fit"
          aria-label="Reset Zoom"
          data-testid="graph-zoom-fit"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '10px',
            fontWeight: 500
          }}
        >
          Fit
        </button>
      </div>

      {/* Floating Node Hover Tooltip */}
      {tooltip && (
        <div
          data-testid="graph-node-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            pointerEvents: 'none',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
            zIndex: 20,
            maxWidth: '240px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {tooltip.node.title}
            </div>
            {tooltip.node.format && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '1px 4px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-hover)',
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  flexShrink: 0
                }}
              >
                {tooltip.node.format === 'asciidoc' ? 'ADOC' : tooltip.node.format.toUpperCase()}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {tooltip.node.path}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {tooltip.node.degree} {tooltip.node.degree === 1 ? 'connection' : 'connections'}
          </div>
          {tooltip.node.tags && tooltip.node.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {tooltip.node.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
