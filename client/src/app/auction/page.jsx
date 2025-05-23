'use client'
import { Music, Gavel } from "lucide-react"
import { motion } from "framer-motion"
import "./aucition_home.css" 

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Scattered Animated Green Geometric Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top scattered elements */}
        <div className="absolute top-16 right-1/4 w-8 h-8 bg-green-500/20 rotate-45 rounded-sm float-animate"></div>
        <div className="absolute top-32 right-1/3 w-6 h-6 bg-green-400/30 rotate-12 rounded-sm pulse-fade"></div>
        <div className="absolute top-24 left-1/4 w-4 h-4 bg-green-500/25 rotate-45 pulse-fade"></div>

        {/* Middle scattered elements */}
        <div className="absolute top-1/2 right-16 w-10 h-10 bg-green-500/15 rotate-12 rounded-sm float-animate"></div>
        <div className="absolute top-1/2 left-16 w-6 h-6 bg-green-400/20 rotate-45 pulse-fade"></div>
        <div className="absolute top-1/3 right-1/2 w-5 h-5 bg-green-500/30 rotate-12 float-animate"></div>

        {/* Bottom scattered elements */}
        <div className="absolute bottom-32 right-1/4 w-7 h-7 bg-green-500/25 rotate-45 rounded-sm pulse-fade"></div>
        <div className="absolute bottom-48 left-1/3 w-9 h-9 bg-green-400/20 rotate-12 rounded-sm float-animate"></div>
        <div className="absolute bottom-24 right-1/3 w-4 h-4 bg-green-500/35 rotate-45 float-animate"></div>
        <div className="absolute bottom-16 left-1/4 w-6 h-6 bg-green-400/25 rotate-12 pulse-fade"></div>

        {/* Extra depth */}
        <div className="absolute top-1/4 left-1/2 w-3 h-3 bg-green-500/40 rotate-45 pulse-fade"></div>
        <div className="absolute top-3/4 right-1/2 w-8 h-8 bg-green-400/15 rotate-12 rounded-sm float-animate"></div>
        <div className="absolute top-1/6 right-1/6 w-5 h-5 bg-green-500/20 rotate-45 float-animate"></div>
        <div className="absolute bottom-1/3 left-1/6 w-7 h-7 bg-green-400/30 rotate-12 rounded-sm pulse-fade"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            {/* Animated Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-6xl md:text-7xl lg:text-8xl font-bold leading-tight mb-8"
            >
              <span className="text-white block">Music Meets</span>
              <span className="text-green-400 block italic">Auction Revolution</span>
            </motion.h1>

            {/* Animated Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 }}
              className="text-gray-300 text-xl md:text-2xl leading-relaxed mb-12 max-w-2xl"
            >
              Own, trade, and experience music in a whole new way.
              <br />
              Direct artist support with transparent auctions on the
              <br />
              blockchain.
            </motion.p>

            {/* buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="flex flex-col sm:flex-row gap-6"
            >
              <button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-4 text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-md hover:shadow-green-500/30"
              >
                <Music className="mr-2 h-5 w-5" />
                Explore Music
              </button>
              <button
                size="lg"
                variant="outline"
                className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400 font-semibold px-8 py-4 text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              >
                <Gavel className="mr-2 h-5 w-5" />
                Auction Music
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="container mx-auto px-6 lg:px-8 pb-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              ["10K+", "Active Bidders"],
              ["50K+", "Tracks Auctioned"],
              ["$5M+", "Total Volume"]
            ].map(([num, label], i) => (
              <div
                key={i}
                className="text-gray-400 hover:text-green-300 transition duration-300 hover:scale-105"
              >
                <div className="text-2xl font-bold text-green-400 mb-2">{num}</div>
                <div className="text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/5 via-transparent to-green-900/10 pointer-events-none"></div>
    </div>
  )
}
