import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Image, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export function PDFEditorPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defaultFontSize, setDefaultFontSize] = useState(16);
  const [defaultColor, setDefaultColor] = useState("#1e3a8a");
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
    setAnnotations([]);
  };

  const addTextBox = () => {
    const id = `ann-${Date.now()}`;
    setAnnotations((prev) => [
      ...prev,
      {
        id,
        text: "New Text",
        x: 40,
        y: 40,
        fontSize: defaultFontSize,
        color: defaultColor,
      },
    ]);
    setSelectedId(id);
  };

  const updateAnnotation = (id: string, updates: Partial<TextAnnotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDragging({
        id,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      });
      setSelectedId(id);
    },
    [annotations],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: dragging state is updated via setState
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragging.offsetX;
      const newY = e.clientY - containerRect.top - dragging.offsetY;
      updateAnnotation(dragging.id, {
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    },
    [dragging],
  );

  const handleMouseUp = () => setDragging(null);

  const selectedAnn = annotations.find((a) => a.id === selectedId);

  const handleDownloadPDF = () => {
    if (!pdfUrl) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const annHtml = annotations
      .map(
        (a) =>
          `<div style="position:absolute;left:${a.x}px;top:${a.y}px;font-size:${a.fontSize}px;color:${a.color};font-family:Arial,sans-serif;white-space:nowrap;pointer-events:none">${a.text.replace(/</g, "&lt;")}</div>`,
      )
      .join("");
    w.document.write(`<!DOCTYPE html><html><head><title>PDF Print — ${pdfName}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial}iframe{width:100%;height:100vh;border:none}.overlay{position:fixed;top:0;left:0;pointer-events:none}</style>
      </head><body><div style="position:relative">
      <iframe src="${pdfUrl}" style="width:100%;height:100vh;border:none"></iframe>
      <div class="overlay" style="position:fixed;top:0;left:0;pointer-events:none">${annHtml}</div>
      </div><script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
  };

  const handleDownloadJPEG = async () => {
    if (!containerRef.current) return;
    try {
      // Use html2canvas if available
      const html2canvas = (window as any).html2canvas;
      if (html2canvas) {
        const canvas = await html2canvas(containerRef.current, {
          useCORS: true,
          scale: 2,
        });
        const link = document.createElement("a");
        link.download = `${pdfName.replace(".pdf", "") || "pdf-export"}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.92);
        link.click();
      } else {
        // Fallback: screenshot via print
        handleDownloadPDF();
      }
    } catch {
      handleDownloadPDF();
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-background"
      data-ocid="pdf_editor.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">PDF Editor</h1>
            <p className="text-xs text-muted-foreground">
              Upload, annotate, and download PDFs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            data-ocid="pdf_editor.upload_button"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {pdfUrl && (
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-muted/30 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {pdfName}
          </Badge>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            variant="outline"
            onClick={addTextBox}
            data-ocid="pdf_editor.button"
            className="gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Text
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Size:</Label>
            <select
              className="text-xs border border-border rounded px-1.5 py-1 bg-white"
              value={selectedAnn ? selectedAnn.fontSize : defaultFontSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDefaultFontSize(v);
                if (selectedId) updateAnnotation(selectedId, { fontSize: v });
              }}
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Color:</Label>
            <input
              type="color"
              className="w-7 h-7 rounded border border-border cursor-pointer"
              value={selectedAnn ? selectedAnn.color : defaultColor}
              onChange={(e) => {
                setDefaultColor(e.target.value);
                if (selectedId)
                  updateAnnotation(selectedId, { color: e.target.value });
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              data-ocid="pdf_editor.primary_button"
              className="gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadJPEG}
              data-ocid="pdf_editor.secondary_button"
              className="gap-1"
            >
              <Image className="w-3.5 h-3.5" />
              Download JPEG
            </Button>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {pdfUrl ? (
          <div className="flex flex-1 overflow-hidden">
            {/* PDF + Annotation canvas */}
            <div
              className="flex-1 overflow-auto bg-gray-100 p-4"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <div
                ref={containerRef}
                className="relative mx-auto bg-white shadow-lg"
                style={{ width: "100%", maxWidth: 900, minHeight: 600 }}
                onClick={() => setSelectedId(null)}
                onKeyDown={(e) => e.key === "Escape" && setSelectedId(null)}
              >
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  className="w-full border-none"
                  style={{ height: 800, display: "block" }}
                />
                {/* Annotation overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="absolute pointer-events-auto"
                      style={{ left: ann.x, top: ann.y }}
                    >
                      <button
                        type="button"
                        className={`flex items-start gap-0.5 group ${
                          selectedId === ann.id
                            ? "ring-2 ring-primary ring-offset-1 rounded"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(ann.id);
                        }}
                      >
                        {/* Drag handle */}
                        <button
                          type="button"
                          aria-label="Drag annotation"
                          className="cursor-move px-1 py-0.5 bg-primary/10 rounded-l text-primary hover:bg-primary/20 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, ann.id)}
                          style={{ touchAction: "none" }}
                        >
                          <svg
                            width="8"
                            height="12"
                            viewBox="0 0 8 12"
                            fill="currentColor"
                            aria-label="drag"
                          >
                            <title>drag handle</title>
                            <circle cx="2" cy="2" r="1.5" />
                            <circle cx="6" cy="2" r="1.5" />
                            <circle cx="2" cy="6" r="1.5" />
                            <circle cx="6" cy="6" r="1.5" />
                            <circle cx="2" cy="10" r="1.5" />
                            <circle cx="6" cy="10" r="1.5" />
                          </svg>
                        </button>
                        <Input
                          value={ann.text}
                          onChange={(e) =>
                            updateAnnotation(ann.id, { text: e.target.value })
                          }
                          style={{
                            fontSize: ann.fontSize,
                            color: ann.color,
                            background: "rgba(255,255,255,0.85)",
                            border: "1px dashed #94a3b8",
                            borderRadius: 4,
                            padding: "2px 6px",
                            minWidth: 80,
                            height: "auto",
                            lineHeight: 1.2,
                          }}
                          className="font-medium"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="p-0.5 text-red-500 hover:text-red-700 bg-white rounded border border-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-ocid="pdf_editor.delete_button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Annotations panel */}
            {annotations.length > 0 && (
              <div className="w-64 border-l border-border bg-white overflow-y-auto p-3 space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Text Annotations
                </h3>
                {annotations.map((ann, idx) => (
                  <button
                    type="button"
                    key={ann.id}
                    className={`w-full text-left p-2 rounded border cursor-pointer transition-colors ${
                      selectedId === ann.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedId(ann.id)}
                    data-ocid={`pdf_editor.item.${idx + 1}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className="text-xs font-medium truncate flex-1"
                        style={{ color: ann.color }}
                      >
                        {ann.text || "(empty)"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ann.fontSize}px · ({Math.round(ann.x)},{" "}
                      {Math.round(ann.y)})
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <button
              type="button"
              className="text-center border-2 border-dashed border-border rounded-2xl p-16 max-w-sm cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-ocid="pdf_editor.dropzone"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Upload a PDF
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a PDF to preview and annotate it with text overlays.
              </p>
              <Button className="gap-2" data-ocid="pdf_editor.upload_button">
                <Upload className="w-4 h-4" />
                Choose PDF File
              </Button>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
