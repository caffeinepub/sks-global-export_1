import { useCallback, useEffect, useRef, useState } from "react";
import { exportAllData } from "../utils/storage";

// Google Drive backup using GIS token client
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GDRIVE_CLIENT_ID_KEY = "sks_gdrive_client_id";

// Hardcoded OAuth Client ID - always use this
const HARDCODED_CLIENT_ID =
  "860382780332-18i92vnm1s103s7at56uo6i1ouc9gtu3.apps.googleusercontent.com";

export function getStoredClientId(): string {
  // Always prefer the hardcoded ID; fallback to localStorage or window override
  return (
    HARDCODED_CLIENT_ID ||
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

const downloadFromDrive = async (accessToken: string): Promise<string> => {
  // Search for existing backup file
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}'+and+trashed=false&fields=files(id,name,modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Drive search failed (${searchRes.status}): ${errText}`);
  }

  const searchData = (await searchRes.json()) as {
    files?: Array<{ id: string; modifiedTime?: string }>;
  };

  const fileId = searchData.files?.[0]?.id;
  if (!fileId) {
    throw new Error("No backup file found on Google Drive");
  }

  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!downloadRes.ok) {
    const errText = await downloadRes.text();
    throw new Error(
      `Drive download failed (${downloadRes.status}): ${errText}`,
    );
  }

  return await downloadRes.text();
};

const uploadToDrive = async (
  accessToken: string,
  content: string,
): Promise<void> => {
  // Search for existing file
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}'+and+trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Drive search failed (${searchRes.status}): ${errText}`);
  }

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
    throw new Error(`Drive upload failed (${res.status}): ${err}`);
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
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store access token in memory only
  const accessTokenRef = useRef<string | null>(null);
  const tokenClientRef = useRef<GisTokenClient | null>(null);

  // Pending backup resolve/reject for when we need a fresh token
  const _pendingBackupRef = useRef<{
    resolve: () => void;
    reject: (e: Error) => void;
  } | null>(null);

  // Initialize the token client (idempotent)
  const _initTokenClient = useCallback(
    (onToken: (token: string) => void, onError: (msg: string) => void) => {
      const clientId = getStoredClientId();
      if (!window.google?.accounts?.oauth2) return;

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response.error) {
            onError(`OAuth error: ${response.error}`);
            return;
          }
          if (response.access_token) {
            accessTokenRef.current = response.access_token;
            onToken(response.access_token);
          }
        },
      });
    },
    [],
  );

  // Request a fresh token silently (no popup) or with consent prompt
  // Always re-initialises the token client so it works after page refresh too
  const requestToken = useCallback(
    (prompt: "" | "consent" = ""): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
          reject(
            new Error(
              "Google Identity Services not loaded. Check your internet connection.",
            ),
          );
          return;
        }
        const clientId = getStoredClientId();
        if (!clientId) {
          reject(new Error("No Google Client ID configured."));
          return;
        }
        // Always create a fresh token client with the one-time callback
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback: (response) => {
            if (response.error) {
              reject(new Error(`OAuth error: ${response.error}`));
              return;
            }
            if (response.access_token) {
              accessTokenRef.current = response.access_token;
              resolve(response.access_token);
            }
          },
        });
        tokenClientRef.current.requestAccessToken({ prompt });
      });
    },
    [],
  );

  /**
   * Core backup: always requests a fresh token before uploading.
   * Uses prompt="" (silent) first; if that fails tries "consent" popup.
   */
  const backupNow = useCallback(async (): Promise<void> => {
    setIsBackingUp(true);
    setError(null);
    try {
      await loadGisScript();
      if (!window.google?.accounts?.oauth2) {
        throw new Error(
          "Google Identity Services not available. Check your internet connection.",
        );
      }
      // Try silent first, fall back to consent popup if needed
      let token: string;
      try {
        token = await requestToken("");
      } catch {
        token = await requestToken("consent");
      }
      const data = exportAllData();
      await uploadToDrive(token, data);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_BACKUP_GDRIVE_KEY, now);
      setLastBackupTime(now);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Backup failed";
      setError(msg);
      console.error("Google Drive backup error:", e);
      throw e; // re-throw so callers can handle
    } finally {
      setIsBackingUp(false);
    }
  }, [requestToken]);

  const fetchFromDriveNow = useCallback(async (): Promise<string> => {
    setIsFetching(true);
    setError(null);
    try {
      await loadGisScript();
      if (!window.google?.accounts?.oauth2) {
        throw new Error(
          "Google Identity Services not available. Check your internet connection.",
        );
      }
      // Try silent first, fall back to consent popup
      let token: string;
      try {
        token = await requestToken("");
      } catch {
        token = await requestToken("consent");
      }
      const content = await downloadFromDrive(token);
      setFetchedContent(content);
      return content;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fetch from Drive failed";
      setError(msg);
      throw e;
    } finally {
      setIsFetching(false);
    }
  }, [requestToken]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await loadGisScript();

      if (!window.google?.accounts?.oauth2) {
        setError(
          "Google Identity Services not available. Check your internet connection.",
        );
        return;
      }

      await new Promise<void>((resolve, reject) => {
        tokenClientRef.current = window.google!.accounts.oauth2.initTokenClient(
          {
            client_id: getStoredClientId(),
            scope: SCOPE,
            callback: async (response) => {
              if (response.error) {
                setError(`OAuth error: ${response.error}`);
                reject(new Error(response.error));
                return;
              }
              if (response.access_token) {
                accessTokenRef.current = response.access_token;
                setIsConnected(true);
                localStorage.setItem(GDRIVE_CONNECTED_KEY, "true");
                // Immediately do a real backup
                try {
                  const data = exportAllData();
                  await uploadToDrive(response.access_token, data);
                  const now = new Date().toISOString();
                  localStorage.setItem(LAST_BACKUP_GDRIVE_KEY, now);
                  setLastBackupTime(now);
                  setError(null);
                } catch (uploadErr) {
                  const msg =
                    uploadErr instanceof Error
                      ? uploadErr.message
                      : "Initial backup failed";
                  setError(msg);
                }
                resolve();
              }
            },
          },
        );
        tokenClientRef.current.requestAccessToken({ prompt: "consent" });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    accessTokenRef.current = null;
    tokenClientRef.current = null;
    setIsConnected(false);
    localStorage.removeItem(GDRIVE_CONNECTED_KEY);
    setError(null);
  }, []);

  // Preload GIS script on mount so it's ready when user clicks
  useEffect(() => {
    loadGisScript().catch(() => {
      // silently ignore preload failures
    });
  }, []);

  return {
    isConnected,
    lastBackupTime,
    isBackingUp,
    isFetching,
    fetchedContent,
    error,
    connect,
    disconnect,
    backupNow,
    fetchFromDriveNow,
    // No auto-interval — manual + on-logout only
    autoIntervalMinutes: 0,
  };
}
