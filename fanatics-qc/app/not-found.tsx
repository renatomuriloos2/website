import Link from "next/link";
import { FanaticsMark } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="fx-stripes flex min-h-screen flex-col items-center justify-center gap-4 bg-fx-ink text-white">
      <FanaticsMark className="h-12 w-auto" />
      <h1 className="font-display text-5xl font-black italic">404</h1>
      <p className="text-white/60">Not found — or you do not have access to this record.</p>
      <Link href="/dashboard" className="btn-primary">Dashboard</Link>
    </main>
  );
}
