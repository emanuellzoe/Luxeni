import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Luxeni — Territory War",
  description: "On-chain Territory War on Celo. Claim, defend, conquer.",
  other: {
    "talentapp:project_verification":
      "a2e2ef08ba3842e1becdf7413ab9b67f91318fc8234648de3340d06d77ac1e1e0cc129241e25069dde06e9bd73cb6e1b4fb961246f7aa704b9d033359cc72acf",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0b0d12",
          color: "#e8ebf2",
          fontFamily: "system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
