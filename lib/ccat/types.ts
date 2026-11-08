export type SignoffMode = "learnt_taught" | "single";

export type EventKind = "learnt" | "taught" | "completed";

export type IntakeStatus = "active" | "archived";

export type StudentStatus = "active" | "completed" | "withdrawn";

export interface CcatIntake {
  id: string;
  name: string;
  startsOn: string | null;
  status: IntakeStatus;
}

export interface CcatStudent {
  id: string;
  fullName: string;
  profileId: string | null;
  intakeId: string | null;
  status: StudentStatus;
  startedOn: string | null;
  notes: string | null;
}

export interface CcatItem {
  id: string;
  categoryId: string;
  categoryKey: string;
  categoryName: string;
  categorySort: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  signoffMode: SignoffMode;
}

export interface CcatFlight {
  id: string;
  studentId: string;
  flownOn: string;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  instructorId: string | null;
  instructorName: string | null;
  dualHours: number;
  soloHours: number;
  notes: string | null;
  voidedAt: string | null;
  learnt: string[];
  taught: string[];
  learntItemIds: string[];
  taughtItemIds: string[];
}

export interface CcatEvent {
  id: string;
  studentId: string;
  itemId: string;
  flightId: string | null;
  kind: EventKind;
  eventDate: string;
  instructorId: string | null;
  instructorName: string | null;
  notes: string | null;
  source: "manual" | "import";
  importKey: string | null;
  voidedAt: string | null;
}

export interface CcatPlan {
  id: string;
  weekStart: string;
  studentId: string;
  instructorId: string | null;
  aircraftRegistration: string | null;
  notes: string | null;
  items: { itemId: string; kind: EventKind }[];
}

export interface CcatAudit {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface NamedMatch {
  name: string;
  id: string | null;
}
