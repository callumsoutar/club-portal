/**
 * Domain types. These mirror the SQL schema in supabase/migrations/0001_init.sql
 * and are the single source of truth for the rest of the app.
 */

export type AppRole = "member" | "instructor" | "admin";

export type AuthorisationStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "declined"
  | "cancelled"
  | "expired"
  | "completed";

export type LicenceType =
  | "student"
  | "rpl"
  | "ppl"
  | "cpl"
  | "atpl"
  | "instructor";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "checkbox"
  | "radio"
  | "select"
  | "date"
  | "time"
  | "signature"
  | "heading"
  | "info"
  | "paragraph"
  | "toggle"
  | "file";

export type NotificationEvent =
  | "authorisation_submitted"
  | "instructor_assigned"
  | "approval_granted"
  | "approval_declined"
  | "comment_added"
  | "reminder_before_eta"
  | "overdue_return"
  | "medical_expiring"
  | "bfr_expiring"
  | "welcome"
  | "password_reset"
  | "account_created";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PilotProfile {
  id: string;
  profile_id: string;
  licence_type: LicenceType | null;
  licence_number: string | null;
  bfr_expiry: string | null;
  medical_expiry: string | null;
  preferred_aircraft_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  total_hours: number | null;
  notes: string | null;
}

export interface Aircraft {
  id: string;
  registration: string;
  aircraft_type: string;
  display_name: string | null;
  status: "available" | "maintenance" | "reserved" | "retired";
  colour: string;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
}

export interface Instructor {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  signature_url: string | null;
  permissions: {
    can_approve?: boolean;
    can_manage_fleet?: boolean;
    can_manage_forms?: boolean;
  };
  is_active: boolean;
  sort_order: number;
}

/** Singleton club configuration. */
export interface ClubSettings {
  id: true;
  notification_email: string | null;
  /** Master switch for Resend delivery. */
  emails_enabled: boolean;
  /**
   * When false, guests authorise without accounts; member login/signup is hidden.
   * Staff (admin / instructor) can always sign in at /login.
   */
  member_login_enabled: boolean;
  /** Path inside the public `branding` storage bucket. */
  logo_path: string | null;
  /** Resolved public URL for the club logo (when set). */
  logo_url?: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** A choice on a radio/select field. */
export interface FieldOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  /** Checkbox must be ticked to pass — used for declarations. */
  mustBeTrue?: boolean;
}

/**
 * Condition against another answer. Used by `visible_when` and `required_when`.
 */
export interface FieldCondition {
  field: string;
  op: "eq" | "neq" | "truthy";
  value?: unknown;
}

/**
 * When set, a field's options come from live data rather than the static
 * `options` array — so the aircraft dropdown is never hardcoded.
 */
export type FieldDataSource =
  | "aircraft"
  | "instructors"
  | "pilot.name"
  | "pilot.phone"
  | "pilot.email";

export interface FormField {
  id: string;
  section_id: string;
  key: string;
  label: string;
  type: FieldType;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  validation: FieldValidation;
  options: FieldOption[];
  /** When set, the field is only shown if the condition matches. */
  visible_when: FieldCondition | null;
  /**
   * When set on a required field, the field is only compulsory if the
   * condition matches — e.g. BFR expiry when licence is not student.
   */
  required_when: FieldCondition | null;
  data_source: FieldDataSource | null;
  default_value: unknown;
  sort_order: number;
}

export interface FormSection {
  id: string;
  template_id: string;
  key: string;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string | null;
  version: number;
  is_active: boolean;
  published_at: string | null;
  sections: FormSection[];
}

/** Answer values, keyed by `FormField.key`. */
export type AnswerMap = Record<string, unknown>;

export interface Authorisation {
  id: string;
  reference: string;
  status: AuthorisationStatus;
  profile_id: string | null;
  is_guest: boolean;

  pilot_name: string;
  pilot_email: string | null;
  pilot_phone: string | null;
  pilot_licence_type: LicenceType | null;
  pilot_bfr_expiry: string | null;
  pilot_medical_expiry: string | null;

  aircraft_id: string | null;
  aircraft_registration: string | null;
  instructor_id: string | null;
  flight_date: string | null;
  exercise: string | null;
  destination: string | null;
  passenger_names: string | null;
  return_eta: string | null;

  answers: AnswerMap;
  template_id: string | null;
  template_snapshot: FormTemplate | null;

  signature_url: string | null;
  signed_at: string | null;

  access_token: string;
  access_expires_at: string;

  submitted_at: string | null;
  decided_at: string | null;
  completed_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Authorisation joined with its display relations, as the queue renders it. */
export interface AuthorisationWithRelations extends Authorisation {
  aircraft: Pick<Aircraft, "id" | "registration" | "aircraft_type" | "colour"> | null;
  instructor: Pick<Instructor, "id" | "full_name"> | null;
}

export interface Comment {
  id: string;
  authorisation_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface Approval {
  id: string;
  authorisation_id: string;
  instructor_id: string | null;
  actor_id: string | null;
  decision: AuthorisationStatus;
  reason: string | null;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  authorisation_id: string | null;
  actor_id: string | null;
  actor_label: string | null;
  verb: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  pending: number;
  approvedToday: number;
  declinedToday: number;
  expiredMedicals: number;
  expiredBfrs: number;
  /** Submissions per day for the last 14 days, oldest first. */
  trend: { date: string; count: number }[];
}
