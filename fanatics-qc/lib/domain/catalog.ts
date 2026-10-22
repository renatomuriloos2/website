// Fanatics QC Lab — protocol catalog.
//
// This file is the single source of truth for the default protocol: fiber
// families, decoration methods, test methods (AATCC / ISO / ASTM based),
// minimum grades and the conditions a lab can attach to an approval.
// supabase/seed.sql mirrors these values so the database starts with the same
// protocol; admins can then tune minimums per fiber in Protocols → Requirements.

import type {
  ConditionCode,
  DecorationCode,
  FiberType,
  GarmentType,
  Localized,
  LotStatus,
  TestCategory,
  TestKind,
  Verdict,
} from "./types";

// ─── Fibers ─────────────────────────────────────────────────────────────────

export interface FiberDef {
  code: FiberType;
  name: Localized;
  short: string;
  /** Disperse-dyed polyester content → dye-migration (bleed) risk under heat. */
  migrationRisk: "high" | "medium" | "low";
  sublimation: "yes" | "light_only" | "no";
  note: Localized;
}

export const FIBERS: FiberDef[] = [
  {
    code: "polyester",
    name: { en: "100% Polyester", es: "100% Poliéster" },
    short: "PES",
    migrationRisk: "high",
    sublimation: "yes",
    note: {
      en: "Disperse dyes sublime above ~150 °C. Dark/saturated shades are prone to dye migration into white inks and twill.",
      es: "Los colorantes dispersos subliman por encima de ~150 °C. Los tonos oscuros/saturados tienden a migrar a tintas blancas y twill.",
    },
  },
  {
    code: "recycled_polyester",
    name: { en: "Recycled Polyester (rPET)", es: "Poliéster reciclado (rPET)" },
    short: "rPES",
    migrationRisk: "high",
    sublimation: "yes",
    note: {
      en: "Behaves like virgin polyester; shade consistency between lots must be verified instrumentally.",
      es: "Se comporta como poliéster virgen; la consistencia de tono entre lotes debe verificarse por espectrofotómetro.",
    },
  },
  {
    code: "cationic_polyester",
    name: { en: "Cationic Dyeable Polyester (CDP)", es: "Poliéster catiónico (CDP)" },
    short: "CDP",
    migrationRisk: "medium",
    sublimation: "yes",
    note: {
      en: "Cationic dyes bond ionically and migrate less than disperse dyes, but heathers/mélanges often combine CDP with disperse-dyed polyester.",
      es: "Los colorantes catiónicos se fijan iónicamente y migran menos que los dispersos, pero los jaspeados suelen combinar CDP con poliéster disperso.",
    },
  },
  {
    code: "poly_spandex",
    name: { en: "Polyester / Spandex", es: "Poliéster / Elastano" },
    short: "PES/EL",
    migrationRisk: "high",
    sublimation: "yes",
    note: {
      en: "Elastane degrades above ~190 °C; prints must withstand stretch without cracking.",
      es: "El elastano se degrada por encima de ~190 °C; las estampas deben resistir el estiramiento sin agrietarse.",
    },
  },
  {
    code: "nylon",
    name: { en: "Nylon / Nylon-Spandex", es: "Nylon / Nylon-Elastano" },
    short: "PA",
    migrationRisk: "medium",
    sublimation: "no",
    note: {
      en: "Acid-dyed; low melting point. Requires nylon-specific inks/catalysts and low press temperatures.",
      es: "Teñido con colorantes ácidos; bajo punto de fusión. Requiere tintas/catalizadores para nylon y bajas temperaturas.",
    },
  },
  {
    code: "polycotton",
    name: { en: "Poly / Cotton blend (CVC)", es: "Mezcla Poliéster / Algodón (CVC)" },
    short: "PES/CO",
    migrationRisk: "medium",
    sublimation: "light_only",
    note: {
      en: "Polyester portion can bleed; sublimation only gives a vintage look on light shades with ≥50% polyester.",
      es: "La parte de poliéster puede migrar; la sublimación solo da efecto vintage en tonos claros con ≥50% poliéster.",
    },
  },
  {
    code: "triblend",
    name: { en: "Tri-blend (Poly / Cotton / Rayon)", es: "Tri-blend (Poliéster / Algodón / Rayón)" },
    short: "TRI",
    migrationRisk: "medium",
    sublimation: "light_only",
    note: {
      en: "Special care whenever heat is applied for curing — low-cure inks and bleed blockers typically required.",
      es: "Cuidado especial cuando se aplica calor de curado — normalmente requiere tintas de bajo curado y bloqueadores.",
    },
  },
  {
    code: "cotton",
    name: { en: "100% Cotton", es: "100% Algodón" },
    short: "CO",
    migrationRisk: "low",
    sublimation: "no",
    note: {
      en: "Reactive/vat dyed — no dye sublimation. Watch wet crocking on dark shades and shrinkage.",
      es: "Teñido reactivo/tina — no sublima. Vigilar frote húmedo en tonos oscuros y encogimiento.",
    },
  },
];

export const FIBER_MAP = Object.fromEntries(FIBERS.map((f) => [f.code, f])) as Record<FiberType, FiberDef>;

// ─── Test methods ───────────────────────────────────────────────────────────

export interface ReadingSpec {
  key: string;
  label: Localized;
  min?: number;
  max?: number;
  /** Compare |value| against max (dimensional change can be ±). */
  abs?: boolean;
  unit?: string;
  /** Which AATCC gray scale a spectro ΔE converts through. */
  scale?: "change" | "staining";
}

export interface TestMethodDef {
  id: string;
  code: string;
  standards: string;
  name: Localized;
  category: TestCategory;
  kind: TestKind;
  readings: ReadingSpec[];
  ladderTemps?: number[];
  summary: Localized;
  procedure: Localized[];
  /** Per-fiber minimum overrides: { fiber: { readingKey: { min/max } } } */
  fiberOverrides?: Partial<Record<FiberType, Record<string, { min?: number; max?: number }>>>;
  spectroCapable: boolean;
  /** Part of the base fabric qualification (independent of decoration). */
  base?: boolean;
  /** Base-fabric test whose failure blocks the lot. */
  critical?: boolean;
}

const L = (en: string, es: string): Localized => ({ en, es });

const MULTIFIBER = (changeMin: number, stainMin: number): ReadingSpec[] => [
  { key: "change", label: L("Color change", "Cambio de color"), min: changeMin, scale: "change" },
  { key: "st_acetate", label: L("Staining · Acetate", "Transferencia · Acetato"), min: stainMin, scale: "staining" },
  { key: "st_cotton", label: L("Staining · Cotton", "Transferencia · Algodón"), min: stainMin, scale: "staining" },
  { key: "st_nylon", label: L("Staining · Nylon", "Transferencia · Nylon"), min: stainMin, scale: "staining" },
  { key: "st_polyester", label: L("Staining · Polyester", "Transferencia · Poliéster"), min: stainMin, scale: "staining" },
  { key: "st_acrylic", label: L("Staining · Acrylic", "Transferencia · Acrílico"), min: stainMin, scale: "staining" },
  { key: "st_wool", label: L("Staining · Wool", "Transferencia · Lana"), min: stainMin, scale: "staining" },
];

