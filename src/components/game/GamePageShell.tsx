type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  footerNote?: string;
};

const GamePageShell: React.FC<Props> = ({ title, subtitle, rightSlot, children, footerNote }) => {
  return (
    <div className="w-full text-white">
      <div className="mx-auto w-full max-w-[1040px]">
        {rightSlot ? <div className="mb-6 flex items-center justify-end gap-3">{rightSlot}</div> : null}

        <header className="rounded-3xl border border-white/10 bg-black/55 px-4 py-6 backdrop-blur sm:px-8">
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

        <section className="mt-6 rounded-3xl border border-white/10 bg-black/55 p-4 backdrop-blur sm:mt-8 sm:p-8">
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
