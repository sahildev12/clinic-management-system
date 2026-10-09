export const ADMIN_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DONE: "Done",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  WEBSITE: "Website",
  WALK_IN: "Walk-in",
  ADMIN: "Admin",
  ONLINE: "Online",
  COUNTER: "Pay at counter",
  CASH: "Cash",
};

export function adminStatusLabel(status: string) {
  const key = status.toUpperCase();
  return ADMIN_STATUS_LABELS[key] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
