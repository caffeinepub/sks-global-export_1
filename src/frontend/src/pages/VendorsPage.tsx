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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Edit,
  FileDown,
  FileUp,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { Vendor } from "../types";
import {
  downloadCSVString,
  exportToCSV,
  getSampleVendorsCSV,
  parseCSV,
} from "../utils/excelHelpers";
import { formatCurrency, generateId } from "../utils/helpers";

export function VendorsPage() {
  const { vendors, addVendor, updateVendor, deleteVendor, activeCompanyId } =
    useAppStore();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");

  // Import state
  const importFileRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  interface ImportVendorRow {
    name: string;
    phone: string;
    email: string;
    address: string;
    gstin: string;
    error?: string;
    isDuplicate?: boolean;
  }
  const [importRows, setImportRows] = useState<ImportVendorRow[]>([]);
  const [importFileName, setImportFileName] = useState("");

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setEditVendor(null);
  };

  const filteredVendors = useMemo(
    () =>
      vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.phone.includes(search),
      ),
    [vendors, search],
  );

  const openEdit = (v: Vendor) => {
    setEditVendor(v);
    setName(v.name);
    setPhone(v.phone);
    setEmail(v.email || "");
    setAddress(v.address || "");
    setGstin(v.gstin || "");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name || !phone) {
      toast.error("Name and phone required");
      return;
    }
    const vendor: Vendor = {
      id: editVendor?.id || generateId(),
      companyId: activeCompanyId,
      name,
      phone,
      email: email || undefined,
      address: address || undefined,
      gstin: gstin || undefined,
      totalPurchases: editVendor?.totalPurchases || 0,
      isActive: true,
    };
    if (editVendor) {
      updateVendor(vendor);
      toast.success("Vendor updated");
    } else {
      addVendor(vendor);
      toast.success("Vendor added");
    }
    setShowForm(false);
    resetForm();
  };

  const handleExportVendors = () => {
    if (vendors.length === 0) {
      toast.info("No vendors to export");
      return;
    }
    exportToCSV(
      "vendors_export.csv",
      ["Name", "Phone", "Email", "Address", "GSTIN"],
      vendors.map((v) => [
        v.name,
        v.phone,
        v.email || "",
        v.address || "",
        v.gstin || "",
      ]),
    );
    toast.success(`Exported ${vendors.length} vendors`);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }
      const existingPhones = new Set(vendors.map((v) => v.phone));
      const parsed: ImportVendorRow[] = [];
      for (let i = 1; i < rows.length; i++) {
        const [name = "", phone = "", email = "", address = "", gstin = ""] =
          rows[i];
        const error = !name.trim()
          ? "Name is required"
          : !phone.trim()
            ? "Phone is required"
            : undefined;
        const isDuplicate = !!phone.trim() && existingPhones.has(phone.trim());
        parsed.push({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          gstin: gstin.trim(),
          error,
          isDuplicate,
        });
      }
      setImportRows(parsed);
      setShowImportDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    const valid = importRows.filter((r) => !r.error && !r.isDuplicate);
    if (valid.length === 0) {
      toast.error("No new valid rows to import");
      return;
    }
    for (const row of valid) {
      addVendor({
        id: generateId(),
        companyId: activeCompanyId,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        address: row.address || undefined,
        gstin: row.gstin || undefined,
        totalPurchases: 0,
        isActive: true,
      });
    }
    toast.success(`Imported ${valid.length} vendors`);
    setShowImportDialog(false);
    setImportRows([]);
    setImportFileName("");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Vendors</h2>
          <p className="text-sm text-muted-foreground">
            {filteredVendors.length} vendors
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportVendors}
            data-ocid="vendors.export.button"
          >
            <FileDown className="w-4 h-4 mr-1" /> Export
          </Button>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 text-xs border border-input bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer">
              <FileUp className="w-3.5 h-3.5" /> Import
            </span>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFileChange}
              data-ocid="vendors.import.upload_button"
            />
          </label>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Vendor
          </Button>
        </div>
      </div>

      <div className="flex gap-3 bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">Total Purchases</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No vendors found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-semibold">
                      {v.name}
                    </TableCell>
                    <TableCell className="text-xs">{v.phone}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.email || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {v.gstin || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {formatCurrency(v.totalPurchases)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(v)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(v.id)}
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

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVendor ? "Edit" : "Add"} Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name*</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Phone*</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">GSTIN</Label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editVendor ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteVendor(deleteId);
                  setDeleteId(null);
                  toast.success("Vendor deleted");
                }
              }}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Vendors Dialog */}
      <Dialog
        open={showImportDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowImportDialog(false);
            setImportRows([]);
            setImportFileName("");
          }
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[85vh] flex flex-col"
          data-ocid="vendors.import.dialog"
        >
          <DialogHeader>
            <DialogTitle>Import Vendors — {importFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-3">
            <div className="flex gap-3 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span>
                <strong className="text-green-600">
                  {importRows.filter((r) => !r.error && !r.isDuplicate).length}
                </strong>{" "}
                new •{" "}
                <strong className="text-amber-600">
                  {importRows.filter((r) => r.isDuplicate).length}
                </strong>{" "}
                duplicates (skipped) •{" "}
                <strong className="text-destructive">
                  {importRows.filter((r) => !!r.error).length}
                </strong>{" "}
                errors
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-primary underline"
                onClick={() =>
                  downloadCSVString("vendors_sample.csv", getSampleVendorsCSV())
                }
              >
                <Download className="w-3.5 h-3.5 inline mr-0.5" />
                Download Sample
              </button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">GSTIN</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map((row, idx) => (
                      <TableRow
                        // biome-ignore lint/suspicious/noArrayIndexKey: preview list
                        key={idx}
                        className={
                          row.error
                            ? "bg-red-50"
                            : row.isDuplicate
                              ? "bg-amber-50"
                              : "hover:bg-muted/10"
                        }
                        data-ocid={`vendors.import.row.${idx + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.name || (
                            <span className="text-destructive italic">
                              missing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.phone}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.email || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {row.gstin || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.error ? (
                            <span className="text-destructive font-medium">
                              ✗ {row.error}
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-amber-600 font-medium">
                              ⚠ Duplicate
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              ✓ New
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportRows([]);
                setImportFileName("");
              }}
              data-ocid="vendors.import.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={
                importRows.filter((r) => !r.error && !r.isDuplicate).length ===
                0
              }
              data-ocid="vendors.import.submit_button"
            >
              Import{" "}
              {importRows.filter((r) => !r.error && !r.isDuplicate).length}{" "}
              Vendors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
