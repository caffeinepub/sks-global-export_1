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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Calculator,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Layers,
  Palette,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DesignEditorCanvas } from "../components/DesignEditorCanvas";
import { useAppStore } from "../hooks/useAppStore";
import type {
  DesignOrder,
  DesignPricingMaster,
  DesignStatus,
  DesignType,
} from "../types";
import { formatCurrency, formatDate, generateId } from "../utils/helpers";

// ─── Constants ───────────────────────────────────────────────────────────────

const DESIGN_TYPE_LABELS: Record<DesignType, string> = {
  id_card: "ID Card",
  visiting_card: "Visiting Card",
  passport_photo: "Passport Photo",
  stamp_photo: "Stamp Photo",
  banner: "Banner",
  letterhead: "Letterhead",
  envelope: "Envelope",
  certificate: "Certificate",
  custom: "Custom",
};

const DESIGN_TYPE_COLORS: Record<DesignType, string> = {
  id_card: "bg-blue-100 text-blue-700 border-blue-200",
  visiting_card: "bg-emerald-100 text-emerald-700 border-emerald-200",
  passport_photo: "bg-violet-100 text-violet-700 border-violet-200",
  stamp_photo: "bg-pink-100 text-pink-700 border-pink-200",
  banner: "bg-orange-100 text-orange-700 border-orange-200",
  letterhead: "bg-teal-100 text-teal-700 border-teal-200",
  envelope: "bg-cyan-100 text-cyan-700 border-cyan-200",
  certificate: "bg-amber-100 text-amber-700 border-amber-200",
  custom: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_COLORS: Record<DesignStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-300",
  designing: "bg-blue-100 text-blue-700 border-blue-300",
  ready_print: "bg-purple-100 text-purple-700 border-purple-300",
  printing: "bg-orange-100 text-orange-700 border-orange-300",
  completed: "bg-green-100 text-green-700 border-green-300",
  delivered: "bg-gray-100 text-gray-600 border-gray-300",
};

const STATUS_LABELS: Record<DesignStatus, string> = {
  pending: "Pending",
  designing: "Designing",
  ready_print: "Ready to Print",
  printing: "Printing",
  completed: "Completed",
  delivered: "Delivered",
};

const SUB_TYPES: Record<DesignType, string[]> = {
  id_card: ["Single Sided", "Double Sided"],
  visiting_card: ["Standard (90×55mm)", "Square", "Folded"],
  passport_photo: [
    "1 per sheet",
    "4 per sheet",
    "6 per sheet",
    "8 per sheet",
    "12 per sheet",
  ],
  stamp_photo: ["1 per sheet", "4 per sheet", "6 per sheet", "9 per sheet"],
  banner: ["Custom Size"],
  letterhead: ["Single Side", "Double Side"],
  envelope: ["DL", "C5", "Custom"],
  certificate: ["A4", "A3", "Custom"],
  custom: [],
};

const MATERIALS = [
  "Art Card 300gsm",
  "Matt 250gsm",
  "Photo Paper Glossy",
  "Photo Paper Matt",
  "PVC Card",
  "Canvas",
  "Normal Paper",
  "Bond Paper",
];

const DEFAULT_PRICING: Omit<DesignPricingMaster, "id" | "companyId">[] = [
  {
    serviceName: "ID Card - Single Side",
    designType: "id_card",
    unit: "per piece",
    basePrice: 25,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "ID Card - Double Side",
    designType: "id_card",
    unit: "per piece",
    basePrice: 40,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "Visiting Card (100 pcs)",
    designType: "visiting_card",
    unit: "per set",
    basePrice: 500,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "Passport Photo (4/sheet)",
    designType: "passport_photo",
    unit: "per sheet",
    basePrice: 60,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "Stamp Photo (9/sheet)",
    designType: "stamp_photo",
    unit: "per sheet",
    basePrice: 50,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "Banner Print",
    designType: "banner",
    unit: "per sqft",
    basePrice: 40,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "Letterhead (500 pcs)",
    designType: "letterhead",
    unit: "per set",
    basePrice: 800,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "Certificate Print",
    designType: "certificate",
    unit: "per piece",
    basePrice: 30,
    gstRate: 18,
    isActive: true,
  },
  {
    serviceName: "Custom Design",
    designType: "custom",
    unit: "per piece",
    basePrice: 200,
    gstRate: 18,
    isActive: true,
  },
];

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface DesignStudioPageProps {
  onNavigate: (page: string) => void;
  onAddToBill?: (item: {
    name: string;
    price: number;
    qty: number;
    description: string;
  }) => void;
}

// ─── Photo Calculator ─────────────────────────────────────────────────────────

