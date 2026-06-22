"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { useWalletUI } from "./providers";
import { Reveal } from "./components/Reveal";
import { LUXENI, KEEPSAKE, CELOSCAN, TEAM_COLORS } from "../lib/contract";

/* Deterministic 8×8 war-mosaic for the relic centerpiece (no randomness → no hydration drift). */
const RELIC_TILES = Array.from({ length: 64 }, (_, i) => {
  const x = i % 8, y = Math.floor(i / 8);
  const quadrant = (x < 4 ? 0 : 1) + (y < 4 ? 0 : 2); // 0..3
  const noise = (i * 37 + 11) % 17;
  if (noise < 3) return 0;                            // scorched/empty
  if (noise < 6) return ((quadrant + 1) % 4) + 1;     // contested frontier
  return quadrant + 1;                                // home banner
});

export default function Landing() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { openConnect } = useWalletUI();

  // Inside MiniPay the wallet is already there — conscript silently, march to the war room.
  // Uses the CONFIGURED injected connector (a fresh injected() would race wagmi reconnect).
  useEffect(() => {
    const eth = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    const inj = connectors.find((c) => c.id === "injected");
    if (eth?.isMiniPay && !isConnected && inj) {
      connect({ connector: inj }, { onSuccess: () => router.push("/app") });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterBattle = () => (isConnected ? router.push("/app") : openConnect());

  return (
    <main>
      {/* ============ I. HERO ============ */}
      <section className="hero" id="top">
        <div className="fx-glow" />
        <div className="fx-fog f1" />
        <div className="fx-fog f2" />
        <div className="fx-ring" />
        <div className="fx-mountains">
          <div className="ember" />
          <div className="ridge r1" />
          <div className="ridge r2" />
          <div className="ridge r3" />
        </div>
        <div className="fx-fog f3" />
        <div className="fx-vignette" />
        <div className="fx-noise" />

        <div className="hero-content">
          <p className="kicker hero-kicker">On-chain Territory War · Celo</p>
          <h1 className="hero-title">LUXENI</h1>
          <p className="hero-tagline">
            Four factions. One battlefield. Spend energy to claim the land tile by tile —
            <b> every claim is a real transaction on Celo</b>. Hold your ground until the
            horn sounds, and let the territory crown its ruler.
          </p>

          <div className="trinity">
            <div className="trinity-item">
              <span className="trinity-numeral">I</span>
              <span className="trinity-name">Claim the Land</span>
              <p className="trinity-text">
                March from your faction&apos;s frontier — each adjacent tile seized is one
                on-chain transaction.
              </p>
              <button className="btn-outline small" onClick={enterBattle}>Enter Battle</button>
            </div>
            <div className="trinity-item">
              <span className="trinity-numeral">II</span>
              <span className="trinity-name">Defend the Realm</span>
              <p className="trinity-text">
                A war lasts three hours. Enemies can wrest your tiles away — hold the line,
                or take them back.
              </p>
              <Link href="/#how" className="btn-outline small">How It Works</Link>
            </div>
            <div className="trinity-item">
              <span className="trinity-numeral">III</span>
              <span className="trinity-name">Rule the Season</span>
              <p className="trinity-text">
                Tiles still held when each battle ends feed your four-week season rank —
                and your Keepsake.
              </p>
              <Link href="/#roadmap" className="btn-outline small">The Campaign</Link>
            </div>
          </div>
        </div>

        <a href="#world" className="scroll-cue" aria-label="Scroll down">↓</a>
      </section>

      {/* ============ II. CINEMATIC INTRO ============ */}
      <section className="section intro-section" id="world">
        <div className="fx-shafts" />
        <div className="fx-noise" />
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <p className="kicker">A War Writ in Stone</p>
              <h2 className="section-title font-display">Enter the World of Luxeni</h2>
              <span className="ornament">✦</span>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relic-stage">
              <div className="relic">
                <div className="halo" />
                <div className="frame" />
                <div className="frame inner" />
                <div className="board" aria-hidden>
                  {RELIC_TILES.map((t, i) => (
                    <span
                      key={i}
                      style={{
                        background: t === 0 ? "rgba(255,255,255,0.045)" : `${TEAM_COLORS[t]}55`,
                        animationDelay: `${(i % 9) * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="relic-caption">The Battlefield · 80 × 80 · Four Banners · One Crown</p>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <p className="intro-lore">
              “Beneath a darkened sky, four banners contest a single field of 6,400 tiles.
              There are no dice and no fate here — only energy, position, and the will to
              hold. One deposit arms you for hundreds of claims; what your hand seizes,
              your hand must defend.”
            </p>
          </Reveal>

          <Reveal delay={200}>
            <p className="section-blurb" style={{ margin: "40px auto 0", textAlign: "center" }}>
              Luxeni is a mobile-first, multiplayer territory war — built as a MiniApp for
              MiniPay on Celo, with a parallel Clarity build coming to Stacks. Join one of
              four factions, expand only where your territory touches, and let the final
              map decide the victor.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="hairline" />

      {/* ============ III. FEATURES ============ */}
      <section className="section" id="features">
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <p className="kicker">The Arsenal</p>
              <h2 className="section-title font-display">Instruments of War</h2>
              <span className="ornament">✦</span>
            </div>
          </Reveal>

          <div className="cards">
            <Reveal>
              <article className="card">
                <div className="card-numeral">I</div>
                <h3 className="card-title">The Energy of War — LUX</h3>
                <p className="card-text">
                  LUX is the war&apos;s lifeblood — a <b>non-transferable energy credit</b>,
                  never a token of speculation. It regenerates free (<b>1 LUX / 20 min</b>),
                  or <b>1 CELO buys 1,000 LUX</b> when the front line burns. Unused LUX
                  withdraws back to CELO at 1:1 — you pay to build, never to wager.
                </p>
              </article>
            </Reveal>
            <Reveal delay={120}>
              <article className="card">
                <div className="card-numeral">II</div>
                <h3 className="card-title">Four Factions, One Field</h3>
                <p className="card-text">
                  Up to <b>~100 warriors</b> split across four banners on an
                  <b> 80×80 battlefield</b>. Expansion is contiguous — you may only claim
                  tiles adjacent to your faction&apos;s ground. Empty land costs <b>1 LUX</b>;
                  tearing a tile from an enemy costs <b>3</b>.
                </p>
              </article>
            </Reveal>
            <Reveal delay={240}>
              <article className="card">
                <div className="card-numeral">III</div>
                <h3 className="card-title">Seasons &amp; Keepsakes</h3>
                <p className="card-text">
                  Every <b>four weeks</b> a season crowns its rulers — your rank is the
                  territory you <b>still hold</b> when each battle ends. Top 100 on the
                  leaderboard, four faction standings, and a generative <b>Keepsake NFT</b>
                  that seals the final map forever.
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============ IV. HOW IT WORKS ============ */}
      <section className="section" id="how">
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <p className="kicker">The Rite of War</p>
              <h2 className="section-title font-display">How a War Is Waged</h2>
              <span className="ornament">✦</span>
            </div>
          </Reveal>

          <div className="steps">
            <Reveal>
              <div className="step">
                <div className="step-numeral">I</div>
                <div>
                  <h3 className="step-title">Connect</h3>
                  <p className="step-text">
                    Bind your wallet — inside <b>MiniPay</b> you are conscripted
                    automatically. One deposit of CELO funds <b>hundreds of claims</b>.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal>
              <div className="step">
                <div className="step-numeral">II</div>
                <div>
                  <h3 className="step-title">Enlist</h3>
                  <p className="step-text">
                    Find a match — you join the live battlefield on its <b>smallest banner</b>
                    to keep the war fair, or raise a new battlefield and let others rally to you.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal>
              <div className="step">
                <div className="step-numeral">III</div>
                <div>
                  <h3 className="step-title">Claim</h3>
                  <p className="step-text">
                    Spend LUX to seize tiles adjacent to your faction&apos;s ground —
                    <b> 1 LUX</b> for empty land, <b>3 LUX</b> to wrest it from an enemy.
                    <b> Every claim is one real transaction on Celo.</b>
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal>
              <div className="step">
                <div className="step-numeral">IV</div>
                <div>
                  <h3 className="step-title">Hold</h3>
                  <p className="step-text">
                    When the third hour sounds, the map is judged. The faction holding the
                    most land takes the war — and the tiles in <b>your</b> hand feed your
                    season rank.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============ V. QUICK START (30s onboarding) ============ */}
      <section className="section" id="start">
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <p className="kicker">Join the Battle</p>
              <h2 className="section-title font-display">Play in 30 Seconds</h2>
              <span className="ornament">✦</span>
              <p className="section-blurb">
                No sign-up. No approval. Bind your wallet, deposit a fraction of CELO,
                and your first tile claim goes on-chain in under a minute.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="quick-steps">
              <div className="qs-item">
                <span className="qs-num">01</span>
                <div className="qs-body">
                  <h3 className="qs-title">Open MiniPay or any Celo wallet</h3>
                  <p className="qs-text">
                    Inside <b>MiniPay</b> you are auto-connected. On desktop, click
                    &ldquo;Connect Wallet&rdquo; — MetaMask, Coinbase Wallet, or any
                    WalletConnect-compatible wallet on Celo Mainnet works.
                  </p>
                </div>
              </div>
              <div className="qs-item">
                <span className="qs-num">02</span>
                <div className="qs-body">
                  <h3 className="qs-title">Deposit as little as 0.01 CELO → get 10 LUX free</h3>
                  <p className="qs-text">
                    Every new wallet starts with <b>10 free LUX</b> (auto-refills 1 LUX
                    every 20 min). Buy more with CELO — <b>1 CELO = 1,000 LUX</b>, and
                    unused LUX is always refundable at 1:1.
                  </p>
                </div>
              </div>
              <div className="qs-item">
                <span className="qs-num">03</span>
                <div className="qs-body">
                  <h3 className="qs-title">Join a battlefield — tap a tile, done</h3>
                  <p className="qs-text">
                    Hit &ldquo;Find Match&rdquo; and you land on the smallest banner to keep
                    it fair. Tap any tile adjacent to your colour — 1 LUX, 1 on-chain
                    transaction, one tile claimed. That&apos;s it.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div style={{ textAlign: "center", marginTop: 44 }}>
              <button className="btn-outline gold" onClick={enterBattle}>
                {isConnected ? "Enter the War Room →" : "Connect & Play →"}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="hairline" />

      {/* ============ VI. ROADMAP ============ */}
      <section className="section" id="roadmap">
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <p className="kicker">The Campaign</p>
              <h2 className="section-title font-display">Roadmap</h2>
              <span className="ornament">✦</span>
            </div>
          </Reveal>

          <Reveal>
            <div className="roadmap">
              <div className="phase live">
                <div className="phase-numeral">I</div>
                <span className="phase-flag">Live Now</span>
                <h3 className="phase-title">The Celo Campaign</h3>
                <p className="phase-text">
                  Energy economy, battlefields, four-faction war, matchmaking and season
                  ranks — contracts live &amp; verified on Celo Mainnet.
                </p>
              </div>
              <div className="phase">
                <div className="phase-numeral">II</div>
                <h3 className="phase-title">The Stacks Crusade</h3>
                <p className="phase-text">
                  The same war forged anew in Clarity for Stacks — STX takes the place of
                  CELO as the deposit of war.
                </p>
              </div>
              <div className="phase">
                <div className="phase-numeral">III</div>
                <h3 className="phase-title">Keepsakes &amp; Beyond</h3>
                <p className="phase-text">
                  Finalised Keepsake NFT art, the Farcaster MiniApp, and archived season
                  halls — viewable forever.
                </p>
              </div>
              <div className="phase">
                <div className="phase-numeral">IV</div>
                <h3 className="phase-title">Sponsored Tournaments</h3>
                <p className="phase-text">
                  Sponsor-funded, skill-judged prize events gated by proof of personhood.
                  The crown gains weight.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ VII. CTA + FOOTER ============ */}
      <section className="section cta-section" id="contact">
        <div className="fx-noise" />
        <div className="section-inner">
          <Reveal>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <p className="kicker">The Horn Sounds</p>
              <h2 className="section-title font-display">The Battlefield Awaits</h2>
              <span className="ornament">✦</span>
              <p className="section-blurb">
                Live &amp; verified on Celo Mainnet. Join a faction, claim your first tile,
                and leave your mark upon the map.
              </p>
            </div>
            <div className="cta-actions">
              <button className="btn-outline gold" onClick={enterBattle}>
                {isConnected ? "Enter the War Room" : "Connect Wallet"}
              </button>
              <a
                className="btn-outline"
                href={`${CELOSCAN}/${LUXENI}#code`}
                target="_blank"
                rel="noreferrer"
              >
                View the Contract
              </a>
            </div>
            <div className="cta-contracts">
              <a href={`${CELOSCAN}/${LUXENI}#code`} target="_blank" rel="noreferrer">
                Luxeni · {LUXENI}
              </a>
              <a href={`${CELOSCAN}/${KEEPSAKE}#code`} target="_blank" rel="noreferrer">
                Keepsake · {KEEPSAKE}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="site-footer">
        <span className="footer-logo">✦ LUXENI</span>
        <span className="footer-note">Forged on Celo · MIT License · © 2026 Luxeni</span>
        <div className="footer-links">
          <a href="https://github.com/emanuellzoe/Luxeni" target="_blank" rel="noreferrer">GitHub</a>
          <a href={`${CELOSCAN}/${LUXENI}#code`} target="_blank" rel="noreferrer">Celoscan</a>
          <Link href="/about">About</Link>
        </div>
      </footer>
    </main>
  );
}
