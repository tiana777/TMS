"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CompanySettings } from "@/types";
import { fetchCompanySettings, updateCompanySettings } from "@/lib/api";

const DEFAULT_COMPANY: CompanySettings = {
  id: 1,
  app_name: process.env.NEXT_PUBLIC_APP_NAME || "TMS EXPRESS 5.0",
  company_name: process.env.NEXT_PUBLIC_COMPANY_NAME || "TMS EXPRESS MADAGASCAR",
  nif: process.env.NEXT_PUBLIC_COMPANY_NIF || "4001234567",
  stat: process.env.NEXT_PUBLIC_COMPANY_STAT || "52291 11 2021 0 10245",
  rcs: "RCS Antananarivo 2021 B 00123",
  cif: "0123456/DGI-J",
  address: "Tsiazotafo / Analakely, Antananarivo 101",
  phone: "+261 34 00 000 00",
  email: "contact@tmsexpress.mg",
  website: "www.tmsexpress.mg",
  currency: "MGA",
  footer_text: "Merci pour votre confiance. Envois garantis et tracés.",
  logo_url: null,
};

interface CompanyContextType {
  company: CompanySettings;
  loading: boolean;
  refreshCompany: () => Promise<void>;
  saveCompany: (data: Partial<CompanySettings>) => Promise<CompanySettings>;
}

const CompanyContext = createContext<CompanyContextType>({
  company: DEFAULT_COMPANY,
  loading: false,
  refreshCompany: async () => {},
  saveCompany: async () => DEFAULT_COMPANY,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshCompany = useCallback(async () => {
    try {
      const data = await fetchCompanySettings();
      if (data && data.app_name) {
        setCompany(data);
      }
    } catch (e) {
      console.warn("Could not fetch company settings, using fallback", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveCompany = useCallback(async (data: Partial<CompanySettings>) => {
    const updated = await updateCompanySettings(data);
    setCompany(updated);
    // Broadcast event so other tabs/listeners update immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tms_company_change", { detail: updated }));
    }
    return updated;
  }, []);

  useEffect(() => {
    refreshCompany();

    const handleExternalChange = (e: any) => {
      if (e.detail) {
        setCompany(e.detail);
      } else {
        refreshCompany();
      }
    };

    window.addEventListener("tms_company_change", handleExternalChange);
    return () => {
      window.removeEventListener("tms_company_change", handleExternalChange);
    };
  }, [refreshCompany]);

  return (
    <CompanyContext.Provider value={{ company, loading, refreshCompany, saveCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
