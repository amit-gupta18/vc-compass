"use client";

import { useQuery } from "@tanstack/react-query";

import { useUIStore } from "../../lib/stores/ui-store";

async function loadDashboardSnapshot() {
  return {
    rankedOpportunities: 42,
    activeFlows: 6,
    diligenceQueue: 3,
    thesis: "Pre-seed AI infrastructure across US and Europe",
  };
}

const cards = [
  {
    key: "rankedOpportunities",
    label: "Ranked opportunities",
  },
  {
    key: "activeFlows",
    label: "Active agent flows",
  },
  {
    key: "diligenceQueue",
    label: "Diligence queue",
  },
] as const;

export function DashboardShell() {
  const activeApplicationId = useUIStore((state) => state.activeApplicationId);
  const setActiveApplicationId = useUIStore((state) => state.setActiveApplicationId);
  const { data } = useQuery({
    queryKey: ["dashboard-snapshot"],
    queryFn: loadDashboardSnapshot,
  });

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.key}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {data ? data[card.key] : "..."}
            </p>
          </article>
        ))}
      </div>

      <article className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Dashboard</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Pipeline control center</h2>
        </div>
        <p className="max-w-3xl text-slate-300">
          The scaffold wires in TanStack Query for server-state patterns and Zustand for local review state, while leaving the actual data sources open for the API and workers.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            "app-001",
            "app-002",
            "app-003",
          ].map((id) => {
            const selected = activeApplicationId === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveApplicationId(id)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selected
                    ? "border-cyan-400 bg-cyan-500/10 text-white"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                Review {id}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-slate-400">
          Active review target: {activeApplicationId ?? "none selected"}
        </p>
        <p className="text-sm text-slate-400">Current thesis: {data?.thesis ?? "loading..."}</p>
      </article>
    </section>
  );
}
