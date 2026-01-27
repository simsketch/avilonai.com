import type { Metadata, Viewport } from "next"
import Script from 'next/script'
import "./globals.css"

export const metadata: Metadata = {
  title: "Avilon - AI Therapy Assistant",
  description: "Your supportive AI therapy companion for mental wellness",
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1614" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-J3Q5ZW2PGP" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-J3Q5ZW2PGP', { site: location.hostname });
        `}</Script>
      </head>
      <body className="min-h-screen antialiased gradient-mesh noise-overlay">
        {children}
      </body>
    </html>
  )
}
