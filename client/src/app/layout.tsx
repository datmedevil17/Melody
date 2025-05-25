import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StarknetProvider from '../components/StarknetProvider';
import UserContextProvider from "@/context/userContextProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Melody",
  description: "Decentralized music streaming platform",
  icons:{
    icon: "/logo.jpg",

  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserContextProvider>
        <StarknetProvider>
          {children}
        </StarknetProvider>
        </UserContextProvider>
      </body>
    </html>
  );
}
