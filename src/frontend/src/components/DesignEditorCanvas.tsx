import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Circle,
  Download,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  ImageIcon,
  Italic,
  Layers,
  Lock,
  MousePointer,
  Paintbrush,
  Printer,
  Redo2,
  RotateCcw,
  Square,
  Trash2,
  Type,
  Unlock,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CanvasElement {
  id: string;
  type: "text" | "rect" | "circle" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  // text
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: "left" | "center" | "right";
  color?: string;
  // shape
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // image
  src?: string;
  flipH?: boolean;
  flipV?: boolean;
  // counter for display name
  counter?: number;
}

type ToolType = "select" | "text" | "rect" | "circle" | "image" | "background";

interface Template {
  label: string;
  width: number;
  height: number;
}

const TEMPLATES: Record<string, Template> = {
  id_card: { label: "ID Card", width: 856, height: 540 },
  visiting_card: { label: "Visiting Card", width: 900, height: 550 },
  passport_photo: { label: "Passport Photo", width: 350, height: 450 },
  stamp_photo: { label: "Stamp Photo", width: 250, height: 350 },
  banner: { label: "Banner", width: 1200, height: 400 },
  a4: { label: "A4 Page", width: 794, height: 1123 },
  custom: { label: "Custom", width: 600, height: 400 },
};

const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
];

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0];
const MAX_HISTORY = 20;

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateElId() {
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getElementName(el: CanvasElement) {
  const typeLabels: Record<string, string> = {
    text: "Text",
    rect: "Rectangle",
    circle: "Circle",
    image: "Image",
  };
  return `${typeLabels[el.type] || el.type} ${el.counter ?? ""}`;
}

// ─── Handle Positions ────────────────────────────────────────────────────────

function getHandlePositions(
  el: CanvasElement,
  zoom: number,
): { handle: ResizeHandle; cx: number; cy: number }[] {
  const x = el.x * zoom;
  const y = el.y * zoom;
  const w = el.width * zoom;
  const h = el.height * zoom;
  return [
    { handle: "nw", cx: x, cy: y },
    { handle: "n", cx: x + w / 2, cy: y },
    { handle: "ne", cx: x + w, cy: y },
    { handle: "e", cx: x + w, cy: y + h / 2 },
    { handle: "se", cx: x + w, cy: y + h },
    { handle: "s", cx: x + w / 2, cy: y + h },
    { handle: "sw", cx: x, cy: y + h },
    { handle: "w", cx: x, cy: y + h / 2 },
  ];
}

// ─── Element Renderer ─────────────────────────────────────────────────────────

interface ElementProps {
  el: CanvasElement;
  zoom: number;
  isSelected: boolean;
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent, id: string, handle: ResizeHandle) => void;
  onDoubleClick: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onTextBlur: (id: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function CanvasElementRenderer({
  el,
  zoom,
  isSelected,
  isEditing,
  onMouseDown,
  onDoubleClick,
  onTextChange,
  onTextBlur,
  textareaRef,
}: ElementProps) {
  if (!el.visible) return null;

  const x = el.x * zoom;
  const y = el.y * zoom;
  const w = el.width * zoom;
  const h = el.height * zoom;
  const opacity = el.opacity != null ? el.opacity / 100 : 1;
  const handles = isSelected ? getHandlePositions(el, zoom) : [];
  const HANDLE_SIZE = 8;

  const sharedStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    transform: `rotate(${el.rotation}deg)`,
    transformOrigin: "center center",
    cursor: el.locked ? "not-allowed" : "move",
    userSelect: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      {/* Main element */}
      <div
        style={{
          ...sharedStyle,
          opacity,
          outline: isSelected ? "2px solid #3b82f6" : "none",
          outlineOffset: "1px",
          zIndex: el.zIndex,
        }}
        onMouseDown={(e) => onMouseDown(e, el.id, null)}
        onDoubleClick={() => onDoubleClick(el.id)}
      >
        {el.type === "rect" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: el.fill || "#3b82f6",
              border: el.strokeWidth
                ? `${el.strokeWidth}px solid ${el.stroke || "#1d4ed8"}`
                : "none",
              boxSizing: "border-box",
            }}
          />
        )}

        {el.type === "circle" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: el.fill || "#10b981",
              border: el.strokeWidth
                ? `${el.strokeWidth}px solid ${el.stroke || "#059669"}`
                : "none",
              borderRadius: "50%",
              boxSizing: "border-box",
            }}
          />
        )}

        {el.type === "text" && !isEditing && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "flex-start",
              justifyContent:
                el.textAlign === "center"
                  ? "center"
                  : el.textAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              fontFamily: el.fontFamily || "Arial",
              fontSize: `${(el.fontSize || 20) * zoom}px`,
              fontWeight: el.fontWeight || "normal",
              fontStyle: el.fontStyle || "normal",
              color: el.color || "#1a1a2e",
              textAlign: el.textAlign || "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "hidden",
              pointerEvents: "none",
              lineHeight: 1.3,
            }}
          >
            {el.content || "Double-click to edit"}
          </div>
        )}

        {el.type === "text" && isEditing && (
          <textarea
            ref={textareaRef}
            value={el.content || ""}
            onChange={(e) => onTextChange(el.id, e.target.value)}
            onBlur={() => onTextBlur(el.id)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              background: "rgba(255,255,255,0.92)",
              border: "2px solid #3b82f6",
              padding: "2px 4px",
              resize: "none",
              outline: "none",
              fontFamily: el.fontFamily || "Arial",
              fontSize: `${(el.fontSize || 20) * zoom}px`,
              fontWeight: el.fontWeight || "normal",
              fontStyle: el.fontStyle || "normal",
              color: el.color || "#1a1a2e",
              textAlign: el.textAlign || "left",
              lineHeight: 1.3,
              zIndex: 9999,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          />
        )}

        {el.type === "image" && el.src && (
          <img
            src={el.src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
              transform: `scaleX(${el.flipH ? -1 : 1}) scaleY(${el.flipV ? -1 : 1})`,
            }}
            draggable={false}
          />
        )}

        {el.type === "image" && !el.src && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f1f5f9",
              border: "2px dashed #94a3b8",
              color: "#64748b",
              fontSize: `${12 * zoom}px`,
              borderRadius: 4,
            }}
          >
            <ImageIcon style={{ width: 24 * zoom, height: 24 * zoom }} />
          </div>
        )}
      </div>

      {/* Resize handles */}
      {isSelected &&
        !el.locked &&
        handles.map(({ handle, cx, cy }) => (
          <div
            key={handle}
            style={{
              position: "absolute",
              left: cx - HANDLE_SIZE / 2,
              top: cy - HANDLE_SIZE / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: "#3b82f6",
              border: "2px solid white",
              borderRadius: 2,
              zIndex: el.zIndex + 100,
              cursor: getCursorForHandle(handle),
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onMouseDown(e, el.id, handle);
            }}
          />
        ))}
    </>
  );
}