export const LADDER_TEMPS = [130, 140, 150, 160, 170, 180, 190, 200, 210];
export const ladderKey = (t: number) => `t${t}`;
const LADDER = (temps: number[], min: number): ReadingSpec[] =>
  temps.map((t) => ({ key: ladderKey(t), label: L(`${t} °C`, `${t} °C`), min, scale: "staining" as const }));

export const TEST_METHODS: TestMethodDef[] = [
  // ── Colorfastness (base fabric) ──
  {
    id: "cf_laundering",
    code: "AATCC 61-2A",
    standards: "AATCC 61 Opt. 2A · ISO 105-C06 A2S · AATCC EP1/EP2 · EP7/EP12",
    name: L("Colorfastness to Laundering (accelerated)", "Solidez al lavado (acelerado)"),
    category: "colorfastness",
    kind: "grade",
    readings: MULTIFIBER(4, 3.5),
    fiberOverrides: { cotton: { st_cotton: { min: 3 }, st_nylon: { min: 3 } }, triblend: { st_nylon: { min: 3 } } },
    summary: L(
      "One accelerated cycle ≈ five home launderings at 49 °C with multifiber DW. Rate shade change and staining with the AATCC gray scales or instrumentally (EP7 / EP12).",
      "Un ciclo acelerado ≈ cinco lavados domésticos a 49 °C con testigo multifibra DW. Evaluar cambio de color y transferencia con escala de grises AATCC o por espectrofotómetro (EP7 / EP12)."
    ),
    procedure: [
      L("Cut a 50 × 150 mm specimen and sew it to multifiber fabric DW (acetate, cotton, nylon, polyester, acrylic, wool).", "Cortar probeta de 50 × 150 mm y coser al testigo multifibra DW (acetato, algodón, nylon, poliéster, acrílico, lana)."),
      L("Launder-Ometer: 150 mL, 0.15% AATCC 1993 WOB detergent, 50 steel balls, 49 °C, 45 min.", "Launder-Ometer: 150 mL, 0,15% detergente AATCC 1993 WOB, 50 bolas de acero, 49 °C, 45 min."),
      L("Rinse, dry ≤ 71 °C, condition 4 h at 21 °C / 65% RH.", "Enjuagar, secar ≤ 71 °C, acondicionar 4 h a 21 °C / 65% HR."),
      L("Rate color change (Gray Scale for Color Change) and staining on each fiber (Gray Scale for Staining) under D65 in a light booth, or measure ΔE with a spectrophotometer.", "Evaluar cambio de color (escala de grises de cambio) y transferencia en cada fibra (escala de grises de manchado) bajo D65 en cabina de luz, o medir ΔE con espectrofotómetro."),
    ],
    spectroCapable: true,
    base: true,
    critical: true,
  },
  {
    id: "cf_crock",
    code: "AATCC 8",
    standards: "AATCC 8 · ISO 105-X12 · AATCC 116 (rotary, prints)",
    name: L("Colorfastness to Crocking (rubbing)", "Solidez al frote"),
    category: "colorfastness",
    kind: "grade",
    readings: [
      { key: "dry", label: L("Dry", "Seco"), min: 4, scale: "staining" },
      { key: "wet", label: L("Wet", "Húmedo"), min: 3, scale: "staining" },
    ],
    fiberOverrides: { cotton: { wet: { min: 2.5 } } },
    summary: L("Crockmeter, 10 turns, dry and wet (65% pick-up) white crock squares, rated with the Gray Scale for Staining or the AATCC Chromatic Transference Scale.", "Crockmeter, 10 ciclos, tela testigo seca y húmeda (65% de absorción), evaluada con escala de grises de manchado o escala cromática AATCC."),
    procedure: [
      L("Condition specimen and crock squares 4 h at 21 °C / 65% RH.", "Acondicionar probeta y testigos 4 h a 21 °C / 65% HR."),
      L("Run 10 complete turns at 1 turn/s with 9 N downward force, warp and weft directions.", "Realizar 10 ciclos a 1 ciclo/s con 9 N de fuerza, en urdimbre y trama."),
      L("Wet test: crock square wetted to 65 ± 5% pick-up.", "Prueba húmeda: testigo mojado al 65 ± 5% de absorción."),
      L("Rate staining of the crock square.", "Evaluar el manchado del testigo."),
    ],
    spectroCapable: true,
    base: true,
    critical: true,
  },
  {
    id: "cf_perspiration",
    code: "AATCC 15",
    standards: "AATCC 15 · ISO 105-E04",
    name: L("Colorfastness to Perspiration", "Solidez al sudor"),
    category: "colorfastness",
    kind: "grade",
    readings: MULTIFIBER(4, 3.5),
    fiberOverrides: { cotton: { st_cotton: { min: 3 }, st_nylon: { min: 3 } } },
    summary: L("Acid artificial perspiration, perspiration tester at 4.5 kg, 6 h at 38 °C. Critical for performance jerseys.", "Sudor artificial ácido, perspirómetro a 4,5 kg, 6 h a 38 °C. Crítico para jerseys de alto rendimiento."),
    procedure: [
      L("Wet specimen + multifiber in acid perspiration solution (pH 4.3) for 30 min.", "Mojar probeta + multifibra en solución de sudor ácido (pH 4,3) 30 min."),
      L("Place in perspiration tester under 4.5 kg, 6 h at 38 °C.", "Colocar en perspirómetro bajo 4,5 kg, 6 h a 38 °C."),
      L("Dry and rate color change and staining.", "Secar y evaluar cambio de color y transferencia."),
    ],
    spectroCapable: true,
    base: true,
  },
  {
    id: "cf_water",
    code: "AATCC 107",
    standards: "AATCC 107 · ISO 105-E01",
    name: L("Colorfastness to Water", "Solidez al agua"),
    category: "colorfastness",
    kind: "grade",
    readings: MULTIFIBER(4, 3.5),
    summary: L("Specimen + multifiber wetted in distilled water, 18 h at 38 °C under pressure.", "Probeta + multifibra mojada en agua destilada, 18 h a 38 °C bajo presión."),
    procedure: [
      L("Immerse composite specimen in distilled water at room temperature for 15 min.", "Sumergir la probeta compuesta en agua destilada 15 min."),
      L("Place in tester under 4.5 kg, 18 h at 38 °C, then dry and rate.", "Colocar en el equipo bajo 4,5 kg, 18 h a 38 °C, secar y evaluar."),
    ],
    spectroCapable: true,
    base: true,
  },
  {
    id: "cf_light",
    code: "AATCC 16.3",
    standards: "AATCC 16.3 Opt. 3 (Xenon) · ISO 105-B02",
    name: L("Colorfastness to Light (20 AFU)", "Solidez a la luz (20 AFU)"),
    category: "colorfastness",
    kind: "grade",
    readings: [{ key: "change", label: L("Color change @ 20 AFU", "Cambio de color @ 20 AFU"), min: 4, scale: "change" }],
    summary: L("Xenon-arc exposure to 20 AATCC Fading Units with blue-wool references.", "Exposición a arco de xenón hasta 20 Unidades de Decoloración AATCC con referencias de lana azul."),
    procedure: [
      L("Mount specimen with half masked; expose to 20 AFU (Option 3).", "Montar la probeta con la mitad cubierta; exponer a 20 AFU (Opción 3)."),
      L("Rate color change exposed vs. unexposed area.", "Evaluar cambio de color zona expuesta vs. no expuesta."),
    ],
    spectroCapable: true,
    base: true,
  },
  {
    id: "color_blocking",
    code: "FX-CB-03",
    standards: "AATCC 61-2A / ISO 105-C06 on a color-blocked composite · AATCC EP2",
    name: L("Color-blocking Bleed (adjacent panel staining)", "Sangrado en color blocking (manchado del panel adyacente)"),
    category: "colorfastness",
    kind: "grade",
    readings: [
      { key: "adjacent", label: L("Staining on adjacent color", "Manchado sobre color adyacente"), min: 4, scale: "staining" },
      { key: "white", label: L("Staining on white panel / trim", "Manchado sobre panel / ribete blanco"), min: 4, scale: "staining" },
    ],
    summary: L(
      "Each color is sewn to the lightest adjacent color of the garment (and to white trim) as in the color-blocked design, laundered (AATCC 61-2A) and the lighter panel is rated with the Gray Scale for Staining. Run once per color pair.",
      "Cada color se cose al color adyacente más claro de la prenda (y al ribete blanco) como en el diseño color-blocking, se lava (AATCC 61-2A) y se evalúa el panel claro con la escala de grises de manchado. Se corre una vez por par de colores."
    ),
    procedure: [
      L("Cut 50 × 100 mm of the tested color and of the adjacent lighter color / white trim used in the style.", "Cortar 50 × 100 mm del color ensayado y del color adyacente más claro / ribete blanco del estilo."),
      L("Sew them face-to-face along the long edge (as the seam in the garment).", "Coserlos cara a cara por el borde largo (como la costura de la prenda)."),
      L("Launder per AATCC 61-2A, dry flat while still in contact.", "Lavar según AATCC 61-2A y secar en plano manteniendo el contacto."),
      L("Rate staining of the lighter panel and of the white trim (Gray Scale for Staining or EP12).", "Evaluar el manchado del panel claro y del ribete blanco (escala de grises de manchado o EP12)."),
    ],
    spectroCapable: true,
    base: true,
  },
  {
    id: "storage_transfer",
    code: "AATCC 163",
    standards: "AATCC 163 · Fanatics hot-stack simulation",
    name: L("Dye Transfer in Storage (hot stacking)", "Transferencia de color en almacenaje (apilado en caliente)"),
    category: "migration",
    kind: "grade",
    readings: [{ key: "staining", label: L("Staining on white decorated face", "Manchado sobre cara decorada blanca"), min: 4, scale: "staining" }],
    summary: L("Decorated specimen stacked face-to-face against white fabric under 1 kg/cm² at 60 °C for 48 h — simulates hot stacking and packaging before cool-down.", "Probeta decorada apilada cara a cara contra tela blanca bajo 1 kg/cm² a 60 °C por 48 h — simula apilado en caliente y empaque antes de enfriar."),
    procedure: [
      L("Decorate the specimen with the production white ink/transfer.", "Decorar la probeta con la tinta/transfer blanco de producción."),
      L("Stack against white polyester under 1 kg/cm², 60 °C, 48 h.", "Apilar contra poliéster blanco bajo 1 kg/cm², 60 °C, 48 h."),
      L("Rate staining of the white print and the adjacent fabric.", "Evaluar el manchado de la estampa blanca y la tela adyacente."),
    ],
    spectroCapable: true,
  },

  // ── Heat / migration ladders (the decoration-readiness core) ──
  {
    id: "dye_migration",
    code: "FX-DM-01",
    standards: "Fanatics heat ladder · based on AATCC 117 / ISO 105-P01 + white plastisol bleed check",
    name: L("Dye Migration Heat Ladder (bleed into white)", "Escalera térmica de migración (sangrado al blanco)"),
    category: "migration",
    kind: "ladder",
    ladderTemps: LADDER_TEMPS,
    readings: LADDER(LADDER_TEMPS, 4),
    summary: L(
      "White low-bleed plastisol / white transfer is applied to the fabric at each ladder temperature (15 s, medium pressure), post-conditioned 24 h at 60 °C, and the white is rated with the Gray Scale for Staining. The highest temperature that still rates ≥ the minimum is the fabric's Max Safe Decoration Temperature.",
      "Se aplica plastisol blanco low-bleed / transfer blanco a la tela en cada temperatura de la escalera (15 s, presión media), se post-acondiciona 24 h a 60 °C y el blanco se evalúa con la escala de grises de manchado. La temperatura más alta que aún cumple el mínimo es la Temperatura Máxima Segura de Decoración."
    ),
    procedure: [
      L("Cut 9 specimens 100 × 100 mm from the lot, one per ladder temperature (130–210 °C).", "Cortar 9 probetas de 100 × 100 mm del lote, una por temperatura (130–210 °C)."),
      L("Print/press a solid white square (production white, no blocker) and cure/press at the ladder temperature for 15 s.", "Imprimir/prensar un cuadro blanco sólido (blanco de producción, sin bloqueador) y curar/prensar a la temperatura por 15 s."),
      L("Post-condition all specimens 24 h at 60 °C to reveal delayed migration (ghosting).", "Post-acondicionar todas las probetas 24 h a 60 °C para revelar migración retardada (ghosting)."),
      L("Rate the white with the Gray Scale for Staining vs. an unheated white reference (or measure ΔE*ab on the white).", "Evaluar el blanco con la escala de grises de manchado vs. blanco de referencia sin calor (o medir ΔE*ab sobre el blanco)."),
      L("If the lot fails at the production temperature, repeat with a grey/black bleed blocker underbase and with low-bleed poly white to qualify a conditional approval.", "Si el lote falla a la temperatura de producción, repetir con base bloqueadora gris/negra y con poly white low-bleed para calificar una aprobación condicionada."),
    ],
    spectroCapable: true,
  },
  {
    id: "sublimation_fastness",
    code: "ISO 105-P01",
    standards: "ISO 105-P01 · AATCC 117 (dry heat)",
    name: L("Colorfastness to Dry Heat / Sublimation", "Solidez al calor seco / sublimación"),
    category: "migration",
    kind: "ladder",
    ladderTemps: [180, 190, 200, 210],
    readings: LADDER([180, 190, 200, 210], 4),
    summary: L("Specimen between white polyester adjacent fabric, heated 30 s in a heating device at each temperature. Rates sublimation staining relevant to full and spot sublimation.", "Probeta entre tela adyacente de poliéster blanco, calentada 30 s en cada temperatura. Evalúa el manchado por sublimación relevante para sublimación total y spot."),
    procedure: [
      L("Composite: specimen between undyed polyester adjacent fabrics.", "Compuesto: probeta entre telas adyacentes de poliéster sin teñir."),
      L("Heat 30 s at 180 / 190 / 200 / 210 °C at 4 kPa.", "Calentar 30 s a 180 / 190 / 200 / 210 °C a 4 kPa."),
      L("Condition 4 h; rate staining of adjacent and color change of specimen.", "Acondicionar 4 h; evaluar manchado del adyacente y cambio de color."),
    ],
    spectroCapable: true,
  },
  {
    id: "hot_pressing",
    code: "AATCC 133",
    standards: "AATCC 133 · ISO 105-X11",
    name: L("Colorfastness to Heat: Hot Pressing", "Solidez al calor: planchado"),
    category: "migration",
    kind: "grade",
    readings: [
      { key: "dry", label: L("Dry pressing", "Planchado seco"), min: 4, scale: "change" },
      { key: "damp", label: L("Damp pressing", "Planchado húmedo"), min: 4, scale: "change" },
      { key: "wet", label: L("Wet pressing", "Planchado mojado"), min: 3.5, scale: "change" },
    ],
    summary: L("Shade change and staining on cotton cover cloth under the press temperature of the decoration method (twill, transfers).", "Cambio de color y manchado sobre tela de algodón bajo la temperatura de prensa del método (twill, transfers)."),
    procedure: [
      L("Press specimen 15 s at the method temperature, dry, damp and wet cover cloth.", "Prensar la probeta 15 s a la temperatura del método, con tela cubierta seca, húmeda y mojada."),
      L("Rate color change immediately and after 4 h conditioning.", "Evaluar cambio de color inmediatamente y tras 4 h de acondicionamiento."),
    ],
    spectroCapable: true,
  },
  {
    id: "press_marks",
    code: "FX-PM-02",
    standards: "Fanatics visual protocol (scorch, glazing, platen marks)",
    name: L("Press Marks, Glazing & Scorch at Process Temperature", "Marcas de prensa, brillo y quemado a temperatura de proceso"),
    category: "decoration",
    kind: "grade",
    readings: [{ key: "appearance", label: L("Appearance grade", "Grado de apariencia"), min: 4 }],
    summary: L("Visual 1–5 rating of shine, platen box marks, scorch or hand change after pressing at the method temperature.", "Evaluación visual 1–5 de brillo, marcas de platina, quemado o cambio de tacto tras prensar a la temperatura del método."),
    procedure: [L("Press at the method temperature and dwell; rate after cooling against photographic standards.", "Prensar a la temperatura y tiempo del método; evaluar tras enfriar contra estándares fotográficos.")],
    spectroCapable: false,
  },

  // ── Decoration performance ──
  {
    id: "print_adhesion",
    code: "ASTM D3359-B",
    standards: "ASTM D3359 Method B (cross-hatch, adapted to textiles)",
    name: L("Print Adhesion — Cross-hatch Tape", "Adherencia de estampa — Cuadrícula y cinta"),
    category: "decoration",
    kind: "grade",
    readings: [{ key: "adhesion", label: L("Adhesion (5 = no removal)", "Adherencia (5 = sin desprendimiento)"), min: 4 }],
    summary: L("Cross-hatch cut through the print, pressure-sensitive tape applied and removed; rated 1–5 (equivalent to 1B–5B).", "Corte en cuadrícula sobre la estampa, se aplica y retira cinta; evaluado 1–5 (equivalente a 1B–5B)."),
    procedure: [L("Cut 6 × 6 lattice at 2 mm spacing, apply tape, pull at 180° and rate removed area.", "Cortar cuadrícula 6 × 6 a 2 mm, aplicar cinta, retirar a 180° y evaluar el área desprendida.")],
    spectroCapable: false,
  },
  {
    id: "print_wash",
    code: "FX-WD-25",
    standards: "AATCC 135 / AATCC 150 laundering (25 cycles) · visual per AATCC 143 photographic scale",
    name: L("Decoration Wash Durability (25 cycles)", "Durabilidad al lavado de la decoración (25 ciclos)"),
    category: "decoration",
    kind: "grade",
    readings: [
      { key: "cracking", label: L("Cracking", "Agrietamiento"), min: 4 },
      { key: "peeling", label: L("Peeling / lifting", "Desprendimiento"), min: 4 },
      { key: "fading", label: L("Fading of decoration", "Decoloración de la decoración"), min: 3.5, scale: "change" },
    ],
    summary: L("Decorated garment laundered 25 home cycles (AATCC 135, 1-IV-A-i, tumble dry) and rated for cracking, peeling and fading.", "Prenda decorada lavada 25 ciclos domésticos (AATCC 135, 1-IV-A-i, secado en tómbola) y evaluada por agrietamiento, desprendimiento y decoloración."),
    procedure: [
      L("Wash inside-out at 41 °C with AATCC 2003 detergent; tumble dry normal.", "Lavar al revés a 41 °C con detergente AATCC 2003; secar en tómbola normal."),
      L("Rate after 5, 10 and 25 cycles; report the 25-cycle grade.", "Evaluar tras 5, 10 y 25 ciclos; reportar el grado de 25 ciclos."),
    ],
    spectroCapable: true,
  },
  {
    id: "stretch_crack",
    code: "ASTM D2594-P",
    standards: "ASTM D2594 adapted — print stretch & recovery",
    name: L("Print Stretch & Recovery (cracking)", "Elongación y recuperación de estampa"),
    category: "decoration",
    kind: "grade",
    readings: [{ key: "crack", label: L("Cracking at 30% stretch", "Agrietamiento al 30% de elongación"), min: 4 }],
    summary: L("Printed area stretched 30% (widthwise) for 10 cycles; rated for cracking and loss of recovery.", "Área impresa estirada 30% (a lo ancho) por 10 ciclos; evaluada por agrietamiento y pérdida de recuperación."),
    procedure: [L("Stretch 30%, hold 10 s, release; repeat 10×; rate 1–5.", "Estirar 30%, mantener 10 s, soltar; repetir 10×; evaluar 1–5.")],
    spectroCapable: false,
  },
  {
    id: "peel_strength",
    code: "ASTM D903-T",
    standards: "ASTM D903 / ISO 6133 adapted (T-peel of heat-applied decoration)",
    name: L("Peel Strength of Heat-applied Decoration", "Resistencia al pelado de decoración termoaplicada"),
    category: "decoration",
    kind: "numeric",
    readings: [{ key: "peel", label: L("Peel force", "Fuerza de pelado"), min: 8, unit: "N/25 mm" }],
    summary: L("T-peel at 300 mm/min after 5 wash cycles; minimum average force per 25 mm.", "Pelado en T a 300 mm/min tras 5 lavados; fuerza media mínima por 25 mm."),
    procedure: [L("Apply decoration at production settings, wash 5×, peel 25 mm strips on a tensile tester.", "Aplicar decoración con parámetros de producción, lavar 5×, pelar tiras de 25 mm en dinamómetro.")],
    spectroCapable: false,
  },

  // ── Physical ──
  {
    id: "dim_change",
    code: "AATCC 135",
    standards: "AATCC 135 (3 cycles, 1-IV-A-i) · ISO 6330",
    name: L("Dimensional Change after Home Laundering", "Cambio dimensional tras lavado doméstico"),
    category: "physical",
    kind: "numeric",
    readings: [
      { key: "length", label: L("Length", "Largo"), max: 3, abs: true, unit: "%" },
      { key: "width", label: L("Width", "Ancho"), max: 3, abs: true, unit: "%" },
    ],
    fiberOverrides: { cotton: { length: { max: 5 }, width: { max: 5 } }, polycotton: { length: { max: 4 }, width: { max: 4 } }, triblend: { length: { max: 4 }, width: { max: 4 } } },
    summary: L("Benchmarks marked 250 mm apart, 3 wash/tumble-dry cycles, % change measured.", "Marcas a 250 mm, 3 ciclos de lavado/secado, se mide el % de cambio."),
    procedure: [L("Mark 3 benchmark pairs per direction, launder 3 cycles, measure and average.", "Marcar 3 pares por dirección, lavar 3 ciclos, medir y promediar.")],
    spectroCapable: false,
    base: true,
    critical: true,
  },
  {
    id: "skew",
    code: "AATCC 179",
    standards: "AATCC 179 · ISO 16322",
    name: L("Skewness / Torque after Laundering", "Torsión tras lavado"),
    category: "physical",
    kind: "numeric",
    readings: [{ key: "skew", label: L("Skew change", "Cambio de torsión"), max: 5, abs: true, unit: "%" }],
    summary: L("Spirality of knits after 3 launderings — critical for side-seam twist in jerseys.", "Espiralidad de tejidos de punto tras 3 lavados — crítico para la torsión de costuras laterales."),
    procedure: [L("Mark diagonal benchmarks, launder 3 cycles, measure skew %.", "Marcar diagonales, lavar 3 ciclos, medir % de torsión.")],
    spectroCapable: false,
    base: true,
  },
  {
    id: "pilling",
    code: "ASTM D3512",
    standards: "ASTM D3512 (random tumble, 30 min) · ISO 12945-2",
    name: L("Pilling Resistance", "Resistencia al pilling"),
    category: "physical",
    kind: "grade",
    readings: [{ key: "pilling", label: L("Pilling grade", "Grado de pilling"), min: 3.5 }],
    summary: L("Random tumble pilling tester, 30 min, rated against photographic standards.", "Equipo de pilling por volteo aleatorio, 30 min, evaluado contra estándares fotográficos."),
    procedure: [L("Tumble 3 specimens 30 min with cork liner; rate 1–5.", "Voltear 3 probetas 30 min con revestimiento de corcho; evaluar 1–5.")],
    spectroCapable: false,
    base: true,
  },
  {
    id: "snagging",
    code: "ASTM D3939",
    standards: "ASTM D3939 (mace test)",
    name: L("Snagging Resistance", "Resistencia al enganche"),
    category: "physical",
    kind: "grade",
    readings: [{ key: "snag", label: L("Snag grade", "Grado de enganche"), min: 3.5 }],
    summary: L("Mace snag tester, 600 revolutions; critical for mesh and lightweight jerseys.", "Equipo de enganche tipo maza, 600 revoluciones; crítico para mallas y jerseys livianos."),
    procedure: [L("Run 600 revolutions; rate against photographic standards.", "Correr 600 revoluciones; evaluar contra estándares fotográficos.")],
    spectroCapable: false,
    base: true,
  },
  {
    id: "burst",
    code: "ASTM D3786",
    standards: "ASTM D3786 (hydraulic diaphragm)",
    name: L("Bursting Strength", "Resistencia al estallido"),
    category: "physical",
    kind: "numeric",
    readings: [{ key: "burst", label: L("Burst strength", "Resistencia al estallido"), min: 345, unit: "kPa" }],
    summary: L("Hydraulic diaphragm bursting strength of knit fabric.", "Resistencia al estallido de tejido de punto por diafragma hidráulico."),
    procedure: [L("Test 5 specimens; report mean in kPa.", "Ensayar 5 probetas; reportar la media en kPa.")],
    spectroCapable: false,
    base: true,
  },

  // ── Shade ──
  {
    id: "shade",
    code: "AATCC EP6 / 173",
    standards: "AATCC EP6 · AATCC 173 (ΔE CMC 2:1, D65/10°)",
    name: L("Shade vs. Approved Standard (spectrophotometer)", "Tono vs. estándar aprobado (espectrofotómetro)"),
    category: "shade",
    kind: "numeric",
    readings: [{ key: "de_cmc", label: L("ΔE CMC (2:1) D65", "ΔE CMC (2:1) D65"), max: 1, unit: "ΔE" }],
    summary: L("Instrumental shade evaluation of the bulk lot against the approved lab dip / team color standard.", "Evaluación instrumental del tono del lote contra el lab dip aprobado / color oficial del equipo."),
    procedure: [
      L("Calibrate spectrophotometer (D65/10°, SCI, large aperture), 4 layers opaque.", "Calibrar espectrofotómetro (D65/10°, SCI, apertura grande), 4 capas opacas."),
      L("Measure 4 readings rotating 90°, average and compute ΔE CMC (2:1) against standard.", "Medir 4 lecturas rotando 90°, promediar y calcular ΔE CMC (2:1) vs. estándar."),
    ],
    spectroCapable: true,
    base: true,
    critical: true,
  },

  // ── Chemical ──
  {
    id: "ph",
    code: "AATCC 81",
    standards: "AATCC 81 · ISO 3071",
    name: L("pH of Water-extracted Fabric", "pH del extracto acuoso"),
    category: "chemical",
    kind: "numeric",
    readings: [{ key: "ph_min", label: L("pH (≥)", "pH (≥)"), min: 4 }, { key: "ph_max", label: L("pH (≤)", "pH (≤)"), max: 7.5 }],
    summary: L("pH of aqueous extract; skin-contact range 4.0–7.5.", "pH del extracto acuoso; rango para contacto con piel 4,0–7,5."),
    procedure: [L("Boil 10 g in 250 mL distilled water, cool and measure pH.", "Hervir 10 g en 250 mL de agua destilada, enfriar y medir pH.")],
    spectroCapable: false,
    base: true,
  },
  {
    id: "formaldehyde",
    code: "AATCC 112",
    standards: "AATCC 112 · ISO 14184-1",
    name: L("Formaldehyde Release", "Liberación de formaldehído"),
    category: "chemical",
    kind: "numeric",
    readings: [{ key: "hcho", label: L("Formaldehyde", "Formaldehído"), max: 75, unit: "ppm" }],
    summary: L("Free and released formaldehyde for skin-contact apparel (≤ 75 ppm; ≤ 20 ppm infant).", "Formaldehído libre y liberado para prendas en contacto con la piel (≤ 75 ppm; ≤ 20 ppm bebé)."),
    procedure: [L("Sealed jar method, 20 h at 49 °C, colorimetric determination.", "Método de frasco sellado, 20 h a 49 °C, determinación colorimétrica.")],
    spectroCapable: false,
    base: true,
  },
  {
    id: "lead",
    code: "CPSIA §101",
    standards: "CPSIA §101 / 16 CFR 1303 · CPSC-CH-E1003",
    name: L("Total Lead in Decoration Inks / Coatings", "Plomo total en tintas / recubrimientos"),
    category: "chemical",
    kind: "numeric",
    readings: [{ key: "pb", label: L("Lead", "Plomo"), max: 90, unit: "ppm" }],
    summary: L("Required for youth products: lead in surface coatings ≤ 90 ppm.", "Requerido para productos juveniles: plomo en recubrimientos ≤ 90 ppm."),
    procedure: [L("Scrape cured ink, microwave digestion, ICP-OES.", "Raspar tinta curada, digestión por microondas, ICP-OES.")],
    spectroCapable: false,
  },
];

