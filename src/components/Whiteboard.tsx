import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Whiteboard.css';

interface Point {
  x: number;
  y: number;
}

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

type Tool = 'pen' | 'eraser' | 'text' | 'rectangle' | 'circle' | 'line';

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(5);
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<Point>({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const { width, height } = container.getBoundingClientRect();
      // Store current content
      const ctx = canvas.getContext('2d');
      let tempContent: ImageData | null = null;
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        tempContent = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Restore content
      if (ctx && tempContent) {
        ctx.putImageData(tempContent, 0, 0);
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('nativeEvent' in e && 'touches' in e.nativeEvent) {
      clientX = e.nativeEvent.touches[0].clientX;
      clientY = e.nativeEvent.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e.nativeEvent) e.preventDefault();
    const { x, y } = getCoordinates(e);
    setStartPos({ x, y });

    if (tool === 'text') {
      const id = Date.now().toString();
      const newText: TextElement = {
        id, x, y,
        text: 'Type here...',
        color,
        fontSize: lineWidth * 4,
      };
      setTexts([...texts, newText]);
      setSelectedTextId(id);
      return;
    }

    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      // Save snapshot for shapes
      if (['rectangle', 'circle', 'line'].includes(tool)) {
        setSnapshot(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
      }
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    setCursorPos(coords);

    if (!isDrawing || tool === 'text') return;
    if ('touches' in e.nativeEvent) e.preventDefault();

    const { x, y } = coords;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (['rectangle', 'circle', 'line'].includes(tool) && snapshot) {
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      if (tool === 'rectangle') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setSnapshot(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTexts([]);
    }
  };

  return (
    <div className="whiteboard-container" ref={containerRef}>
      <div className="floating-toolbar">
        <div className="tool-section">
          <button className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')} title="Pen">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-1.5M2 22l5-5M2 22v-5l5 5zM11 7l4-4 2 2-4 4-2-2z"/></svg>
          </button>
          <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')} title="Eraser">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><path d="M20 20H7L3 16C2 15 2 14 3 13L13 3C14 2 15 2 16 3L21 8C22 9 22 10 21 11L15 17L20 20Z"/><path d="M18 11L11 4"/></svg>
          </button>
          <button className={tool === 'text' ? 'active' : ''} onClick={() => setTool('text')} title="Text">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          </button>
        </div>
        
        <div className="divider" />
        
        <div className="tool-section">
          <button className={tool === 'rectangle' ? 'active' : ''} onClick={() => setTool('rectangle')} title="Rectangle">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
          <button className={tool === 'circle' ? 'active' : ''} onClick={() => setTool('circle')} title="Circle">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
          </button>
          <button className={tool === 'line' ? 'active' : ''} onClick={() => setTool('line')} title="Line">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>
          </button>
        </div>

        <div className="divider" />

        <div className="tool-section colors">
          {['#000000', '#2563eb', '#dc2626', '#16a34a', '#ca8a04'].map(c => (
            <button 
              key={c} 
              className={`color-swatch ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        <div className="divider" />

        <div className="tool-section slider-group">
          <input type="range" min="1" max="40" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} />
          <span className="size-label">{lineWidth}px</span>
        </div>

        <div className="divider" />

        <button onClick={clearCanvas} className="action-btn delete" title="Clear All">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
        </button>
      </div>

      <div 
        className="canvas-wrapper" 
        onMouseMove={(e) => setCursorPos(getCoordinates(e))}
        onMouseLeave={() => setCursorPos(null)}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Brush/Eraser range preview */}
        {cursorPos && (tool === 'pen' || tool === 'eraser') && (
          <div 
            className="brush-preview"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              width: lineWidth,
              height: lineWidth,
              borderColor: tool === 'eraser' ? '#000' : color,
              borderStyle: tool === 'eraser' ? 'dashed' : 'solid'
            }}
          />
        )}

        {texts.map((text) => (
          <div
            key={text.id}
            className={`text-element ${selectedTextId === text.id ? 'editing' : ''}`}
            style={{
              left: text.x,
              top: text.y,
              color: text.color,
              fontSize: `${text.fontSize}px`,
            }}
            onClick={(e) => { e.stopPropagation(); setSelectedTextId(text.id); }}
          >
            {selectedTextId === text.id ? (
              <input
                autoFocus
                value={text.text}
                onChange={(e) => setTexts(texts.map(t => t.id === text.id ? { ...t, text: e.target.value } : t))}
                onBlur={() => setSelectedTextId(null)}
                style={{ color: text.color, fontSize: `${text.fontSize}px` }}
              />
            ) : (
              text.text
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Whiteboard;
