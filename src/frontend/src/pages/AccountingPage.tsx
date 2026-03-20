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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type BankReconciliation,
  type ChartAccount,
  type JournalEntry,
  type JournalLine,
  getBankReconciliations,
  getBills,
  getChartOfAccounts,
  getInvoices,
  getJournalEntries,
  saveBankReconciliations,
  saveChartOfAccounts,
  saveJournalEntries,
} from "../utils/storage";

const SHARED_ID = "shared";

const generateId = () =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);

// ─── Chart of Accounts ────────────────────────────────────────────────────────
function ChartOfAccountsTab() {
  const [accounts, setAccounts] = useState<ChartAccount[]>(() =>
    getChartOfAccounts(),
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editAccount, setEditAccount] = useState<ChartAccount | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Asset" as ChartAccount["type"],
    openingBalance: "",
  });

  const save = (accs: ChartAccount[]) => {
    setAccounts(accs);
    saveChartOfAccounts(accs);
  };

  const handleSubmit = () => {
    if (!form.code || !form.name) {
      toast.error("Account Code and Name are required");
      return;
    }
    const ob = Number(form.openingBalance) || 0;
    if (editAccount) {
      save(
        accounts.map((a) =>
          a.id === editAccount.id
            ? { ...a, ...form, openingBalance: ob, currentBalance: ob }
            : a,
        ),
      );
      toast.success("Account updated");
    } else {
      const newAcc: ChartAccount = {
        id: generateId(),
        code: form.code,
        name: form.name,
        type: form.type,
        openingBalance: ob,
        currentBalance: ob,
      };
      save([...accounts, newAcc]);
      toast.success("Account created");
    }
    setShowAdd(false);
    setEditAccount(null);
    setForm({ code: "", name: "", type: "Asset", openingBalance: "" });
  };

  const openEdit = (acc: ChartAccount) => {
    setEditAccount(acc);
    setForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      openingBalance: String(acc.openingBalance),
    });
    setShowAdd(true);
  };

  const handleDelete = (id: string) => {
    save(accounts.filter((a) => a.id !== id));
    toast.success("Account deleted");
  };

  const typeColor = (t: ChartAccount["type"]) => {
    switch (t) {
      case "Asset":
        return "bg-green-100 text-green-700";
      case "Liability":
        return "bg-red-100 text-red-700";
      case "Capital":
        return "bg-blue-100 text-blue-700";
      case "Income":
        return "bg-emerald-100 text-emerald-700";
      case "Expense":
        return "bg-orange-100 text-orange-700";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Chart of Accounts</h3>
          <p className="text-xs text-muted-foreground">
            {accounts.length} accounts
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditAccount(null);
            setForm({ code: "", name: "", type: "Asset", openingBalance: "" });
            setShowAdd(true);
          }}
          data-ocid="accounts.open_modal_button"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Account
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc, idx) => (
                <TableRow key={acc.id} data-ocid={`accounts.item.${idx + 1}`}>
                  <TableCell className="font-mono text-xs">
                    {acc.code}
                  </TableCell>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(acc.type)}`}
                    >
                      {acc.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {fmt(acc.openingBalance)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-semibold ${
                      acc.type === "Asset" || acc.type === "Income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {fmt(acc.currentBalance)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(acc)}
                        data-ocid={`accounts.edit_button.${idx + 1}`}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      {!acc.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(acc.id)}
                          data-ocid={`accounts.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" data-ocid="accounts.dialog">
          <DialogHeader>
            <DialogTitle>
              {editAccount ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Account Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="e.g. 1005"
                  data-ocid="accounts.input"
                />
              </div>
              <div>
                <Label className="text-xs">Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as ChartAccount["type"] }))
                  }
                >
                  <SelectTrigger data-ocid="accounts.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Asset", "Liability", "Capital", "Income", "Expense"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Account Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Petty Cash"
              />
            </div>
            <div>
              <Label className="text-xs">Opening Balance (₹)</Label>
              <Input
                type="number"
                value={form.openingBalance}
                onChange={(e) =>
                  setForm((p) => ({ ...p, openingBalance: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              data-ocid="accounts.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} data-ocid="accounts.save_button">
              {editAccount ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Journal Entries ──────────────────────────────────────────────────────────
function JournalEntriesTab() {
  const [entries, setEntries] = useState<JournalEntry[]>(() =>
    getJournalEntries(),
  );
  const [accounts] = useState<ChartAccount[]>(() => getChartOfAccounts());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    narration: "",
    lines: [
      { accountId: "", accountName: "", debit: 0, credit: 0 },
      { accountId: "", accountName: "", debit: 0, credit: 0 },
    ] as JournalLine[],
  });

  const saveAll = (updated: JournalEntry[]) => {
    setEntries(updated);
    saveJournalEntries(updated);
  };

  const totalDebit = form.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const updateLine = (
    idx: number,
    field: keyof JournalLine,
    value: string | number,
  ) => {
    setForm((p) => {
      const lines = [...p.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      if (field === "accountId") {
        const acc = accounts.find((a) => a.id === value);
        lines[idx].accountName = acc?.name ?? "";
      }
      return { ...p, lines };
    });
  };

  const addLine = () =>
    setForm((p) => ({
      ...p,
      lines: [
        ...p.lines,
        { accountId: "", accountName: "", debit: 0, credit: 0 },
      ],
    }));

  const removeLine = (idx: number) =>
    setForm((p) => ({
      ...p,
      lines: p.lines.filter((_, i) => i !== idx),
    }));

  const handleSubmit = () => {
    if (!form.date || !form.narration) {
      toast.error("Date and narration are required");
      return;
    }
    if (!balanced) {
      toast.error("Journal entry is not balanced. Debits must equal Credits.");
      return;
    }
    const entry: JournalEntry = {
      id: generateId(),
      entryNo: `JE${String(entries.length + 1).padStart(4, "0")}`,
      date: form.date,
      narration: form.narration,
      lines: form.lines.filter((l) => l.accountId),
      type: "Manual",
      createdAt: new Date().toISOString(),
    };
    saveAll([entry, ...entries]);
    toast.success(`Journal Entry ${entry.entryNo} created`);
    setShowAdd(false);
    setForm({
      date: new Date().toISOString().split("T")[0],
      narration: "",
      lines: [
        { accountId: "", accountName: "", debit: 0, credit: 0 },
        { accountId: "", accountName: "", debit: 0, credit: 0 },
      ],
    });
  };

  const importFromBills = () => {
    const bills = getBills(SHARED_ID);
    const invoices = getInvoices(SHARED_ID);
    const existing = new Set(entries.map((e) => e.sourceId).filter(Boolean));
    const newEntries: JournalEntry[] = [];
    let count = 0;

    const arAcc = accounts.find((a) => a.code === "1003");
    const salesAcc = accounts.find((a) => a.code === "4001");
    const gstAcc = accounts.find((a) => a.code === "2002");

    for (const inv of invoices) {
      if (existing.has(inv.id)) continue;
      if (!arAcc || !salesAcc || !gstAcc) continue;
      const gstTotal = (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0);
      const salesAmt = inv.subtotal;
      const entry: JournalEntry = {
        id: generateId(),
        entryNo: `JE${String(entries.length + newEntries.length + 1).padStart(4, "0")}`,
        date: inv.date,
        narration: `Auto: Invoice ${inv.invoiceNo} - ${inv.customerName}`,
        lines: [
          {
            accountId: arAcc.id,
            accountName: arAcc.name,
            debit: inv.total,
            credit: 0,
          },
          {
            accountId: salesAcc.id,
            accountName: salesAcc.name,
            debit: 0,
            credit: salesAmt,
          },
          ...(gstTotal > 0
            ? [
                {
                  accountId: gstAcc.id,
                  accountName: gstAcc.name,
                  debit: 0,
                  credit: gstTotal,
                },
              ]
            : []),
        ],
        type: "Auto-from-Invoice",
        sourceId: inv.id,
        createdAt: new Date().toISOString(),
      };
      newEntries.push(entry);
      count++;
    }

    for (const bill of bills) {
      if (existing.has(bill.id)) continue;
      if (!arAcc || !salesAcc) continue;
      const taxableBase = bill.subtotal;
      const gstAmt = bill.taxAmount || 0;
      const entry: JournalEntry = {
        id: generateId(),
        entryNo: `JE${String(entries.length + newEntries.length + 1).padStart(4, "0")}`,
        date: bill.date,
        narration: `Auto: Bill ${bill.billNo} - ${bill.customerName}`,
        lines: [
          {
            accountId: arAcc.id,
            accountName: arAcc.name,
            debit: bill.total,
            credit: 0,
          },
          {
            accountId: salesAcc.id,
            accountName: salesAcc.name,
            debit: 0,
            credit: taxableBase,
          },
          ...(gstAmt > 0 && gstAcc
            ? [
                {
                  accountId: gstAcc.id,
                  accountName: gstAcc.name,
                  debit: 0,
                  credit: gstAmt,
                },
              ]
            : []),
        ],
        type: "Auto-from-Bill",
        sourceId: bill.id,
        createdAt: new Date().toISOString(),
      };
      newEntries.push(entry);
      count++;
    }

    if (count === 0) {
      toast.info("No new bills/invoices to import");
      return;
    }
    saveAll([...newEntries, ...entries]);
    toast.success(`Imported ${count} entries from bills/invoices`);
  };

  const typeBadgeClass = (t: JournalEntry["type"]) => {
    switch (t) {
      case "Manual":
        return "bg-blue-100 text-blue-700";
      case "Auto-from-Bill":
        return "bg-amber-100 text-amber-700";
      case "Auto-from-Invoice":
        return "bg-green-100 text-green-700";
      case "Auto-from-Purchase":
        return "bg-purple-100 text-purple-700";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold">Journal Entries</h3>
          <p className="text-xs text-muted-foreground">
            {entries.length} entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={importFromBills}
            data-ocid="journal.secondary_button"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Import from Bills/Invoices
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            data-ocid="journal.open_modal_button"
          >
            <Plus className="h-4 w-4 mr-1" /> New Entry
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <ScrollArea className="h-[450px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Entry No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total Debit</TableHead>
                <TableHead className="text-right">Total Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                    data-ocid="journal.empty_state"
                  >
                    No journal entries yet. Click "New Entry" or import from
                    Bills.
                  </TableCell>
                </TableRow>
              )}
              {entries.map((entry, idx) => {
                const debit = entry.lines.reduce((s, l) => s + l.debit, 0);
                const credit = entry.lines.reduce((s, l) => s + l.credit, 0);
                return (
                  <TableRow
                    key={entry.id}
                    data-ocid={`journal.item.${idx + 1}`}
                  >
                    <TableCell className="font-mono text-xs">
                      {entry.entryNo}
                    </TableCell>
                    <TableCell className="text-sm">{entry.date}</TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate">
                      {entry.narration}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeClass(entry.type)}`}
                      >
                        {entry.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-green-700">
                      {fmt(debit)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-red-700">
                      {fmt(credit)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="journal.dialog"
        >
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  data-ocid="journal.input"
                />
              </div>
              <div>
                <Label className="text-xs">Narration *</Label>
                <Input
                  value={form.narration}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, narration: e.target.value }))
                  }
                  placeholder="Description of transaction"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Transaction Lines</Label>
              <div className="space-y-2">
                {form.lines.map((line, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: form list with no stable IDs
                    key={i}
                    className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center"
                  >
                    <Select
                      value={line.accountId}
                      onValueChange={(v) => updateLine(i, "accountId", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} – {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      placeholder="Debit"
                      value={line.debit || ""}
                      onChange={(e) =>
                        updateLine(i, "debit", Number(e.target.value))
                      }
                    />
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      placeholder="Credit"
                      value={line.credit || ""}
                      onChange={(e) =>
                        updateLine(i, "credit", Number(e.target.value))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => removeLine(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addLine}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Line
              </Button>
            </div>

            <div
              className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                balanced
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {balanced ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>
                Debit: {fmt(totalDebit)} | Credit: {fmt(totalCredit)}
                {!balanced && " — Not balanced!"}
                {balanced && " — Balanced ✓"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              data-ocid="journal.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!balanced}
              data-ocid="journal.submit_button"
            >
              Post Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── General Ledger ───────────────────────────────────────────────────────────
function GeneralLedgerTab() {
  const [accounts] = useState<ChartAccount[]>(() => getChartOfAccounts());
  const [entries] = useState<JournalEntry[]>(() => getJournalEntries());
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const ledger = useMemo(() => {
    if (!selectedAccountId) return [];
    const rows: Array<{
      date: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];
    let balance = 0;
    const acc = accounts.find((a) => a.id === selectedAccountId);
    if (acc) {
      balance = acc.openingBalance;
      rows.push({
        date: "Opening",
        narration: "Opening Balance",
        debit: 0,
        credit: 0,
        balance,
      });
    }
    const filtered = entries
      .filter((e) => {
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        return e.lines.some((l) => l.accountId === selectedAccountId);
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const entry of filtered) {
      for (const line of entry.lines) {
        if (line.accountId !== selectedAccountId) continue;
        balance += line.debit - line.credit;
        rows.push({
          date: entry.date,
          narration: entry.narration,
          debit: line.debit,
          credit: line.credit,
          balance,
        });
      }
    }
    return rows;
  }, [selectedAccountId, entries, accounts, fromDate, toDate]);

  const exportCSV = () => {
    const header = "Date,Narration,Debit,Credit,Balance\n";
    const rows = ledger
      .map(
        (r) =>
          `"${r.date}","${r.narration}",${r.debit},${r.credit},${r.balance}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger_${selectedAccountId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-[200px]">
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger data-ocid="ledger.select">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} – {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="date"
          className="w-36"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          placeholder="From"
        />
        <Input
          type="date"
          className="w-36"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          placeholder="To"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={ledger.length === 0}
          data-ocid="ledger.secondary_button"
        >
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {selectedAccountId ? (
        <div className="rounded-lg border overflow-hidden">
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((row, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: ledger rows have no stable IDs
                  <TableRow key={i} data-ocid={`ledger.item.${i + 1}`}>
                    <TableCell className="text-xs">{row.date}</TableCell>
                    <TableCell className="text-sm">{row.narration}</TableCell>
                    <TableCell className="text-right text-sm text-green-700">
                      {row.debit > 0 ? fmt(row.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-700">
                      {row.credit > 0 ? fmt(row.credit) : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold text-sm ${
                        row.balance >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {fmt(Math.abs(row.balance))}
                      {row.balance < 0 ? " Cr" : " Dr"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <div
          className="text-center text-muted-foreground py-16 border rounded-lg"
          data-ocid="ledger.empty_state"
        >
          Select an account to view its ledger
        </div>
      )}
    </div>
  );
}

// ─── Trial Balance ────────────────────────────────────────────────────────────
function TrialBalanceTab() {
  const [accounts] = useState<ChartAccount[]>(() => getChartOfAccounts());
  const [entries] = useState<JournalEntry[]>(() => getJournalEntries());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const trialData = useMemo(() => {
    const balances: Record<string, number> = {};
    for (const acc of accounts) {
      balances[acc.id] = acc.openingBalance;
    }
    for (const entry of entries) {
      if (fromDate && entry.date < fromDate) continue;
      if (toDate && entry.date > toDate) continue;
      for (const line of entry.lines) {
        balances[line.accountId] =
          (balances[line.accountId] || 0) + line.debit - line.credit;
      }
    }
    return accounts.map((acc) => ({ acc, balance: balances[acc.id] || 0 }));
  }, [accounts, entries, fromDate, toDate]);

  const totalDebit = trialData
    .filter((r) => r.balance > 0)
    .reduce((s, r) => s + r.balance, 0);
  const totalCredit = trialData
    .filter((r) => r.balance < 0)
    .reduce((s, r) => s + Math.abs(r.balance), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const exportCSV = () => {
    const header = "Account Code,Account Name,Type,Debit,Credit\n";
    const rows = trialData
      .map(
        (r) =>
          `"${r.acc.code}","${r.acc.name}","${r.acc.type}",${r.balance > 0 ? r.balance : ""},${r.balance < 0 ? Math.abs(r.balance) : ""}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trial_balance.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex gap-2">
          <Input
            type="date"
            className="w-36"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            type="date"
            className="w-36"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          data-ocid="trial.secondary_button"
        >
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {!isBalanced && (
        <div
          className="flex items-center gap-2 text-sm bg-red-50 text-red-700 p-3 rounded-lg"
          data-ocid="trial.error_state"
        >
          <AlertCircle className="h-4 w-4" />
          Trial Balance does not balance! Debit: {fmt(totalDebit)} | Credit:{" "}
          {fmt(totalCredit)}
        </div>
      )}
      {isBalanced && totalDebit > 0 && (
        <div
          className="flex items-center gap-2 text-sm bg-green-50 text-green-700 p-3 rounded-lg"
          data-ocid="trial.success_state"
        >
          <CheckCircle2 className="h-4 w-4" />
          Trial Balance is balanced — Total: {fmt(totalDebit)}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right text-green-700">
                  Debit (Dr)
                </TableHead>
                <TableHead className="text-right text-red-700">
                  Credit (Cr)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialData.map((row, i) => (
                <TableRow key={row.acc.id} data-ocid={`trial.item.${i + 1}`}>
                  <TableCell className="font-mono text-xs">
                    {row.acc.code}
                  </TableCell>
                  <TableCell className="text-sm">{row.acc.name}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {row.acc.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-green-700">
                    {row.balance > 0 ? fmt(row.balance) : ""}
                  </TableCell>
                  <TableCell className="text-right text-sm text-red-700">
                    {row.balance < 0 ? fmt(Math.abs(row.balance)) : ""}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/30">
                <TableCell colSpan={3}>TOTAL</TableCell>
                <TableCell className="text-right text-green-700">
                  {fmt(totalDebit)}
                </TableCell>
                <TableCell className="text-right text-red-700">
                  {fmt(totalCredit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

// ─── P&L ─────────────────────────────────────────────────────────────────────
function ProfitLossTab() {
  const [accounts] = useState<ChartAccount[]>(() => getChartOfAccounts());
  const [entries] = useState<JournalEntry[]>(() => getJournalEntries());
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-04-01`);
  const [toDate, setToDate] = useState(`${currentYear + 1}-03-31`);

  const data = useMemo(() => {
    const balances: Record<string, number> = {};
    for (const entry of entries) {
      if (entry.date < fromDate || entry.date > toDate) continue;
      for (const line of entry.lines) {
        balances[line.accountId] =
          (balances[line.accountId] || 0) + line.debit - line.credit;
      }
    }
    const income = accounts
      .filter((a) => a.type === "Income")
      .map((a) => ({ acc: a, amount: -(balances[a.id] || 0) }));
    const expenses = accounts
      .filter((a) => a.type === "Expense")
      .map((a) => ({ acc: a, amount: balances[a.id] || 0 }));
    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
    return {
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
    };
  }, [accounts, entries, fromDate, toDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="w-36"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="w-36"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div
        className={`text-center p-4 rounded-xl font-bold text-xl ${
          data.netProfit >= 0
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
        data-ocid="pl.card"
      >
        {data.netProfit >= 0 ? "Net Profit" : "Net Loss"}:{" "}
        {fmt(Math.abs(data.netProfit))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-green-50 px-3 py-2 font-semibold text-sm text-green-800">
            Income
          </div>
          <Table>
            <TableBody>
              {data.income.map((r, i) => (
                <TableRow key={r.acc.id} data-ocid={`pl.item.${i + 1}`}>
                  <TableCell className="text-sm">{r.acc.name}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-green-700">
                    {fmt(r.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Total Income</TableCell>
                <TableCell className="text-right text-green-700">
                  {fmt(data.totalIncome)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="bg-red-50 px-3 py-2 font-semibold text-sm text-red-800">
            Expenses
          </div>
          <Table>
            <TableBody>
              {data.expenses.map((r, i) => (
                <TableRow key={r.acc.id} data-ocid={`pl.item.${i + 1}`}>
                  <TableCell className="text-sm">{r.acc.name}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-red-700">
                    {fmt(r.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Total Expenses</TableCell>
                <TableCell className="text-right text-red-700">
                  {fmt(data.totalExpenses)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────
function BalanceSheetTab() {
  const [accounts] = useState<ChartAccount[]>(() => getChartOfAccounts());
  const [entries] = useState<JournalEntry[]>(() => getJournalEntries());
  const [asOf, setAsOf] = useState(new Date().toISOString().split("T")[0]);

  const data = useMemo(() => {
    const balances: Record<string, number> = {};
    for (const acc of accounts) balances[acc.id] = acc.openingBalance;
    for (const entry of entries) {
      if (entry.date > asOf) continue;
      for (const line of entry.lines) {
        balances[line.accountId] =
          (balances[line.accountId] || 0) + line.debit - line.credit;
      }
    }
    const assets = accounts
      .filter((a) => a.type === "Asset")
      .map((a) => ({ acc: a, amount: balances[a.id] || 0 }));
    const liabilities = accounts
      .filter((a) => a.type === "Liability")
      .map((a) => ({ acc: a, amount: -(balances[a.id] || 0) }));
    const capital = accounts
      .filter((a) => a.type === "Capital")
      .map((a) => ({ acc: a, amount: -(balances[a.id] || 0) }));
    const incomeAcc = accounts.filter((a) => a.type === "Income");
    const expAcc = accounts.filter((a) => a.type === "Expense");
    const netProfit =
      incomeAcc.reduce((s, a) => s - (balances[a.id] || 0), 0) -
      expAcc.reduce((s, a) => s + (balances[a.id] || 0), 0);
    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabCap =
      liabilities.reduce((s, r) => s + r.amount, 0) +
      capital.reduce((s, r) => s + r.amount, 0) +
      netProfit;
    return {
      assets,
      liabilities,
      capital,
      netProfit,
      totalAssets,
      totalLiabCap,
      isBalanced: Math.abs(totalAssets - totalLiabCap) < 0.01,
    };
  }, [accounts, entries, asOf]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <Label className="text-xs">As of Date</Label>
          <Input
            type="date"
            className="w-40"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
        </div>
        {data.isBalanced ? (
          <Badge
            className="bg-green-100 text-green-700"
            data-ocid="balance_sheet.success_state"
          >
            Balanced ✓
          </Badge>
        ) : (
          <Badge variant="destructive" data-ocid="balance_sheet.error_state">
            Not Balanced!
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-green-50 px-3 py-2 font-semibold text-sm text-green-800">
            Assets
          </div>
          <Table>
            <TableBody>
              {data.assets.map((r, i) => (
                <TableRow
                  key={r.acc.id}
                  data-ocid={`balance_sheet.item.${i + 1}`}
                >
                  <TableCell className="text-sm">{r.acc.name}</TableCell>
                  <TableCell className="text-right text-sm">
                    {fmt(r.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Total Assets</TableCell>
                <TableCell className="text-right">
                  {fmt(data.totalAssets)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="bg-blue-50 px-3 py-2 font-semibold text-sm text-blue-800">
            Liabilities & Capital
          </div>
          <Table>
            <TableBody>
              {data.liabilities.map((r, i) => (
                <TableRow
                  key={r.acc.id}
                  data-ocid={`balance_sheet.item.${i + 1}`}
                >
                  <TableCell className="text-sm">{r.acc.name}</TableCell>
                  <TableCell className="text-right text-sm">
                    {fmt(r.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {data.capital.map((r, i) => (
                <TableRow
                  key={r.acc.id}
                  data-ocid={`balance_sheet.item.${i + 1}`}
                >
                  <TableCell className="text-sm">{r.acc.name}</TableCell>
                  <TableCell className="text-right text-sm">
                    {fmt(r.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="text-sm text-green-700">
                  Net Profit / (Loss)
                </TableCell>
                <TableCell
                  className={`text-right text-sm ${data.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {fmt(data.netProfit)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Total Liabilities + Capital</TableCell>
                <TableCell className="text-right">
                  {fmt(data.totalLiabCap)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Bank Reconciliation ──────────────────────────────────────────────────────
function BankReconciliationTab() {
  const [accounts] = useState<ChartAccount[]>(() => getChartOfAccounts());
  const [entries] = useState<JournalEntry[]>(() => getJournalEntries());
  const [recs, setRecs] = useState<BankReconciliation[]>(() =>
    getBankReconciliations(),
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [bankBalance, setBankBalance] = useState("");

  const bankAccounts = accounts.filter(
    (a) =>
      a.type === "Asset" &&
      (a.name.toLowerCase().includes("bank") || a.code === "1002"),
  );

  const transactions = useMemo(() => {
    if (!selectedAccountId) return [];
    return entries
      .filter((e) => e.lines.some((l) => l.accountId === selectedAccountId))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((entry) => {
        const line = entry.lines.find(
          (l) => l.accountId === selectedAccountId,
        )!;
        const rec = recs.find((r) => r.journalEntryId === entry.id);
        return {
          entry,
          line,
          reconciled: rec?.reconciled ?? false,
          recId: rec?.id,
        };
      });
  }, [entries, selectedAccountId, recs]);

  const toggleReconcile = (
    entryId: string,
    currentRec: boolean,
    recId: string | undefined,
  ) => {
    let updated: BankReconciliation[];
    if (recId) {
      updated = recs.map((r) =>
        r.id === recId
          ? {
              ...r,
              reconciled: !currentRec,
              reconciledAt: !currentRec ? new Date().toISOString() : undefined,
            }
          : r,
      );
    } else {
      const newRec: BankReconciliation = {
        id: generateId(),
        accountId: selectedAccountId,
        journalEntryId: entryId,
        reconciled: true,
        reconciledAt: new Date().toISOString(),
      };
      updated = [...recs, newRec];
    }
    setRecs(updated);
    saveBankReconciliations(updated);
  };

  const bookedBalance = useMemo(() => {
    const acc = accounts.find((a) => a.id === selectedAccountId);
    let bal = acc?.openingBalance || 0;
    for (const { line } of transactions) {
      bal += line.debit - line.credit;
    }
    return bal;
  }, [transactions, accounts, selectedAccountId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-[200px]">
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger data-ocid="reconcile.select">
              <SelectValue placeholder="Select Bank Account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} – {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Bank Statement Balance (₹)</Label>
          <Input
            type="number"
            className="w-36"
            value={bankBalance}
            onChange={(e) => setBankBalance(e.target.value)}
            placeholder="0.00"
            data-ocid="reconcile.input"
          />
        </div>
      </div>

      {selectedAccountId && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Balance per Books</p>
              <p className="text-xl font-bold text-green-700">
                {fmt(bookedBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                Bank Statement Balance
              </p>
              <p className="text-xl font-bold text-blue-700">
                {fmt(Number(bankBalance) || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Difference</p>
              <p
                className={`text-xl font-bold ${Math.abs(bookedBalance - (Number(bankBalance) || 0)) < 0.01 ? "text-green-700" : "text-red-700"}`}
              >
                {fmt(Math.abs(bookedBalance - (Number(bankBalance) || 0)))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedAccountId ? (
        <div className="rounded-lg border overflow-hidden">
          <ScrollArea className="h-[380px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-center">Reconciled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t, i) => (
                  <TableRow
                    key={t.entry.id}
                    data-ocid={`reconcile.item.${i + 1}`}
                  >
                    <TableCell className="text-xs">{t.entry.date}</TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">
                      {t.entry.narration}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-700">
                      {t.line.debit > 0 ? fmt(t.line.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-700">
                      {t.line.credit > 0 ? fmt(t.line.credit) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() =>
                          toggleReconcile(t.entry.id, t.reconciled, t.recId)
                        }
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${
                          t.reconciled
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-green-400"
                        }`}
                        data-ocid={`reconcile.toggle.${i + 1}`}
                      >
                        {t.reconciled && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                      data-ocid="reconcile.empty_state"
                    >
                      No transactions for this account
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <div
          className="text-center text-muted-foreground py-16 border rounded-lg"
          data-ocid="reconcile.empty_state"
        >
          Select a bank account to begin reconciliation
        </div>
      )}
    </div>
  );
}

// ─── Main AccountingPage ──────────────────────────────────────────────────────
export function AccountingPage() {
  const [activeTab, setActiveTab] = useState("accounts");

  // Recalculate account balances from journal entries
  useEffect(() => {
    const accounts = getChartOfAccounts();
    const entries = getJournalEntries();
    const balances: Record<string, number> = {};
    for (const acc of accounts) {
      balances[acc.id] = acc.openingBalance;
    }
    for (const entry of entries) {
      for (const line of entry.lines) {
        balances[line.accountId] =
          (balances[line.accountId] || 0) + line.debit - line.credit;
      }
    }
    const updated = accounts.map((a) => ({
      ...a,
      currentBalance: balances[a.id] ?? a.openingBalance,
    }));
    saveChartOfAccounts(updated);
  }, []); // run once on mount

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-xl">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Chartered Accounting
          </h1>
          <p className="text-xs text-muted-foreground">
            Full double-entry accounting system — Chart of Accounts, Journal
            Entries, Ledger, Trial Balance, P&amp;L, Balance Sheet
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Chart of Accounts",
            icon: Building2,
            color: "text-blue-600",
            value: getChartOfAccounts().length,
          },
          {
            label: "Journal Entries",
            icon: FileText,
            color: "text-green-600",
            value: getJournalEntries().length,
          },
          {
            label: "Total Revenue",
            icon: BookOpen,
            color: "text-emerald-600",
            value: fmt(
              getJournalEntries()
                .flatMap((e) => e.lines)
                .filter((l) => {
                  const acc = getChartOfAccounts().find(
                    (a) => a.id === l.accountId,
                  );
                  return acc?.type === "Income";
                })
                .reduce((s, l) => s + l.credit, 0),
            ),
          },
          {
            label: "Total Expenses",
            icon: AlertCircle,
            color: "text-orange-600",
            value: fmt(
              getJournalEntries()
                .flatMap((e) => e.lines)
                .filter((l) => {
                  const acc = getChartOfAccounts().find(
                    (a) => a.id === l.accountId,
                  );
                  return acc?.type === "Expense";
                })
                .reduce((s, l) => s + l.debit, 0),
            ),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <p className="text-lg font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="accounts" data-ocid="accounting.tab">
            Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="journal" data-ocid="accounting.tab">
            Journal Entries
          </TabsTrigger>
          <TabsTrigger value="ledger" data-ocid="accounting.tab">
            General Ledger
          </TabsTrigger>
          <TabsTrigger value="trial" data-ocid="accounting.tab">
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="pl" data-ocid="accounting.tab">
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="bs" data-ocid="accounting.tab">
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="reconcile" data-ocid="accounting.tab">
            Bank Reconciliation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <ChartOfAccountsTab />
        </TabsContent>
        <TabsContent value="journal" className="mt-4">
          <JournalEntriesTab />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <GeneralLedgerTab />
        </TabsContent>
        <TabsContent value="trial" className="mt-4">
          <TrialBalanceTab />
        </TabsContent>
        <TabsContent value="pl" className="mt-4">
          <ProfitLossTab />
        </TabsContent>
        <TabsContent value="bs" className="mt-4">
          <BalanceSheetTab />
        </TabsContent>
        <TabsContent value="reconcile" className="mt-4">
          <BankReconciliationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
