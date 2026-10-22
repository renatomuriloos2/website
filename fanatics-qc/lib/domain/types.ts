// Core domain types shared by the UI, the demo store, the Supabase repository,
// the decision engine and the BI/REST API.

export type Locale = "en" | "es";
export type Localized = { en: string; es: string };

export type Role = "admin" | "reviewer" | "supplier";

export type FiberType =
  | "polyester"
  | "recycled_polyester"
  | "cationic_polyester"
  | "poly_spandex"
  | "nylon"
  | "polycotton"
  | "triblend"
  | "cotton";

export type DecorationCode =
  | "screen_plastisol"
  | "screen_waterbased"
  | "screen_silicone"
  | "sublimation"
  | "spot_sublimation"
  | "heat_transfer"
  | "htv"
  | "tackle_twill"
  | "dtf"
  | "dtg"
  | "embroidery"
  | "pad_print"
  | "heat_label"
  | "silicone_3d"
  | "patch"
  | "foil_reflective";

export type TestCategory = "colorfastness" | "migration" | "decoration" | "physical" | "chemical" | "shade";

export type TestKind = "grade" | "ladder" | "numeric";

export type Assessment = "gray_scale" | "spectrophotometer" | "visual" | "instrument";

export type LotStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "retest"
  | "on_hold"
  | "approved"
  | "approved_concession"
  | "rejected";

export type Verdict = "approved" | "conditional" | "rejected" | "pending" | "not_applicable";

export type ConditionCode =
  | "max_temp"
  | "low_cure_ink"
  | "bleed_blocker"
  | "poly_white"
  | "blocker_adhesive"
  | "reduced_dwell"
  | "no_hot_stack"
  | "pretreatment"
  | "stabilizer"
  | "light_base_only"
  | "concession";

export type GarmentType = "jersey" | "tee" | "hoodie" | "polo" | "shorts";

export interface Supplier {
  id: string;
  name: string;
  code: string;
  country: string;
  city: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  logoUrl: string | null;
  status: "active" | "onboarding" | "inactive";
  tier: "strategic" | "approved" | "probation";
  createdAt: string;
}

export interface Fabric {
  id: string;
  supplierId: string;
  code: string;
  name: string;
  fiber: FiberType;
  composition: string;
  construction: string;
  weightGsm: number | null;
  color: string;
  colorHex: string;
  dyeClass: string;
  finish: string;
  photoUrl: string | null;
  notes: string;
  createdAt: string;
}

export interface MethodOverride {
  verdict: Verdict;
  conditions: ConditionCode[];
  maxTempC: number | null;
  notes: string;
}

/** A colorway of the lot. Results may be recorded per color (colorId) or for the whole lot. */
export interface LotColor {
  id: string;
  name: string;
  hex: string;
  code: string;
}

export interface Lot {
  id: string;
  ref: string;
  supplierId: string;
  fabricId: string;
  lotNumber: string;
  poNumber: string;
  program: string;
  garmentType: GarmentType;
  quantityM: number | null;
  methods: DecorationCode[];
  colors: LotColor[];
  status: LotStatus;
  isRetest: boolean;
  parentLotId: string | null;
  labName: string;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNotes: string;
  overrides: Partial<Record<DecorationCode, MethodOverride>>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type Readings = Record<string, number | null>;

export interface TestResult {
  id: string;
  lotId: string;
  testId: string;
  /** null → applies to every color of the lot. */
  colorId: string | null;
  readings: Readings;
  assessment: Assessment;
  deltaE: Readings;
  labName: string;
  testedAt: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface Evidence {
  id: string;
  lotId: string;
  resultId: string | null;
  kind: "photo" | "report" | "spectro" | "other" | "garment_before" | "garment_after" | "capa";
  name: string;
  mime: string;
  size: number;
  sha256: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export interface LotEvent {
  id: string;
  lotId: string;
  at: string;
  actor: string;
  type: "created" | "submitted" | "status" | "result" | "evidence" | "decision" | "comment";
  from: LotStatus | null;
  to: LotStatus | null;
  message: string;
}

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  supplierId: string | null;
  active: boolean;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface RequirementRow {
  fiber: FiberType;
  testId: string;
  key: string;
  min: number | null;
  max: number | null;
}

/** Finished, decorated garment washed N cycles and rated before/after (photos as evidence). */
export interface GarmentTrial {
  id: string;
  lotId: string;
  colorId: string | null;
  method: DecorationCode;
  placement: string;
  washCycles: number;
  washProcedure: string;
  /** Grades 1–5 (5 = no change) except shrinkage (%). */
  appearance: number;
  cracking: number | null;
  peeling: number | null;
  fading: number | null;
  shrinkagePct: number | null;
  beforeEvidenceId: string | null;
  afterEvidenceId: string | null;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export type CapaStatus = "open" | "submitted" | "returned" | "accepted" | "closed";

/** Corrective and preventive action requested from a mill after a rejected / retest lot. */
export interface Capa {
  id: string;
  ref: string;
  lotId: string;
  supplierId: string;
  status: CapaStatus;
  problem: string;
  rootCause: string;
  containment: string;
  correctiveAction: string;
  preventiveAction: string;
  dueDate: string | null;
  supplierOwner: string;
  reviewNotes: string;
  retestLotId: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  closedAt: string | null;
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface LotBundle {
  lot: Lot;
  fabric: Fabric;
  supplier: Supplier;
  results: TestResult[];
  evidence: Evidence[];
  events: LotEvent[];
  trials: GarmentTrial[];
  capas: Capa[];
}
