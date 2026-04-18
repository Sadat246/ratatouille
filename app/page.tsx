export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16 text-stone-950">
      <section className="w-full max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-[0_30px_80px_rgba(24,18,10,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-500">
          Ratatouille
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance">
          Foundation ready for the product shell buildout.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
          This app starts from a clean App Router base with the database and
          deployment tooling needed for the next execution steps.
        </p>
      </section>
    </main>
  );
}
