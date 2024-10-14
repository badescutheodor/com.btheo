"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface SettingsData {
  [key: string]: string | number | boolean;
}

interface SettingsContextType {
  settings: SettingsData;
  refetchSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: SettingsData;
}) {
  const [settings, setSettings] = useState<SettingsData>(initialSettings);

  const refetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const settings = await response.json();
      const newSettings: SettingsData = settings.reduce(
        (acc: any, setting: any) => {
          acc[setting.key] = setting.value;
          return acc;
        },
        {}
      );

      setSettings(newSettings);
    } catch (error) {
      console.error("Error refetching settings:", error);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, refetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === null) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
