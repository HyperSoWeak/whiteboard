import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Whiteboard.css';

interface Point {
  x: number;
  y: number;
}

// TODO: Re-implement and fix the Text Tool functionality.
type Tool = 'select' | 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line';

interface Element {
  id: string;
  type: Tool;
  points?: Point[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  lineWidth: number;
}

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [history, setHistory] = useState<Element[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(5);
  
  const [action, setAction] = useState<'none' | 'drawing' | 'moving'>('none');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentElement, setCurrentElement] = useState<Element | null>(null);
  const [startOffset, setStartOffset] = useState<Point>({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  // --- History Management ---

  const saveToHistory = useCallback((newElements: Element[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setElements(history[prevIndex]);
      setSelectedId(null);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setElements([]);
      setSelectedId(null);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements(history[nextIndex]);
    }
  }, [history, historyIndex]);

  // --- Shortcuts ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
        e.preventDefault();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
      } else if (!isCtrl) {
        switch (e.key.toLowerCase()) {
          case 'q': setTool('select'); break;
          case 'w': setTool('pen'); break;
          case 'e': setTool('eraser'); break;
          case 'a': setTool('rectangle'); break;
          case 's': setTool('circle'); break;
          case 'd': setTool('line'); break;
          case 'backspace':
          case 'delete':
            if (selectedId) {
              const newElements = elements.filter(el => el.id !== selectedId);
              setElements(newElements);
              saveToHistory(newElements);
              setSelectedId(null);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedId, elements, saveToHistory]);

  // --- Core Rendering ---

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: Element) => {
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'pen':
      case 'eraser':
        if (element.points && element.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          element.points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.strokeStyle = element.type === 'eraser' ? '#ffffff' : element.color;
          ctx.stroke();
        }
        break;
      case 'rectangle':
        ctx.beginPath();
        ctx.strokeRect(element.x, element.y, element.width || 0, element.height || 0);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.radius || 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(element.x, element.y);
        ctx.lineTo(element.x + (element.width || 0), element.y + (element.height || 0));
        ctx.stroke();
        break;
    }

    if (selectedId === element.id && tool === 'select') {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1;
      const w = element.width || (element.radius ? element.radius * 2 : 20);
      const h = element.height || (element.radius ? element.radius * 2 : 20);
      ctx.strokeRect(element.x - 5, element.y - 5, Math.abs(w) + 10, Math.abs(h) + 10);
      ctx.setLineDash([]);
    }
  }, [selectedId, tool]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    elements.forEach(el => drawElement(ctx, el));
    if (currentElement) drawElement(ctx, currentElement);
  }, [elements, currentElement, drawElement]);

  useEffect(() => { render(); }, [render]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      render();
    }
  }, [render]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // --- Interaction ---

  const getCoordinates = (e: any): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const isWithinElement = (x: number, y: number, el: Element) => {
    const w = Math.abs(el.width || 20);
    const h = Math.abs(el.height || 20);
    const minX = Math.min(el.x, el.x + (el.width || 0));
    const minY = Math.min(el.y, el.y + (el.height || 0));
    
    if (el.type === 'circle') {
      return Math.sqrt(Math.pow(x - el.x, 2) + Math.pow(y - el.y, 2)) <= (el.radius || 0) + 10;
    }
    if (el.type === 'pen' || el.type === 'eraser') {
      return el.points?.some(p => Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2)) < 15);
    }
    return x >= minX - 10 && x <= minX + w + 10 && y >= minY - 10 && y <= minY + h + 10;
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);

    if (tool === 'select') {
      const el = [...elements].reverse().find(el => isWithinElement(x, y, el));
      if (el) {
        setSelectedId(el.id);
        setStartOffset({ x: x - el.x, y: y - el.y });
        setAction('moving');
      } else {
        setSelectedId(null);
        setAction('none');
      }
      return;
    }

    const id = Date.now().toString();
    const newEl: Element = {
      id, type: tool, x, y, color, lineWidth,
      points: [{ x, y }]
    };

    setCurrentElement(newEl);
    setAction('drawing');
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    setCursorPos(coords);

    if (action === 'drawing' && currentElement) {
      const { x, y } = coords;
      const updated = { ...currentElement };
      if (['pen', 'eraser'].includes(tool)) {
        updated.points = [...(updated.points || []), { x, y }];
      } else if (tool === 'rectangle' || tool === 'line') {
        updated.width = x - updated.x;
        updated.height = y - updated.y;
      } else if (tool === 'circle') {
        updated.radius = Math.sqrt(Math.pow(x - updated.x, 2) + Math.pow(y - updated.y, 2));
      }
      setCurrentElement(updated);
    } else if (action === 'moving' && selectedId) {
      setElements(elements.map(el => {
        if (el.id === selectedId) {
          const dx = coords.x - startOffset.x - el.x;
          const dy = coords.y - startOffset.y - el.y;
          return {
            ...el,
            x: coords.x - startOffset.x,
            y: coords.y - startOffset.y,
            points: el.points?.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return el;
      }));
    }
  };

  const handleMouseUp = () => {
    if (action === 'drawing' && currentElement) {
      const newElements = [...elements, currentElement];
      setElements(newElements);
      saveToHistory(newElements);
      setCurrentElement(null);
    } else if (action === 'moving') {
      saveToHistory(elements);
    }
    setAction('none');
  };

  const clearCanvas = () => {
    setElements([]);
    saveToHistory([]);
    setSelectedId(null);
  };

  return (
    <div className="whiteboard-container" ref={containerRef}>
      <div className="floating-toolbar">
        <div className="tool-section">
          <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} title="Select (Q)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><path d="M5 3l14 9-7 2 7 7-3 1-6-7-5 5V3z"/></svg>
          </button>
          <button className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')} title="Pen (W)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-1.5M2 22l5-5M2 22v-5l5 5zM11 7l4-4 2 2-4 4-2-2z"/></svg>
          </button>
          <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')} title="Eraser (E)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><path d="M20 20H7L3 16C2 15 2 14 3 13L13 3C14 2 15 2 16 3L21 8C22 9 22 10 21 11L15 17L20 20Z"/><path d="M18 11L11 4"/></svg>
          </button>
        </div>
        <div className="divider" />
        <div className="tool-section">
          <button className={tool === 'rectangle' ? 'active' : ''} onClick={() => setTool('rectangle')} title="Rectangle (A)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
          <button className={tool === 'circle' ? 'active' : ''} onClick={() => setTool('circle')} title="Circle (S)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/></svg>
          </button>
          <button className={tool === 'line' ? 'active' : ''} onClick={() => setTool('line')} title="Line (D)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><line x1="5" y1="19" x2="19" y2="5"/></svg>
          </button>
        </div>
        <div className="divider" />
        <div className="tool-section colors">
          {['#000000', '#2563eb', '#dc2626', '#16a34a', '#ca8a04'].map(c => (
            <button key={c} className={`color-swatch ${color === c ? 'selected' : ''}`} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <div className="divider" />
        <div className="tool-section slider-group">
          <input type="range" min="1" max="40" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} />
          <span className="size-label">{lineWidth}px</span>
        </div>
        <div className="divider" />
        <div className="tool-section">
          <button onClick={undo} disabled={historyIndex < 0} title="Undo (Ctrl+Z)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5"><path d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"/></svg>
          </button>
        </div>
        <div className="divider" />
        <button onClick={clearCanvas} className="action-btn delete" title="Clear All">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#ef4444" fill="none" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
        </button>
      </div>

      <div 
        className="canvas-wrapper" 
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{ cursor: (tool === 'pen' || tool === 'eraser') ? 'none' : (tool === 'select' ? 'default' : 'crosshair') }}
      >
        <canvas ref={canvasRef} />
        {cursorPos && (tool === 'pen' || tool === 'eraser') && (
          <div className="brush-preview" style={{ left: cursorPos.x, top: cursorPos.y, width: lineWidth, height: lineWidth, borderColor: tool === 'eraser' ? '#000' : color, borderStyle: tool === 'eraser' ? 'dashed' : 'solid' }} />
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
