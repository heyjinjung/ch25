type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  footerNote?: string;
};

const GamePageShell: React.FC<Props> = ({ title, subtitle, rightSlot, children, footerNote }) => {
  return (
    <div className="relative w-full text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-28 h-[420px] w-[420px] rounded-full bg-cc-green/16 blur-3xl" />
        <div className="absolute -right-28 top-24 h-[520px] w-[520px] rounded-full bg-cc-lime/14 blur-3xl" />
        <div className="absolute left-1/2 top-[55%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cc-teal/10 blur-3xl" />
      </div>
      <div className="mx-auto w-full max-w-[1040px]">
        {rightSlot ? <div className="mb-6 flex items-center justify-end gap-3">{rightSlot}</div> : null}

        <header className="relative overflow-hidden rounded-3xl border border-cc-lime/20 bg-gradient-to-b from-white/14 via-white/7 to-black/30 px-4 py-6 backdrop-blur sm:px-8">
          <div className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-cc-teal/18 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-20 h-56 w-56 rounded-full bg-cc-lime/14 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cc-green/70 to-transparent" />
          {subtitle && (
            <p className="text-center text-[clamp(12px,2.6vw,14px)] font-bold uppercase tracking-[0.35em] text-cc-lime/90">
              {subtitle}
            </p>
          )}
          <h1 className="mt-3 text-center text-[clamp(22px,5.2vw,38px)] font-extrabold leading-tight text-white">
            {title}
          </h1>
          <div className="mx-auto mt-5 h-px w-full max-w-[720px] bg-gradient-to-r from-transparent via-cc-lime/60 to-transparent" />
        </header>

        <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 via-white/6 to-black/35 p-4 backdrop-blur sm:mt-8 sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-cc-orange/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-14 -bottom-10 h-44 w-44 rounded-full bg-cc-green/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cc-lime/50 to-transparent" />
          {children}
        </section>

        {footerNote && (
          <footer className="mx-auto mt-6 max-w-[920px] text-center text-[clamp(11px,2.2vw,13px)] text-white/60">
            {footerNote}
          </footer>
        )}
      </div>
    </div>
  );
};

export default GamePageShell;
