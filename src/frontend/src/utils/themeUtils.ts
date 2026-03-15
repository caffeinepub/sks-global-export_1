export const themes = {
  professional: {
    primary: "#1e40af",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    bg: "#f8fafc",
    sidebar: "#1e293b",
  },
  minimal: {
    primary: "#374151",
    secondary: "#6b7280",
    accent: "#10b981",
    bg: "#ffffff",
    sidebar: "#f9fafb",
  },
  dark: {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#f59e0b",
    bg: "#0f172a",
    sidebar: "#1e1b4b",
  },
  vibrant: {
    primary: "#dc2626",
    secondary: "#ea580c",
    accent: "#16a34a",
    bg: "#fefce8",
    sidebar: "#7f1d1d",
  },
  ocean: {
    primary: "#0891b2",
    secondary: "#0e7490",
    accent: "#f97316",
    bg: "#f0f9ff",
    sidebar: "#164e63",
  },
};

export const themeLabels: Record<string, string> = {
  professional: "Professional",
  minimal: "Minimal",
  dark: "Dark Mode",
  vibrant: "Vibrant",
  ocean: "Ocean",
};

export function applyTheme(themeName: string, customPrimary?: string) {
  const theme = themes[themeName as keyof typeof themes] || themes.professional;
  const root = document.documentElement;
  const primary = customPrimary || theme.primary;

  // We set CSS variables that cascade into index.css token system
  root.style.setProperty("--theme-primary", primary);
  root.style.setProperty("--theme-secondary", theme.secondary);
  root.style.setProperty("--theme-accent", theme.accent);
  root.style.setProperty("--theme-bg", theme.bg);
  root.style.setProperty("--theme-sidebar", theme.sidebar);

  localStorage.setItem(
    "sks_theme",
    JSON.stringify({ name: themeName, customPrimary }),
  );
}

export function loadSavedTheme() {
  try {
    const saved = localStorage.getItem("sks_theme");
    if (saved) {
      const { name, customPrimary } = JSON.parse(saved);
      applyTheme(name, customPrimary);
    }
  } catch {
    // ignore
  }
}

export function resetTheme() {
  const root = document.documentElement;
  root.style.removeProperty("--theme-primary");
  root.style.removeProperty("--theme-secondary");
  root.style.removeProperty("--theme-accent");
  root.style.removeProperty("--theme-bg");
  root.style.removeProperty("--theme-sidebar");
  localStorage.removeItem("sks_theme");
}
