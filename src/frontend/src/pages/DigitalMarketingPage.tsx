import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import {
  type AutomatedCampaign,
  type Campaign,
  type DMApiSettings,
  type Lead,
  getAutomations,
  getCampaigns,
  getCustomers,
  getDMApiSettings,
  getLeads,
  setAutomations,
  setCampaigns,
  setDMApiSettings,
  setLeads,
} from "../utils/storage";

const SHARED = "shared";

const SERVICE_LABELS: Record<Lead["serviceType"], string> = {
  "domestic-courier": "Domestic Courier",
  "international-courier": "International Courier",
  "general-product": "General Product",
};

const STATUS_COLORS: Record<Lead["status"], string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Interested: "bg-purple-100 text-purple-800",
  Converted: "bg-green-100 text-green-800",
  Lost: "bg-gray-100 text-gray-700",
};

const CAMPAIGN_STATUS_COLORS: Record<Campaign["status"], string> = {
  Draft: "bg-gray-100 text-gray-700",
  Active: "bg-green-100 text-green-800",
  Completed: "bg-blue-100 text-blue-800",
  Paused: "bg-yellow-100 text-yellow-800",
};

function emptyLead(): Omit<Lead, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
    pincode: "",
    city: "",
    serviceType: "domestic-courier",
    productInterest: "",
    leadSource: "Walk-in",
    status: "New",
    notes: "",
    assignedTo: "",
    followUpDate: "",
    followUpNote: "",
  };
}

function emptyCampaign(): Omit<Campaign, "id" | "createdAt"> {
  return {
    name: "",
    type: "WhatsApp",
    targetService: "all",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "Draft",
    reachCount: 0,
    convertedCount: 0,
    budget: 0,
    notes: "",
  };
}