export const TEST_MAP = Object.fromEntries(TEST_METHODS.map((t) => [t.id, t])) as Record<string, TestMethodDef>;
export const BASE_TESTS = TEST_METHODS.filter((t) => t.base);

// ─── Decoration methods ─────────────────────────────────────────────────────

export interface MethodTest {
  testId: string;
  critical: boolean;
}

export interface DecorationDef {
  code: DecorationCode;
  name: Localized;
  family: "screen" | "sublimation" | "heat_applied" | "digital" | "stitch" | "other";
  icon: string;
  /** Typical production cure / press temperature (°C). null → no heat. */
  processTempC: number | null;
  /** Lowest viable temperature with low-cure inks / adhesives (°C). */
  lowTempC: number | null;
  dwellS: number | null;
  fibers: FiberType[];
  tests: MethodTest[];
  /** Conditions to add when the fabric bleeds below the process temperature. */
  bleedFixes: ConditionCode[];
  description: Localized;
  tips: Localized;
}

const ALL_FIBERS: FiberType[] = FIBERS.map((f) => f.code);
const POLY: FiberType[] = ["polyester", "recycled_polyester", "cationic_polyester", "poly_spandex"];

export const DECORATIONS: DecorationDef[] = [
  {
    code: "screen_plastisol",
    name: L("Screen Print · Plastisol", "Serigrafía · Plastisol"),
    family: "screen",
    icon: "screen",
    processTempC: 160,
    lowTempC: 135,
    dwellS: 60,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "print_adhesion", critical: true },
      { testId: "print_wash", critical: true },
      { testId: "stretch_crack", critical: false },
      { testId: "storage_transfer", critical: false },
      { testId: "lead", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "bleed_blocker", "poly_white", "no_hot_stack"],
    description: L("Ink is squeegeed through a stencilled screen and cured in a dryer. Standard for crests, wordmarks and numbers on tees.", "La tinta se pasa con racleta a través de una malla y se cura en horno. Estándar para escudos, wordmarks y números en camisetas."),
    tips: L("Low-cure poly inks required on polyester and blends. Grey or black bleed blockers may be necessary. Avoid hot stacking, do not use catch bins, use cooling stations and do not package until completely cool.", "Tintas poly de bajo curado en poliéster y mezclas. Pueden requerirse bloqueadores gris o negro. Evitar el apilado en caliente, no usar bandejas de recogida, usar estaciones de enfriamiento y no empacar hasta enfriar completamente."),
  },
  {
    code: "screen_waterbased",
    name: L("Screen Print · Water-based / Discharge", "Serigrafía · Base agua / Corrosión"),
    family: "screen",
    icon: "screen",
    processTempC: 160,
    lowTempC: null,
    dwellS: 90,
    fibers: ["cotton", "polycotton", "triblend"],
    tests: [
      { testId: "print_wash", critical: true },
      { testId: "cf_crock", critical: true },
      { testId: "print_adhesion", critical: false },
      { testId: "formaldehyde", critical: false },
    ],
    bleedFixes: [],
    description: L("Soft-hand water-based or discharge inks that remove reactive dye from cotton. Not suitable for polyester-rich fabrics.", "Tintas base agua o de corrosión que remueven el colorante reactivo del algodón. No apto para telas ricas en poliéster."),
    tips: L("Discharge only works on dischargeable reactive-dyed cotton; confirm dischargeability on the lot. Full cure is essential for wash durability.", "La corrosión solo funciona en algodón teñido con reactivos corroíbles; confirmar en el lote. El curado completo es esencial."),
  },
  {
    code: "screen_silicone",
    name: L("Screen Print · Silicone (performance)", "Serigrafía · Silicona (performance)"),
    family: "screen",
    icon: "screen",
    processTempC: 150,
    lowTempC: 130,
    dwellS: 60,
    fibers: [...POLY, "nylon", "polycotton"],
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "stretch_crack", critical: true },
      { testId: "print_wash", critical: true },
    ],
    bleedFixes: ["low_cure_ink", "bleed_blocker"],
    description: L("Silicone inks with high stretch for performance and compression wear; inherently bleed-resistant.", "Tintas de silicona de alta elasticidad para prendas de alto rendimiento; resistentes al sangrado."),
    tips: L("Use a silicone bleed-blocking base on dark sublimation-prone polyester.", "Usar base bloqueadora de silicona en poliéster oscuro propenso a migrar."),
  },
  {
    code: "sublimation",
    name: L("Sublimation (all-over / full dye)", "Sublimación (total)"),
    family: "sublimation",
    icon: "sublimation",
    processTempC: 200,
    lowTempC: 190,
    dwellS: 45,
    fibers: POLY,
    tests: [
      { testId: "sublimation_fastness", critical: true },
      { testId: "cf_laundering", critical: true },
      { testId: "cf_crock", critical: true },
      { testId: "cf_light", critical: false },
      { testId: "press_marks", critical: false },
      { testId: "dim_change", critical: true },
    ],
    bleedFixes: ["reduced_dwell"],
    description: L("Disperse dyes are transferred from paper into white/light polyester at ~200 °C — the standard for replica and authentic sublimated jerseys.", "Los colorantes dispersos se transfieren del papel al poliéster blanco/claro a ~200 °C — estándar para jerseys sublimados."),
    tips: L("Fabric must be white or light, ≥ 65% polyester, heat-set above the press temperature to avoid shrinkage and platen marks.", "La tela debe ser blanca o clara, ≥ 65% poliéster, termofijada sobre la temperatura de prensa para evitar encogimiento y marcas."),
  },
  {
    code: "spot_sublimation",
    name: L("Spot Sublimation", "Sublimación localizada (spot)"),
    family: "sublimation",
    icon: "sublimation",
    processTempC: 195,
    lowTempC: 185,
    dwellS: 40,
    fibers: POLY,
    tests: [
      { testId: "sublimation_fastness", critical: true },
      { testId: "dye_migration", critical: true },
      { testId: "press_marks", critical: true },
      { testId: "cf_crock", critical: false },
    ],
    bleedFixes: ["reduced_dwell", "light_base_only"],
    description: L("Localized sublimation (graphics, gradients, sleeve panels) on a pre-dyed polyester body.", "Sublimación localizada (gráficos, degradados, paneles de manga) sobre un cuerpo de poliéster ya teñido."),
    tips: L("The base shade must not migrate into the sublimated area — run the heat ladder on the dyed body at the spot-press temperature.", "El tono base no debe migrar al área sublimada — correr la escalera térmica sobre el cuerpo teñido a la temperatura de prensa."),
  },
  {
    code: "heat_transfer",
    name: L("Heat Transfer (screen-printed)", "Transfer térmico (serigráfico)"),
    family: "heat_applied",
    icon: "press",
    processTempC: 150,
    lowTempC: 125,
    dwellS: 12,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "peel_strength", critical: true },
      { testId: "print_wash", critical: true },
      { testId: "storage_transfer", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive", "no_hot_stack"],
    description: L("Pre-printed plastisol transfers applied with a heat press — crests, names and numbers, on-demand programs.", "Transfers de plastisol preimpresos aplicados con prensa — escudos, nombres y números, programas bajo demanda."),
    tips: L("Heat transfers with low-cure adhesive and bleed blockers are required on polyester, blends and pigment-dyed fabrics. Avoid hot stacking; use cooling stations.", "En poliéster, mezclas y telas pigmentadas se requieren transfers con adhesivo de bajo curado y bloqueadores. Evitar apilado en caliente; usar estaciones de enfriamiento."),
  },
  {
    code: "htv",
    name: L("Heat Transfer Vinyl · Names & Numbers", "Vinil textil · Nombres y números"),
    family: "heat_applied",
    icon: "press",
    processTempC: 150,
    lowTempC: 130,
    dwellS: 10,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "peel_strength", critical: true },
      { testId: "print_wash", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive"],
    description: L("Cut PU/PVC-free vinyl for personalization (NOB, numbers) applied with a heat press.", "Vinil PU cortado para personalización (nombre, números) aplicado con prensa."),
    tips: L("Use sublimation-blocking (grey back) vinyl on dark polyester.", "Usar vinil bloqueador de sublimación (respaldo gris) en poliéster oscuro."),
  },
  {
    code: "tackle_twill",
    name: L("Tackle Twill Appliqué (heat-seal + stitched)", "Aplique Tackle Twill (termosellado + cosido)"),
    family: "heat_applied",
    icon: "twill",
    processTempC: 165,
    lowTempC: 140,
    dwellS: 15,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "hot_pressing", critical: true },
      { testId: "peel_strength", critical: false },
      { testId: "dim_change", critical: true },
      { testId: "print_wash", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive"],
    description: L("Layered polyester twill numbers and wordmarks tacked with heat-seal adhesive and zig-zag stitched — the authentic jersey look.", "Números y wordmarks de twill de poliéster en capas, fijados con adhesivo termosellable y cosidos en zig-zag — el look auténtico."),
    tips: L("White and light twill on dark polyester is the highest migration risk on a jersey — qualify with a dye-blocking adhesive film.", "El twill blanco/claro sobre poliéster oscuro es el mayor riesgo de migración de un jersey — calificar con film adhesivo bloqueador."),
  },
  {
    code: "dtf",
    name: L("DTF · Direct-to-Film", "DTF · Directo a film"),
    family: "digital",
    icon: "digital",
    processTempC: 160,
    lowTempC: 130,
    dwellS: 15,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "print_wash", critical: true },
      { testId: "stretch_crack", critical: false },
      { testId: "cf_crock", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive", "no_hot_stack"],
    description: L("Pigment ink printed on PET film with hot-melt powder, transferred with a heat press. Full color, short runs, on-demand.", "Tinta pigmentada impresa sobre film PET con polvo hot-melt, transferida con prensa. Full color, tiradas cortas, bajo demanda."),
    tips: L("Use low-temperature / anti-sublimation (black) powder on polyester.", "Usar polvo de baja temperatura / anti-sublimación (negro) en poliéster."),
  },
  {
    code: "dtg",
    name: L("DTG · Direct-to-Garment", "DTG · Directo a prenda"),
    family: "digital",
    icon: "digital",
    processTempC: 165,
    lowTempC: 140,
    dwellS: 90,
    fibers: ["cotton", "polycotton", "triblend", "polyester"],
    tests: [
      { testId: "print_wash", critical: true },
      { testId: "cf_crock", critical: true },
      { testId: "dye_migration", critical: true },
    ],
    bleedFixes: ["pretreatment", "low_cure_ink"],
    description: L("Water-based pigment inkjet printed directly on the garment after pretreatment.", "Inyección de tinta pigmentada base agua directamente sobre la prenda tras pretratamiento."),
    tips: L("Polyester requires low-temperature pretreatment and cure; verify wet crock on dark shades.", "El poliéster requiere pretratamiento y curado de baja temperatura; verificar frote húmedo en tonos oscuros."),
  },
  {
    code: "embroidery",
    name: L("Embroidery", "Bordado"),
    family: "stitch",
    icon: "embroidery",
    processTempC: null,
    lowTempC: null,
    dwellS: null,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dim_change", critical: true },
      { testId: "skew", critical: false },
      { testId: "snagging", critical: false },
    ],
    bleedFixes: ["stabilizer"],
    description: L("Needle and thread decoration digitized from artwork — crests, sleeve logos, jock tags.", "Decoración con aguja e hilo digitalizada — escudos, logos de manga, jock tags."),
    tips: L("Use cut-away stabilizer on knits; reduce density on lightweight mesh to avoid puckering.", "Usar entretela cut-away en tejidos de punto; reducir densidad en mallas livianas para evitar fruncido."),
  },
  {
    code: "pad_print",
    name: L("Pad Print (tagless labels)", "Tampografía (etiquetas sin tag)"),
    family: "other",
    icon: "pad",
    processTempC: 140,
    lowTempC: 120,
    dwellS: 30,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "print_adhesion", critical: true },
      { testId: "dye_migration", critical: false },
      { testId: "lead", critical: false },
    ],
    bleedFixes: ["low_cure_ink"],
    description: L("Silicone pad transfers ink from an etched plate — tagless neck labels and small detailed logos.", "Un tampón de silicona transfiere tinta desde un cliché — etiquetas de cuello y logos pequeños."),
    tips: L("Great for heat-sensitive styles; confirm adhesion after wash.", "Ideal para estilos sensibles al calor; confirmar adherencia tras lavado."),
  },
  {
    code: "heat_label",
    name: L("Heat-applied Label (tagless)", "Etiqueta termoaplicada"),
    family: "heat_applied",
    icon: "press",
    processTempC: 150,
    lowTempC: 130,
    dwellS: 10,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "peel_strength", critical: false },
      { testId: "print_wash", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive"],
    description: L("Neck labels and care information applied by heat transfer.", "Etiquetas de cuello e información de cuidado aplicadas por transfer."),
    tips: L("Bleed shows quickly on white label backgrounds — use blocker on dark polyester.", "El sangrado se ve rápido en fondos blancos — usar bloqueador en poliéster oscuro."),
  },
  {
    code: "silicone_3d",
    name: L("3D Silicone / High-density Transfer", "Transfer de silicona 3D / alta densidad"),
    family: "heat_applied",
    icon: "press",
    processTempC: 150,
    lowTempC: 130,
    dwellS: 12,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "peel_strength", critical: true },
      { testId: "stretch_crack", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive"],
    description: L("Raised silicone logos and badges for premium and performance products.", "Logos y escudos de silicona en relieve para productos premium y de alto rendimiento."),
    tips: L("Confirm adhesion on DWR-finished or silicone-softened fabrics.", "Confirmar adherencia en telas con acabado repelente o suavizante de silicona."),
  },
  {
    code: "patch",
    name: L("Patches & Emblems (woven / chenille, heat-seal)", "Parches y emblemas (tejidos / chenille, termosellado)"),
    family: "heat_applied",
    icon: "patch",
    processTempC: 160,
    lowTempC: 140,
    dwellS: 20,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: false },
      { testId: "peel_strength", critical: true },
      { testId: "dim_change", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive"],
    description: L("League, sponsor, anniversary and championship patches; heat-sealed and/or sewn.", "Parches de liga, patrocinador, aniversario y campeonato; termosellados y/o cosidos."),
    tips: L("Stitch-down recommended in addition to heat-seal for authentic product.", "Se recomienda costura además del termosellado para producto auténtico."),
  },
  {
    code: "foil_reflective",
    name: L("Foil, Metallic & Reflective Transfers", "Transfers foil, metálico y reflectivo"),
    family: "heat_applied",
    icon: "press",
    processTempC: 150,
    lowTempC: 130,
    dwellS: 12,
    fibers: ALL_FIBERS,
    tests: [
      { testId: "dye_migration", critical: true },
      { testId: "print_wash", critical: true },
      { testId: "peel_strength", critical: false },
    ],
    bleedFixes: ["low_cure_ink", "blocker_adhesive"],
    description: L("Specialty finishes for fashion and fan-gear collections.", "Acabados especiales para colecciones de moda y fan-gear."),
    tips: L("Foil abrades quickly — verify 25-cycle wash appearance.", "El foil se desgasta rápido — verificar apariencia tras 25 lavados."),
  },
];

