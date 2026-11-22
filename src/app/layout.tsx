import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Voice - Tu voz, sin límites",
  description: "Vórtex Voice, de Vortex Company: dictado por voz con transcripción en tiempo real, guarda en .txt o envía a Vórtex Notes. Gratis, sin anuncios y 100% local en tu navegador.",
  keywords: ["Vórtex Voice","dictado por voz","voz a texto","transcripción","speech recognition","notas de voz","productividad gratis","sin anuncios"],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#8b5cf6" stroke-width="3.5"/><path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#a78bfa" stroke-width="3.5" stroke-linecap="round"/><path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#a78bfa" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#a78bfa"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Voice - Tu voz, sin límites",
    description: "Vórtex Voice, de Vortex Company: dictado por voz con transcripción en tiempo real, guarda en .txt o envía a Vórtex Notes. Gratis, sin anuncios y 100% local en tu navegador.",
    siteName: "Vórtex Voice - Tu voz, sin límites",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