export function DigitalMarketingPage() {
  const [leads, setLeadsState] = useState<Lead[]>([]);
  const [campaigns, setCampaignsState] = useState<Campaign[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Automations state
  const [automations, setAutomationsState] = useState<AutomatedCampaign[]>(() =>
    getAutomations(),
  );
  const [apiSettings, setApiSettingsState] = useState<DMApiSettings>(() =>
    getDMApiSettings(),
  );
  const [apiEdits, setApiEdits] = useState<DMApiSettings>({});
  const [automationDialog, setAutomationDialog] = useState(false);
  const [automationForm, setAutomationForm] = useState<
    Omit<AutomatedCampaign, "id" | "createdAt">
  >({
    name: "",
    channel: "WhatsApp",
    messageTemplate: "",
    schedule: "One-time",
    targetAudience: "All Customers",
    startDateTime: "",
    status: "Active",
  });

  // Lead dialog
  const [leadDialog, setLeadDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState(emptyLead());

  // Follow-up dialog
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  // Campaign dialog
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState(emptyCampaign());

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on mount only
  useEffect(() => {
    setLeadsState(getLeads(SHARED));
    setCampaignsState(getCampaigns(SHARED));
  }, []);

  const saveLeads = (updated: Lead[]) => {
    setLeads(updated, SHARED);
    setLeadsState(updated);
  };

  const saveCampaigns = (updated: Campaign[]) => {
    setCampaigns(updated, SHARED);
    setCampaignsState(updated);
  };

  const openAddLead = () => {
    setEditingLead(null);
    setLeadForm(emptyLead());
    setLeadDialog(true);
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? "",
      address: lead.address ?? "",
      pincode: lead.pincode ?? "",
      city: lead.city ?? "",
      serviceType: lead.serviceType,
      productInterest: lead.productInterest ?? "",
      leadSource: lead.leadSource,
      status: lead.status,
      notes: lead.notes ?? "",
      assignedTo: lead.assignedTo ?? "",
      followUpDate: lead.followUpDate ?? "",
      followUpNote: lead.followUpNote ?? "",
    });
    setLeadDialog(true);
  };

  const saveLead = () => {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const now = new Date().toISOString();
    if (editingLead) {
      const updated = leads.map((l) =>
        l.id === editingLead.id ? { ...l, ...leadForm, updatedAt: now } : l,
      );
      saveLeads(updated);
      toast.success("Lead updated");
    } else {
      const newLead: Lead = {
        id: `lead_${Date.now()}`,
        ...leadForm,
        createdAt: now,
        updatedAt: now,
      };
      saveLeads([newLead, ...leads]);
      toast.success("Lead added");
    }
    setLeadDialog(false);
  };

  const deleteLead = (id: string) => {
    if (!confirm("Delete this lead?")) return;
    saveLeads(leads.filter((l) => l.id !== id));
    toast.success("Lead deleted");
  };

  const openFollowUp = (lead: Lead) => {
    setFollowUpLead(lead);
    setFollowUpDate(lead.followUpDate ?? "");
    setFollowUpNote("");
    setFollowUpDialog(true);
  };

  const saveFollowUp = () => {
    if (!followUpLead) return;
    const now = new Date().toISOString();
    const updated = leads.map((l) =>
      l.id === followUpLead.id
        ? {
            ...l,
            followUpDate,
            followUpNote,
            status: l.status === "New" ? ("Contacted" as const) : l.status,
            updatedAt: now,
          }
        : l,
    );
    saveLeads(updated);
    toast.success("Follow-up scheduled");
    setFollowUpDialog(false);
  };

  const convertLead = (lead: Lead) => {
    const now = new Date().toISOString();
    const updated = leads.map((l) =>
      l.id === lead.id
        ? { ...l, status: "Converted" as const, updatedAt: now }
        : l,
    );
    saveLeads(updated);
    toast.success("Lead marked as Converted!");
  };

  const openAddCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm(emptyCampaign());
    setCampaignDialog(true);
  };

  const openEditCampaign = (c: Campaign) => {
    setEditingCampaign(c);
    setCampaignForm({
      name: c.name,
      type: c.type,
      targetService: c.targetService,
      description: c.description ?? "",
      startDate: c.startDate,
      endDate: c.endDate ?? "",
      status: c.status,
      reachCount: c.reachCount,
      convertedCount: c.convertedCount,
      budget: c.budget ?? 0,
      notes: c.notes ?? "",
    });
    setCampaignDialog(true);
  };

  const saveCampaign = () => {
    if (!campaignForm.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    const now = new Date().toISOString();
    if (editingCampaign) {
      const updated = campaigns.map((c) =>
        c.id === editingCampaign.id ? { ...c, ...campaignForm } : c,
      );
      saveCampaigns(updated);
      toast.success("Campaign updated");
    } else {
      const nc: Campaign = {
        id: `camp_${Date.now()}`,
        ...campaignForm,
        createdAt: now,
      };
      saveCampaigns([nc, ...campaigns]);
      toast.success("Campaign created");
    }
    setCampaignDialog(false);
  };

  const deleteCampaign = (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    saveCampaigns(campaigns.filter((c) => c.id !== id));
    toast.success("Campaign deleted");
  };

  const exportLeadsCSV = () => {
    const header = [
      "Name",
      "Phone",
      "Email",
      "Service",
      "Source",
      "Status",
      "City",
      "Pincode",
      "Notes",
      "Follow-up Date",
    ];
    const rows = leads.map((l) => [
      l.name,
      l.phone,
      l.email ?? "",
      SERVICE_LABELS[l.serviceType],
      l.leadSource,
      l.status,
      l.city ?? "",
      l.pincode ?? "",
      l.notes ?? "",
      l.followUpDate ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === "Converted").length;
  const convRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const today = new Date().toISOString().split("T")[0];
  const pendingFollowUps = leads.filter(
    (l) => l.followUpDate && l.status !== "Converted" && l.status !== "Lost",
  ).length;
  const overdueFollowUps = leads.filter(
    (l) =>
      l.followUpDate &&
      l.followUpDate < today &&
      l.status !== "Converted" &&
      l.status !== "Lost",
  ).length;
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;

  // Filtered leads
  const filteredLeads = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterService !== "all" && l.serviceType !== filterService)
      return false;
    if (
      search &&
      !l.name.toLowerCase().includes(search.toLowerCase()) &&
      !l.phone.includes(search)
    )
      return false;
    return true;
  });

  // Follow-ups tab
  const followUpLeads = leads
    .filter(
      (l) => l.followUpDate && l.status !== "Converted" && l.status !== "Lost",
    )
    .sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? ""));

  return (
    <div className="p-6 space-y-6" data-ocid="digital_marketing.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Marketing</h1>
          <p className="text-muted-foreground text-sm">
            Organic lead generation & campaign management for courier and
            products
          </p>
        </div>
        <Button
          onClick={openAddLead}
          data-ocid="digital_marketing.add_lead.button"
        >
          + Add Lead
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{totalLeads}</div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {convertedLeads}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({convRate}%)
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Converted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div
              className={`text-2xl font-bold ${overdueFollowUps > 0 ? "text-red-600" : "text-orange-500"}`}
            >
              {pendingFollowUps}
              {overdueFollowUps > 0 && (
                <span className="text-sm font-normal text-red-500 ml-1">
                  ({overdueFollowUps} overdue)
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Pending Follow-ups
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {activeCampaigns}
            </div>
            <div className="text-sm text-muted-foreground">
              Active Campaigns
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" data-ocid="digital_marketing.tabs">
        <TabsList>
          <TabsTrigger value="leads" data-ocid="digital_marketing.leads.tab">
            Leads ({totalLeads})
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            data-ocid="digital_marketing.followups.tab"
          >
            Follow-ups
            {overdueFollowUps > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                {overdueFollowUps}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="campaigns"
            data-ocid="digital_marketing.campaigns.tab"
          >
            Campaigns
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            data-ocid="digital_marketing.analytics.tab"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="automation"
            data-ocid="digital_marketing.automation.tab"
          >
            Automation
          </TabsTrigger>
        </TabsList>

        {/* LEADS TAB */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
              data-ocid="digital_marketing.leads.search_input"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger
                className="w-36"
                data-ocid="digital_marketing.leads.status.select"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger
                className="w-44"
                data-ocid="digital_marketing.leads.service.select"
              >
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="domestic-courier">
                  Domestic Courier
                </SelectItem>
                <SelectItem value="international-courier">
                  International Courier
                </SelectItem>
                <SelectItem value="general-product">General Product</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={exportLeadsCSV}
              data-ocid="digital_marketing.leads.export.button"
            >
              Export CSV
            </Button>
          </div>

          {filteredLeads.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="digital_marketing.leads.empty_state"
            >
              <div className="text-4xl mb-2">📊</div>
              <p>
                No leads yet. Click "+ Add Lead" to capture your first lead.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                data-ocid="digital_marketing.leads.table"
              >
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Service</th>
                    <th className="text-left p-3">Source</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Follow-up</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, i) => (
                    <tr
                      key={lead.id}
                      className="border-b hover:bg-muted/20"
                      data-ocid={`digital_marketing.leads.row.${i + 1}`}
                    >
                      <td className="p-3 font-medium">{lead.name}</td>
                      <td className="p-3">{lead.phone}</td>
                      <td className="p-3">
                        <span className="text-xs">
                          {SERVICE_LABELS[lead.serviceType]}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {lead.leadSource}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[lead.status]}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {lead.followUpDate ? (
                          <span
                            className={
                              lead.followUpDate < today &&
                              lead.status !== "Converted"
                                ? "text-red-600 font-medium"
                                : ""
                            }
                          >
                            {lead.followUpDate}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditLead(lead)}
                            data-ocid={`digital_marketing.leads.edit_button.${i + 1}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFollowUp(lead)}
                            data-ocid={`digital_marketing.leads.followup.button.${i + 1}`}
                          >
                            Follow-up
                          </Button>
                          {lead.status !== "Converted" &&
                            lead.status !== "Lost" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300"
                                onClick={() => convertLead(lead)}
                                data-ocid={`digital_marketing.leads.convert.button.${i + 1}`}
                              >
                                Convert
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => deleteLead(lead.id)}
                            data-ocid={`digital_marketing.leads.delete_button.${i + 1}`}
                          >
                            ✕
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* FOLLOW-UPS TAB */}
        <TabsContent value="followups" className="space-y-3">
          {followUpLeads.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="digital_marketing.followups.empty_state"
            >
              <div className="text-4xl mb-2">📅</div>
              <p>No follow-ups scheduled. Add follow-up dates to your leads.</p>
            </div>
          ) : (
            followUpLeads.map((lead, i) => {
              const isOverdue = (lead.followUpDate ?? "") < today;
              return (
                <Card
                  key={lead.id}
                  className={isOverdue ? "border-red-300" : ""}
                  data-ocid={`digital_marketing.followup.card.${i + 1}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{lead.name}</span>
                          <span className="text-muted-foreground text-sm">
                            {lead.phone}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status]}`}
                          >
                            {lead.status}
                          </span>
                          {isOverdue && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                              ⚠ Overdue
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {SERVICE_LABELS[lead.serviceType]} · Source:{" "}
                          {lead.leadSource}
                        </div>
                        {lead.followUpNote && (
                          <div className="text-sm mt-1 text-foreground">
                            {lead.followUpNote}
                          </div>
                        )}
                        <div
                          className={`text-sm mt-1 font-medium ${isOverdue ? "text-red-600" : "text-blue-600"}`}
                        >
                          📅 Follow-up: {lead.followUpDate}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFollowUp(lead)}
                          data-ocid={`digital_marketing.followup.update.button.${i + 1}`}
                        >
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300"
                          onClick={() => convertLead(lead)}
                          data-ocid={`digital_marketing.followup.convert.button.${i + 1}`}
                        >
                          Convert
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={openAddCampaign}
              data-ocid="digital_marketing.add_campaign.button"
            >
              + New Campaign
            </Button>
          </div>
          {campaigns.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="digital_marketing.campaigns.empty_state"
            >
              <div className="text-4xl mb-2">📣</div>
              <p>No campaigns yet. Create your first campaign.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((c, i) => (
                <Card
                  key={c.id}
                  data-ocid={`digital_marketing.campaign.card.${i + 1}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${CAMPAIGN_STATUS_COLORS[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {c.type}
                      </span>{" "}
                      ·{" "}
                      {c.targetService === "all"
                        ? "All Services"
                        : SERVICE_LABELS[
                            c.targetService as Lead["serviceType"]
                          ]}
                    </div>
                    {c.description && (
                      <div className="text-sm">{c.description}</div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div className="font-semibold text-foreground text-base">
                          {c.reachCount}
                        </div>
                        Reached
                      </div>
                      <div>
                        <div className="font-semibold text-green-600 text-base">
                          {c.convertedCount}
                        </div>
                        Converted
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-base">
                          {c.budget ? `₹${c.budget.toLocaleString()}` : "—"}
                        </div>
                        Budget
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Start: {c.startDate}
                      {c.endDate ? ` · End: ${c.endDate}` : ""}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditCampaign(c)}
                        data-ocid={`digital_marketing.campaign.edit_button.${i + 1}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => deleteCampaign(c.id)}
                        data-ocid={`digital_marketing.campaign.delete_button.${i + 1}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    "New",
                    "Contacted",
                    "Interested",
                    "Converted",
                    "Lost",
                  ] as const
                ).map((s) => {
                  const count = leads.filter((l) => l.status === s).length;
                  const pct =
                    totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-sm mb-1">
                        <span
                          className={`font-medium px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[s]}`}
                        >
                          {s}
                        </span>
                        <span>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Service Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    "domestic-courier",
                    "international-courier",
                    "general-product",
                  ] as const
                ).map((s) => {
                  const count = leads.filter((l) => l.serviceType === s).length;
                  const pct =
                    totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{SERVICE_LABELS[s]}</span>
                        <span>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Source Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(
                  [
                    "Walk-in",
                    "Referral",
                    "WhatsApp",
                    "Online",
                    "Social Media",
                    "Cold Call",
                    "Other",
                  ] as const
                ).map((s) => {
                  const count = leads.filter((l) => l.leadSource === s).length;
                  if (count === 0) return null;
                  const pct =
                    totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                  return (
                    <div key={s} className="flex justify-between text-sm">
                      <span>{s}</span>
                      <span className="font-medium">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
                {totalLeads === 0 && (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Service Area Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-semibold text-blue-800 text-sm">
                    🏠 Domestic Courier
                  </div>
                  <div className="text-blue-700 text-xs mt-1">
                    Service area: Within 15 km radius
                  </div>
                  <div className="text-blue-600 text-xs">
                    Leads:{" "}
                    {
                      leads.filter((l) => l.serviceType === "domestic-courier")
                        .length
                    }
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="font-semibold text-purple-800 text-sm">
                    🌍 International Courier
                  </div>
                  <div className="text-purple-700 text-xs mt-1">
                    Coverage: City-wide (expanding to more cities soon)
                  </div>
                  <div className="text-purple-600 text-xs">
                    Leads:{" "}
                    {
                      leads.filter(
                        (l) => l.serviceType === "international-courier",
                      ).length
                    }
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-semibold text-green-800 text-sm">
                    📦 General Products
                  </div>
                  <div className="text-green-700 text-xs mt-1">
                    All product categories
                  </div>
                  <div className="text-green-600 text-xs">
                    Leads:{" "}
                    {
                      leads.filter((l) => l.serviceType === "general-product")
                        .length
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* AUTOMATION TAB */}
        <TabsContent value="automation" className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <span className="text-lg">⚠️</span>
            <span>
              Automated sending requires the respective API keys configured
              below. Without API keys, campaigns are saved as drafts.
            </span>
          </div>

          {/* API Configuration */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
              <span className="font-semibold text-foreground">
                API Configuration
              </span>
              <span className="text-xs text-muted-foreground">
                (save once, reuse for all automations)
              </span>
            </div>
            <div className="p-5 space-y-4">
              {[
                {
                  key: "whatsappApiKey" as keyof DMApiSettings,
                  label: "WhatsApp Business API Key",
                  help: "Get from: business.facebook.com > WhatsApp > API Setup",
                  placeholder: "Enter WhatsApp Business API key…",
                },
                {
                  key: "facebookApiToken" as keyof DMApiSettings,
                  label: "Facebook / Instagram Graph API Token",
                  help: "Get from: developers.facebook.com > My Apps > Access Token",
                  placeholder: "Enter Facebook Graph API token…",
                },
                {
                  key: "emailApiKey" as keyof DMApiSettings,
                  label: "Email API Key (SendGrid)",
                  help: "Get from: app.sendgrid.com > Settings > API Keys > Create API Key",
                  placeholder: "SG.xxxxxxxxxxxxxxxxxxxx",
                },
                {
                  key: "telegramBotToken" as keyof DMApiSettings,
                  label: "Telegram Bot Token",
                  help: "Get from: Telegram > search @BotFather > /newbot > follow steps",
                  placeholder: "123456789:AAxxxxxxxx",
                },
              ].map(({ key, label, help, placeholder }) => (
                <div
                  key={key}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start"
                >
                  <div>
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {help}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground"
                      placeholder={
                        apiSettings[key] ? "••••••••••••••••" : placeholder
                      }
                      value={apiEdits[key] ?? ""}
                      onChange={(e) =>
                        setApiEdits((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      data-ocid={`automation.api_${key}.input`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    const merged = { ...apiSettings, ...apiEdits };
                    setApiSettingsState(merged);
                    setDMApiSettings(merged);
                    setApiEdits({});
                    toast.success("API settings saved");
                  }}
                  data-ocid="automation.save_api.button"
                >
                  Save API Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Automated Campaigns List */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Automated Campaigns ({automations.length})
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setAutomationForm({
                    name: "",
                    channel: "WhatsApp",
                    messageTemplate: "",
                    schedule: "One-time",
                    targetAudience: "All Customers",
                    startDateTime: "",
                    status: "Active",
                  });
                  setAutomationDialog(true);
                }}
                data-ocid="automation.new.button"
              >
                + New Automation
              </Button>
            </div>
            {automations.length === 0 ? (
              <div
                className="p-12 text-center text-muted-foreground"
                data-ocid="automation.empty_state"
              >
                <p className="font-medium">No automations yet</p>
                <p className="text-sm mt-1">
                  Create your first automated campaign to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Channel</th>
                      <th className="px-4 py-3 text-left">Schedule</th>
                      <th className="px-4 py-3 text-left">Audience</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {automations.map((a, idx) => (
                      <tr
                        key={a.id}
                        className="border-t border-border"
                        data-ocid={`automation.item.${idx + 1}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {a.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {a.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {a.schedule}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {a.targetAudience}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              a.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : a.status === "Paused"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-destructive px-2"
                            onClick={() => {
                              const updated = automations.filter(
                                (x) => x.id !== a.id,
                              );
                              setAutomationsState(updated);
                              setAutomations(updated);
                              toast.success("Automation deleted");
                            }}
                            data-ocid={`automation.delete_button.${idx + 1}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Automation Dialog */}
      <Dialog open={automationDialog} onOpenChange={setAutomationDialog}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="automation.dialog"
        >
          <DialogHeader>
            <DialogTitle>New Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name *</Label>
              <input
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                value={automationForm.name}
                onChange={(e) =>
                  setAutomationForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Monthly Courier Promo"
                data-ocid="automation.name.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Channel</Label>
                <Select
                  value={automationForm.channel}
                  onValueChange={(v) =>
                    setAutomationForm((p) => ({
                      ...p,
                      channel: v as AutomatedCampaign["channel"],
                    }))
                  }
                >
                  <SelectTrigger data-ocid="automation.channel.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "WhatsApp",
                      "Email",
                      "Facebook Post",
                      "Instagram Post",
                      "Telegram",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule</Label>
                <Select
                  value={automationForm.schedule}
                  onValueChange={(v) =>
                    setAutomationForm((p) => ({
                      ...p,
                      schedule: v as AutomatedCampaign["schedule"],
                    }))
                  }
                >
                  <SelectTrigger data-ocid="automation.schedule.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["One-time", "Daily", "Weekly", "Monthly"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select
                value={automationForm.targetAudience}
                onValueChange={(v) =>
                  setAutomationForm((p) => ({
                    ...p,
                    targetAudience: v as AutomatedCampaign["targetAudience"],
                  }))
                }
              >
                <SelectTrigger data-ocid="automation.audience.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "All Customers",
                    "Domestic Courier Leads",
                    "International Leads",
                    "Converted Customers",
                  ].map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message Template</Label>
              <textarea
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-md bg-background min-h-[80px]"
                value={automationForm.messageTemplate}
                onChange={(e) =>
                  setAutomationForm((p) => ({
                    ...p,
                    messageTemplate: e.target.value,
                  }))
                }
                placeholder="Hi {name}, we have a special offer for you..."
                data-ocid="automation.message.textarea"
              />
            </div>
            <div>
              <Label>Start Date & Time</Label>
              <input
                type="datetime-local"
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                value={automationForm.startDateTime}
                onChange={(e) =>
                  setAutomationForm((p) => ({
                    ...p,
                    startDateTime: e.target.value,
                  }))
                }
                data-ocid="automation.start_datetime.input"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setAutomationDialog(false)}
                data-ocid="automation.cancel.button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!automationForm.name.trim()) {
                    toast.error("Campaign name is required");
                    return;
                  }
                  const hasApiKey = (() => {
                    const ch = automationForm.channel;
                    if (ch === "WhatsApp") return !!apiSettings.whatsappApiKey;
                    if (ch === "Email") return !!apiSettings.emailApiKey;
                    if (ch === "Telegram")
                      return !!apiSettings.telegramBotToken;
                    return !!apiSettings.facebookApiToken;
                  })();
                  const newAutomation: AutomatedCampaign = {
                    id: String(Date.now()),
                    ...automationForm,
                    status: hasApiKey ? automationForm.status : "Draft",
                    createdAt: new Date().toISOString(),
                  };
                  const updated = [...automations, newAutomation];
                  setAutomationsState(updated);
                  setAutomations(updated);
                  setAutomationDialog(false);
                  toast.success(
                    hasApiKey
                      ? "Automation created"
                      : "Saved as draft (configure API key to activate)",
                  );
                }}
                data-ocid="automation.save.button"
              >
                Save Automation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lead Dialog */}
      <Dialog open={leadDialog} onOpenChange={setLeadDialog}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="digital_marketing.lead.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingLead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={leadForm.name}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, name: e.target.value })
                  }
                  data-ocid="digital_marketing.lead.name.input"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={leadForm.phone}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, phone: e.target.value })
                  }
                  data-ocid="digital_marketing.lead.phone.input"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={leadForm.email}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, email: e.target.value })
                }
                data-ocid="digital_marketing.lead.email.input"
              />
            </div>
            <div>
              <Label>Service Type *</Label>
              <Select
                value={leadForm.serviceType}
                onValueChange={(v) =>
                  setLeadForm({
                    ...leadForm,
                    serviceType: v as Lead["serviceType"],
                  })
                }
              >
                <SelectTrigger data-ocid="digital_marketing.lead.service_type.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestic-courier">
                    Domestic Courier (within 15 km radius)
                  </SelectItem>
                  <SelectItem value="international-courier">
                    International Courier (city-wide)
                  </SelectItem>
                  <SelectItem value="general-product">
                    General Product
                  </SelectItem>
                </SelectContent>
              </Select>
              {leadForm.serviceType === "domestic-courier" && (
                <p className="text-xs text-blue-600 mt-1">
                  📍 Service area: Within 15 km radius
                </p>
              )}
              {leadForm.serviceType === "international-courier" && (
                <p className="text-xs text-purple-600 mt-1">
                  🌍 Coverage: City-wide (expanding)
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pincode</Label>
                <Input
                  value={leadForm.pincode}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, pincode: e.target.value })
                  }
                  data-ocid="digital_marketing.lead.pincode.input"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={leadForm.city}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, city: e.target.value })
                  }
                  data-ocid="digital_marketing.lead.city.input"
                />
              </div>
            </div>
            {leadForm.serviceType === "general-product" && (
              <div>
                <Label>Product Interest</Label>
                <Input
                  value={leadForm.productInterest}
                  onChange={(e) =>
                    setLeadForm({
                      ...leadForm,
                      productInterest: e.target.value,
                    })
                  }
                  placeholder="e.g. Stationery, Electronics..."
                  data-ocid="digital_marketing.lead.product_interest.input"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lead Source</Label>
                <Select
                  value={leadForm.leadSource}
                  onValueChange={(v) =>
                    setLeadForm({
                      ...leadForm,
                      leadSource: v as Lead["leadSource"],
                    })
                  }
                >
                  <SelectTrigger data-ocid="digital_marketing.lead.source.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Walk-in",
                      "Referral",
                      "WhatsApp",
                      "Online",
                      "Social Media",
                      "Cold Call",
                      "Other",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={leadForm.status}
                  onValueChange={(v) =>
                    setLeadForm({ ...leadForm, status: v as Lead["status"] })
                  }
                >
                  <SelectTrigger data-ocid="digital_marketing.lead.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "New",
                      "Contacted",
                      "Interested",
                      "Converted",
                      "Lost",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={leadForm.address}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, address: e.target.value })
                }
                data-ocid="digital_marketing.lead.address.input"
              />
            </div>
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={leadForm.followUpDate}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, followUpDate: e.target.value })
                }
                data-ocid="digital_marketing.lead.followup_date.input"
              />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input
                value={leadForm.assignedTo}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, assignedTo: e.target.value })
                }
                placeholder="Employee name"
                data-ocid="digital_marketing.lead.assigned_to.input"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={leadForm.notes}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, notes: e.target.value })
                }
                rows={3}
                data-ocid="digital_marketing.lead.notes.textarea"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setLeadDialog(false)}
                data-ocid="digital_marketing.lead.cancel.button"
              >
                Cancel
              </Button>
              <Button
                onClick={saveLead}
                data-ocid="digital_marketing.lead.save.button"
              >
                Save Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent data-ocid="digital_marketing.followup.dialog">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up — {followUpLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                data-ocid="digital_marketing.followup.date.input"
              />
            </div>
            <div>
              <Label>Note / Action</Label>
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="What was discussed, next action..."
                rows={3}
                data-ocid="digital_marketing.followup.note.textarea"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFollowUpDialog(false)}
                data-ocid="digital_marketing.followup.cancel.button"
              >
                Cancel
              </Button>
              <Button
                onClick={saveFollowUp}
                data-ocid="digital_marketing.followup.save.button"
              >
                Save Follow-up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Campaign Dialog */}
      <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="digital_marketing.campaign.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? "Edit Campaign" : "New Campaign"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Campaign Name *</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, name: e.target.value })
                }
                data-ocid="digital_marketing.campaign.name.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={campaignForm.type}
                  onValueChange={(v) =>
                    setCampaignForm({
                      ...campaignForm,
                      type: v as Campaign["type"],
                    })
                  }
                >
                  <SelectTrigger data-ocid="digital_marketing.campaign.type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["WhatsApp", "SMS", "Email", "Social Media", "Flyer"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Service</Label>
                <Select
                  value={campaignForm.targetService}
                  onValueChange={(v) =>
                    setCampaignForm({
                      ...campaignForm,
                      targetService: v as Campaign["targetService"],
                    })
                  }
                >
                  <SelectTrigger data-ocid="digital_marketing.campaign.target.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="domestic-courier">
                      Domestic Courier
                    </SelectItem>
                    <SelectItem value="international-courier">
                      International Courier
                    </SelectItem>
                    <SelectItem value="general-product">
                      General Product
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={campaignForm.startDate}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      startDate: e.target.value,
                    })
                  }
                  data-ocid="digital_marketing.campaign.start_date.input"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={campaignForm.endDate}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      endDate: e.target.value,
                    })
                  }
                  data-ocid="digital_marketing.campaign.end_date.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={campaignForm.status}
                  onValueChange={(v) =>
                    setCampaignForm({
                      ...campaignForm,
                      status: v as Campaign["status"],
                    })
                  }
                >
                  <SelectTrigger data-ocid="digital_marketing.campaign.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Draft", "Active", "Completed", "Paused"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget (₹)</Label>
                <Input
                  type="number"
                  value={campaignForm.budget}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      budget: Number(e.target.value),
                    })
                  }
                  data-ocid="digital_marketing.campaign.budget.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Reach Count</Label>
                <Input
                  type="number"
                  value={campaignForm.reachCount}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      reachCount: Number(e.target.value),
                    })
                  }
                  data-ocid="digital_marketing.campaign.reach.input"
                />
              </div>
              <div>
                <Label>Converted Count</Label>
                <Input
                  type="number"
                  value={campaignForm.convertedCount}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      convertedCount: Number(e.target.value),
                    })
                  }
                  data-ocid="digital_marketing.campaign.converted.input"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={campaignForm.description}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    description: e.target.value,
                  })
                }
                rows={2}
                data-ocid="digital_marketing.campaign.description.textarea"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={campaignForm.notes}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, notes: e.target.value })
                }
                rows={2}
                data-ocid="digital_marketing.campaign.notes.textarea"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCampaignDialog(false)}
                data-ocid="digital_marketing.campaign.cancel.button"
              >
                Cancel
              </Button>
              <Button
                onClick={saveCampaign}
                data-ocid="digital_marketing.campaign.save.button"
              >
                Save Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
