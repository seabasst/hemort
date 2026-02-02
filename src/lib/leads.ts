export interface Lead {
  slug: string;
  name?: string;
  email: string;
  message?: string;
  submittedAt: string;
}

const STORAGE_PREFIX = "hemort-lead-";

export function saveLead(lead: Lead): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PREFIX + lead.slug, JSON.stringify(lead));
}

export function getLead(slug: string): Lead | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_PREFIX + slug);
  if (!data) return null;
  return JSON.parse(data) as Lead;
}

export function getAllLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  const leads: Lead[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      const data = localStorage.getItem(key);
      if (data) leads.push(JSON.parse(data) as Lead);
    }
  }
  return leads;
}
