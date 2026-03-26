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
import {
  type Asset,
  type AttendanceRecord,
  type Employee,
  type LeaveRequest,
  type PurchaseOrder,
  type StockRequisition,
  getAssets,
  getAttendance,
  getEmployees,
  getLeaveRequests,
  getPurchaseOrders,
  getStockRequisitions,
  getVendors,
  setAssets,
  setAttendance,
  setEmployees,
  setLeaveRequests,
  setPurchaseOrders,
  setStockRequisitions,
} from "../utils/storage";

const SHARED = "shared";

const today = new Date().toISOString().split("T")[0];

// ─── HR & Employees ───────────────────────────────────────────────────────────

function emptyEmployee(): Omit<Employee, "id" | "createdAt"> {
  return {
    employeeId: "",
    name: "",
    phone: "",
    email: "",
    department: "",
    designation: "",
    joinDate: today,
    salary: 0,
    salaryType: "Monthly",
    address: "",
    aadhar: "",
    pan: "",
    bankAccount: "",
    bankIfsc: "",
    status: "Active",
  };
}

function HRModule() {
  const [employees, setEmpState] = useState<Employee[]>([]);
  const [attendance, setAttState] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLRState] = useState<LeaveRequest[]>([]);
  const [subTab, setSubTab] = useState("employees");
  const [attDate, setAttDate] = useState(today);
  const [empDialog, setEmpDialog] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState(emptyEmployee());
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState<
    Omit<LeaveRequest, "id" | "appliedAt">
  >({
    employeeId: "",
    leaveType: "Casual",
    fromDate: today,
    toDate: today,
    reason: "",
    status: "Pending",
  });
  const [payMonth, setPayMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  useEffect(() => {
    setEmpState(getEmployees(SHARED));
    setAttState(getAttendance(SHARED));
    setLRState(getLeaveRequests(SHARED));
  }, []);

  const saveEmp = () => {
    if (!empForm.name.trim()) {
      toast.error("Name required");
      return;
    }
    const now = new Date().toISOString();
    if (editingEmp) {
      const updated = employees.map((e) =>
        e.id === editingEmp.id ? { ...e, ...empForm } : e,
      );
      setEmployees(updated, SHARED);
      setEmpState(updated);
      toast.success("Employee updated");
    } else {
      const ne: Employee = {
        id: `emp_${Date.now()}`,
        ...empForm,
        createdAt: now,
      };
      const updated = [ne, ...employees];
      setEmployees(updated, SHARED);
      setEmpState(updated);
      toast.success("Employee added");
    }
    setEmpDialog(false);
  };

  const deleteEmp = (id: string) => {
    if (!confirm("Delete employee?")) return;
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated, SHARED);
    setEmpState(updated);
  };

  const openAddEmp = () => {
    setEditingEmp(null);
    setEmpForm(emptyEmployee());
    setEmpDialog(true);
  };
  const openEditEmp = (e: Employee) => {
    setEditingEmp(e);
    setEmpForm({
      employeeId: e.employeeId,
      name: e.name,
      phone: e.phone,
      email: e.email ?? "",
      department: e.department,
      designation: e.designation,
      joinDate: e.joinDate,
      salary: e.salary,
      salaryType: e.salaryType,
      address: e.address ?? "",
      aadhar: e.aadhar ?? "",
      pan: e.pan ?? "",
      bankAccount: e.bankAccount ?? "",
      bankIfsc: e.bankIfsc ?? "",
      status: e.status,
    });
    setEmpDialog(true);
  };

  const markAttendance = (
    empId: string,
    status: AttendanceRecord["status"],
  ) => {
    const existing = attendance.find(
      (a) => a.employeeId === empId && a.date === attDate,
    );
    let updated: AttendanceRecord[];
    if (existing) {
      updated = attendance.map((a) =>
        a.employeeId === empId && a.date === attDate ? { ...a, status } : a,
      );
    } else {
      updated = [
        ...attendance,
        {
          id: `att_${Date.now()}_${empId}`,
          employeeId: empId,
          date: attDate,
          status,
        },
      ];
    }
    setAttendance(updated, SHARED);
    setAttState(updated);
  };

  const getAttForEmp = (empId: string) =>
    attendance.find((a) => a.employeeId === empId && a.date === attDate)
      ?.status ?? "";

  const saveLeave = () => {
    if (!leaveForm.employeeId || !leaveForm.reason.trim()) {
      toast.error("Employee and reason required");
      return;
    }
    const nl: LeaveRequest = {
      id: `lr_${Date.now()}`,
      ...leaveForm,
      appliedAt: new Date().toISOString(),
    };
    const updated = [nl, ...leaveRequests];
    setLeaveRequests(updated, SHARED);
    setLRState(updated);
    toast.success("Leave request submitted");
    setLeaveDialog(false);
  };

  const updateLeaveStatus = (
    id: string,
    status: LeaveRequest["status"],
    note?: string,
  ) => {
    const updated = leaveRequests.map((l) =>
      l.id === id ? { ...l, status, reviewNote: note ?? l.reviewNote } : l,
    );
    setLeaveRequests(updated, SHARED);
    setLRState(updated);
    toast.success(`Leave ${status}`);
  };

  // Payroll calculation
  const [year, month] = payMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const payrollRows = employees
    .filter((e) => e.status === "Active")
    .map((e) => {
      const attRecords = attendance.filter(
        (a) => a.employeeId === e.id && a.date.startsWith(payMonth),
      );
      const present = attRecords.filter((a) => a.status === "Present").length;
      const halfDay = attRecords.filter((a) => a.status === "Half Day").length;
      const effectiveDays = present + halfDay * 0.5;
      const perDay =
        e.salaryType === "Monthly" ? e.salary / daysInMonth : e.salary;
      const gross =
        e.salaryType === "Monthly" ? e.salary : effectiveDays * perDay;
      const pf = Math.round(gross * 0.12);
      const net = gross - pf;
      return { employee: e, present, halfDay, effectiveDays, gross, pf, net };
    });

  const exportPayroll = () => {
    const header = [
      "Employee",
      "ID",
      "Department",
      "Present Days",
      "Half Days",
      "Gross Salary",
      "PF (12%)",
      "Net Salary",
    ];
    const rows = payrollRows.map((r) => [
      r.employee.name,
      r.employee.employeeId,
      r.employee.department,
      r.present,
      r.halfDay,
      r.gross,
      r.pf,
      r.net,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${payMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ATT_STATUS: AttendanceRecord["status"][] = [
    "Present",
    "Absent",
    "Half Day",
    "Leave",
    "Holiday",
  ];
  const ATT_COLORS: Record<string, string> = {
    Present: "bg-green-100 text-green-800",
    Absent: "bg-red-100 text-red-800",
    "Half Day": "bg-yellow-100 text-yellow-800",
    Leave: "bg-blue-100 text-blue-800",
    Holiday: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={subTab}
        onValueChange={(v) => {
          setSubTab(v);
          setEmpState(getEmployees(SHARED));
          setAttState(getAttendance(SHARED));
        }}
      >
        <TabsList>
          <TabsTrigger value="employees" data-ocid="erp.hr.employees.tab">
            Employees
          </TabsTrigger>
          <TabsTrigger value="attendance" data-ocid="erp.hr.attendance.tab">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" data-ocid="erp.hr.leave.tab">
            Leave Requests
          </TabsTrigger>
          <TabsTrigger value="payroll" data-ocid="erp.hr.payroll.tab">
            Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">
              Employees ({employees.length} total,{" "}
              {employees.filter((e) => e.status === "Active").length} active)
            </h3>
            <Button onClick={openAddEmp} data-ocid="erp.add_employee.button">
              + Add Employee
            </Button>
          </div>
          {employees.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="erp.employees.empty_state"
            >
              <div className="text-4xl mb-2">👥</div>
              <p>No employees added yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-ocid="erp.employees.table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Department</th>
                    <th className="text-left p-3">Designation</th>
                    <th className="text-left p-3">Salary</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e, i) => (
                    <tr
                      key={e.id}
                      className="border-b hover:bg-muted/20"
                      data-ocid={`erp.employee.row.${i + 1}`}
                    >
                      <td className="p-3 font-medium">{e.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {e.employeeId}
                      </td>
                      <td className="p-3">{e.department}</td>
                      <td className="p-3">{e.designation}</td>
                      <td className="p-3">
                        ₹{e.salary.toLocaleString()}/
                        {e.salaryType === "Monthly"
                          ? "mo"
                          : e.salaryType === "Daily"
                            ? "day"
                            : "hr"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditEmp(e)}
                            data-ocid={`erp.employee.edit_button.${i + 1}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => deleteEmp(e.id)}
                            data-ocid={`erp.employee.delete_button.${i + 1}`}
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

        <TabsContent value="attendance">
          <div className="flex items-center gap-3 mb-4">
            <Label>Date:</Label>
            <Input
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
              className="w-40"
              data-ocid="erp.attendance.date.input"
            />
          </div>
          {employees.filter((e) => e.status === "Active").length === 0 ? (
            <div
              className="text-center py-10 text-muted-foreground"
              data-ocid="erp.attendance.empty_state"
            >
              No active employees
            </div>
          ) : (
            <div className="space-y-2" data-ocid="erp.attendance.list">
              {employees
                .filter((e) => e.status === "Active")
                .map((e, i) => {
                  const att = getAttForEmp(e.id);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                      data-ocid={`erp.attendance.row.${i + 1}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.department} · {e.designation}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {ATT_STATUS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => markAttendance(e.id, s)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${att === s ? `${ATT_COLORS[s]} border-current` : "border-gray-200 hover:bg-muted"}`}
                            data-ocid={`erp.attendance.mark.button.${i + 1}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leave">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">
              Leave Requests ({leaveRequests.length})
            </h3>
            <Button
              onClick={() => {
                setLeaveForm({
                  employeeId: "",
                  leaveType: "Casual",
                  fromDate: today,
                  toDate: today,
                  reason: "",
                  status: "Pending",
                });
                setLeaveDialog(true);
              }}
              data-ocid="erp.leave.apply.button"
            >
              Apply Leave
            </Button>
          </div>
          {leaveRequests.length === 0 ? (
            <div
              className="text-center py-10 text-muted-foreground"
              data-ocid="erp.leave.empty_state"
            >
              No leave requests
            </div>
          ) : (
            <div className="space-y-2">
              {leaveRequests.map((lr, i) => {
                const emp = employees.find((e) => e.id === lr.employeeId);
                return (
                  <Card key={lr.id} data-ocid={`erp.leave.card.${i + 1}`}>
                    <CardContent className="pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-medium">
                            {emp?.name ?? lr.employeeId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {lr.leaveType} leave · {lr.fromDate} to {lr.toDate}
                          </div>
                          <div className="text-sm mt-1">{lr.reason}</div>
                          {lr.reviewNote && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Note: {lr.reviewNote}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${lr.status === "Pending" ? "bg-yellow-100 text-yellow-800" : lr.status === "Approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            {lr.status}
                          </span>
                          {lr.status === "Pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700"
                                onClick={() =>
                                  updateLeaveStatus(lr.id, "Approved")
                                }
                                data-ocid={`erp.leave.approve.button.${i + 1}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700"
                                onClick={() =>
                                  updateLeaveStatus(lr.id, "Rejected")
                                }
                                data-ocid={`erp.leave.reject.button.${i + 1}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payroll">
          <div className="flex items-center gap-3 mb-4">
            <Label>Month:</Label>
            <Input
              type="month"
              value={payMonth}
              onChange={(e) => setPayMonth(e.target.value)}
              className="w-40"
              data-ocid="erp.payroll.month.input"
            />
            <Button
              variant="outline"
              onClick={exportPayroll}
              data-ocid="erp.payroll.export.button"
            >
              Export CSV
            </Button>
          </div>
          {payrollRows.length === 0 ? (
            <div
              className="text-center py-10 text-muted-foreground"
              data-ocid="erp.payroll.empty_state"
            >
              No active employees
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-ocid="erp.payroll.table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3">Employee</th>
                    <th className="text-left p-3">Dept</th>
                    <th className="text-right p-3">Present</th>
                    <th className="text-right p-3">Half Days</th>
                    <th className="text-right p-3">Gross</th>
                    <th className="text-right p-3">PF (12%)</th>
                    <th className="text-right p-3">Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRows.map((r, i) => (
                    <tr
                      key={r.employee.id}
                      className="border-b"
                      data-ocid={`erp.payroll.row.${i + 1}`}
                    >
                      <td className="p-3 font-medium">{r.employee.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {r.employee.department}
                      </td>
                      <td className="p-3 text-right">{r.present}</td>
                      <td className="p-3 text-right">{r.halfDay}</td>
                      <td className="p-3 text-right">
                        ₹{r.gross.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        ₹{r.pf.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-700">
                        ₹{r.net.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold bg-muted/20">
                    <td className="p-3" colSpan={4}>
                      Total
                    </td>
                    <td className="p-3 text-right">
                      ₹
                      {payrollRows
                        .reduce((s, r) => s + r.gross, 0)
                        .toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      ₹
                      {payrollRows
                        .reduce((s, r) => s + r.pf, 0)
                        .toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-green-700">
                      ₹
                      {payrollRows
                        .reduce((s, r) => s + r.net, 0)
                        .toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="erp.employee.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingEmp ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Employee ID</Label>
                <Input
                  value={empForm.employeeId}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, employeeId: e.target.value })
                  }
                  data-ocid="erp.employee.id.input"
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={empForm.name}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, name: e.target.value })
                  }
                  data-ocid="erp.employee.name.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input
                  value={empForm.phone}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, phone: e.target.value })
                  }
                  data-ocid="erp.employee.phone.input"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={empForm.email}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, email: e.target.value })
                  }
                  data-ocid="erp.employee.email.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Input
                  value={empForm.department}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, department: e.target.value })
                  }
                  data-ocid="erp.employee.dept.input"
                />
              </div>
              <div>
                <Label>Designation</Label>
                <Input
                  value={empForm.designation}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, designation: e.target.value })
                  }
                  data-ocid="erp.employee.designation.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Join Date</Label>
                <Input
                  type="date"
                  value={empForm.joinDate}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, joinDate: e.target.value })
                  }
                  data-ocid="erp.employee.join_date.input"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={empForm.status}
                  onValueChange={(v) =>
                    setEmpForm({ ...empForm, status: v as Employee["status"] })
                  }
                >
                  <SelectTrigger data-ocid="erp.employee.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Salary (₹)</Label>
                <Input
                  type="number"
                  value={empForm.salary}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, salary: Number(e.target.value) })
                  }
                  data-ocid="erp.employee.salary.input"
                />
              </div>
              <div>
                <Label>Salary Type</Label>
                <Select
                  value={empForm.salaryType}
                  onValueChange={(v) =>
                    setEmpForm({
                      ...empForm,
                      salaryType: v as Employee["salaryType"],
                    })
                  }
                >
                  <SelectTrigger data-ocid="erp.employee.salary_type.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={empForm.address}
                onChange={(e) =>
                  setEmpForm({ ...empForm, address: e.target.value })
                }
                data-ocid="erp.employee.address.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aadhar No.</Label>
                <Input
                  value={empForm.aadhar}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, aadhar: e.target.value })
                  }
                  data-ocid="erp.employee.aadhar.input"
                />
              </div>
              <div>
                <Label>PAN No.</Label>
                <Input
                  value={empForm.pan}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, pan: e.target.value })
                  }
                  data-ocid="erp.employee.pan.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank Account</Label>
                <Input
                  value={empForm.bankAccount}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, bankAccount: e.target.value })
                  }
                  data-ocid="erp.employee.bank_account.input"
                />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input
                  value={empForm.bankIfsc}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, bankIfsc: e.target.value })
                  }
                  data-ocid="erp.employee.ifsc.input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEmpDialog(false)}
                data-ocid="erp.employee.cancel.button"
              >
                Cancel
              </Button>
              <Button onClick={saveEmp} data-ocid="erp.employee.save.button">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent data-ocid="erp.leave.dialog">
          <DialogHeader>
            <DialogTitle>Apply Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee *</Label>
              <Select
                value={leaveForm.employeeId}
                onValueChange={(v) =>
                  setLeaveForm({ ...leaveForm, employeeId: v })
                }
              >
                <SelectTrigger data-ocid="erp.leave.employee.select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select
                value={leaveForm.leaveType}
                onValueChange={(v) =>
                  setLeaveForm({
                    ...leaveForm,
                    leaveType: v as LeaveRequest["leaveType"],
                  })
                }
              >
                <SelectTrigger data-ocid="erp.leave.type.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Casual", "Sick", "Annual", "Unpaid", "Other"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, fromDate: e.target.value })
                  }
                  data-ocid="erp.leave.from.input"
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, toDate: e.target.value })
                  }
                  data-ocid="erp.leave.to.input"
                />
              </div>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                rows={2}
                data-ocid="erp.leave.reason.textarea"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setLeaveDialog(false)}
                data-ocid="erp.leave.cancel.button"
              >
                Cancel
              </Button>
              <Button onClick={saveLeave} data-ocid="erp.leave.save.button">
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Assets ───────────────────────────────────────────────────────────────────