function getCursorForHandle(handle: ResizeHandle): string {
  switch (handle) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    default:
      return "move";
  }
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  selected: CanvasElement | null;
  onChange: (id: string, updates: Partial<CanvasElement>) => void;
}

function PropertiesPanel({ selected, onChange }: PropertiesPanelProps) {
  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <Layers className="w-10 h-10 text-gray-400 mb-3" />
        <p className="text-xs text-gray-400">
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  const update = (updates: Partial<CanvasElement>) =>
    onChange(selected.id, updates);

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      {/* Position & Size */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Position & Size
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            {
              label: "X",
              key: "x" as const,
              val: Math.round(selected.x),
            },
            {
              label: "Y",
              key: "y" as const,
              val: Math.round(selected.y),
            },
            {
              label: "W",
              key: "width" as const,
              val: Math.round(selected.width),
            },
            {
              label: "H",
              key: "height" as const,
              val: Math.round(selected.height),
            },
          ].map(({ label, key, val }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-4 shrink-0">
                {label}
              </span>
              <input
                type="number"
                value={val}
                onChange={(e) => update({ [key]: Number(e.target.value) })}
                className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Text properties */}
      {selected.type === "text" && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Typography
          </p>
          <div className="space-y-2">
            <select
              value={selected.fontFamily || "Arial"}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
              data-ocid="design.editor.fontfamily.select"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>

            <div className="flex gap-1.5">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px] text-gray-400 w-6 shrink-0">
                  Sz
                </span>
                <input
                  type="number"
                  value={selected.fontSize || 20}
                  onChange={(e) => update({ fontSize: Number(e.target.value) })}
                  min={4}
                  max={400}
                  className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
                  data-ocid="design.editor.fontsize.input"
                />
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    update({
                      fontWeight:
                        selected.fontWeight === "bold" ? "normal" : "bold",
                    })
                  }
                  className={`p-1.5 rounded text-xs ${selected.fontWeight === "bold" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                  data-ocid="design.editor.bold.toggle"
                >
                  <Bold className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      fontStyle:
                        selected.fontStyle === "italic" ? "normal" : "italic",
                    })
                  }
                  className={`p-1.5 rounded text-xs ${selected.fontStyle === "italic" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                  data-ocid="design.editor.italic.toggle"
                >
                  <Italic className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex gap-0.5">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => update({ textAlign: align })}
                  className={`flex-1 p-1.5 rounded text-xs flex items-center justify-center ${selected.textAlign === align ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                  data-ocid={`design.editor.align_${align}.toggle`}
                >
                  {align === "left" && <AlignLeft className="w-3 h-3" />}
                  {align === "center" && <AlignCenter className="w-3 h-3" />}
                  {align === "right" && <AlignRight className="w-3 h-3" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-10 shrink-0">
                Color
              </span>
              <input
                type="color"
                value={selected.color || "#000000"}
                onChange={(e) => update({ color: e.target.value })}
                className="w-8 h-6 cursor-pointer rounded border-0 bg-transparent"
                data-ocid="design.editor.text_color.input"
              />
              <span className="text-xs text-gray-300">
                {selected.color || "#000000"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Shape properties */}
      {(selected.type === "rect" || selected.type === "circle") && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Fill & Stroke
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-10 shrink-0">
                Fill
              </span>
              <input
                type="color"
                value={selected.fill || "#3b82f6"}
                onChange={(e) => update({ fill: e.target.value })}
                className="w-8 h-6 cursor-pointer rounded border-0 bg-transparent"
                data-ocid="design.editor.fill_color.input"
              />
              <span className="text-xs text-gray-300">
                {selected.fill || "#3b82f6"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-10 shrink-0">
                Stroke
              </span>
              <input
                type="color"
                value={selected.stroke || "#1d4ed8"}
                onChange={(e) => update({ stroke: e.target.value })}
                className="w-8 h-6 cursor-pointer rounded border-0 bg-transparent"
                data-ocid="design.editor.stroke_color.input"
              />
              <span className="text-xs text-gray-300">
                {selected.stroke || "#1d4ed8"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-10 shrink-0">
                SW
              </span>
              <input
                type="number"
                value={selected.strokeWidth || 0}
                onChange={(e) =>
                  update({ strokeWidth: Number(e.target.value) })
                }
                min={0}
                max={20}
                className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
                data-ocid="design.editor.stroke_width.input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Opacity (shapes + images) */}
      {selected.type !== "text" && (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-14 shrink-0">
              Opacity
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={selected.opacity ?? 100}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              className="flex-1 accent-blue-500"
              data-ocid="design.editor.opacity.input"
            />
            <span className="text-xs text-gray-300 w-8 text-right">
              {selected.opacity ?? 100}%
            </span>
          </div>
        </div>
      )}

      {/* Image properties */}
      {selected.type === "image" && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Transform
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => update({ flipH: !selected.flipH })}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${selected.flipH ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              data-ocid="design.editor.fliph.toggle"
            >
              <FlipHorizontal className="w-3 h-3" />
              Flip H
            </button>
            <button
              type="button"
              onClick={() => update({ flipV: !selected.flipV })}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${selected.flipV ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              data-ocid="design.editor.flipv.toggle"
            >
              <FlipVertical className="w-3 h-3" />
              Flip V
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function DesignEditorCanvas() {
  const [templateKey, setTemplateKey] = useState("visiting_card");
  const [canvasW, setCanvasW] = useState(TEMPLATES.visiting_card.width);
  const [canvasH, setCanvasH] = useState(TEMPLATES.visiting_card.height);
  const [customW, setCustomW] = useState("600");
  const [customH, setCustomH] = useState("400");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [zoom, setZoom] = useState(0.75);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [counterMap, setCounterMap] = useState<Record<string, number>>({});

  // Drag/resize state
  const dragRef = useRef<{
    type: "move" | "resize" | "draw";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    handle: ResizeHandle;
    id: string;
    drawId?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // ── History ────────────────────────────────────────────────────────────────

  const pushHistory = useCallback((currentElements: CanvasElement[]) => {
    const snapshot = JSON.stringify(currentElements);
    setHistory((prev) => {
      const next = [...prev, snapshot];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setFuture([]);
  }, []);

  const undo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const newHistory = prev.slice(0, -1);
      setFuture((f) => [JSON.stringify(elements), ...f]);
      setElements(JSON.parse(last));
      setSelectedId(null);
      return newHistory;
    });
  };

  const redo = () => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      const newFuture = prev.slice(1);
      setHistory((h) => [...h, JSON.stringify(elements)]);
      setElements(JSON.parse(next));
      setSelectedId(null);
      return newFuture;
    });
  };

  // ── Element operations ─────────────────────────────────────────────────────

  const addElement = (el: CanvasElement) => {
    pushHistory(elements);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
      setElements((prev) => {
        const next = prev.map((el) =>
          el.id === id ? { ...el, ...updates } : el,
        );
        if (!skipHistory) pushHistory(prev);
        return next;
      });
    },
    [pushHistory],
  );

  const deleteElement = (id: string) => {
    pushHistory(elements);
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const getNextCounter = (type: string): number => {
    const next = (counterMap[type] || 0) + 1;
    setCounterMap((prev) => ({ ...prev, [type]: next }));
    return next;
  };

  // ── Tool actions ───────────────────────────────────────────────────────────

  const addText = (x: number, y: number) => {
    const el: CanvasElement = {
      id: generateElId(),
      type: "text",
      x,
      y,
      width: 200,
      height: 50,
      rotation: 0,
      visible: true,
      locked: false,
      zIndex: elements.length + 1,
      content: "Text",
      fontSize: 24,
      fontFamily: "Arial",
      fontWeight: "normal",
      fontStyle: "normal",
      textAlign: "left",
      color: "#1a1a2e",
      counter: getNextCounter("text"),
    };
    addElement(el);
    setEditingId(el.id);
  };

  const _addRect = (x: number, y: number, w: number, h: number) => {
    const el: CanvasElement = {
      id: generateElId(),
      type: "rect",
      x,
      y,
      width: Math.max(10, w),
      height: Math.max(10, h),
      rotation: 0,
      visible: true,
      locked: false,
      zIndex: elements.length + 1,
      fill: "#3b82f6",
      stroke: "#1d4ed8",
      strokeWidth: 0,
      opacity: 100,
      counter: getNextCounter("rect"),
    };
    addElement(el);
  };

  const _addCircle = (x: number, y: number, w: number, h: number) => {
    const el: CanvasElement = {
      id: generateElId(),
      type: "circle",
      x,
      y,
      width: Math.max(10, w),
      height: Math.max(10, h),
      rotation: 0,
      visible: true,
      locked: false,
      zIndex: elements.length + 1,
      fill: "#10b981",
      stroke: "#059669",
      strokeWidth: 0,
      opacity: 100,
      counter: getNextCounter("circle"),
    };
    addElement(el);
  };

  const addImage = (src: string) => {
    const el: CanvasElement = {
      id: generateElId(),
      type: "image",
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      rotation: 0,
      visible: true,
      locked: false,
      zIndex: elements.length + 1,
      src,
      opacity: 100,
      flipH: false,
      flipV: false,
      counter: getNextCounter("image"),
    };
    addElement(el);
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )
        return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !editingId) {
          deleteElement(selectedId);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Mouse events ───────────────────────────────────────────────────────────

  const getCanvasPos = (
    e: React.MouseEvent | MouseEvent,
  ): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pos = getCanvasPos(e);

    if (activeTool === "text") {
      addText(pos.x, pos.y);
      return;
    }

    if (activeTool === "rect" || activeTool === "circle") {
      // Start drawing
      const drawId = generateElId();
      const type = activeTool === "rect" ? "rect" : "circle";
      const el: CanvasElement = {
        id: drawId,
        type,
        x: pos.x,
        y: pos.y,
        width: 1,
        height: 1,
        rotation: 0,
        visible: true,
        locked: false,
        zIndex: elements.length + 1,
        fill: type === "rect" ? "#3b82f6" : "#10b981",
        stroke: type === "rect" ? "#1d4ed8" : "#059669",
        strokeWidth: 0,
        opacity: 100,
        counter: getNextCounter(type),
      };
      pushHistory(elements);
      setElements((prev) => [...prev, el]);
      setSelectedId(drawId);

      dragRef.current = {
        type: "draw",
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        origW: 0,
        origH: 0,
        handle: null,
        id: drawId,
        drawId,
      };
      return;
    }

    if (activeTool === "select") {
      // Click on empty canvas → deselect
      setSelectedId(null);
      setEditingId(null);
    }
  };

  const handleElementMouseDown = (
    e: React.MouseEvent,
    id: string,
    handle: ResizeHandle,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const el = elements.find((x) => x.id === id);
    if (!el || el.locked) return;

    setSelectedId(id);
    if (editingId && editingId !== id) setEditingId(null);

    dragRef.current = {
      type: handle ? "resize" : "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
      handle,
      id,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;

      if (drag.type === "draw") {
        const newX = dx < 0 ? drag.origX + dx : drag.origX;
        const newY = dy < 0 ? drag.origY + dy : drag.origY;
        const newW = Math.abs(dx);
        const newH = Math.abs(dy);
        setElements((prev) =>
          prev.map((el) =>
            el.id === drag.drawId
              ? {
                  ...el,
                  x: newX,
                  y: newY,
                  width: Math.max(1, newW),
                  height: Math.max(1, newH),
                }
              : el,
          ),
        );
        return;
      }

      if (drag.type === "move") {
        setElements((prev) =>
          prev.map((el) =>
            el.id === drag.id
              ? { ...el, x: drag.origX + dx, y: drag.origY + dy }
              : el,
          ),
        );
        return;
      }

      if (drag.type === "resize") {
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== drag.id) return el;
            let newX = drag.origX;
            let newY = drag.origY;
            let newW = drag.origW;
            let newH = drag.origH;

            const h = drag.handle;
            if (h === "e" || h === "ne" || h === "se")
              newW = Math.max(10, drag.origW + dx);
            if (h === "w" || h === "nw" || h === "sw") {
              newX = drag.origX + dx;
              newW = Math.max(10, drag.origW - dx);
            }
            if (h === "s" || h === "se" || h === "sw")
              newH = Math.max(10, drag.origH + dy);
            if (h === "n" || h === "nw" || h === "ne") {
              newY = drag.origY + dy;
              newH = Math.max(10, drag.origH - dy);
            }

            return { ...el, x: newX, y: newY, width: newW, height: newH };
          }),
        );
      }
    },
    [zoom],
  );

  const handleMouseUp = useCallback(() => {
    const drag = dragRef.current;
    if (
      drag &&
      (drag.type === "draw" || drag.type === "move" || drag.type === "resize")
    ) {
      // History was already pushed at mousedown for draw; push for move/resize now
      if (drag.type === "move" || drag.type === "resize") {
        // find before-state
        setElements((prev) => {
          // push current state as committed
          pushHistory(
            prev.map((el) => {
              if (el.id !== drag.id) return el;
              return el; // current state already in prev from continuous updates
            }),
          );
          return prev;
        });
      }
      if (drag.type === "draw") {
        setActiveTool("select");
      }
    }
    dragRef.current = null;
  }, [pushHistory]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Text editing ───────────────────────────────────────────────────────────

  const handleDoubleClick = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el || el.locked || el.type !== "text") return;
    setEditingId(id);
  };

  const handleTextChange = (id: string, text: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, content: text } : el)),
    );
  };

  const handleTextBlur = (id: string) => {
    setEditingId(null);
    pushHistory(elements);
    void id;
  };

  // ── Image upload ───────────────────────────────────────────────────────────

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      addImage(src);
      setActiveTool("select");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Template change ────────────────────────────────────────────────────────

  const handleTemplateChange = (key: string) => {
    setTemplateKey(key);
    if (key !== "custom") {
      setCanvasW(TEMPLATES[key].width);
      setCanvasH(TEMPLATES[key].height);
    }
    setSelectedId(null);
    setEditingId(null);
  };

  // ── Layers operations ──────────────────────────────────────────────────────

  const moveLayerUp = (id: string) => {
    pushHistory(elements);
    setElements((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((el) => el.id === id);
      if (idx >= sorted.length - 1) return prev;
      const a = sorted[idx];
      const b = sorted[idx + 1];
      return prev.map((el) => {
        if (el.id === a.id) return { ...el, zIndex: b.zIndex };
        if (el.id === b.id) return { ...el, zIndex: a.zIndex };
        return el;
      });
    });
  };

  const moveLayerDown = (id: string) => {
    pushHistory(elements);
    setElements((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((el) => el.id === id);
      if (idx <= 0) return prev;
      const a = sorted[idx];
      const b = sorted[idx - 1];
      return prev.map((el) => {
        if (el.id === a.id) return { ...el, zIndex: b.zIndex };
        if (el.id === b.id) return { ...el, zIndex: a.zIndex };
        return el;
      });
    });
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportCanvas = (format: "png" | "jpeg") => {
    const offscreen = hiddenCanvasRef.current;
    if (!offscreen) return;
    offscreen.width = canvasW;
    offscreen.height = canvasH;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw elements in z-order
    const sorted = [...elements]
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    const drawAll = async () => {
      for (const el of sorted) {
        const opacity = el.opacity != null ? el.opacity / 100 : 1;
        ctx.globalAlpha = opacity;
        ctx.save();
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);

        if (el.type === "rect") {
          ctx.fillStyle = el.fill || "#3b82f6";
          ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
          if (el.strokeWidth && el.strokeWidth > 0) {
            ctx.strokeStyle = el.stroke || "#1d4ed8";
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
          }
        }

        if (el.type === "circle") {
          ctx.beginPath();
          ctx.ellipse(0, 0, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = el.fill || "#10b981";
          ctx.fill();
          if (el.strokeWidth && el.strokeWidth > 0) {
            ctx.strokeStyle = el.stroke || "#059669";
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke();
          }
        }

        if (el.type === "text" && el.content) {
          const fw = el.fontWeight === "bold" ? "bold" : "normal";
          const fi = el.fontStyle === "italic" ? "italic" : "normal";
          ctx.font = `${fi} ${fw} ${el.fontSize || 20}px ${el.fontFamily || "Arial"}`;
          ctx.fillStyle = el.color || "#1a1a2e";
          ctx.textAlign = el.textAlign || "left";
          ctx.textBaseline = "top";
          const lines = el.content.split("\n");
          const lineH = (el.fontSize || 20) * 1.3;
          const xOffset =
            ctx.textAlign === "center"
              ? 0
              : ctx.textAlign === "right"
                ? el.width / 2
                : -el.width / 2;
          lines.forEach((line, i) => {
            ctx.fillText(line, xOffset, -el.height / 2 + i * lineH);
          });
        }

        if (el.type === "image" && el.src) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.save();
              if (el.flipH) ctx.scale(-1, 1);
              if (el.flipV) ctx.scale(1, -1);
              ctx.drawImage(
                img,
                el.flipH ? el.width / 2 : -el.width / 2,
                el.flipV ? el.height / 2 : -el.height / 2,
                el.flipH ? -el.width : el.width,
                el.flipV ? -el.height : el.height,
              );
              ctx.restore();
              resolve();
            };
            img.onerror = () => resolve();
            img.src = el.src!;
          });
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      }

      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const dataUrl = offscreen.toDataURL(mimeType, 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `design-${templateKey}.${format}`;
      a.click();
      toast.success(`Exported as ${format.toUpperCase()}`);
    };

    void drawAll();
  };

  const printDesign = () => {
    const offscreen = hiddenCanvasRef.current;
    if (!offscreen) return;
    offscreen.width = canvasW;
    offscreen.height = canvasH;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const sorted = [...elements]
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    const doPrint = async () => {
      for (const el of sorted) {
        ctx.save();
        ctx.globalAlpha = el.opacity != null ? el.opacity / 100 : 1;
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);

        if (el.type === "rect") {
          ctx.fillStyle = el.fill || "#3b82f6";
          ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
        }
        if (el.type === "circle") {
          ctx.beginPath();
          ctx.ellipse(0, 0, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = el.fill || "#10b981";
          ctx.fill();
        }
        if (el.type === "text" && el.content) {
          const fw = el.fontWeight === "bold" ? "bold" : "normal";
          ctx.font = `${fw} ${el.fontSize || 20}px ${el.fontFamily || "Arial"}`;
          ctx.fillStyle = el.color || "#1a1a2e";
          ctx.textAlign = el.textAlign || "left";
          ctx.textBaseline = "top";
          const lines = el.content.split("\n");
          const lineH = (el.fontSize || 20) * 1.3;
          const xOffset =
            ctx.textAlign === "center"
              ? 0
              : ctx.textAlign === "right"
                ? el.width / 2
                : -el.width / 2;
          lines.forEach((line, i) =>
            ctx.fillText(line, xOffset, -el.height / 2 + i * lineH),
          );
        }
        if (el.type === "image" && el.src) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(
                img,
                -el.width / 2,
                -el.height / 2,
                el.width,
                el.height,
              );
              resolve();
            };
            img.onerror = () => resolve();
            img.src = el.src!;
          });
        }
        ctx.restore();
      }

      const dataUrl = offscreen.toDataURL("image/png");
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(
          `<!DOCTYPE html><html><head><title>Print Design</title><style>@media print{body{margin:0}}body{margin:0;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style></head><body><img src="${dataUrl}" style="max-width:100%;"/></body></html>`,
        );
        win.document.close();
        win.onload = () => win.print();
      }
    };

    void doPrint();
  };

  // ── Zoom ───────────────────────────────────────────────────────────────────

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
  };

  const zoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
  };

  // ── Tool icons ─────────────────────────────────────────────────────────────

  const tools: {
    id: ToolType;
    icon: React.ReactNode;
    label: string;
    ocid: string;
  }[] = [
    {
      id: "select",
      icon: <MousePointer className="w-4 h-4" />,
      label: "Select (V)",
      ocid: "design.editor.select.toggle",
    },
    {
      id: "text",
      icon: <Type className="w-4 h-4" />,
      label: "Text (T)",
      ocid: "design.editor.text.toggle",
    },
    {
      id: "rect",
      icon: <Square className="w-4 h-4" />,
      label: "Rectangle (R)",
      ocid: "design.editor.rect.toggle",
    },
    {
      id: "circle",
      icon: <Circle className="w-4 h-4" />,
      label: "Circle (C)",
      ocid: "design.editor.circle.toggle",
    },
    {
      id: "image",
      icon: <ImageIcon className="w-4 h-4" />,
      label: "Insert Image (I)",
      ocid: "design.editor.image.toggle",
    },
    {
      id: "background",
      icon: <Paintbrush className="w-4 h-4" />,
      label: "Background Color",
      ocid: "design.editor.background.toggle",
    },
  ];

  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px] bg-gray-900 text-white select-none">
        {/* ── Top Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0 flex-wrap">
          {/* Template */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Template:
            </span>
            <select
              value={templateKey}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
              data-ocid="design.editor.template.select"
            >
              {Object.entries(TEMPLATES).map(([k, t]) => (
                <option key={k} value={k}>
                  {t.label} ({t.width}×{t.height})
                </option>
              ))}
            </select>
          </div>

          {/* Custom dimensions */}
          {templateKey === "custom" && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="w-16 text-xs bg-gray-700 text-white border border-gray-600 rounded px-1.5 py-1"
                placeholder="W"
                data-ocid="design.editor.custom_width.input"
              />
              <span className="text-gray-400 text-xs">×</span>
              <input
                type="number"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="w-16 text-xs bg-gray-700 text-white border border-gray-600 rounded px-1.5 py-1"
                placeholder="H"
                data-ocid="design.editor.custom_height.input"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                onClick={() => {
                  const w = Number(customW);
                  const h = Number(customH);
                  if (w > 0 && h > 0) {
                    setCanvasW(w);
                    setCanvasH(h);
                  }
                }}
                data-ocid="design.editor.custom_apply.button"
              >
                Apply
              </Button>
            </div>
          )}

          <div className="w-px h-5 bg-gray-600" />

          {/* BG Color */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">BG:</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-7 h-6 cursor-pointer rounded border border-gray-600 bg-transparent"
              title="Canvas background color"
              data-ocid="design.editor.bg_color.input"
            />
          </div>

          <div className="w-px h-5 bg-gray-600" />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= ZOOM_LEVELS[0]}
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-40"
                  data-ocid="design.editor.zoom_out.button"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-1.5 py-1 w-16"
              data-ocid="design.editor.zoom.select"
            >
              {ZOOM_LEVELS.map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
            </select>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-40"
                  data-ocid="design.editor.zoom_in.button"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>

          <div className="w-px h-5 bg-gray-600" />

          {/* Undo / Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                className="p-1 rounded hover:bg-gray-700 disabled:opacity-40"
                data-ocid="design.editor.undo.button"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={redo}
                disabled={future.length === 0}
                className="p-1 rounded hover:bg-gray-700 disabled:opacity-40"
                data-ocid="design.editor.redo.button"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-gray-600" />

          {/* Clear */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="p-1 rounded hover:bg-gray-700 text-red-400 hover:text-red-300"
                data-ocid="design.editor.clear.button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear Canvas</TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-gray-600" />

          {/* Export */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => exportCanvas("png")}
                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white"
                data-ocid="design.editor.export_png.button"
              >
                <Download className="w-3 h-3" />
                PNG
              </button>
            </TooltipTrigger>
            <TooltipContent>Download PNG</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => exportCanvas("jpeg")}
                className="flex items-center gap-1 px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-xs text-white"
                data-ocid="design.editor.export_jpeg.button"
              >
                <Download className="w-3 h-3" />
                JPEG
              </button>
            </TooltipTrigger>
            <TooltipContent>Download JPEG</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={printDesign}
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-xs text-white"
                data-ocid="design.editor.print.button"
              >
                <Printer className="w-3 h-3" />
                Print
              </button>
            </TooltipTrigger>
            <TooltipContent>Print Design</TooltipContent>
          </Tooltip>
        </div>

        {/* ── Main Area ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left Toolbar ───────────────────────────────────────────── */}
          <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-1 shrink-0">
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (tool.id === "image") {
                        imageInputRef.current?.click();
                      } else {
                        setActiveTool(tool.id);
                        setEditingId(null);
                      }
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                      activeTool === tool.id && tool.id !== "image"
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:bg-gray-700 hover:text-white"
                    }`}
                    data-ocid={tool.ocid}
                  >
                    {tool.id === "background" ? (
                      <div className="relative">
                        {tool.icon}
                        <div
                          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-gray-900"
                          style={{ background: bgColor }}
                        />
                      </div>
                    ) : (
                      tool.icon
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{tool.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* ── Canvas Workspace ────────────────────────────────────────── */}
          <div className="flex-1 overflow-auto bg-gray-700 flex items-start justify-start p-8">
            <div
              ref={canvasRef}
              style={{
                position: "relative",
                width: canvasW * zoom,
                height: canvasH * zoom,
                background: bgColor,
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)",
                cursor:
                  activeTool === "text"
                    ? "text"
                    : activeTool === "rect" || activeTool === "circle"
                      ? "crosshair"
                      : "default",
                overflow: "hidden",
                flexShrink: 0,
              }}
              onMouseDown={handleCanvasMouseDown}
            >
              {sortedElements.map((el) => (
                <CanvasElementRenderer
                  key={el.id}
                  el={el}
                  zoom={zoom}
                  isSelected={selectedId === el.id}
                  isEditing={editingId === el.id}
                  onMouseDown={handleElementMouseDown}
                  onDoubleClick={handleDoubleClick}
                  onTextChange={handleTextChange}
                  onTextBlur={handleTextBlur}
                  textareaRef={
                    editingId === el.id ? textareaRef : { current: null }
                  }
                />
              ))}
            </div>
          </div>

          {/* ── Right Panel ─────────────────────────────────────────────── */}
          <div className="w-56 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
            {/* Layers (top half) */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-gray-700">
              <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-300">
                  Layers
                </span>
                <span className="text-[10px] text-gray-500 ml-auto">
                  {elements.length}
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-1">
                  {sortedElements.length === 0 ? (
                    <p
                      className="text-[10px] text-gray-500 text-center py-6 px-3"
                      data-ocid="design.editor.layers.empty_state"
                    >
                      No elements yet
                    </p>
                  ) : (
                    sortedElements.map((el, idx) => (
                      <div
                        key={el.id}
                        className={`flex items-center gap-0.5 px-2 py-1 group transition-colors ${
                          selectedId === el.id
                            ? "bg-blue-600/30 border-l-2 border-blue-500"
                            : "hover:bg-gray-700/50 border-l-2 border-transparent"
                        }`}
                        data-ocid={`design.editor.layer.item.${idx + 1}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(el.id);
                            setEditingId(null);
                          }}
                          className="text-[10px] text-gray-300 flex-1 truncate text-left py-0.5 min-w-0"
                        >
                          {getElementName(el)}
                        </button>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayerUp(el.id);
                            }}
                            className="p-0.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
                            title="Move up"
                            data-ocid={`design.editor.layer.up.button.${idx + 1}`}
                          >
                            <ChevronUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayerDown(el.id);
                            }}
                            className="p-0.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
                            title="Move down"
                            data-ocid={`design.editor.layer.down.button.${idx + 1}`}
                          >
                            <ChevronDown className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateElement(el.id, { visible: !el.visible });
                            }}
                            className="p-0.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
                            title={el.visible ? "Hide" : "Show"}
                            data-ocid={`design.editor.layer.visibility.toggle.${idx + 1}`}
                          >
                            {el.visible ? (
                              <Eye className="w-2.5 h-2.5" />
                            ) : (
                              <EyeOff className="w-2.5 h-2.5 text-gray-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateElement(el.id, { locked: !el.locked });
                            }}
                            className="p-0.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
                            title={el.locked ? "Unlock" : "Lock"}
                            data-ocid={`design.editor.layer.lock.toggle.${idx + 1}`}
                          >
                            {el.locked ? (
                              <Lock className="w-2.5 h-2.5 text-amber-400" />
                            ) : (
                              <Unlock className="w-2.5 h-2.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                            className="p-0.5 rounded hover:bg-gray-600 text-red-400 hover:text-red-300"
                            title="Delete"
                            data-ocid={`design.editor.layer.delete.button.${idx + 1}`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Properties (bottom half) */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-2 border-b border-gray-700">
                <span className="text-xs font-semibold text-gray-300">
                  Properties
                </span>
              </div>
              <ScrollArea className="flex-1">
                <PropertiesPanel
                  selected={selectedElement}
                  onChange={(id, updates) => updateElement(id, updates)}
                />
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Hidden canvas for export */}
        <canvas ref={hiddenCanvasRef} style={{ display: "none" }} />

        {/* Hidden file input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
          data-ocid="design.editor.image_upload.upload_button"
        />

        {/* Clear Confirmation */}
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogContent data-ocid="design.editor.clear.dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Canvas?</AlertDialogTitle>
              <AlertDialogDescription>
                All elements will be removed. This cannot be undone (but you can
                undo via Ctrl+Z before saving).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="design.editor.clear.cancel_button">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  pushHistory(elements);
                  setElements([]);
                  setSelectedId(null);
                  setEditingId(null);
                  setShowClearConfirm(false);
                  toast.success("Canvas cleared");
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-ocid="design.editor.clear.confirm_button"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
