import Link from "next/link";
import { LUXENI, KEEPSAKE, CELOSCAN } from "../../lib/contract";

const ext = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", borderBottom: "1px solid var(--gold-dim)" }}>
    {text}
  </a>
);

export default function About() {
  return (
    <main className="app-shell">
      <div className="fx-noise" />
      <div className="section-inner prose-section" style={{ position: "relative", zIndex: 2 }}>
        <div className="section-head" style={{ marginBottom: 44 }}>
          <p className="kicker">The Chronicle</p>
          <h1 className="section-title font-display" style={{ fontSize: "clamp(30px, 6vw, 48px)" }}>
            About Luxeni
          </h1>
          <span className="ornament">✦</span>
          <p className="section-blurb">
            On-chain Territory War on Celo. Claim. Defend. Conquer.
          </p>
          <Link href="/app" className="btn-outline gold">▶ Play Now</Link>
        </div>

        <div className="panel">
          <p className="panel-label">What is Luxeni?</p>
          <p style={{ color: "var(--muted)", lineHeight: 1.9, fontSize: 13.5, margin: 0 }}>
            Four factions fight to control a shared tile battlefield. You spend{" "}
            <b style={{ color: "var(--ink)" }}>energy (LUX)</b> to claim tiles next to your
            faction&apos;s territory — and{" "}
            <b style={{ color: "var(--ink)" }}>every claim is one real transaction on Celo</b>.
            When a 3-hour battle ends, the tiles your faction still holds decide the winner;
            a 4-week season ranks players by territory held.
          </p>
        </div>

        <div className="panel">
          <p className="panel-label">How to Play</p>
          <ol style={{ color: "var(--muted)", lineHeight: 2, fontSize: 13.5, margin: 0, paddingLeft: 20 }}>
            <li><b style={{ color: "var(--ink)" }}>Connect</b> your wallet (auto-connects inside MiniPay).</li>
            <li><b style={{ color: "var(--ink)" }}>Find Match</b> — you join the live battle on the smallest banner to keep it fair.</li>
            <li><b style={{ color: "var(--ink)" }}>Claim tiles</b> next to your faction (1 LUX empty · 3 LUX to take an enemy tile).</li>
            <li>Out of energy? <b style={{ color: "var(--ink)" }}>Buy LUX</b> — 1 CELO = 1,000 LUX, unused is refundable.</li>
          </ol>
          <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 14, marginBottom: 0, lineHeight: 1.7 }}>
            A skill game, not gambling: you pay to build, never to wager — no randomness, no cash payout.
          </p>
        </div>

        <div className="panel">
          <p className="panel-label">Live on Celo Mainnet · Verified</p>
          <p style={{ color: "var(--muted)", lineHeight: 2.1, fontSize: 13, margin: 0 }}>
            Game · {ext(`${CELOSCAN}/${LUXENI}#code`, `${LUXENI.slice(0, 10)}…`)}<br />
            Keepsake NFT · {ext(`${CELOSCAN}/${KEEPSAKE}#code`, `${KEEPSAKE.slice(0, 10)}…`)}<br />
            Source · {ext("https://github.com/emanuellzoe/Luxeni", "github.com/emanuellzoe/Luxeni")}
          </p>
        </div>

        <p className="app-foot">Forged on Celo · MIT</p>
      </div>
    </main>
  );
}
