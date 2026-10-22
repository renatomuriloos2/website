import type {
  ApiKey,
  AppNotification,
  AppUser,
  Assessment,
  AuditEntry,
  DecorationCode,
  Evidence,
  Fabric,
  FiberType,
  GarmentType,
  Lot,
  LotBundle,
  LotColor,
  LotStatus,
  MethodOverride,
  Readings,
  RequirementRow,
  Role,
  Supplier,
  TestResult,
} from "@/lib/domain/types";

export interface Ctx {
  user: AppUser;
}

export interface UploadFile {
  name: string;
  mime: string;
  size: number;
  bytes: Uint8Array;
  sha256: string;
}

export interface SupplierInput {
  name: string;
  code: string;
  country: string;
  city: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  status: Supplier["status"];
  tier: Supplier["tier"];
  logo: UploadFile | null;
}

export interface FabricInput {
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
  notes: string;
  photo: UploadFile | null;
}

export interface LotInput {
  fabricId: string;
  lotNumber: string;
  poNumber: string;
  program: string;
  garmentType: GarmentType;
  quantityM: number | null;
  methods: DecorationCode[];
  colors: LotColor[];
  labName: string;
  parentLotId: string | null;
}

export interface ResultInput {
  testId: string;
  colorId: string | null;
  readings: Readings;
  assessment: Assessment;
  deltaE: Readings;
  labName: string;
  testedAt: string;
  notes: string;
}

export interface DecisionInput {
  status: LotStatus;
  notes: string;
  overrides: Partial<Record<DecorationCode, MethodOverride>>;
}

export interface UserInput {
  email: string;
  fullName: string;
  role: Role;
  supplierId: string | null;
  password: string;
}

export interface NotificationInput {
  title: string;
  body: string;
  href: string;
}

export interface Repo {
  readonly mode: "demo" | "supabase";

  listSuppliers(ctx: Ctx): Promise<Supplier[]>;
  getSupplier(ctx: Ctx, id: string): Promise<Supplier | null>;
  saveSupplier(ctx: Ctx, input: SupplierInput, id?: string): Promise<Supplier>;

  listFabrics(ctx: Ctx, supplierId?: string): Promise<Fabric[]>;
  getFabric(ctx: Ctx, id: string): Promise<Fabric | null>;
  saveFabric(ctx: Ctx, input: FabricInput, id?: string): Promise<Fabric>;

  listLots(ctx: Ctx): Promise<Lot[]>;
  listResults(ctx: Ctx): Promise<TestResult[]>;
  getLotBundle(ctx: Ctx, id: string): Promise<LotBundle | null>;
  createLot(ctx: Ctx, input: LotInput): Promise<Lot>;
  setLotStatus(ctx: Ctx, id: string, status: LotStatus, message: string): Promise<Lot>;
  decideLot(ctx: Ctx, id: string, input: DecisionInput): Promise<Lot>;

  addResult(ctx: Ctx, lotId: string, input: ResultInput): Promise<TestResult>;
  deleteResult(ctx: Ctx, id: string): Promise<void>;
  addEvidence(ctx: Ctx, lotId: string, kind: Evidence["kind"], resultId: string | null, file: UploadFile): Promise<Evidence>;

  listRequirements(ctx: Ctx): Promise<RequirementRow[]>;
  saveRequirement(ctx: Ctx, row: RequirementRow): Promise<void>;

  listUsers(ctx: Ctx): Promise<AppUser[]>;
  createUser(ctx: Ctx, input: UserInput): Promise<AppUser>;
  setUserActive(ctx: Ctx, id: string, active: boolean): Promise<void>;
  /** Staff (admin + reviewer) and the users of one supplier — notification targets. */
  recipients(kind: "staff" | { supplierId: string }): Promise<AppUser[]>;

  listNotifications(ctx: Ctx): Promise<AppNotification[]>;
  markNotificationsRead(ctx: Ctx): Promise<void>;
  pushNotifications(userIds: string[], n: NotificationInput): Promise<void>;

  listAudit(ctx: Ctx, limit?: number): Promise<AuditEntry[]>;

  listApiKeys(ctx: Ctx): Promise<ApiKey[]>;
  createApiKey(ctx: Ctx, name: string): Promise<{ key: ApiKey; token: string }>;
  revokeApiKey(ctx: Ctx, id: string): Promise<void>;
  /** Returns the key id when the bearer token is valid and not revoked. */
  verifyApiKey(token: string): Promise<string | null>;
  /** Service-level, read-only snapshot for the BI API (no user context). */
  biSnapshot(): Promise<{ suppliers: Supplier[]; fabrics: Fabric[]; lots: Lot[]; results: TestResult[]; requirements: RequirementRow[] }>;
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const isStaff = (u: AppUser) => u.role === "admin" || u.role === "reviewer";

export function assertStaff(ctx: Ctx) {
  if (!isStaff(ctx.user)) throw new ForbiddenError();
}

export function assertAdmin(ctx: Ctx) {
  if (ctx.user.role !== "admin") throw new ForbiddenError();
}

/** Suppliers may only touch rows of their own company. */
export function assertSupplierScope(ctx: Ctx, supplierId: string) {
  if (isStaff(ctx.user)) return;
  if (!ctx.user.supplierId || ctx.user.supplierId !== supplierId) throw new ForbiddenError();
}
