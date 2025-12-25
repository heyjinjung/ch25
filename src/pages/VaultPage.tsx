import React from "react";
import VaultMainPanel from "../components/vault/VaultMainPanel";

const VaultPage: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 pb-32">
      <VaultMainPanel />
    </div>
  );
};

export default VaultPage;
