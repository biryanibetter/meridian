import type { Metadata } from "next";
import { DemoProvider } from "@/lib/store";
import "./globals.css";
import "./refinements.css";
export const metadata: Metadata = {
  title: "Meridian — Know what comes next.",
  description:
    "Travel readiness and cross-border services. Prepare entry requirements, applications and documents around your journey.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
