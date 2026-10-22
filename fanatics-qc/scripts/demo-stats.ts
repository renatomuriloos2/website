// Prints the status distribution of the demo dataset (sanity check for seed tuning).
import { buildDemoDb } from "../lib/demo/seed";
const db = buildDemoDb();
const c: Record<string, number> = {};
db.lots.forEach((l) => (c[l.status] = (c[l.status] ?? 0) + 1));
console.log(db.lots.length, c);
