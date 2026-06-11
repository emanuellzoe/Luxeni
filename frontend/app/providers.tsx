"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../lib/wagmi";
import { ConnectModal } from "./components/ConnectModal";

const queryClient = new QueryClient();

/** Site-wide handle to the connect-wallet modal (navbar, hero, app gate all share one). */
const WalletUIContext = createContext<{ openConnect: () => void }>({ openConnect: () => {} });
export const useWalletUI = () => useContext(WalletUIContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [connectOpen, setConnectOpen] = useState(false);
  const openConnect = useCallback(() => setConnectOpen(true), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletUIContext.Provider value={{ openConnect }}>
          {children}
          {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
        </WalletUIContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
