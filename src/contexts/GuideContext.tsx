// src/contexts/GuideContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface GuideContextType {
  isGuideRunning: boolean;
  stepIndex: number;
  startGuide: () => void;
  stopGuide: () => void;
  setStepIndex: (index: number) => void;
  hasSeenGuide: boolean;
  markGuideSeen: () => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

const GUIDE_SEEN_KEY = "app-guide-seen:v1";

export const GuideProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGuideRunning, setIsGuideRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasSeenGuide, setHasSeenGuide] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  const startGuide = useCallback(() => {
    setStepIndex(0);
    setIsGuideRunning(true);
  }, []);

  const stopGuide = useCallback(() => {
    setIsGuideRunning(false);
    setStepIndex(0);
  }, []);

  const markGuideSeen = useCallback(() => {
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, "1");
      setHasSeenGuide(true);
    } catch {
      // ignore
    }
  }, []);

  return (
    <GuideContext.Provider
      value={{
        isGuideRunning,
        stepIndex,
        startGuide,
        stopGuide,
        setStepIndex,
        hasSeenGuide,
        markGuideSeen,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = (): GuideContextType => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error("useGuide must be used within a GuideProvider");
  }
  return context;
};
