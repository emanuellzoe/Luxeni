"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useWalletUI } from "../providers";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How It Works" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const { address, isConnected } = useAccount();
  const { openConnect } = useWalletUI();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`site-nav${scrolled || open ? " scrolled" : ""}`}>
        <Link href="/" className="nav-logo" onClick={() => setOpen(false)}>
          <span className="sigil">✦</span>LUXENI
        </Link>

        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href}>{l.label}</Link>
          ))}
        </nav>

        <div className="nav-right">
          {isConnected && address ? (
            <>
              <span className="nav-chip">{address.slice(0, 6)}…{address.slice(-4)}</span>
              <Link href="/app" className="btn-outline small gold">Enter App</Link>
            </>
          ) : (
            <button className="btn-outline small" onClick={openConnect}>Connect Wallet</button>
          )}
          <button
            className="nav-burger"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </header>

      <nav className={`nav-mobile${open ? " open" : ""}`} aria-label="Mobile">
        {LINKS.map((l) => (
          <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
        ))}
        {isConnected ? (
          <Link href="/app" onClick={() => setOpen(false)} style={{ color: "var(--gold)" }}>
            Enter App →
          </Link>
        ) : (
          <a
            href="#connect"
            onClick={(e) => { e.preventDefault(); setOpen(false); openConnect(); }}
            style={{ color: "var(--gold)" }}
          >
            Connect Wallet
          </a>
        )}
      </nav>
    </>
  );
}
