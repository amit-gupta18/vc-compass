export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
      <h2 className="text-2xl font-semibold text-white">Application {id}</h2>
      <p className="text-slate-300">
        Placeholder detail screen for application review, scores, and evidence.
      </p>
    </section>
  );
}
