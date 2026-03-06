# SKS Global Export

## Current State

The Design Studio page has 4 tabs: New Order (form), All Orders (CRUD table), Photo Calculator, and Pricing Master. It manages design job orders but has no actual canvas-based design tool — users cannot create or edit visual designs within the app.

## Requested Changes (Diff)

### Add

- **Design Editor tab** in Design Studio — a full Photoshop-like canvas editor built with the HTML5 Canvas API and fabric.js-style interactions (using native Canvas + React state, no external lib required)
- **Canvas Editor features:**
  - Template presets for ID Card, Visiting Card, Passport Photo, Stamp Photo, Banner — each with correct dimensions
  - **Layers panel** (right side): list all elements, show/hide, lock/unlock, reorder (move up/down), delete
  - **Toolbar** (left side): Selection tool, Text tool, Rectangle/Shape tool, Circle tool, Image upload tool, Background color picker
  - **Canvas** (center): interactive drag-move, resize handles on selected element, click to select, click empty to deselect
  - **Properties panel** (right side below layers): context-sensitive — text properties (font, size, bold, italic, color, alignment), shape properties (fill color, stroke color, stroke width, opacity), image properties (opacity, flip H/V)
  - **Top bar**: Template selector, canvas zoom (50%/75%/100%/150%), Undo/Redo (up to 20 steps), Clear canvas, Print/Export as PNG/JPEG
  - Text editing: double-click text element to enter inline edit mode on canvas overlay
  - Background: set solid color or upload image as background
  - Grid/ruler toggle for alignment guides

### Modify

- `DesignStudioPage.tsx` — add a 5th tab "Design Editor" with `<DesignEditorCanvas />` component
- Tab list updated to include the new editor tab

### Remove

Nothing removed.

## Implementation Plan

1. Create `src/frontend/src/components/DesignEditorCanvas.tsx` — full canvas editor component with all tools, layers, undo/redo, export
2. Add "Design Editor" tab to `DesignStudioPage.tsx`
3. Template presets: ID Card (85.6×54mm → 856×540px), Visiting Card (90×55mm → 900×550px), Passport Photo (35×45mm → 350×450px), Stamp Photo (25×35mm → 250×350px), Banner (3000×1000px), Custom
4. Each element has: id, type (text/rect/circle/image), x, y, w, h, rotation, visible, locked, properties
5. Undo/Redo: maintain history array of canvas state snapshots (JSON), pop/push on actions
6. Export: use canvas.toDataURL() to download PNG or JPEG
7. Print: open popup window with canvas image for browser print dialog
