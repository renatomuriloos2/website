import { SYSTEMS } from "@/lib/constants";
import { SystemType } from "@/types/database";

export function SystemCheckboxes({ selected }: { selected: SystemType[] }) {
  return (
    <div>
      <label className="label">Sistemas de este cliente</label>
      <div className="flex flex-wrap gap-3">
        {SYSTEMS.map((system) => (
          <label
            key={system}
            className="flex items-center gap-2 rounded-lg border border-surface/15 px-3 py-2 text-sm text-rethink-cream/80"
          >
            <input
              type="checkbox"
              name="systems"
              value={system}
              defaultChecked={selected.includes(system)}
              className="accent-rethink-orange"
            />
            {system}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-rethink-cream/40">
        Desmarca los que este cliente no tenga (ej. sin caldera o sin PTAR). No borra datos
        históricos, solo deja de mostrarlos en su portal.
      </p>
    </div>
  );
}
