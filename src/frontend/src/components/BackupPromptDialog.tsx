import { Cloud, Download, HardDrive, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getStoredClientId,
  useGoogleDriveBackup,
} from "../hooks/useGoogleDriveBackup";
import { exportAllData } from "../utils/storage";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface BackupPromptDialogProps {
  open: boolean;
  onProceed: () => void; // user confirmed — proceed with logout/close
  onCancel: () => void;
  reason: "logout" | "close";
}

export function BackupPromptDialog({
  open,
  onProceed,
  onCancel,
  reason,
}: BackupPromptDialogProps) {
  const gdrive = useGoogleDriveBackup();
  const [localDone, setLocalDone] = useState(false);
  const [driveDone, setDriveDone] = useState(false);
  const [driveWorking, setDriveWorking] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  const hasClientId = !!getStoredClientId();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalDone(false);
      setDriveDone(false);
      setDriveError(null);
    }
  }, [open]);

  const handleLocalBackup = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sks_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLocalDone(true);
    toast.success("Local backup downloaded");
  };

  const handleDriveBackup = async () => {
    setDriveWorking(true);
    setDriveError(null);
    try {
      await gdrive.backupNow();
      setDriveDone(true);
      toast.success("Backed up to Google Drive");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Backup failed";
      setDriveError(msg);
    } finally {
      setDriveWorking(false);
    }
  };

  const handleConnectAndBackup = async () => {
    setDriveWorking(true);
    setDriveError(null);
    try {
      await gdrive.connect();
      if (!gdrive.error) {
        setDriveDone(true);
        toast.success("Connected and backed up to Google Drive");
      }
    } catch {
      // error is set by hook
    } finally {
      setDriveWorking(false);
    }
  };

  const actionLabel = reason === "logout" ? "Log Out" : "Close App";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className="max-w-md"
        data-ocid="backup_prompt.dialog"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>
              Backup Before You {reason === "logout" ? "Log Out" : "Close"}?
            </span>
          </DialogTitle>
          <DialogDescription>
            Your data is stored in this browser. Take a backup to avoid any data
            loss.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Local backup */}
          <div
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              localDone
                ? "bg-green-50 border-green-200"
                : "bg-muted/30 border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <HardDrive
                className={`w-5 h-5 ${localDone ? "text-green-600" : "text-muted-foreground"}`}
              />
              <div>
                <p className="text-sm font-medium">Local Backup</p>
                <p className="text-xs text-muted-foreground">
                  Download JSON file to your device
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={localDone ? "outline" : "default"}
              onClick={handleLocalBackup}
              data-ocid="backup_prompt.local_backup.button"
              className={localDone ? "text-green-700 border-green-300" : ""}
            >
              {localDone ? (
                "✓ Done"
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </>
              )}
            </Button>
          </div>

          {/* Google Drive backup */}
          <div
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              driveDone
                ? "bg-green-50 border-green-200"
                : "bg-muted/30 border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <Cloud
                className={`w-5 h-5 ${driveDone ? "text-green-600" : "text-blue-500"}`}
              />
              <div>
                <p className="text-sm font-medium">Google Drive Backup</p>
                <p className="text-xs text-muted-foreground">
                  {gdrive.isConnected
                    ? "Backup to your connected Drive"
                    : hasClientId
                      ? "Connect and backup to Google Drive"
                      : "Sign in to backup to Google Drive"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={driveDone ? "outline" : "default"}
              onClick={
                gdrive.isConnected ? handleDriveBackup : handleConnectAndBackup
              }
              disabled={driveWorking}
              data-ocid="backup_prompt.drive_backup.button"
              className={
                driveDone
                  ? "text-green-700 border-green-300"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            >
              {driveDone ? (
                "✓ Done"
              ) : driveWorking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />{" "}
                  Working...
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 mr-1" />{" "}
                  {gdrive.isConnected ? "Backup" : "Connect & Backup"}
                </>
              )}
            </Button>
          </div>

          {/* Drive error */}
          {(driveError || gdrive.error) && (
            <p className="text-xs text-red-600 px-1">
              {driveError || gdrive.error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            data-ocid="backup_prompt.cancel.button"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onProceed}
            data-ocid="backup_prompt.proceed.button"
          >
            {actionLabel} Without Backup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