/** Compact labels for matrices and chips. */
export const DECORATION_SHORT: Record<DecorationCode, string> = {
  screen_plastisol: "Plastisol",
  screen_waterbased: "Water-based",
  screen_silicone: "Silicone ink",
  sublimation: "Sublimation",
  spot_sublimation: "Spot sublim.",
  heat_transfer: "Heat transfer",
  htv: "HTV N&N",
  tackle_twill: "Tackle twill",
  dtf: "DTF",
  dtg: "DTG",
  embroidery: "Embroidery",
  pad_print: "Pad print",
  heat_label: "Heat label",
  silicone_3d: "3D silicone",
  patch: "Patches",
  foil_reflective: "Foil / reflective",
};

export const DECORATION_MAP = Object.fromEntries(DECORATIONS.map((d) => [d.code, d])) as Record<DecorationCode, DecorationDef>;

// ─── Conditions ─────────────────────────────────────────────────────────────

export const CONDITIONS: Record<ConditionCode, Localized> = {
  max_temp: L("Max press / cure temperature {t} °C", "Temperatura máx. de prensa / curado {t} °C"),
  low_cure_ink: L("Low-cure ink / adhesive required", "Tinta / adhesivo de bajo curado obligatorio"),
  bleed_blocker: L("Grey or black bleed-blocker underbase required", "Base bloqueadora gris o negra obligatoria"),
  poly_white: L("Use low-bleed poly white ink", "Usar tinta poly white low-bleed"),
  blocker_adhesive: L("Dye-blocking (anti-sublimation) adhesive layer", "Capa adhesiva bloqueadora (anti-sublimación)"),
  reduced_dwell: L("Reduce dwell time / pressure", "Reducir tiempo / presión de prensa"),
  no_hot_stack: L("No hot stacking — cooling stations, pack only when cool", "Sin apilado en caliente — enfriar antes de empacar"),
  pretreatment: L("Low-temperature pretreatment required", "Pretratamiento de baja temperatura obligatorio"),
  stabilizer: L("Cut-away stabilizer / reduced stitch density", "Entretela cut-away / menor densidad de puntada"),
  light_base_only: L("Approved on white / light shades only", "Aprobado solo en tonos blancos / claros"),
  concession: L("Accepted under concession — monitor in bulk", "Aceptado por concesión — monitorear en producción"),
};

