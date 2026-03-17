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
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import { generateId } from "../utils/helpers";
import { addTask, deleteTask, getTasks, updateTask } from "../utils/storage";
import type { Task } from "../utils/storage";

export { getTasks };

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-red-100 text-red-700",
  noted: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
};

interface TasksPageProps {
  onNavigate?: (page: string) => void;
  initialSourceRef?: string;
  initialDescription?: string;
  initialSource?: Task["source"];
}

export function TasksPage({
  initialSourceRef,
  initialDescription,
  initialSource,
}: TasksPageProps) {
  const { currentUser, users } = useAppStore();
  const isAdmin = currentUser?.role === "admin";

  const [tasks, setTasksLocal] = useState<Task[]>(() => getTasks());

  const refreshTasks = () => setTasksLocal(getTasks());

  // Form state
  const [showForm, setShowForm] = useState(!!initialSourceRef);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState(initialDescription || "");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [formPriority, setFormPriority] = useState<Task["priority"]>("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [formSource, setFormSource] = useState<Task["source"]>(
    initialSource || "manual",
  );

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const myTasks = tasks.filter((t) => t.assignedTo === currentUser?.username);

  const allTasksDone =
    myTasks.length > 0 && myTasks.every((t) => t.status === "done");

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterUser !== "all" && t.assignedTo !== filterUser) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority)
        return false;
      return true;
    });
  }, [tasks, filterStatus, filterUser, filterPriority]);

  const openCreateForm = () => {
    setEditTask(null);
    setFormTitle("");
    setFormDesc(initialDescription || "");
    setFormAssignedTo("");
    setFormPriority("medium");
    setFormDueDate("");
    setFormSource(initialSource || "manual");
    setShowForm(true);
  };

  const openEditForm = (task: Task) => {
    setEditTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description);
    setFormAssignedTo(task.assignedTo);
    setFormPriority(task.priority);
    setFormDueDate(task.dueDate);
    setFormSource(task.source);
    setShowForm(true);
  };

  const handleSaveTask = () => {
    if (!formTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!formAssignedTo) {
      toast.error("Please assign to a user");
      return;
    }
    if (editTask) {
      updateTask({
        id: editTask.id,
        title: formTitle.trim(),
        description: formDesc,
        assignedTo: formAssignedTo,
        priority: formPriority,
        dueDate: formDueDate,
        source: formSource,
      });
      toast.success("Task updated");
    } else {
      const task: Task = {
        id: generateId(),
        title: formTitle.trim(),
        description: formDesc,
        assignedTo: formAssignedTo,
        assignedBy: currentUser?.username || "admin",
        priority: formPriority,
        dueDate: formDueDate,
        status: "pending",
        source: formSource,
        sourceRef: initialSourceRef,
        createdAt: new Date().toISOString(),
      };
      addTask(task);
      toast.success("Task created");
    }
    setShowForm(false);
    setEditTask(null);
    refreshTasks();
  };

  const handleNoted = (task: Task) => {
    updateTask({
      id: task.id,
      status: "noted",
      notedAt: new Date().toISOString(),
    });
    toast.info("Task noted — marked as pending");
    refreshTasks();
  };

  const handleDone = (task: Task) => {
    updateTask({
      id: task.id,
      status: "done",
      doneAt: new Date().toISOString(),
    });
    toast.success("Task marked as done!");
    refreshTasks();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTask(deleteId);
    toast.success("Task deleted");
    setDeleteId(null);
    refreshTasks();
  };

  const employeeUsers = users;

  // Employee view
  if (!isAdmin) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">My Tasks</h1>
          {myTasks.some((t) => t.status !== "done") && (
            <Badge className="bg-red-100 text-red-700 ml-2">
              {myTasks.filter((t) => t.status !== "done").length} pending
            </Badge>
          )}
        </div>

        {allTasksDone && (
          <div className="text-center py-12 text-green-600">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-semibold">
              All tasks completed! Great work.
            </p>
          </div>
        )}

        {!allTasksDone && myTasks.length === 0 && (
          <div
            className="text-center py-12 text-muted-foreground"
            data-ocid="tasks.empty_state"
          >
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No tasks assigned to you yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {myTasks
            .filter((t) => t.status !== "done")
            .map((task, idx) => (
              <div
                key={task.id}
                className="bg-white border border-border rounded-xl p-4 shadow-xs"
                data-ocid={`tasks.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">
                        {task.title}
                      </span>
                      <Badge className={PRIORITY_COLORS[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge className={STATUS_COLORS[task.status]}>
                        {task.status === "noted" ? "Pending" : task.status}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>From: {task.assignedBy}</span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due: {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => handleNoted(task)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        data-ocid={`tasks.noted.button.${idx + 1}`}
                      >
                        Noted
                      </Button>
                    )}
                    {task.status === "noted" && (
                      <Button
                        size="sm"
                        onClick={() => handleDone(task)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-ocid={`tasks.done.button.${idx + 1}`}
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          {myTasks
            .filter((t) => t.status === "done")
            .map((task, idx) => (
              <div
                key={task.id}
                className="bg-green-50 border border-green-200 rounded-xl p-4 opacity-60"
                data-ocid={`tasks.done.item.${idx + 1}`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium line-through">
                    {task.title}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Task Management</h1>
        </div>
        <Button
          onClick={openCreateForm}
          data-ocid="tasks.add_task.primary_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Create Task
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all" data-ocid="tasks.all.tab">
            All Tasks
          </TabsTrigger>
          <TabsTrigger value="mine" data-ocid="tasks.mine.tab">
            My Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36" data-ocid="tasks.status.select">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="noted">Noted</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-40" data-ocid="tasks.user.select">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employeeUsers.map((u) => (
                  <SelectItem key={u.id} value={u.username}>
                    {u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-36" data-ocid="tasks.priority.select">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            {filteredTasks.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground"
                data-ocid="tasks.empty_state"
              >
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No tasks found</p>
              </div>
            ) : (
              <Table data-ocid="tasks.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task, idx) => (
                    <TableRow key={task.id} data-ocid={`tasks.row.${idx + 1}`}>
                      <TableCell>
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-48">
                            {task.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.assignedTo}
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORITY_COLORS[task.priority]}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.dueDate || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[task.status]}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.source}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditForm(task)}
                            data-ocid={`tasks.edit_button.${idx + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(task.id)}
                            data-ocid={`tasks.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mine">
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks assigned to you.</p>
              </div>
            ) : (
              myTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="bg-white border border-border rounded-xl p-4"
                  data-ocid={`tasks.mine.item.${idx + 1}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-sm">
                        {task.title}
                      </span>
                      <div className="flex gap-2 mt-1">
                        <Badge className={PRIORITY_COLORS[task.priority]}>
                          {task.priority}
                        </Badge>
                        <Badge className={STATUS_COLORS[task.status]}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {task.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleNoted(task)}
                          data-ocid={`tasks.mine.noted.button.${idx + 1}`}
                        >
                          Noted
                        </Button>
                      )}
                      {task.status === "noted" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleDone(task)}
                          data-ocid={`tasks.mine.done.button.${idx + 1}`}
                        >
                          Done
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Task Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="tasks.dialog"
        >
          <DialogHeader>
            <DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Task title..."
                data-ocid="tasks.form.title.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Task description..."
                rows={3}
                data-ocid="tasks.form.desc.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Assign To *</Label>
                <Select
                  value={formAssignedTo}
                  onValueChange={setFormAssignedTo}
                >
                  <SelectTrigger data-ocid="tasks.form.assignedto.select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeUsers.map((u) => (
                      <SelectItem key={u.id} value={u.username}>
                        {u.username} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as Task["priority"])}
                >
                  <SelectTrigger data-ocid="tasks.form.priority.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  data-ocid="tasks.form.duedate.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Source</Label>
                <Select
                  value={formSource}
                  onValueChange={(v) => setFormSource(v as Task["source"])}
                >
                  <SelectTrigger data-ocid="tasks.form.source.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="query">Query Follow-up</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              data-ocid="tasks.form.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTask} data-ocid="tasks.form.save_button">
              {editTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent data-ocid="tasks.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="tasks.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              data-ocid="tasks.delete.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
