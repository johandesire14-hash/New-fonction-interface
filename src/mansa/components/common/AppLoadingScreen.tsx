import { AfhubLogo } from "../AfhubLogo";

export function AppLoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Chargement du tableau de bord"
      className="mansa-viewport relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0f1012] px-6 text-[#eeeeee]"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D26A]/[0.06] blur-3xl" />
      <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/[0.08] bg-[#121316]/90 px-8 py-10 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-7 rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-3 shadow-lg shadow-black/20">
          <AfhubLogo size="lg" />
        </div>
        <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00D26A]">
          <span className="size-1.5 rounded-full bg-[#00D26A] animate-pulse" />
          <span>afhub</span>
          <span className="size-1.5 rounded-full bg-[#00D26A] animate-pulse [animation-delay:180ms]" />
        </div>
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-white">
          Préparation de votre espace
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Nous synchronisons vos données et vos applications.
        </p>
        <div className="mt-7 h-1 w-44 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full w-1/2 rounded-full bg-[#00D26A] animate-[loader-slide_1.4s_ease-in-out_infinite]" />
        </div>
        <span className="mt-3 text-[10px] font-medium text-zinc-600">Chargement…</span>
      </div>
    </div>
  );
}
