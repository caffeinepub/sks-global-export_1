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
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Category } from "../types";
import { generateId } from "../utils/helpers";
import { getCategories, setCategories } from "../utils/storage";

const TYPE_COLORS: Record<Category["type"], string> = {
  General: "bg-blue-50 text-blue-700 border-blue-200",
  Courier: "bg-orange-50 text-orange-700 border-orange-200",
  Both: "bg-purple-50 text-purple-700 border-purple-200",
};

interface CategoryFormState {
  name: string;
  type: Category["type"];
  parentId: string | null;
}

const DEFAULT_FORM: CategoryFormState = {
  name: "",
  type: "General",
  parentId: null,
};

export function CategoriesPage() {
  const [categories, setCatsState] = useState<Category[]>(() =>
    getCategories(),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const save = (cats: Category[]) => {
    setCategories(cats);
    setCatsState(cats);
  };

  const topLevel = categories.filter((c) => c.parentId === null);
  const subOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdd = (parentId: string | null = null) => {
    setEditCat(null);
    setForm({ ...DEFAULT_FORM, parentId });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setForm({ name: cat.name, type: cat.type, parentId: cat.parentId });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (editCat) {
      const updated = categories.map((c) =>
        c.id === editCat.id
          ? {
              ...c,
              name: form.name.trim(),
              type: form.type,
              parentId: form.parentId,
            }
          : c,
      );
      save(updated);
      toast.success("Category updated");
    } else {
      const newCat: Category = {
        id: generateId(),
        name: form.name.trim(),
        type: form.type,
        parentId: form.parentId,
      };
      save([...categories, newCat]);
      toast.success("Category added");
    }
    setDialogOpen(false);
    setForm(DEFAULT_FORM);
  };

  const handleDelete = (id: string) => {
    const children = subOf(id);
    if (children.length > 0) {
      toast.error(
        `Cannot delete: this category has ${children.length} subcategory${children.length > 1 ? "s" : ""}. Delete subcategories first.`,
      );
      setDeleteId(null);
      return;
    }
    save(categories.filter((c) => c.id !== id));
    toast.success("Category deleted");
    setDeleteId(null);
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Categories &amp; Subcategories
          </h2>
          <p className="text-sm text-muted-foreground">
            {topLevel.length} top-level categories,{" "}
            {categories.filter((c) => c.parentId !== null).length} subcategories
          </p>
        </div>
        <Button onClick={() => openAdd(null)} data-ocid="categories.add_button">
          <Plus className="w-4 h-4 mr-1" /> Add Category
        </Button>
      </div>

      {/* Category tree */}
      <div className="space-y-2">
        {topLevel.length === 0 && (
          <div
            className="bg-white rounded-xl border border-border p-10 text-center text-muted-foreground text-sm"
            data-ocid="categories.empty_state"
          >
            No categories yet. Click "Add Category" to get started.
          </div>
        )}
        {topLevel.map((cat, idx) => {
          const subs = subOf(cat.id);
          const isExpanded = expandedIds.has(cat.id);
          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-border shadow-xs overflow-hidden"
              data-ocid={`categories.item.${idx + 1}`}
            >
              {/* Top-level row */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10">
                <button
                  type="button"
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleExpand(cat.id)}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <span className="font-semibold text-sm">{cat.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${TYPE_COLORS[cat.type]}`}
                  >
                    {cat.type}
                  </Badge>
                  {subs.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {subs.length} sub{subs.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={() => openAdd(cat.id)}
                    title="Add subcategory"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Sub
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(cat)}
                    data-ocid={`categories.edit_button.${idx + 1}`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteId(cat.id)}
                    data-ocid={`categories.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Subcategory rows */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/5">
                  {subs.length === 0 ? (
                    <div className="px-10 py-3 text-xs text-muted-foreground">
                      No subcategories. Click "+ Sub" to add one.
                    </div>
                  ) : (
                    subs.map((sub, subIdx) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 px-10 py-2.5 border-b border-border last:border-0 hover:bg-muted/10"
                        data-ocid={`categories.item.${idx + 1}.${subIdx + 1}`}
                      >
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <span className="text-sm text-muted-foreground">
                            ↳
                          </span>
                          <span className="text-sm font-medium">
                            {sub.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${TYPE_COLORS[sub.type]}`}
                          >
                            {sub.type}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openEdit(sub)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => setDeleteId(sub.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditCat(null);
            setForm(DEFAULT_FORM);
          }
        }}
      >
        <DialogContent className="max-w-md" data-ocid="categories.dialog">
          <DialogHeader>
            <DialogTitle>
              {editCat
                ? "Edit Category"
                : form.parentId
                  ? "Add Subcategory"
                  : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Category name"
                className="mt-1 text-sm"
                data-ocid="categories.name.input"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as Category["type"] }))
                }
              >
                <SelectTrigger
                  className="mt-1 text-sm"
                  data-ocid="categories.type.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">
                    General (for general products)
                  </SelectItem>
                  <SelectItem value="Courier">
                    Courier (for courier products)
                  </SelectItem>
                  <SelectItem value="Both">Both (General & Courier)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Parent Category</Label>
              <Select
                value={form.parentId ?? "none"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, parentId: v === "none" ? null : v }))
                }
              >
                <SelectTrigger
                  className="mt-1 text-sm"
                  data-ocid="categories.parent.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — Top Level</SelectItem>
                  {topLevel
                    .filter((c) => c.id !== editCat?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditCat(null);
                setForm(DEFAULT_FORM);
              }}
              data-ocid="categories.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-ocid="categories.save_button">
              {editCat ? "Update" : "Add"} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any products using this category
              will retain their category label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
