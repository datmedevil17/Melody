"use client";
import { usePathname } from "next/navigation";
import WalletConnectorModal from "./WalletConnectorModal";
import Link from "next/link";

export default function Navbar() {
    const pathname = usePathname();

    // Don't render Navbar on the home page
    if (pathname === "/") return null;

    const navItems = [
        { label: "Home", href: "/start" },
        { label: "Explore", href: "/start/explore" },
        { label: "Tracks", href: "/start/songs" },
        { label: "Artist", href: "/start/artists" },
    ];

    return (
        <header className="flex flex-wrap justify-between items-center p-4 border-b border-white/10 pb-4">
            <div className="text-2xl font-extrabold tracking-wide">
                <span className="text-yellow-400">M</span> Melody
            </div>
            <nav className="hidden md:flex gap-8 items-center text-sm font-medium">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="relative group transition text-white hover:text-yellow-400"
                    >
                        {item.label}
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                ))}
            </nav>
            <div className="flex flex-row gap-3 text-sm">
                <WalletConnectorModal />
            </div>
        </header>
    );
}
