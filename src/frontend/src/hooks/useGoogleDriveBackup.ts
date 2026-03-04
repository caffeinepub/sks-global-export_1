import { useCallback, useEffect, useRef, useState } from "react";
import { exportAllData } from "../utils/storage";

// Google Drive backup using GIS token client
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GDRIVE_CLIENT_ID_KEY = "sks_gdrive_client_id";

export function getStoredClientId(): string {
  return (
    localStorage.getItem(GDRIVE_CLIENT_ID_KEY) ||
    ((window as unknown as Record<string, unknown>)
      .SKS_GOOGLE_CLIENT_ID as string) ||
    ""
  );
}

export function saveClientId(id: string) {
  localStorage.setItem(GDRIVE_CLIENT_ID_KEY, id.trim());
}
const BACKUP_FILE_NAME = "sks_global_export_backup.json";
const GDRIVE_CONNECTED_KEY = "sks_gdrive_connected";
const LAST_BACKUP_GDRIVE_KEY = "sks_gdrive_last_backup";
const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface GisTokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}

interface GisLib {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }) => GisTokenClient;
    };
  };
}

declare global {
  interface Window {
    google?: GisLib;
  }
}

const loadGisScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const existing = document.getElementById("gis-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load GIS")),
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GIS script"));
    document.head.appendChild(script);
  });
};

const uploadToDrive = async (
  accessToken: string,
  content: string,
): Promise<void> => {
  // Check if file already exists
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}'+and+trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const searchData = (await searchRes.json()) as {
    files?: Array<{ id: string }>;
  };
  const existingFileId = searchData.files?.[0]?.id;

  const metadata = JSON.stringify({
    name: BACKUP_FILE_NAME,
    mimeType: "application/json",
  });
  const fileContent = new Blob([content], { type: "application/json" });

  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([metadata], { type: "application/json" }),
  );
  formData.append("file", fileContent);

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const method = existingFileId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload failed: ${err}`);
  }
};

export function useGoogleDriveBackup() {
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return localStorage.getItem(GDRIVE_CONNECTED_KEY) === "true";
  });
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem(LAST_BACKUP_GDRIVE_KEY);
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store access token in memory only
  const accessTokenRef = useRef<string | null>(null);
  const tokenClientRef = useRef<GisTokenClient | null>(null);
  const autoBackupTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const backupNow = useCallback(async (): Promise<void> => {
    if (!accessTokenRef.current) {
      setError("Not connected to Google Drive");
      return;
    }
    setIsBackingUp(true);
    setError(null);
    try {
      const data = exportAllData();
      await uploadToDrive(accessTokenRef.current, data);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_BACKUP_GDRIVE_KEY, now);
      setLastBackupTime(now);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Backup failed";
      setError(msg);
      console.error("Google Drive backup error:", e);
    } finally {
      setIsBackingUp(false);
    }
  }, []);

  const startAutoBackup = useCallback(() => {
    if (autoBackupTimerRef.current) {
      clearInterval(autoBackupTimerRef.current);
    }
    autoBackupTimerRef.current = setInterval(() => {
      if (accessTokenRef.current) {
        backupNow();
      }
    }, AUTO_BACKUP_INTERVAL_MS);
  }, [backupNow]);

  const stopAutoBackup = useCallback(() => {
    if (autoBackupTimerRef.current) {
      clearInterval(autoBackupTimerRef.current);
      autoBackupTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const clientId = getStoredClientId();
    if (!clientId) {
      setError(
        "Please enter your Google OAuth Client ID above and save it before connecting.",
      );
      return;
    }
    try {
      await loadGisScript();

      if (!window.google?.accounts?.oauth2) {
        setError(
          "Google Identity Services not available. Check your internet connection.",
        );
        return;
      }

      // Always reinitialise so we pick up the latest saved Client ID
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response.error) {
            setError(`OAuth error: ${response.error}`);
            return;
          }
          if (response.access_token) {
            accessTokenRef.current = response.access_token;
            setIsConnected(true);
            localStorage.setItem(GDRIVE_CONNECTED_KEY, "true");
            startAutoBackup();
            // Do an immediate backup on connect
            backupNow();
          }
        },
      });

      tokenClientRef.current.requestAccessToken({ prompt: "" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
    }
  }, [backupNow, startAutoBackup]);

  const disconnect = useCallback(() => {
    accessTokenRef.current = null;
    setIsConnected(false);
    localStorage.removeItem(GDRIVE_CONNECTED_KEY);
    stopAutoBackup();
    setError(null);
  }, [stopAutoBackup]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAutoBackup();
    };
  }, [stopAutoBackup]);

  return {
    isConnected,
    lastBackupTime,
    isBackingUp,
    error,
    connect,
    disconnect,
    backupNow,
    autoIntervalMinutes: 5,
  };
}
