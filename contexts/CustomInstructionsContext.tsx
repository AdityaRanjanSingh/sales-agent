"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CustomInstructionsContextType {
  customInstructions: string;
  setCustomInstructions: (instructions: string) => void;
  isLoading: boolean;
}

const CustomInstructionsContext = createContext<CustomInstructionsContextType | undefined>(undefined);

export function CustomInstructionsProvider({ children }: { children: ReactNode }) {
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch custom instructions on mount
  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const response = await fetch("/api/user-preferences");
        if (response.ok) {
          const data = await response.json();
          setCustomInstructions(data.customInstructions || "");
        }
      } catch (error) {
        console.error("Error fetching custom instructions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstructions();
  }, []);

  return (
    <CustomInstructionsContext.Provider
      value={{ customInstructions, setCustomInstructions, isLoading }}
    >
      {children}
    </CustomInstructionsContext.Provider>
  );
}

export function useCustomInstructions() {
  const context = useContext(CustomInstructionsContext);
  if (context === undefined) {
    throw new Error("useCustomInstructions must be used within a CustomInstructionsProvider");
  }
  return context;
}
