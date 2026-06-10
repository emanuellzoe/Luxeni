import Link from "next/link";

const LUXENI = "0x82064c90A86BA16d81Dd1fb16374D78A70d59e70";
const KEEPSAKE = "0x9e22Dff36a5494B6601C9ffAd57d78C26de6ca25";

const card: React.CSSProperties = {
  background: "#141823", border: "1px solid #232838", borderRadius: 16,
  padding: 20, maxWidth: 560, margin: "0 auto 16px",
};
const link = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noreferrer" style={{ color: "#5b8cff" }}>{text}</a>
);

export default function About() {
  return (
    <main style={{ padding: "48px 16px 64px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>🎨 Luxeni</h1>
        <p style={{ color: "#8b93a7", marginTop: 8, fontSize: 18 }}>
          On-chain Territory War on Celo. Claim, defend, conquer.
        </p>
        <Link href="/" style={{ display: "inline-block", marginTop: 16, padding: "12px 22px", borderRadius: 12, background: "#5b8cff", color: "#fff", fontWeight: 700, textDecoration: "none" }}>
          ▶ Play now
        </Link>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>What is Luxeni?</h2>
        <p style={{ color: "#c2c8d6", lineHeight: 1.6 }}>
          Four teams fight to control a shared tile board. You spend <b>energy (LUX)</b> to claim
          tiles next to your team&apos;s territory — and <b>every claim is one real transaction on Celo</b>.
          When a 3-hour battle ends, the tiles your team still holds decide the winner; a 4-week
          season ranks players by territory held.
        </p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>How to play</h2>
        <ol style={{ color: "#c2c8d6", lineHeight: 1.8, paddingLeft: 20 }}>
          <li><b>Connect</b> your wallet (auto-connects inside MiniPay).</li>
          <li><b>Find Match</b> — you join the live battle on the smallest team to keep it fair.</li>
          <li><b>Claim tiles</b> next to your team (cheap: 1 LUX empty, 3 LUX to take an enemy tile).</li>
          <li>Out of energy? <b>Buy LUX</b> (1 CELO = 1000 LUX, unused is refundable).</li>
        </ol>
        <p style={{ color: "#8b93a7", fontSize: 13 }}>
          Skill game, not gambling: you pay to build, never to wager — no randomness, no cash payout.
        </p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Live on Celo Mainnet · verified</h2>
        <p style={{ color: "#c2c8d6", lineHeight: 1.8, margin: 0 }}>
          Game: {link(`https://celoscan.io/address/${LUXENI}#code`, `${LUXENI.slice(0, 10)}…`)}<br />
          NFT: {link(`https://celoscan.io/address/${KEEPSAKE}#code`, `${KEEPSAKE.slice(0, 10)}…`)}<br />
          Code: {link("https://github.com/emanuellzoe/Luxeni", "github.com/emanuellzoe/Luxeni")}
        </p>
      </div>

      <p style={{ textAlign: "center", color: "#5b6273", fontSize: 12, marginTop: 12 }}>
        Built on Celo · MIT
      </p>
    </main>
  );
}
