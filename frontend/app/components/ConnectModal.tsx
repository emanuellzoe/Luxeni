"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, type Connector } from "wagmi";

/**
 * Dark-fantasy connect modal built directly on wagmi connectors.
 * Installed wallets (MetaMask, Rabby, OKX, Phantom, …) surface automatically
 * via EIP-6963 discovery; Coinbase Wallet / WalletConnect are SDK connectors.
 * On success the warrior is sent straight to the war room (/app).
 */
export function ConnectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connect, connectors, isPending, variables, error, reset } = useConnect();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus management: move focus in, trap Tab, lock body scroll, restore on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose]);

  // Opened while already connected (edge case) → just go to the app.
  useEffect(() => {
    if (isConnected) {
      onClose();
      router.push("/app");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Rendered client-side only (mounted on click), so window is available here.
  const hasInjectedProvider =
    typeof window !== "undefined" && !!(window as any).ethereum;

  const { installed, others } = useMemo(() => {
    const seen = new Set<string>();
    const unique = connectors.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    // EIP-6963-discovered wallets have a reverse-DNS id (io.metamask, …).
    const discovered = unique.filter((c) => c.type === "injected" && c.id !== "injected");
    const generic = unique.filter((c) => c.id === "injected");
    const sdk = unique.filter((c) => c.type !== "injected");
    return {
      // generic "Browser Wallet" only when a provider actually exists and
      // EIP-6963 found nothing (e.g. MiniPay's bare window.ethereum)
      installed: discovered.length > 0 ? discovered : hasInjectedProvider ? generic : [],
      others: sdk,
    };
  }, [connectors, hasInjectedProvider]);

  const pendingUid = isPending ? (variables?.connector as Connector | undefined)?.uid : undefined;

  const pick = (connector: Connector) =>
    connect(
      { connector },
      {
        onSuccess: () => {
          onClose();
          router.push("/app");
        },
      }
    );

  const label = (c: Connector) =>
    c.id === "injected" ? "Browser Wallet" : c.name;

  const renderButton = (c: Connector) => (
    <button
      key={c.uid}
      className="wallet-btn"
      disabled={isPending}
      onClick={() => { reset(); pick(c); }}
    >
      <span className="wallet-icon" aria-hidden>
        {c.icon ? <img src={c.icon} alt="" /> : label(c).charAt(0)}
      </span>
      {label(c)}
      {pendingUid === c.uid && <span className="wallet-state">Summoning…</span>}
    </button>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Connect a wallet" ref={dialogRef}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>✕</button>
        <h2 className="modal-title">Connect a Wallet</h2>
        <p className="modal-sub">Choose your seal to enter the battlefield</p>

        {installed.length > 0 ? (
          <>
            <div className="wallet-section">Installed</div>
            {installed.map(renderButton)}
          </>
        ) : (
          <p className="modal-foot" style={{ marginTop: 0 }}>
            No browser wallet detected — install MetaMask, or open Luxeni inside MiniPay.
          </p>
        )}

        {others.length > 0 && (
          <>
            <div className="wallet-section">More Options</div>
            {others.map(renderButton)}
          </>
        )}

        {error && (
          <div className="modal-error">
            {(error as any).shortMessage ?? error.message}
          </div>
        )}

        <p className="modal-foot">
          Luxeni lives on Celo Mainnet · inside MiniPay you connect automatically
        </p>
      </div>
    </div>
  );
}
