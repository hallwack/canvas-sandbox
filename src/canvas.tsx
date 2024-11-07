import React, {
  useRef,
  useState,
  useEffect,
  MouseEvent,
  TouchEvent,
} from "react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  position: Point; // Track the stroke's offset position
}

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [fillColor, setFillColor] = useState<string>("#cdecde");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedStrokeIndex, setDraggedStrokeIndex] = useState<number | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState<Point | null>(null);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    context.lineCap = "round";

    strokes.forEach(({ points, color, position }) => {
      context.strokeStyle = "black";
      context.beginPath();
      points.forEach((point, i) => {
        const x = point.x + position.x;
        const y = point.y + position.y;
        i === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
      });
      context.stroke();
      if (isClosedPath(points)) fillStroke(context, points, color, position);
    });
  };

  const isClosedPath = (stroke: Point[]): boolean => {
    if (stroke.length < 2) return false;
    const [start, end] = [stroke[0], stroke[stroke.length - 1]];
    return Math.hypot(end.x - start.x, end.y - start.y) < 10;
  };

  const fillStroke = (
    context: CanvasRenderingContext2D,
    stroke: Point[],
    color: string,
    position: Point,
  ) => {
    context.fillStyle = color;
    context.beginPath();
    stroke.forEach((point, i) => {
      const x = point.x + position.x;
      const y = point.y + position.y;
      i === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
    });
    context.closePath();
    context.fill();
  };

  const findClickedStrokeIndex = (x: number, y: number): number | null => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const { points, position } = strokes[i];
      const adjustedPoints = points.map((p) => ({
        x: p.x + position.x,
        y: p.y + position.y,
      }));
      if (isInsideStroke(adjustedPoints, x, y)) return i;
    }
    return null;
  };

  const isInsideStroke = (points: Point[], x: number, y: number): boolean => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return false;
    ctx.beginPath();
    points.forEach((point, i) => {
      i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    return ctx.isPointInPath(x, y);
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = e.nativeEvent;
    const clickedStrokeIndex = findClickedStrokeIndex(offsetX, offsetY);

    if (clickedStrokeIndex !== null) {
      const stroke = strokes[clickedStrokeIndex];
      setIsDragging(true);
      setDraggedStrokeIndex(clickedStrokeIndex);
      setDragOffset({
        x: offsetX - stroke.position.x,
        y: offsetY - stroke.position.y,
      });
    } else {
      setCurrentStroke([{ x: offsetX, y: offsetY }]);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && draggedStrokeIndex !== null && dragOffset) {
      const { offsetX, offsetY } = e.nativeEvent;
      const newPosition = {
        x: offsetX - dragOffset.x,
        y: offsetY - dragOffset.y,
      };
      setStrokes((prev) =>
        prev.map((stroke, index) =>
          index === draggedStrokeIndex
            ? { ...stroke, position: newPosition }
            : stroke,
        ),
      );
    } else if (isDrawing && canvasRef.current) {
      const { offsetX, offsetY } = e.nativeEvent;
      setCurrentStroke((prev) => [...prev, { x: offsetX, y: offsetY }]);

      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.beginPath();
        const lastPoint = currentStroke[currentStroke.length - 1];
        context.moveTo(lastPoint.x, lastPoint.y);
        context.lineTo(offsetX, offsetY);
        context.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedStrokeIndex(null);
      setDragOffset(null);
    } else if (isDrawing && currentStroke.length > 0) {
      setStrokes((prev) => [
        ...prev,
        { points: currentStroke, color: fillColor, position: { x: 0, y: 0 } },
      ]);
      setCurrentStroke([]);
      setIsDrawing(false);
    }
  };

  // Touch event handlers for drawing in real-time
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const clickedStrokeIndex = findClickedStrokeIndex(x, y);

    if (clickedStrokeIndex !== null) {
      const stroke = strokes[clickedStrokeIndex];
      setIsDragging(true);
      setDraggedStrokeIndex(clickedStrokeIndex);
      setDragOffset({ x: x - stroke.position.x, y: y - stroke.position.y });
    } else {
      setCurrentStroke([{ x, y }]);
      setIsDrawing(true);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && draggedStrokeIndex !== null && dragOffset) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const newPosition = {
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      };

      setStrokes((prev) =>
        prev.map((stroke, index) =>
          index === draggedStrokeIndex
            ? { ...stroke, position: newPosition }
            : stroke,
        ),
      );
    } else if (isDrawing && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setCurrentStroke((prev) => [...prev, { x, y }]);

      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.beginPath();
        const lastPoint = currentStroke[currentStroke.length - 1];
        context.moveTo(lastPoint.x, lastPoint.y);
        context.lineTo(x, y);
        context.stroke();
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedStrokeIndex(null);
      setDragOffset(null);
    } else if (isDrawing && currentStroke.length > 0) {
      setStrokes((prev) => [
        ...prev,
        { points: currentStroke, color: fillColor, position: { x: 0, y: 0 } },
      ]);
      setCurrentStroke([]);
      setIsDrawing(false);
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [strokes]);

  const saveAsCustomFormat = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const backgroundImage = canvas.toDataURL("image/png");

    const data = JSON.stringify({ backgroundImage, strokes });
    const blob = new Blob([data], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "drawing.draw";
    link.click();
  };

  const loadCustomFormat = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) return;

      const { backgroundImage, strokes: loadedStrokes } = JSON.parse(
        e.target.result as string,
      );
      setStrokes(loadedStrokes);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);

        redrawCanvas();
      };
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ border: "1px solid black", cursor: "crosshair" }}
      />
      <div style={{ marginTop: "10px" }}>
        <button onClick={() => setStrokes((prev) => prev.slice(0, -1))}>
          Undo
        </button>
        <input
          type="color"
          onChange={(e) => setFillColor(e.target.value)}
          value={fillColor}
          style={{ marginLeft: "10px" }}
        />
        <span>Select Fill Color</span>
        <button onClick={saveAsCustomFormat} style={{ marginLeft: "10px" }}>
          Save as .draw
        </button>
        <input
          type="file"
          accept=".draw"
          onChange={(e) =>
            e.target.files && loadCustomFormat(e.target.files[0])
          }
          style={{ marginLeft: "10px" }}
        />
      </div>
    </div>
  );
};

export default Canvas;