// ─── Status vocabulary ──────────────────────────────────────────────────────

export const LOT_STATUSES: { code: LotStatus; label: Localized; tone: Tone }[] = [
  { code: "draft", label: L("Draft", "Borrador"), tone: "neutral" },
  { code: "submitted", label: L("Submitted", "Enviado"), tone: "neutral" },
  { code: "in_review", label: L("In review", "En revisión"), tone: "info" },
  { code: "retest", label: L("Retest required", "Requiere re-test"), tone: "violet" },
  { code: "on_hold", label: L("On hold", "En espera"), tone: "warn" },
  { code: "approved", label: L("Approved", "Aprobado"), tone: "ok" },
  { code: "approved_concession", label: L("Approved w/ concession", "Aprobado con concesión"), tone: "amber" },
  { code: "rejected", label: L("Rejected", "Rechazado"), tone: "bad" },
];
export const STATUS_MAP = Object.fromEntries(LOT_STATUSES.map((s) => [s.code, s])) as Record<LotStatus, (typeof LOT_STATUSES)[number]>;
export const BOARD_COLUMNS: LotStatus[] = ["submitted", "in_review", "retest", "on_hold", "approved", "approved_concession", "rejected"];
export const DECIDED: LotStatus[] = ["approved", "approved_concession", "rejected"];

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "violet" | "amber";

