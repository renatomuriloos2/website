import { Brand } from "./Brand";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="fx-stripes flex min-h-screen items-center justify-center bg-fx-black px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="font-display text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mb-6 mt-1 text-sm text-gray-500">{subtitle}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}