function AssetsModule() {
  const [assets, setAssetsState] = useState<Asset[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<Omit<Asset, "id" | "createdAt">>({
    name: "",
    category: "",
    purchaseDate: today,
    purchaseCost: 0,
    currentValue: 0,
    depreciationPercent: 10,
    location: "",
    serialNumber: "",
    vendor: "",
    warrantyExpiry: "",
    status: "Active",
    notes: "",
  });

  useEffect(() => {
    setAssetsState(getAssets(SHARED));
  }, []);

  const calcCurrentValue = (
    cost: number,
    dep: number,
    purchaseDate: string,
  ) => {
    const years =
      (Date.now() - new Date(purchaseDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365);
    return Math.max(0, Math.round(cost * (1 - dep / 100) ** years));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      category: "",
      purchaseDate: today,
      purchaseCost: 0,
      currentValue: 0,
      depreciationPercent: 10,
      location: "",
      serialNumber: "",
      vendor: "",
      warrantyExpiry: "",
      status: "Active",
      notes: "",
    });
    setDialog(true);
  };
  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm({
      name: a.name,
      category: a.category,
      purchaseDate: a.purchaseDate,
      purchaseCost: a.purchaseCost,
      currentValue: a.currentValue,
      depreciationPercent: a.depreciationPercent,
      location: a.location,
      serialNumber: a.serialNumber ?? "",
      vendor: a.vendor ?? "",
      warrantyExpiry: a.warrantyExpiry ?? "",
      status: a.status,
      notes: a.notes ?? "",
    });
    setDialog(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Name required");
      return;
    }
    const cv = calcCurrentValue(
      form.purchaseCost,
      form.depreciationPercent,
      form.purchaseDate,
    );
    if (editing) {
      const updated = assets.map((a) =>
        a.id === editing.id ? { ...a, ...form, currentValue: cv } : a,
      );
      setAssets(updated, SHARED);
      setAssetsState(updated);
    } else {
      const na: Asset = {
        id: `asset_${Date.now()}`,
        ...form,
        currentValue: cv,
        createdAt: new Date().toISOString(),
      };
      const updated = [na, ...assets];
      setAssets(updated, SHARED);
      setAssetsState(updated);
    }
    toast.success("Asset saved");
    setDialog(false);
  };

  const del = (id: string) => {
    if (!confirm("Delete asset?")) return;
    const u = assets.filter((a) => a.id !== id);
    setAssets(u, SHARED);
    setAssetsState(u);
  };

  const totalCost = assets.reduce((s, a) => s + a.purchaseCost, 0);
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="pt-3">
              <div className="text-xl font-bold">
                ₹{totalCost.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Total Purchase Cost
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="pt-3">
              <div className="text-xl font-bold text-green-600">
                ₹{totalValue.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Current Value</div>
            </CardContent>
          </Card>
        </div>
        <Button onClick={openAdd} data-ocid="erp.add_asset.button">
          + Add Asset
        </Button>
      </div>
      {assets.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="erp.assets.empty_state"
        >
          <div className="text-4xl mb-2">🏢</div>
          <p>No assets tracked yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-ocid="erp.assets.table">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3">Asset Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Location</th>
                <th className="text-right p-3">Purchase Cost</th>
                <th className="text-right p-3">Current Value</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a, i) => (
                <tr
                  key={a.id}
                  className="border-b hover:bg-muted/20"
                  data-ocid={`erp.asset.row.${i + 1}`}
                >
                  <td className="p-3 font-medium">
                    {a.name}
                    <div className="text-xs text-muted-foreground">
                      {a.serialNumber}
                    </div>
                  </td>
                  <td className="p-3">{a.category}</td>
                  <td className="p-3">{a.location}</td>
                  <td className="p-3 text-right">
                    ₹{a.purchaseCost.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-green-700">
                    ₹{a.currentValue.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${a.status === "Active" ? "bg-green-100 text-green-800" : a.status === "Under Maintenance" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(a)}
                        data-ocid={`erp.asset.edit_button.${i + 1}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => del(a.id)}
                        data-ocid={`erp.asset.delete_button.${i + 1}`}
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
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="erp.asset.dialog"
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Asset Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-ocid="erp.asset.name.input"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  data-ocid="erp.asset.category.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm({ ...form, purchaseDate: e.target.value })
                  }
                  data-ocid="erp.asset.purchase_date.input"
                />
              </div>
              <div>
                <Label>Purchase Cost (₹)</Label>
                <Input
                  type="number"
                  value={form.purchaseCost}
                  onChange={(e) =>
                    setForm({ ...form, purchaseCost: Number(e.target.value) })
                  }
                  data-ocid="erp.asset.cost.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Depreciation % / Year</Label>
                <Input
                  type="number"
                  value={form.depreciationPercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      depreciationPercent: Number(e.target.value),
                    })
                  }
                  data-ocid="erp.asset.depreciation.input"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as Asset["status"] })
                  }
                >
                  <SelectTrigger data-ocid="erp.asset.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Under Maintenance">
                      Under Maintenance
                    </SelectItem>
                    <SelectItem value="Disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  data-ocid="erp.asset.location.input"
                />
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) =>
                    setForm({ ...form, serialNumber: e.target.value })
                  }
                  data-ocid="erp.asset.serial.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor</Label>
                <Input
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  data-ocid="erp.asset.vendor.input"
                />
              </div>
              <div>
                <Label>Warranty Expiry</Label>
                <Input
                  type="date"
                  value={form.warrantyExpiry}
                  onChange={(e) =>
                    setForm({ ...form, warrantyExpiry: e.target.value })
                  }
                  data-ocid="erp.asset.warranty.input"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                data-ocid="erp.asset.notes.textarea"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialog(false)}
                data-ocid="erp.asset.cancel.button"
              >
                Cancel
              </Button>
              <Button onClick={save} data-ocid="erp.asset.save.button">
                Save Asset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

type POItem = PurchaseOrder["items"][0];

function POModule() {
  const [pos, setPOState] = useState<PurchaseOrder[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [items, setItems] = useState<POItem[]>([
    {
      productName: "",
      quantity: 1,
      unit: "Pcs",
      unitPrice: 0,
      gstRate: 18,
      amount: 0,
    },
  ]);
  const vendors = getVendors(SHARED);

  useEffect(() => {
    setPOState(getPurchaseOrders(SHARED));
  }, []);

  const calcItems = (its: POItem[]) =>
    its.map((it) => ({ ...it, amount: it.quantity * it.unitPrice }));
  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const gstTotal = items.reduce(
    (s, it) => s + Math.round((it.amount * it.gstRate) / 100),
    0,
  );
  const grandTotal = subtotal + gstTotal;

  const addItem = () =>
    setItems([
      ...items,
      {
        productName: "",
        quantity: 1,
        unit: "Pcs",
        unitPrice: 0,
        gstRate: 18,
        amount: 0,
      },
    ]);
  const removeItem = (i: number) =>
    setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof POItem, val: string | number) => {
    const updated = items.map((it, idx) =>
      idx === i ? { ...it, [field]: val } : it,
    );
    setItems(calcItems(updated));
  };

  const openAdd = () => {
    setEditing(null);
    setVendorName("");
    setExpectedDelivery("");
    setPONotes("");
    setItems([
      {
        productName: "",
        quantity: 1,
        unit: "Pcs",
        unitPrice: 0,
        gstRate: 18,
        amount: 0,
      },
    ]);
    setDialog(true);
  };

  const save = () => {
    if (!vendorName.trim()) {
      toast.error("Vendor required");
      return;
    }
    const po: PurchaseOrder = {
      id: editing?.id ?? `po_${Date.now()}`,
      poNumber: editing?.poNumber ?? `PO-${Date.now().toString().slice(-6)}`,
      vendorName,
      items: calcItems(items),
      subtotal,
      gstAmount: gstTotal,
      totalAmount: grandTotal,
      expectedDelivery,
      status: editing?.status ?? "Draft",
      notes: poNotes,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    const updated = editing
      ? pos.map((p) => (p.id === editing.id ? po : p))
      : [po, ...pos];
    setPurchaseOrders(updated, SHARED);
    setPOState(updated);
    toast.success(editing ? "PO updated" : "PO created");
    setDialog(false);
  };

  const updateStatus = (id: string, status: PurchaseOrder["status"]) => {
    const updated = pos.map((p) => (p.id === id ? { ...p, status } : p));
    setPurchaseOrders(updated, SHARED);
    setPOState(updated);
    toast.success(`PO marked as ${status}`);
  };

  const del = (id: string) => {
    if (!confirm("Delete PO?")) return;
    const u = pos.filter((p) => p.id !== id);
    setPurchaseOrders(u, SHARED);
    setPOState(u);
  };

  const STATUS_COLORS: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700",
    Approved: "bg-blue-100 text-blue-800",
    Ordered: "bg-purple-100 text-purple-800",
    "Partially Received": "bg-yellow-100 text-yellow-800",
    Received: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Purchase Orders ({pos.length})</h3>
        <Button onClick={openAdd} data-ocid="erp.add_po.button">
          + Create PO
        </Button>
      </div>
      {pos.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="erp.po.empty_state"
        >
          <div className="text-4xl mb-2">📎</div>
          <p>No purchase orders yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-ocid="erp.po.table">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3">PO #</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Expected</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b hover:bg-muted/20"
                  data-ocid={`erp.po.row.${i + 1}`}
                >
                  <td className="p-3 font-mono text-sm">{p.poNumber}</td>
                  <td className="p-3 font-medium">{p.vendorName}</td>
                  <td className="p-3 text-right">
                    ₹{p.totalAmount.toLocaleString()}
                  </td>
                  <td className="p-3 text-sm">{p.expectedDelivery || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.status === "Draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-700"
                          onClick={() => updateStatus(p.id, "Approved")}
                          data-ocid={`erp.po.approve.button.${i + 1}`}
                        >
                          Approve
                        </Button>
                      )}
                      {p.status === "Approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-700"
                          onClick={() => updateStatus(p.id, "Ordered")}
                          data-ocid={`erp.po.order.button.${i + 1}`}
                        >
                          Mark Ordered
                        </Button>
                      )}
                      {p.status === "Ordered" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700"
                          onClick={() => updateStatus(p.id, "Received")}
                          data-ocid={`erp.po.receive.button.${i + 1}`}
                        >
                          Mark Received
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => del(p.id)}
                        data-ocid={`erp.po.delete_button.${i + 1}`}
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
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="erp.po.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit PO" : "Create Purchase Order"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor Name *</Label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  list="vendors-list"
                  data-ocid="erp.po.vendor.input"
                />
                <datalist id="vendors-list">
                  {vendors.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  data-ocid="erp.po.delivery.input"
                />
              </div>
            </div>
            <div>
              <Label>Items</Label>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2">Product</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-right p-2">Rate</th>
                      <th className="text-right p-2">GST%</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr
                        // biome-ignore lint/suspicious/noArrayIndexKey: order matters here
                        key={i}
                        className="border-b"
                        data-ocid={`erp.po.item.${i + 1}`}
                      >
                        <td className="p-1">
                          <Input
                            value={it.productName}
                            onChange={(e) =>
                              updateItem(i, "productName", e.target.value)
                            }
                            className="h-7 text-xs"
                            data-ocid={`erp.po.item_name.input.${i + 1}`}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(i, "quantity", Number(e.target.value))
                            }
                            className="h-7 text-xs w-16 text-right"
                            data-ocid={`erp.po.item_qty.input.${i + 1}`}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            value={it.unit}
                            onChange={(e) =>
                              updateItem(i, "unit", e.target.value)
                            }
                            className="h-7 text-xs w-14"
                            data-ocid={`erp.po.item_unit.input.${i + 1}`}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            value={it.unitPrice}
                            onChange={(e) =>
                              updateItem(i, "unitPrice", Number(e.target.value))
                            }
                            className="h-7 text-xs w-20 text-right"
                            data-ocid={`erp.po.item_price.input.${i + 1}`}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            value={it.gstRate}
                            onChange={(e) =>
                              updateItem(i, "gstRate", Number(e.target.value))
                            }
                            className="h-7 text-xs w-14 text-right"
                            data-ocid={`erp.po.item_gst.input.${i + 1}`}
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          ₹{it.amount.toLocaleString()}
                        </td>
                        <td className="p-1">
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-red-500 px-1"
                            data-ocid={`erp.po.item_remove.button.${i + 1}`}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={addItem}
                className="mt-2"
                data-ocid="erp.po.add_item.button"
              >
                + Add Item
              </Button>
            </div>
            <div className="text-sm text-right space-y-1">
              <div>Subtotal: ₹{subtotal.toLocaleString()}</div>
              <div>GST: ₹{gstTotal.toLocaleString()}</div>
              <div className="font-bold text-base">
                Total: ₹{grandTotal.toLocaleString()}
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={poNotes}
                onChange={(e) => setPONotes(e.target.value)}
                rows={2}
                data-ocid="erp.po.notes.textarea"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialog(false)}
                data-ocid="erp.po.cancel.button"
              >
                Cancel
              </Button>
              <Button onClick={save} data-ocid="erp.po.save.button">
                Save PO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stock Requisitions ───────────────────────────────────────────────────────

type ReqItem = StockRequisition["items"][0];

function StockReqModule() {
  const [reqs, setReqsState] = useState<StockRequisition[]>([]);
  const [dialog, setDialog] = useState(false);
  const [dept, setDept] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [priority, setPriority] =
    useState<StockRequisition["priority"]>("Medium");
  const [requiredBy, setRequiredBy] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [items, setItems] = useState<ReqItem[]>([
    { productName: "", quantity: 1, unit: "Pcs", reason: "" },
  ]);

  useEffect(() => {
    setReqsState(getStockRequisitions(SHARED));
  }, []);

  const addItem = () =>
    setItems([
      ...items,
      { productName: "", quantity: 1, unit: "Pcs", reason: "" },
    ]);
  const removeItem = (i: number) =>
    setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ReqItem, val: string | number) =>
    setItems(
      items.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)),
    );

  const save = () => {
    if (!dept.trim() || !requestedBy.trim()) {
      toast.error("Department and requester required");
      return;
    }
    const req: StockRequisition = {
      id: `req_${Date.now()}`,
      reqNumber: `REQ-${Date.now().toString().slice(-6)}`,
      department: dept,
      requestedBy,
      items,
      priority,
      requiredBy,
      notes: reqNotes,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    const updated = [req, ...reqs];
    setStockRequisitions(updated, SHARED);
    setReqsState(updated);
    toast.success("Requisition submitted");
    setDialog(false);
  };

  const updateStatus = (
    id: string,
    status: StockRequisition["status"],
    note?: string,
  ) => {
    const updated = reqs.map((r) =>
      r.id === id ? { ...r, status, reviewNote: note ?? r.reviewNote } : r,
    );
    setStockRequisitions(updated, SHARED);
    setReqsState(updated);
    toast.success(`Requisition ${status}`);
  };

  const del = (id: string) => {
    if (!confirm("Delete requisition?")) return;
    const u = reqs.filter((r) => r.id !== id);
    setStockRequisitions(u, SHARED);
    setReqsState(u);
  };

  const PRIORITY_COLORS: Record<string, string> = {
    Low: "bg-gray-100 text-gray-700",
    Medium: "bg-blue-100 text-blue-800",
    High: "bg-orange-100 text-orange-800",
    Urgent: "bg-red-100 text-red-800",
  };
  const STATUS_COLORS: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Approved: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Fulfilled: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Stock Requisitions ({reqs.length})</h3>
        <Button
          onClick={() => {
            setDept("");
            setRequestedBy("");
            setPriority("Medium");
            setRequiredBy("");
            setReqNotes("");
            setItems([
              { productName: "", quantity: 1, unit: "Pcs", reason: "" },
            ]);
            setDialog(true);
          }}
          data-ocid="erp.add_requisition.button"
        >
          + New Requisition
        </Button>
      </div>
      {reqs.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="erp.requisition.empty_state"
        >
          <div className="text-4xl mb-2">📦</div>
          <p>No stock requisitions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reqs.map((r, i) => (
            <Card key={r.id} data-ocid={`erp.requisition.card.${i + 1}`}>
              <CardContent className="pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm">{r.reqNumber}</span>
                      <span className="font-medium">{r.department}</span>
                      <span className="text-muted-foreground text-sm">
                        by {r.requestedBy}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[r.priority]}`}
                      >
                        {r.priority}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="text-sm mt-1 text-muted-foreground">
                      {r.items
                        .map(
                          (it) =>
                            `${it.productName} (${it.quantity} ${it.unit})`,
                        )
                        .join(" · ")}
                    </div>
                    {r.requiredBy && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Required by: {r.requiredBy}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {r.status === "Pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700"
                          onClick={() => updateStatus(r.id, "Approved")}
                          data-ocid={`erp.requisition.approve.button.${i + 1}`}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700"
                          onClick={() => updateStatus(r.id, "Rejected")}
                          data-ocid={`erp.requisition.reject.button.${i + 1}`}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {r.status === "Approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-700"
                        onClick={() => updateStatus(r.id, "Fulfilled")}
                        data-ocid={`erp.requisition.fulfill.button.${i + 1}`}
                      >
                        Mark Fulfilled
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => del(r.id)}
                      data-ocid={`erp.requisition.delete_button.${i + 1}`}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="erp.requisition.dialog"
        >
          <DialogHeader>
            <DialogTitle>New Stock Requisition</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department *</Label>
                <Input
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  data-ocid="erp.requisition.dept.input"
                />
              </div>
              <div>
                <Label>Requested By *</Label>
                <Input
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  data-ocid="erp.requisition.requestedby.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) =>
                    setPriority(v as StockRequisition["priority"])
                  }
                >
                  <SelectTrigger data-ocid="erp.requisition.priority.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Urgent"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Required By</Label>
                <Input
                  type="date"
                  value={requiredBy}
                  onChange={(e) => setRequiredBy(e.target.value)}
                  data-ocid="erp.requisition.required_by.input"
                />
              </div>
            </div>
            <div>
              <Label>Items</Label>
              {items.map((it, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: order matters for form items
                  key={i}
                  className="grid grid-cols-4 gap-2 mt-2"
                  data-ocid={`erp.requisition.item.${i + 1}`}
                >
                  <Input
                    placeholder="Product"
                    value={it.productName}
                    onChange={(e) =>
                      updateItem(i, "productName", e.target.value)
                    }
                    className="col-span-2"
                    data-ocid={`erp.requisition.item_name.input.${i + 1}`}
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(i, "quantity", Number(e.target.value))
                    }
                    data-ocid={`erp.requisition.item_qty.input.${i + 1}`}
                  />
                  <div className="flex gap-1">
                    <Input
                      placeholder="Unit"
                      value={it.unit}
                      onChange={(e) => updateItem(i, "unit", e.target.value)}
                      data-ocid={`erp.requisition.item_unit.input.${i + 1}`}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-red-500"
                        data-ocid={`erp.requisition.item_remove.button.${i + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={addItem}
                className="mt-2"
                data-ocid="erp.requisition.add_item.button"
              >
                + Add Item
              </Button>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                rows={2}
                data-ocid="erp.requisition.notes.textarea"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialog(false)}
                data-ocid="erp.requisition.cancel.button"
              >
                Cancel
              </Button>
              <Button onClick={save} data-ocid="erp.requisition.save.button">
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ERP Page ─────────────────────────────────────────────────────────────────

export function ERPPage() {
  const employees = getEmployees(SHARED);
  const assets = getAssets(SHARED);
  const pos = getPurchaseOrders(SHARED);
  const reqs = getStockRequisitions(SHARED);
  const pendingPOs = pos.filter(
    (p) => p.status === "Draft" || p.status === "Approved",
  ).length;
  const pendingReqs = reqs.filter((r) => r.status === "Pending").length;

  return (
    <div className="p-6 space-y-6" data-ocid="erp.page">
      <div>
        <h1 className="text-2xl font-bold">
          ERP — Enterprise Resource Planning
        </h1>
        <p className="text-muted-foreground text-sm">
          HR, Payroll, Assets, Purchase Orders & Stock Management
        </p>
      </div>

      {/* ERP Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {employees.filter((e) => e.status === "Active").length}
            </div>
            <div className="text-sm text-muted-foreground">
              Active Employees
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {assets.filter((a) => a.status === "Active").length}
            </div>
            <div className="text-sm text-muted-foreground">Active Assets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div
              className={`text-2xl font-bold ${pendingPOs > 0 ? "text-orange-600" : "text-gray-600"}`}
            >
              {pendingPOs}
            </div>
            <div className="text-sm text-muted-foreground">Pending POs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div
              className={`text-2xl font-bold ${pendingReqs > 0 ? "text-red-600" : "text-gray-600"}`}
            >
              {pendingReqs}
            </div>
            <div className="text-sm text-muted-foreground">
              Pending Requisitions
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hr" data-ocid="erp.tabs">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="hr" data-ocid="erp.hr.tab">
            HR & Payroll
          </TabsTrigger>
          <TabsTrigger value="assets" data-ocid="erp.assets.tab">
            Assets
          </TabsTrigger>
          <TabsTrigger value="po" data-ocid="erp.po.tab">
            Purchase Orders{" "}
            {pendingPOs > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5">
                {pendingPOs}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stock-req" data-ocid="erp.stock_req.tab">
            Stock Requisitions{" "}
            {pendingReqs > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                {pendingReqs}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hr" className="pt-4">
          <HRModule />
        </TabsContent>
        <TabsContent value="assets" className="pt-4">
          <AssetsModule />
        </TabsContent>
        <TabsContent value="po" className="pt-4">
          <POModule />
        </TabsContent>
        <TabsContent value="stock-req" className="pt-4">
          <StockReqModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