function PhotoCalculator() {
  const [photoW, setPhotoW] = useState(35);
  const [photoH, setPhotoH] = useState(45);
  const [sheetSize, setSheetSize] = useState("A4");
  const [margin, setMargin] = useState(5);
  const [spacing, setSpacing] = useState(2);
  const [photosNeeded, setPhotosNeeded] = useState(4);
  const [pricePerSheet, setPricePerSheet] = useState(60);

  const SHEET_SIZES: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    "4R": { w: 102, h: 152 },
    "6R": { w: 152, h: 203 },
    "5R": { w: 127, h: 178 },
  };

  const sheet = SHEET_SIZES[sheetSize] || SHEET_SIZES.A4;
  const usableW = sheet.w - 2 * margin;
  const usableH = sheet.h - 2 * margin;
  const photosPerRow = Math.floor((usableW + spacing) / (photoW + spacing));
  const photosPerCol = Math.floor((usableH + spacing) / (photoH + spacing));
  const totalPerSheet = Math.max(0, photosPerRow * photosPerCol);
  const sheetsNeeded =
    totalPerSheet > 0 ? Math.ceil(photosNeeded / totalPerSheet) : 0;
  const totalCost = sheetsNeeded * pricePerSheet;

  const handlePrint = () => {
    const boxes: string[] = [];
    for (let i = 1; i <= totalPerSheet; i++) {
      boxes.push(
        `<div style="width:${photoW}mm;height:${photoH}mm;border:1px solid #aaa;background:#e8f4ff;display:flex;align-items:center;justify-content:center;font-size:10px;color:#555;flex-shrink:0;box-sizing:border-box;">Photo ${i}</div>`,
      );
    }
    const grid = `<div style="display:grid;grid-template-columns:repeat(${photosPerRow},${photoW}mm);gap:${spacing}mm;padding:${margin}mm;">${boxes.join("")}</div>`;
    const html = `<!DOCTYPE html><html><head><title>Photo Layout</title><style>@media print{body{margin:0}}body{margin:0;background:#fff;}</style></head><body>${grid}</body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => win.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Photo Layout Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset Buttons */}
            <div>
              <Label className="text-xs mb-2 block">Presets</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Passport (35×45)", w: 35, h: 45 },
                  { label: "Stamp (25×35)", w: 25, h: 35 },
                  { label: "Visa (51×51)", w: 51, h: 51 },
                ].map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setPhotoW(p.w);
                      setPhotoH(p.h);
                    }}
                    data-ocid="design.calculator.toggle"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Photo Width (mm)</Label>
                <Input
                  type="number"
                  value={photoW}
                  onChange={(e) => setPhotoW(Number(e.target.value))}
                  min={1}
                  data-ocid="design.calculator.width.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Photo Height (mm)</Label>
                <Input
                  type="number"
                  value={photoH}
                  onChange={(e) => setPhotoH(Number(e.target.value))}
                  min={1}
                  data-ocid="design.calculator.height.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sheet Size</Label>
                <Select value={sheetSize} onValueChange={setSheetSize}>
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="design.calculator.sheet.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["A4", "4R", "5R", "6R"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Margin (mm)</Label>
                <Input
                  type="number"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  min={0}
                  data-ocid="design.calculator.margin.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Spacing (mm)</Label>
                <Input
                  type="number"
                  value={spacing}
                  onChange={(e) => setSpacing(Number(e.target.value))}
                  min={0}
                  data-ocid="design.calculator.spacing.input"
                />
              </div>
            </div>

            {/* Result summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Photos per row</span>
                <span className="font-bold">{photosPerRow}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Photos per column</span>
                <span className="font-bold">{photosPerCol}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-muted-foreground font-medium">
                  Total per sheet
                </span>
                <span className="font-bold text-primary text-sm">
                  {totalPerSheet}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Photos Needed</Label>
                  <Input
                    type="number"
                    value={photosNeeded}
                    onChange={(e) => setPhotosNeeded(Number(e.target.value))}
                    min={1}
                    data-ocid="design.calculator.needed.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Price per Sheet (₹)</Label>
                  <Input
                    type="number"
                    value={pricePerSheet}
                    onChange={(e) => setPricePerSheet(Number(e.target.value))}
                    min={0}
                    data-ocid="design.calculator.price.input"
                  />
                </div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Sheets Required</span>
                  <span className="font-bold">{sheetsNeeded}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-primary">
                  <span>Total Cost</span>
                  <span>{formatCurrency(totalCost)}</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handlePrint}
              disabled={totalPerSheet === 0}
              data-ocid="design.calculator.print.button"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Layout ({totalPerSheet} slots)
            </Button>
          </CardContent>
        </Card>

        {/* Visual Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sheet Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center min-h-[400px]">
              {totalPerSheet === 0 ? (
                <div className="text-center text-muted-foreground text-sm">
                  <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Adjust dimensions to see preview</p>
                </div>
              ) : (
                <div
                  className="bg-white border-2 border-gray-300 shadow-md"
                  style={{
                    padding: `${Math.min(margin, 12)}px`,
                    maxWidth: "100%",
                    maxHeight: "400px",
                    overflow: "hidden",
                    aspectRatio: `${sheet.w} / ${sheet.h}`,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${photosPerRow}, 1fr)`,
                      gap: `${Math.min(spacing, 4)}px`,
                      height: "100%",
                    }}
                  >
                    {Array.from({ length: totalPerSheet }, (_, i) => i + 1).map(
                      (num) => (
                        <div
                          key={`photo-slot-${num}`}
                          className="bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-500"
                          style={{ fontSize: "8px", minHeight: "20px" }}
                        >
                          {num}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {sheetSize} ({sheet.w}×{sheet.h}mm) · {totalPerSheet} photos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Pricing Master ───────────────────────────────────────────────────────────

function PricingMasterTab() {
  const {
    designPricing,
    addDesignPricing,
    updateDesignPricing,
    deleteDesignPricing,
    activeCompanyId,
  } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formServiceName, setFormServiceName] = useState("");
  const [formDesignType, setFormDesignType] = useState<DesignType>("id_card");
  const [formUnit, setFormUnit] =
    useState<DesignPricingMaster["unit"]>("per piece");
  const [formBasePrice, setFormBasePrice] = useState("");
  const [formGstRate, setFormGstRate] = useState("18");

  const resetForm = () => {
    setFormServiceName("");
    setFormDesignType("id_card");
    setFormUnit("per piece");
    setFormBasePrice("");
    setFormGstRate("18");
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: DesignPricingMaster) => {
    setEditingId(item.id);
    setFormServiceName(item.serviceName);
    setFormDesignType(item.designType);
    setFormUnit(item.unit);
    setFormBasePrice(String(item.basePrice));
    setFormGstRate(String(item.gstRate));
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formServiceName.trim()) {
      toast.error("Service name required");
      return;
    }
    const basePrice = Number(formBasePrice);
    if (!basePrice || basePrice <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    if (editingId) {
      updateDesignPricing(editingId, {
        serviceName: formServiceName.trim(),
        designType: formDesignType,
        unit: formUnit,
        basePrice,
        gstRate: Number(formGstRate),
      });
      toast.success("Pricing updated");
    } else {
      const item: DesignPricingMaster = {
        id: generateId(),
        companyId: activeCompanyId,
        serviceName: formServiceName.trim(),
        designType: formDesignType,
        unit: formUnit,
        basePrice,
        gstRate: Number(formGstRate),
        isActive: true,
      };
      addDesignPricing(item);
      toast.success("Pricing added");
    }
    setShowForm(false);
    resetForm();
  };

  const handleImportDefaults = () => {
    let added = 0;
    for (const def of DEFAULT_PRICING) {
      const exists = designPricing.some(
        (p) => p.serviceName === def.serviceName,
      );
      if (!exists) {
        addDesignPricing({
          id: generateId(),
          companyId: activeCompanyId,
          ...def,
        });
        added++;
      }
    }
    toast.success(
      added > 0
        ? `${added} default prices imported`
        : "All defaults already exist",
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDesignPricing(deleteId);
    toast.success("Pricing deleted");
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {designPricing.length} pricing entries
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleImportDefaults}
            data-ocid="design.pricing.import.button"
          >
            <Download className="w-4 h-4 mr-1" />
            Import Defaults
          </Button>
          <Button
            size="sm"
            onClick={openAdd}
            data-ocid="design.pricing.add.button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Pricing
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="design.pricing.table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Service Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs text-right">Base Price</TableHead>
                <TableHead className="text-xs text-right">GST %</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {designPricing.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="design.pricing.empty_state"
                  >
                    <Palette className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      No pricing entries. Click "Import Defaults" to get
                      started.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                designPricing.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/20"
                    data-ocid={`design.pricing.item.${idx + 1}`}
                  >
                    <TableCell className="text-xs font-medium">
                      {item.serviceName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${DESIGN_TYPE_COLORS[item.designType]}`}
                      >
                        {DESIGN_TYPE_LABELS[item.designType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.unit}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold">
                      {formatCurrency(item.basePrice)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {item.gstRate}%
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={(v) =>
                          updateDesignPricing(item.id, { isActive: v })
                        }
                        data-ocid={`design.pricing.toggle.${idx + 1}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(item)}
                          data-ocid={`design.pricing.edit_button.${idx + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(item.id)}
                          data-ocid={`design.pricing.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md" data-ocid="design.pricing.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Pricing" : "Add Pricing Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Service Name *</Label>
              <Input
                value={formServiceName}
                onChange={(e) => setFormServiceName(e.target.value)}
                placeholder="e.g. ID Card - Double Sided"
                data-ocid="design.pricing.form.name.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Design Type</Label>
                <Select
                  value={formDesignType}
                  onValueChange={(v) => setFormDesignType(v as DesignType)}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="design.pricing.form.type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DESIGN_TYPE_LABELS) as DesignType[]).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {DESIGN_TYPE_LABELS[t]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Select
                  value={formUnit}
                  onValueChange={(v) =>
                    setFormUnit(v as DesignPricingMaster["unit"])
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="design.pricing.form.unit.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["per piece", "per sheet", "per sqft", "per set"].map(
                      (u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Base Price (₹) *</Label>
                <Input
                  type="number"
                  value={formBasePrice}
                  onChange={(e) => setFormBasePrice(e.target.value)}
                  placeholder="0"
                  data-ocid="design.pricing.form.price.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GST Rate (%)</Label>
                <Select value={formGstRate} onValueChange={setFormGstRate}>
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="design.pricing.form.gst.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["0", "5", "12", "18", "28"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              data-ocid="design.pricing.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              data-ocid="design.pricing.form.save_button"
            >
              {editingId ? "Save Changes" : "Add Pricing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="design.pricing.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="design.pricing.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="design.pricing.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Print Job Card ───────────────────────────────────────────────────────────

function printJobCard(order: DesignOrder, companyName: string) {
  const balance = order.price - order.advancePaid;
  const html = `<!DOCTYPE html>
<html>
<head>
<title>Job Card - ${order.orderNo}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; margin: 0; padding: 16px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 12px; }
  .company-name { font-size: 18px; font-weight: bold; color: #1a1a2e; }
  .job-title { font-size: 14px; font-weight: bold; background: #1a1a2e; color: white; padding: 4px 12px; border-radius: 4px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .field { background: #f5f5f5; padding: 6px 10px; border-radius: 4px; }
  .field-label { font-size: 9px; text-transform: uppercase; color: #666; margin-bottom: 2px; letter-spacing: 0.5px; }
  .field-value { font-weight: 600; font-size: 12px; }
  .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #1a1a2e; margin: 12px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .instructions-box { border: 1px solid #ccc; min-height: 50px; padding: 8px; border-radius: 4px; font-size: 11px; background: #fffbe6; }
  .money-row { display: flex; justify-content: space-between; padding: 4px 8px; }
  .money-row.balance { background: #fee2e2; border-radius: 4px; font-weight: bold; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: bold; text-transform: uppercase; background: #fef3c7; color: #92400e; }
  .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 12px; display: flex; justify-content: space-between; }
  .signature-line { border-bottom: 1px solid #555; width: 160px; margin-top: 20px; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${companyName}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">Design Services</div>
    </div>
    <div class="job-title">DESIGN JOB CARD</div>
  </div>

  <div class="grid-2">
    <div class="field"><div class="field-label">Order No</div><div class="field-value">${order.orderNo}</div></div>
    <div class="field"><div class="field-label">Date</div><div class="field-value">${formatDate(order.date)}</div></div>
    <div class="field"><div class="field-label">Delivery Date</div><div class="field-value">${formatDate(order.deliveryDate)}</div></div>
    <div class="field"><div class="field-label">Status</div><div class="field-value"><span class="status-badge">${STATUS_LABELS[order.status]}</span></div></div>
  </div>

  <div class="section-title">Customer Details</div>
  <div class="grid-2">
    <div class="field"><div class="field-label">Customer Name</div><div class="field-value">${order.customerName}</div></div>
    <div class="field"><div class="field-label">Phone</div><div class="field-value">${order.customerPhone}</div></div>
  </div>

  <div class="section-title">Design Specifications</div>
  <div class="grid-2">
    <div class="field"><div class="field-label">Design Type</div><div class="field-value">${DESIGN_TYPE_LABELS[order.designType]}</div></div>
    <div class="field"><div class="field-label">Sub Type</div><div class="field-value">${order.subType}</div></div>
    <div class="field"><div class="field-label">Quantity</div><div class="field-value">${order.quantity}</div></div>
    <div class="field"><div class="field-label">Material</div><div class="field-value">${order.material}</div></div>
    <div class="field"><div class="field-label">Lamination</div><div class="field-value">${order.lamination}</div></div>
    <div class="field"><div class="field-label">Color Mode</div><div class="field-value">${order.colorMode}</div></div>
    <div class="field" style="grid-column:span 2;"><div class="field-label">Design Source</div><div class="field-value">${order.designSource}</div></div>
  </div>

  <div class="section-title">Special Instructions</div>
  <div class="instructions-box">${order.specialInstructions || "(No special instructions)"}</div>

  <div class="section-title">Payment Summary</div>
  <div style="border:1px solid #ddd;border-radius:6px;overflow:hidden;">
    <div class="money-row"><span>Total Price</span><span>₹${order.price.toFixed(2)}${order.gstIncluded ? ` (incl. ${order.gstRate}% GST)` : ""}</span></div>
    <div class="money-row"><span>Advance Paid</span><span>₹${order.advancePaid.toFixed(2)}</span></div>
    <div class="money-row balance"><span>Balance Due</span><span>₹${balance.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <div>
      <div style="font-size:10px;color:#555;">Prepared by</div>
      <div class="signature-line"></div>
    </div>
    <div>
      <div style="font-size:10px;color:#555;">Received by</div>
      <div class="signature-line"></div>
    </div>
  </div>
</body>
</html>`;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }
}

// ─── New Order Form ───────────────────────────────────────────────────────────

interface NewOrderFormProps {
  onCreated: () => void;
}

function NewOrderForm({ onCreated }: NewOrderFormProps) {
  const {
    customers,
    designPricing,
    addDesignOrder,
    designOrders,
    activeCompanyId,
  } = useAppStore();

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [walkingName, setWalkingName] = useState("");
  const [walkingPhone, setWalkingPhone] = useState("");
  const [isWalking, setIsWalking] = useState(false);

  const [designType, setDesignType] = useState<DesignType>("visiting_card");
  const [subType, setSubType] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [material, setMaterial] = useState("Art Card 300gsm");
  const [lamination, setLamination] =
    useState<DesignOrder["lamination"]>("None");
  const [colorMode, setColorMode] = useState<DesignOrder["colorMode"]>("Color");
  const [designSource, setDesignSource] =
    useState<DesignOrder["designSource"]>("Customer File");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
  );
  const [price, setPrice] = useState("");
  const [gstIncluded, setGstIncluded] = useState(true);
  const [gstRate, setGstRate] = useState("18");
  const [advancePaid, setAdvancePaid] = useState("0");
  const [status, setStatus] = useState<DesignStatus>("pending");

  // Auto-fill sub-type when design type changes
  const handleDesignTypeChange = (t: DesignType) => {
    setDesignType(t);
    setSubType(SUB_TYPES[t][0] || "");
    // Auto-fill price from pricing master
    const match = designPricing.find((p) => p.designType === t && p.isActive);
    if (match) {
      setPrice(String(match.basePrice));
      setGstRate(String(match.gstRate));
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return customers
      .filter(
        (c) =>
          c.customerType === "registered" &&
          (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone.includes(customerSearch)),
      )
      .slice(0, 5);
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSelectCustomer = (c: (typeof customers)[0]) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch(c.name);
    setIsWalking(false);
    setWalkingName("");
    setWalkingPhone("");
  };

  const handleSubmit = () => {
    const customerName = isWalking
      ? walkingName.trim()
      : selectedCustomer?.name || walkingName.trim();
    const customerPhone = isWalking
      ? walkingPhone.trim()
      : selectedCustomer?.phone || walkingPhone.trim();

    if (!customerName) {
      toast.error("Customer name required");
      return;
    }
    if (!subType && SUB_TYPES[designType].length > 0) {
      toast.error("Please select a sub type");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error("Enter valid quantity");
      return;
    }
    const priceVal = Number(price);
    if (!priceVal || priceVal <= 0) {
      toast.error("Enter valid price");
      return;
    }
    if (!deliveryDate) {
      toast.error("Delivery date required");
      return;
    }

    // Generate order number
    const companyOrders = designOrders.filter(
      (o) => o.companyId === activeCompanyId,
    );
    const seqNo = String(companyOrders.length + 1).padStart(3, "0");
    const orderNo = `DS${seqNo}`;

    const order: DesignOrder = {
      id: generateId(),
      companyId: activeCompanyId,
      orderNo,
      date: new Date().toISOString().split("T")[0],
      customerId: isWalking ? undefined : selectedCustomerId || undefined,
      customerName,
      customerPhone: customerPhone || "",
      designType,
      subType: subType || (SUB_TYPES[designType][0] ?? designType),
      quantity: qty,
      material,
      lamination,
      colorMode,
      designSource,
      specialInstructions,
      deliveryDate,
      price: priceVal,
      gstIncluded,
      gstRate: Number(gstRate),
      advancePaid: Number(advancePaid) || 0,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addDesignOrder(order);
    toast.success(`Design order ${orderNo} created!`);
    onCreated();

    // Reset
    setCustomerSearch("");
    setSelectedCustomerId("");
    setWalkingName("");
    setWalkingPhone("");
    setIsWalking(false);
    setDesignType("visiting_card");
    setSubType(SUB_TYPES.visiting_card[0]);
    setQuantity("1");
    setMaterial("Art Card 300gsm");
    setLamination("None");
    setColorMode("Color");
    setDesignSource("Customer File");
    setSpecialInstructions("");
    setDeliveryDate(
      new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    );
    setPrice("");
    setGstIncluded(true);
    setGstRate("18");
    setAdvancePaid("0");
    setStatus("pending");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer type toggle */}
          <div className="flex items-center gap-3">
            <Label className="text-xs">Walking Customer</Label>
            <Switch
              checked={isWalking}
              onCheckedChange={(v) => {
                setIsWalking(v);
                if (v) {
                  setSelectedCustomerId("");
                  setCustomerSearch("");
                }
              }}
              data-ocid="design.order.walking.switch"
            />
          </div>

          {isWalking ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={walkingName}
                  onChange={(e) => setWalkingName(e.target.value)}
                  placeholder="Customer name"
                  data-ocid="design.order.customer_name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={walkingPhone}
                  onChange={(e) => setWalkingPhone(e.target.value)}
                  placeholder="Mobile number"
                  data-ocid="design.order.customer_phone.input"
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <Label className="text-xs mb-1.5 block">
                Search Registered Customer
              </Label>
              <Input
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  if (!e.target.value) setSelectedCustomerId("");
                }}
                placeholder="Type name or phone..."
                data-ocid="design.order.customer_search.input"
              />
              {filteredCustomers.length > 0 && !selectedCustomerId && (
                <div className="absolute z-10 w-full bg-white border border-border rounded-lg mt-1 shadow-lg">
                  {filteredCustomers.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm"
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.phone}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedCustomer.name} · {selectedCustomer.phone}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Design Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Design Type *</Label>
              <Select
                value={designType}
                onValueChange={(v) => handleDesignTypeChange(v as DesignType)}
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="design.order.type.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DESIGN_TYPE_LABELS) as DesignType[]).map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {DESIGN_TYPE_LABELS[t]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Sub Type</Label>
              {SUB_TYPES[designType].length > 0 ? (
                <Select value={subType} onValueChange={setSubType}>
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="design.order.subtype.select"
                  >
                    <SelectValue placeholder="Select sub type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_TYPES[designType].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  placeholder="Custom description"
                  data-ocid="design.order.subtype.input"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Quantity *</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                data-ocid="design.order.quantity.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger
                  className="text-xs"
                  data-ocid="design.order.material.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Lamination</Label>
              <Select
                value={lamination}
                onValueChange={(v) =>
                  setLamination(v as DesignOrder["lamination"])
                }
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="design.order.lamination.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["None", "Gloss", "Matt", "Soft Touch"].map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Color Mode</Label>
              <Select
                value={colorMode}
                onValueChange={(v) =>
                  setColorMode(v as DesignOrder["colorMode"])
                }
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="design.order.colormode.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Color">Color</SelectItem>
                  <SelectItem value="Black & White">Black & White</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Design Source</Label>
              <Select
                value={designSource}
                onValueChange={(v) =>
                  setDesignSource(v as DesignOrder["designSource"])
                }
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="design.order.source.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer File">
                    <span className="flex items-center gap-2">
                      <Upload className="w-3 h-3" />
                      Customer Brings File
                    </span>
                  </SelectItem>
                  <SelectItem value="We Design">
                    <span className="flex items-center gap-2">
                      <Palette className="w-3 h-3" />
                      We Design (+charge)
                    </span>
                  </SelectItem>
                  <SelectItem value="Use Template">
                    <span className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Use Template
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Delivery Date *</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                data-ocid="design.order.delivery.input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Special Instructions</Label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requirements, dimensions, colors, text content..."
              rows={3}
              data-ocid="design.order.instructions.textarea"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Pricing & Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Price (₹) *</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                data-ocid="design.order.price.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GST Rate</Label>
              <Select value={gstRate} onValueChange={setGstRate}>
                <SelectTrigger
                  className="text-xs"
                  data-ocid="design.order.gstrate.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["0", "5", "12", "18", "28"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Advance Paid (₹)</Label>
              <Input
                type="number"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(e.target.value)}
                placeholder="0"
                data-ocid="design.order.advance.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as DesignStatus)}
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="design.order.status.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as DesignStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={gstIncluded}
              onCheckedChange={setGstIncluded}
              data-ocid="design.order.gst.switch"
            />
            <Label className="text-xs">Price includes GST</Label>
          </div>

          {price && Number(price) > 0 && (
            <div className="bg-muted/40 rounded-lg p-3 text-xs flex flex-wrap gap-4">
              <div>
                <span className="text-muted-foreground">Balance Due: </span>
                <span className="font-bold text-destructive">
                  {formatCurrency(
                    Math.max(0, Number(price) - Number(advancePaid)),
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">GST {gstRate}%: </span>
                <span className="font-bold">
                  {gstIncluded
                    ? formatCurrency(
                        (Number(price) * Number(gstRate)) /
                          (100 + Number(gstRate)),
                      )
                    : formatCurrency((Number(price) * Number(gstRate)) / 100)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        data-ocid="design.order.submit_button"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Design Order
      </Button>
    </div>
  );
}

// ─── All Orders Tab ───────────────────────────────────────────────────────────

interface AllOrdersTabProps {
  onAddToBill?: DesignStudioPageProps["onAddToBill"];
}

function AllOrdersTab({ onAddToBill }: AllOrdersTabProps) {
  const { designOrders, updateDesignOrder, deleteDesignOrder, activeCompany } =
    useAppStore();

  const [filterStatus, setFilterStatus] = useState<DesignStatus | "all">("all");
  const [filterType, setFilterType] = useState<DesignType | "all">("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [editOrder, setEditOrder] = useState<DesignOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Edit form state
  const [editStatus, setEditStatus] = useState<DesignStatus>("pending");
  const [editDelivery, setEditDelivery] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editAdvance, setEditAdvance] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  const filtered = useMemo(() => {
    return [...designOrders]
      .filter((o) => {
        if (filterStatus !== "all" && o.status !== filterStatus) return false;
        if (filterType !== "all" && o.designType !== filterType) return false;
        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          if (
            !o.customerName.toLowerCase().includes(q) &&
            !o.orderNo.toLowerCase().includes(q)
          )
            return false;
        }
        if (filterFrom && o.date < filterFrom) return false;
        if (filterTo && o.date > filterTo) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [
    designOrders,
    filterStatus,
    filterType,
    filterSearch,
    filterFrom,
    filterTo,
  ]);

  const summaryStats = useMemo(() => {
    const orders = designOrders;
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      inProgress: orders.filter((o) =>
        ["designing", "ready_print", "printing"].includes(o.status),
      ).length,
      completed: orders.filter((o) =>
        ["completed", "delivered"].includes(o.status),
      ).length,
      revenue: orders.reduce((s, o) => s + o.price, 0),
      outstanding: orders.reduce(
        (s, o) => s + Math.max(0, o.price - o.advancePaid),
        0,
      ),
    };
  }, [designOrders]);

  const openEdit = (order: DesignOrder) => {
    setEditOrder(order);
    setEditStatus(order.status);
    setEditDelivery(order.deliveryDate);
    setEditPrice(String(order.price));
    setEditAdvance(String(order.advancePaid));
    setEditInstructions(order.specialInstructions);
  };

  const handleSaveEdit = () => {
    if (!editOrder) return;
    updateDesignOrder(editOrder.id, {
      status: editStatus,
      deliveryDate: editDelivery,
      price: Number(editPrice) || editOrder.price,
      advancePaid: Number(editAdvance) || 0,
      specialInstructions: editInstructions,
    });
    toast.success("Order updated");
    setEditOrder(null);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDesignOrder(deleteId);
    toast.success("Order deleted");
    setDeleteId(null);
  };

  const statusFlow: DesignStatus[] = [
    "pending",
    "designing",
    "ready_print",
    "printing",
    "completed",
    "delivered",
  ];

  const nextStatus = (current: DesignStatus): DesignStatus | null => {
    const idx = statusFlow.indexOf(current);
    return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Total",
            value: summaryStats.total,
            color: "border-l-gray-400",
          },
          {
            label: "Pending",
            value: summaryStats.pending,
            color: "border-l-amber-400",
          },
          {
            label: "In Progress",
            value: summaryStats.inProgress,
            color: "border-l-blue-400",
          },
          {
            label: "Completed",
            value: summaryStats.completed,
            color: "border-l-green-400",
          },
          {
            label: "Revenue",
            value: formatCurrency(summaryStats.revenue),
            color: "border-l-primary",
            isText: true,
          },
          {
            label: "Outstanding",
            value: formatCurrency(summaryStats.outstanding),
            color: "border-l-destructive",
            isText: true,
          },
        ].map((s) => (
          <Card key={s.label} className={`border-l-4 ${s.color}`}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p
                className={`font-bold mt-0.5 ${s.isText ? "text-sm" : "text-xl"}`}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl border border-border shadow-xs">
        <Input
          placeholder="Search order/customer..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="text-xs w-48"
          data-ocid="design.orders.search_input"
        />
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as DesignStatus | "all")}
        >
          <SelectTrigger
            className="text-xs w-40"
            data-ocid="design.orders.status.select"
          >
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusFlow.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as DesignType | "all")}
        >
          <SelectTrigger
            className="text-xs w-40"
            data-ocid="design.orders.type.select"
          >
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.keys(DESIGN_TYPE_LABELS) as DesignType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {DESIGN_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="text-xs w-36"
          data-ocid="design.orders.from.input"
        />
        <Input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="text-xs w-36"
          data-ocid="design.orders.to.input"
        />
        {(filterSearch ||
          filterStatus !== "all" ||
          filterType !== "all" ||
          filterFrom ||
          filterTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              setFilterSearch("");
              setFilterStatus("all");
              setFilterType("all");
              setFilterFrom("");
              setFilterTo("");
            }}
            data-ocid="design.orders.reset.button"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {filtered.length} orders
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="design.orders.table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Order No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
                <TableHead className="text-xs text-right">Balance</TableHead>
                <TableHead className="text-xs">Delivery</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="design.orders.empty_state"
                  >
                    <Palette className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No design orders found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order, idx) => {
                  const balance = Math.max(0, order.price - order.advancePaid);
                  const next = nextStatus(order.status);
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/20"
                      data-ocid={`design.orders.item.${idx + 1}`}
                    >
                      <TableCell className="text-xs font-bold text-primary">
                        {order.orderNo}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(order.date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{order.customerName}</div>
                        {order.customerPhone && (
                          <div className="text-muted-foreground text-xs">
                            {order.customerPhone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${DESIGN_TYPE_COLORS[order.designType]}`}
                        >
                          {DESIGN_TYPE_LABELS[order.designType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {formatCurrency(order.price)}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {balance > 0 ? (
                          <span className="text-destructive font-bold">
                            {formatCurrency(balance)}
                          </span>
                        ) : (
                          <span className="text-green-600 font-bold">Paid</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(order.deliveryDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_COLORS[order.status]}`}
                          >
                            {STATUS_LABELS[order.status]}
                          </Badge>
                          {next && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDesignOrder(order.id, {
                                  status: next,
                                })
                              }
                              title={`Advance to ${STATUS_LABELS[next]}`}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(order)}
                            title="Edit"
                            data-ocid={`design.orders.edit_button.${idx + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              printJobCard(
                                order,
                                activeCompany?.name || "SKS Global Export",
                              )
                            }
                            title="Print Job Card"
                            data-ocid={`design.orders.print.button.${idx + 1}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          {onAddToBill && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600"
                              onClick={() =>
                                onAddToBill({
                                  name: `${DESIGN_TYPE_LABELS[order.designType]} - ${order.subType}`,
                                  price: order.price,
                                  qty: order.quantity,
                                  description: `Design Order ${order.orderNo}`,
                                })
                              }
                              title="Add to Bill"
                              data-ocid={`design.orders.add_to_bill.button.${idx + 1}`}
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(order.id)}
                            title="Delete"
                            data-ocid={`design.orders.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editOrder}
        onOpenChange={(open) => !open && setEditOrder(null)}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="design.orders.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Order {editOrder?.orderNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as DesignStatus)}
              >
                <SelectTrigger data-ocid="design.orders.edit.status.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusFlow.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Delivery Date</Label>
                <Input
                  type="date"
                  value={editDelivery}
                  onChange={(e) => setEditDelivery(e.target.value)}
                  data-ocid="design.orders.edit.delivery.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹)</Label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  data-ocid="design.orders.edit.price.input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Advance Paid (₹)</Label>
              <Input
                type="number"
                value={editAdvance}
                onChange={(e) => setEditAdvance(e.target.value)}
                data-ocid="design.orders.edit.advance.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Special Instructions</Label>
              <Textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                rows={2}
                data-ocid="design.orders.edit.instructions.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOrder(null)}
              data-ocid="design.orders.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              data-ocid="design.orders.edit.save_button"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="design.orders.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Design Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="design.orders.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="design.orders.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DesignStudioPage({
  onNavigate,
  onAddToBill,
}: DesignStudioPageProps) {
  const [activeTab, setActiveTab] = useState("new-order");

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-pink-500 rounded-xl">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Design Studio
            </h2>
            <p className="text-sm text-muted-foreground">
              ID Cards · Visiting Cards · Passport Photos · Stamps · Banners &
              more
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("billing/new")}
          data-ocid="design.nav.billing.button"
        >
          Go to Billing
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto" data-ocid="design.tabs">
          <TabsTrigger
            value="new-order"
            className="gap-2"
            data-ocid="design.new_order.tab"
          >
            <Plus className="w-4 h-4" />
            New Order
          </TabsTrigger>
          <TabsTrigger
            value="all-orders"
            className="gap-2"
            data-ocid="design.all_orders.tab"
          >
            <FileText className="w-4 h-4" />
            All Orders
          </TabsTrigger>
          <TabsTrigger
            value="calculator"
            className="gap-2"
            data-ocid="design.calculator.tab"
          >
            <Calculator className="w-4 h-4" />
            Photo Calculator
          </TabsTrigger>
          <TabsTrigger
            value="pricing"
            className="gap-2"
            data-ocid="design.pricing.tab"
          >
            <TrendingUp className="w-4 h-4" />
            Pricing Master
          </TabsTrigger>
          <TabsTrigger
            value="editor"
            className="gap-2"
            data-ocid="design.editor.tab"
          >
            <Wand2 className="w-4 h-4" />
            Design Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-order" className="mt-4">
          <NewOrderForm onCreated={() => setActiveTab("all-orders")} />
        </TabsContent>

        <TabsContent value="all-orders" className="mt-4">
          <AllOrdersTab onAddToBill={onAddToBill} />
        </TabsContent>

        <TabsContent value="calculator" className="mt-4">
          <PhotoCalculator />
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <PricingMasterTab />
        </TabsContent>

        <TabsContent value="editor" className="mt-0 -mx-6">
          <DesignEditorCanvas />
        </TabsContent>
      </Tabs>
    </div>
  );
}
