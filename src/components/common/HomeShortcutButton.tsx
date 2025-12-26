import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  className?: string;
  to?: string;
  label?: string;
};

const HomeShortcutButton: React.FC<Props> = ({ className, to = "/landing", label = "홈 바로가기" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isAlreadyHome = location.pathname.startsWith(to);

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      disabled={isAlreadyHome}
      className={
        "rounded-[6px] bg-[#d2fd9c] px-4 py-2 text-[clamp(12px,2.6vw,14px)] font-semibold text-black hover:brightness-95 disabled:cursor-default disabled:opacity-60 " +
        (className ?? "")
      }
    >
      {label}
    </button>
  );
};

export default HomeShortcutButton;