export const VERDICTS: Record<Verdict, { label: Localized; tone: Tone }> = {
  approved: { label: L("Approved", "Aprobado"), tone: "ok" },
  conditional: { label: L("Conditional", "Condicionado"), tone: "amber" },
  rejected: { label: L("Not approved", "No aprobado"), tone: "bad" },
  pending: { label: L("Pending tests", "Pruebas pendientes"), tone: "neutral" },
  not_applicable: { label: L("Not applicable", "No aplica"), tone: "neutral" },
};

// ─── Garments & placements (from decoration spec-sheet conventions) ─────────

export interface Placement {
  code: string;
  name: Localized;
  size: string;
  side: "front" | "back" | "sleeve";
  x: number;
  y: number;
  w: number;
  h: number;
}

export const GARMENTS: Record<GarmentType, Localized> = {
  jersey: L("Jersey (replica / authentic)", "Jersey (réplica / auténtico)"),
  tee: L("Tee", "Camiseta"),
  hoodie: L("Hoodie / Fleece", "Sudadera / Fleece"),
  polo: L("Polo", "Polo"),
  shorts: L("Shorts", "Shorts"),
};

// x/y/w/h are percentages on the silhouette drawing.
export const PLACEMENTS: Placement[] = [
  { code: "FC", name: L("Front crest / wordmark", "Escudo / wordmark frontal"), size: '12" W × 4" H', side: "front", x: 30, y: 30, w: 40, h: 12 },
  { code: "FN", name: L("Front number", "Número frontal"), size: '4"–6" H', side: "front", x: 42, y: 46, w: 16, h: 14 },
  { code: "LC", name: L("Left chest", "Pecho izquierdo"), size: '4" × 4"', side: "front", x: 58, y: 26, w: 12, h: 10 },
  { code: "JT", name: L("Jock tag", "Jock tag"), size: '2.5" × 3"', side: "front", x: 26, y: 78, w: 10, h: 9 },
  { code: "NB", name: L("Name on back (NOB)", "Nombre en espalda"), size: '12" W × 3" H', side: "back", x: 30, y: 22, w: 40, h: 8 },
  { code: "BN", name: L("Back number", "Número de espalda"), size: '8"–10" H', side: "back", x: 34, y: 33, w: 32, h: 26 },
  { code: "NL", name: L("Neck label (tagless)", "Etiqueta de cuello"), size: '3" × 2"', side: "back", x: 44, y: 9, w: 12, h: 6 },
  { code: "SL", name: L("Sleeve number / patch", "Número / parche de manga"), size: '4" × 4"', side: "sleeve", x: 4, y: 24, w: 12, h: 10 },
  { code: "SP", name: L("Sponsor / league patch", "Parche de patrocinador / liga"), size: '3.5" × 3.5"', side: "sleeve", x: 84, y: 24, w: 12, h: 10 },
];

export function loc(text: Localized, locale: "en" | "es"): string {
  return text[locale] ?? text.en;
}
