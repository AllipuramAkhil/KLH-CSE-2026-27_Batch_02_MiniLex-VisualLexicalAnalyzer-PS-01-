import { useEffect, useMemo, useRef, useState } from "react";
import { Automaton } from "../types";

type Props = { automaton: Automaton; currentState?: number };

export default function AutomataGraph({ automaton, currentState }: Props) {
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const defaultPositions = useMemo(() => {
    const gap = 150;
    const middle = 115;
    return new Map(automaton.states.map((state, index) => [state, { x: 82 + index * gap, y: middle }]));
  }, [automaton.states]);
  const [positions, setPositions] = useState(defaultPositions);
  const draggingState = useRef<number | null>(null);
  useEffect(() => setPositions(defaultPositions), [defaultPositions]);
  const width = Math.max(260, 164 + Math.max(0, automaton.states.length - 1) * 150);
  const accepting = new Set(automaton.accept_states);

  if (!automaton.states.length) {
    return <div className="graph-empty">Generate an automaton to inspect its states and transitions.</div>;
  }

  return (
    <div className="graph-frame">
      <div className="graph-tools">
        <button className="icon-button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.55, value - 0.1))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button className="icon-button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.7, value + 0.1))}>+</button>
        <button className="icon-button" aria-label="Reset zoom" onClick={() => setZoom(1)}>Reset</button>
      </div>
      <div className="graph-scroll">
        <svg
          width={width * zoom}
          height={230 * zoom}
          viewBox={`0 0 ${width} 230`}
          role="img"
          aria-label="Finite automaton graph"
          onPointerMove={(event) => {
            const state = draggingState.current;
            if (state === null) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setPositions((previous) => new Map(previous).set(state, {
              x: (event.clientX - bounds.left) / zoom,
              y: (event.clientY - bounds.top) / zoom,
            }));
          }}
          onPointerUp={() => { draggingState.current = null; }}
          onPointerCancel={() => { draggingState.current = null; }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#75849e" />
            </marker>
          </defs>
          {automaton.transitions.map((edge, index) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;
            const self = edge.from === edge.to;
            const path = self
              ? `M ${from.x - 12} ${from.y - 26} C ${from.x - 48} ${from.y - 76}, ${from.x + 48} ${from.y - 76}, ${from.x + 12} ${from.y - 26}`
              : `M ${from.x + (edge.from < edge.to ? 26 : -26)} ${from.y} L ${to.x + (edge.from < edge.to ? -29 : 29)} ${to.y}`;
            const labelX = self ? from.x : (from.x + to.x) / 2;
            const labelY = self ? from.y - 64 : from.y - 12 - (edge.from > edge.to ? 16 : 0);
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <path d={path} fill="none" stroke="#75849e" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <text x={labelX} y={labelY} textAnchor="middle" className="edge-label">{edge.label}</text>
              </g>
            );
          })}
          <path d={`M 12 115 L 47 115`} stroke="#75849e" strokeWidth="1.5" markerEnd="url(#arrow)" />
          {automaton.states.map((state) => {
            const point = positions.get(state)!;
            const active = state === currentState;
            const chosen = state === selected;
            return (
              <g
                key={state}
                onClick={() => setSelected(chosen ? null : state)}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  draggingState.current = state;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerUp={() => { draggingState.current = null; }}
                className="state-node"
              >
                <circle cx={point.x} cy={point.y} r="25" fill={active ? "#173c3d" : chosen ? "#282653" : "#101a2b"} stroke={active ? "#54d3b2" : chosen ? "#a99bff" : "#40516d"} strokeWidth="2" />
                {accepting.has(state) && <circle cx={point.x} cy={point.y} r="20" fill="none" stroke={active ? "#54d3b2" : "#7184a4"} strokeWidth="1" />}
                <text x={point.x} y={point.y + 4} textAnchor="middle" className="node-label">q{state}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="graph-legend"><span><i className="legend-start" /> Start</span><span><i className="legend-accept" /> Accepting</span><span><i className="legend-active" /> Active in simulation</span></div>
    </div>
  );
}
