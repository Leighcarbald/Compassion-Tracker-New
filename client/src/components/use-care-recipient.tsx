import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CareRecipient } from "@shared/schema";
import { useAuth } from "./use-auth";

type CareRecipientContextType = {
  activeCareRecipientId: string | null;
  setActiveCareRecipientId: (id: string | null) => void;
  careRecipients: CareRecipient[] | undefined;
  selectedCareRecipient: CareRecipient | undefined;
  isLoading: boolean;
};

export const CareRecipientContext = createContext<CareRecipientContextType | null>(null);

export function CareRecipientProvider({ children }: { children: ReactNode }) {
  const [activeCareRecipientId, setActiveCareRecipientId] = useState<string | null>(
    localStorage.getItem("activeCareRecipientId")
  );

  const { user } = useAuth();
  
  // Fetch care recipients
  const { data: careRecipients, isLoading } = useQuery<CareRecipient[]>({
    queryKey: ['/api/care-recipients'],
    enabled: !!user, // Only fetch when user is authenticated
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Find the selected care recipient object based on activeCareRecipientId
  const selectedCareRecipient = careRecipients?.find(
    recipient => recipient.id.toString() === activeCareRecipientId
  );

  // Set default active recipient if none selected or if the stored ID doesn't exist
  useEffect(() => {
    if (careRecipients && careRecipients.length > 0) {
      const validIds = careRecipients.map(r => r.id.toString());
      
      // If no active ID or the stored ID is invalid, use the first available recipient
      if (!activeCareRecipientId || !validIds.includes(activeCareRecipientId)) {
        const firstId = careRecipients[0].id.toString();
        setActiveCareRecipientId(firstId);
        localStorage.setItem("activeCareRecipientId", firstId);
      }
    }
  }, [careRecipients, activeCareRecipientId]);

  // Save active care recipient to localStorage whenever it changes
  useEffect(() => {
    if (activeCareRecipientId) {
      localStorage.setItem("activeCareRecipientId", activeCareRecipientId);
    }
  }, [activeCareRecipientId]);

  return (
    <CareRecipientContext.Provider
      value={{
        activeCareRecipientId,
        setActiveCareRecipientId,
        careRecipients,
        selectedCareRecipient,
        isLoading
      }}
    >
      {children}
    </CareRecipientContext.Provider>
  );
}

export function useCareRecipient() {
  const context = useContext(CareRecipientContext);
  if (!context) {
    throw new Error("useCareRecipient must be used within a CareRecipientProvider");
  }
  return context;
}