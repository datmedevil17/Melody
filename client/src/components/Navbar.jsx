"use client";
import React, { useState, useEffect} from 'react';
import { Home, Search, Music, User, Menu, X, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import WalletConnectorModal from './WalletConnectorModal';

import Link from 'next/link';

export default function Navbar() {
    const pathname = usePathname(); // Assuming usePathname is a custom hook to get the current path
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Mock usePathname hook
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const navItems = [
    { label: "Home", href: "/start", icon: Home },
    { label: "Explore", href: "/start/explore", icon: Search },
    { label: "Tracks", href: "/start/songs", icon: Music },
    { label: "Artist", href: "/start/artists", icon: User },
    { label: "Profile", href: "/start/user/profile", icon: User },
  ];

  const handleNavClick = (href) => {
  };

  return (
    <>
      {/* Main Navbar */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-black/95 backdrop-blur-md border-b border-gray-800/50' 
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold tracking-tight flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mr-3">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <span className="text-white">
                  <span className="text-green-400">M</span>elody
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    href={item.href}
                    key={item.label}
                    onClick={() => handleNavClick(item.href)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-400 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right section */}
            <div className="flex items-center gap-4">
              {/* Search bar - desktop only */}
              {/* <div className="hidden lg:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search artists, songs..."
                    className="bg-gray-800 border border-gray-700 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:bg-gray-700 transition-all duration-200 w-64"
                  />
                </div>
              </div> */}

              {/* Wallet Connector */}
              <WalletConnectorModal />

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-80 h-screen bg-gray-900 border-l border-gray-800 shadow-2xl">
            <div className="p-6">
              {/* Close button */}
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-semibold text-white">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                />
              </div>

              {/* Mobile navigation */}
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleNavClick(item.href)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-green-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Mobile footer */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-1">Premium Features</h3>
                  <p className="text-green-100 text-sm">Unlock unlimited access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}