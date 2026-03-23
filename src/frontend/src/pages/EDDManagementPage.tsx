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
import { Clock, Edit2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { CourierBrand, CourierProduct } from "../types";
import type { EDDRule } from "../utils/storage";
import { getCourierBrands, getEDDRules, saveEDDRules } from "../utils/storage";

const ZONE_LABELS: Record<EDDRule["zone"], string> = {
  metro: "Metro",
  non_metro: "Non-Metro",
  all: "All Zones",
};

const emptyRule = (): Omit<EDDRule, "id"> => ({
  name: "",
  productType: "",
  city: "",
  state: "",
  zone: "all",
  deliveryDays: 3,
  isActive: true,
});

export function EDDManagementPage() {
  const [rules, setRules] = useState<EDDRule[]>(getEDDRules);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all_filter");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [courierBrands] = useState<CourierBrand[]>(() =>
    getCourierBrands("shared"),
  );
  const [selectedBrandForEDD, setSelectedBrandForEDD] = useState("");
  const [editingRule, setEditingRule] = useState<EDDRule | null>(null);
  const [form, setForm] = useState<Omit<EDDRule, "id">>(emptyRule());

  const filtered = rules.filter((r) => {
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.productType.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase());
    const matchZone = zoneFilter === "all_filter" || r.zone === zoneFilter;
    return matchSearch && matchZone;
  });

  const openAdd = () => {
    setEditingRule(null);
    setForm(emptyRule());
    setDialogOpen(true);
  };

  const openEdit = (rule: EDDRule) => {
    setEditingRule(rule);
    setForm({ ...rule });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (form.deliveryDays < 1 || form.deliveryDays > 30) {
      toast.error("Delivery days must be between 1 and 30");
      return;
    }
    let updated: EDDRule[];
    if (editingRule) {
      updated = rules.map((r) =>
        r.id === editingRule.id ? { ...form, id: editingRule.id } : r,
      );
      toast.success("EDD rule updated");
    } else {
      const newRule: EDDRule = {
        ...form,
        id: `edd_${Date.now()}`,
      };
      updated = [...rules, newRule];
      toast.success("EDD rule added");
    }
    saveEDDRules(updated);
    setRules(updated);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    saveEDDRules(updated);
    setRules(updated);
    toast.success("EDD rule deleted");
  };

  const toggleActive = (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, isActive: !r.isActive } : r,
    );
    saveEDDRules(updated);
    setRules(updated);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            EDD Rules
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure Estimated Delivery Date rules by product type, city,
            state, and zone
          </p>
        </div>
        <Button onClick={openAdd} data-ocid="edd.primary_button">
          <Plus className="w-4 h-4 mr-2" />
          Add EDD Rule
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, product type, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-ocid="edd.search_input"
              />
            </div>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-48" data-ocid="edd.select">
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_filter">All Zones</SelectItem>
                <SelectItem value="metro">Metro</SelectItem>
                <SelectItem value="non_metro">Non-Metro</SelectItem>
                <SelectItem value="all">All (no zone filter)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {filtered.length} Rule{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Product Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead className="text-center">Delivery Days</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                      data-ocid="edd.empty_state"
                    >
                      No EDD rules found. Add your first rule to get started.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((rule, idx) => (
                  <TableRow key={rule.id} data-ocid={`edd.item.${idx + 1}`}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      {rule.productType ? (
                        <Badge variant="secondary">{rule.productType}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          All types
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rule.city || (
                        <span className="text-muted-foreground text-xs">
                          Any
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rule.state || (
                        <span className="text-muted-foreground text-xs">
                          Any
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rule.zone === "metro"
                            ? "default"
                            : rule.zone === "non_metro"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {ZONE_LABELS[rule.zone]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-primary">
                        {rule.deliveryDays}d
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleActive(rule.id)}
                        data-ocid={`edd.switch.${idx + 1}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(rule)}
                          data-ocid={`edd.edit_button.${idx + 1}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(rule.id)}
                          data-ocid={`edd.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit EDD Rule" : "Add EDD Rule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Rule Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Metro Express 2-Day"
                data-ocid="edd.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand (optional)</Label>
                <Select
                  value={selectedBrandForEDD}
                  onValueChange={(v) => {
                    setSelectedBrandForEDD(v);
                    setForm((p) => ({ ...p, productType: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Brands</SelectItem>
                    {courierBrands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.brandName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product Type</Label>
                {(() => {
                  const brand = courierBrands.find(
                    (b) => b.id === selectedBrandForEDD,
                  );
                  const products = brand?.courierProducts || [];
                  if (products.length > 0) {
                    return (
                      <Select
                        value={form.productType}
                        onValueChange={(v) =>
                          setForm((p) => ({ ...p, productType: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          {products.map((pt) => (
                            <SelectItem key={pt.id} value={pt.productType}>
                              {pt.productType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }
                  return (
                    <Input
                      value={form.productType}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, productType: e.target.value }))
                      }
                      placeholder="e.g. Express, Priority (blank = all)"
                    />
                  );
                })()}
              </div>
              <div>
                <Label>Zone</Label>
                <Select
                  value={form.zone}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, zone: v as EDDRule["zone"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    <SelectItem value="metro">Metro</SelectItem>
                    <SelectItem value="non_metro">Non-Metro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City (optional)</Label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, city: e.target.value }))
                  }
                  placeholder="e.g. Delhi, Mumbai"
                />
              </div>
              <div>
                <Label>State (optional)</Label>
                <Input
                  value={form.state}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, state: e.target.value }))
                  }
                  placeholder="e.g. Maharashtra"
                />
              </div>
            </div>
            <div>
              <Label>Delivery Days (working days) *</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.deliveryDays}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    deliveryDays: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Sundays are skipped. Delivery = booking date +{" "}
                {form.deliveryDays} working day(s).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
              <Label>Active (show in EDD calculations)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="edd.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-ocid="edd.save_button">
              {editingRule ? "Update Rule" : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
