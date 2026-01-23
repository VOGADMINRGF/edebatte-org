export type Role = "user" | "editor" | "moderator" | "admin";
export type Action =
  | "view_reports"
  | "create_report"
  | "manage_users"
  | "manage_orgs"
  | "view_logs"
  | "view_system"
  | "view_telemetry"
  | "admin";

const MATRIX: Record<Role, Record<Action, boolean>> = {
  user: {
    view_reports: true,
    create_report: false,
    manage_users: false,
    manage_orgs: false,
    view_logs: false,
    view_system: false,
    view_telemetry: false,
    admin: false,
  },
  editor: {
    view_reports: true,
    create_report: true,
    manage_users: false,
    manage_orgs: false,
    view_logs: false,
    view_system: false,
    view_telemetry: false,
    admin: false,
  },
  moderator: {
    view_reports: true,
    create_report: false,
    manage_users: true,
    manage_orgs: false,
    view_logs: true,
    view_system: false,
    view_telemetry: false,
    admin: false,
  },
  admin: {
    view_reports: true,
    create_report: true,
    manage_users: true,
    manage_orgs: true,
    view_logs: true,
    view_system: true,
    view_telemetry: true,
    admin: true,
  },
};
export function can(role: Role | undefined | null, action: Action) {
  return !!(role && MATRIX[role]?.[action]);
}
export function roleList() {
  return Object.keys(MATRIX) as Role[];
}
export function actions() {
  return Object.keys(MATRIX.admin) as Action[];
}
