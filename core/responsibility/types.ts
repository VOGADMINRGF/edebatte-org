export type ResponsibilityLevel =
  | "kommune"
  | "land"
  | "bund"
  | "eu"
  | "global"
  | string;

export type ResponsibilityRole =
  | "parlament"
  | "regierung"
  | "behoerde"
  | "gericht"
  | "buerger-assembly"
  | string;

export type ResponsibilityActor = {
  id?: string;
  actorKey?: string | null;
  name: string;
  level?: ResponsibilityLevel | null;
  role?: ResponsibilityRole | null;
  regionId?: string | null;
  description?: string | null;
  isActive?: boolean;
  meta?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ResponsibilityStep = {
  order?: number;
  level?: ResponsibilityLevel | null;
  actorKey?: string | null;
  actorName?: string | null;
  role?: ResponsibilityRole | null;
  function?: string | null;
  note?: string | null;
};

export type ResponsibilityPath = {
  id?: string;
  label?: string | null;
  steps: ResponsibilityStep[];
  summary?: string | null;
};
