import React, { useRef, useEffect, useState } from 'react';
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

type Tool = 'pen' | 'eraser' | 'text';

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Resize canvas to fit container
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const { width, height } = container.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        // Redraw content if needed (not implemented yet for paths)
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e.nativeEvent) {
      clientX = e.nativeEvent.touches[0].clientX;
      clientY = e.nativeEvent.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e.nativeEvent) {
      e.preventDefault();
    }
    const { x, y } = getCoordinates(e);

    if (tool === 'text') {
      const id = Date.now().toString();
      const newText: TextElement = {
        id,
        x,
        y,
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
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e.nativeEvent) {
      e.preventDefault();
    }
    if (!isDrawing || tool === 'text') return;

    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTexts([]);
    }
  };

  const updateText = (id: string, newText: string) => {
    setTexts(texts.map(t => (t.id === id ? { ...t, text: newText } : t)));
  };

  const handleTextClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedTextId(id);
  };

  return (
    <div className="whiteboard-container" ref={containerRef}>
      <div className="toolbar">
        <div className="tool-group">
          <button 
            className={tool === 'pen' ? 'active' : ''} 
            onClick={() => setTool('pen')}
          >
            Pen
          </button>
          <button 
            className={tool === 'eraser' ? 'active' : ''} 
            onClick={() => setTool('eraser')}
          >
            Eraser
          </button>
          <button 
            className={tool === 'text' ? 'active' : ''} 
            onClick={() => setTool('text')}
          >
            Text
          </button>
        </div>
        <div className="tool-group">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            disabled={tool === 'eraser'}
          />
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(Number(e.target.value))} 
          />
          <span>{lineWidth}px</span>
        </div>
        <button onClick={clearCanvas} className="clear-btn">Clear</button>
      </div>

      <div className="canvas-wrapper" onClick={() => setSelectedTextId(null)}>
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
            onClick={(e) => handleTextClick(e, text.id)}
          >
            {selectedTextId === text.id ? (
              <input
                autoFocus
                value={text.text}
                onChange={(e) => updateText(text.id, e.target.value)}
                onBlur={() => setSelectedTextId(null)}
                style={{ 
                  color: text.color, 
                  fontSize: `${text.fontSize}px`,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                }}
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
