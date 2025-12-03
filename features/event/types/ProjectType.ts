export type ProjectStatus = "planned" | "active" | "completed" | "archived";

/**
 * Projekttyp/Event für Aktionen, Kampagnen, Veranstaltungen.
 */
export type Project = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  region?: string;
  organizerIds: string[];
  status: ProjectStatus;
  createdAt: string;
};
