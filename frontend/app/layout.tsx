import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import { Providers } from "./providers";
import { SiteNav } from "./components/SiteNav";
import { SideNav } from "./components/SideNav";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-display",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luxeni — On-chain Territory War",
  description:
    "Claim. Defend. Conquer. Four factions fight for a shared battlefield on Celo — every tile is a transaction.",
  other: {
    "talentapp:project_verification":
      "a2e2ef08ba3842e1becdf7413ab9b67f91318fc8234648de3340d06d77ac1e1e0cc129241e25069dde06e9bd73cb6e1b4fb961246f7aa704b9d033359cc72acf",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${cormorant.variable}`}>
        <Providers>
          <SiteNav />
          <SideNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
