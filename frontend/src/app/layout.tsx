import React from "react";
import "./globals.css";
import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "TMS EXPRESS - Gestion Logistique Dernier Kilomètre",
  description: "Transport Management System pour Grand Tanà & Madagascar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
