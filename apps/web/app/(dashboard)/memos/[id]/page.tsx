export default async function MemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
      <h2 className="text-2xl font-semibold text-white">Memo {id}</h2>
      <p className="text-slate-300">
        Placeholder memo detail route with room for evidence-backed reasoning output.
      </p>
    </section>
  );
}
