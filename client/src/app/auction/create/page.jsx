"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Particles from "../../../components/reactbits/Particles";

// import { createAuction } from '@/lib/starknet/actions/createAuction'

export default function CreateAuctionPage() {
  const [artistAddress, setArtistAddress] = useState("");
  const [songId, setSongId] = useState("");
  const [minBid, setMinBid] = useState("");
  const [platformFeePercent, setPlatformFeePercent] = useState("");
  const [artistFeePercent, setArtistFeePercent] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // try {
    //   await createAuction({
    //     artistAddress,
    //     songId,
    //     minBid,
    //     platformFeePercent,
    //     artistFeePercent,
    //     startTime,
    //     endTime,
    //   })
    //   router.push('/auctions')
    // } catch (error) {
    //   console.error('Auction creation failed:', error)
    // }
  };

  return (
    <>
      <div className="absolute top-10 h-screen w-full pointer-events-none ">
        <Particles
          particleColors={["#ffffff", "#ffffff"]}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-emerald-900/20 to-teal-900/20 animate-pulse"></div>

          {/* Main form container */}
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Header with gradient text */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
                Create New Auction
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-6">
              {/* Artist Address */}
              <div className="group">
                <label className="block text-white/80 text-sm font-medium mb-2 group-focus-within:text-green-400 transition-colors">
                  Artist Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={artistAddress}
                    onChange={(e) => setArtistAddress(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 hover:bg-white/10"
                    placeholder="0x..."
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"></div>
                </div>
              </div>

              {/* Song ID */}
              <div className="group">
                <label className="block text-white/80 text-sm font-medium mb-2 group-focus-within:text-emerald-400 transition-colors">
                  Song ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={songId}
                    onChange={(e) => setSongId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 hover:bg-white/10"
                    placeholder="Enter song identifier"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"></div>
                </div>
              </div>

              {/* Minimum Bid */}
              <div className="group">
                <label className="block text-white/80 text-sm font-medium mb-2 group-focus-within:text-teal-400 transition-colors">
                  Minimum Bid
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={minBid}
                    onChange={(e) => setMinBid(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 hover:bg-white/10"
                    placeholder="0.1 ETH"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"></div>
                </div>
              </div>

              {/* Fee percentages row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-white/80 text-sm font-medium mb-2 group-focus-within:text-lime-400 transition-colors">
                    Platform Fee (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={platformFeePercent}
                      onChange={(e) => setPlatformFeePercent(e.target.value)}
                      required
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500/50 transition-all duration-300 hover:bg-white/10"
                      placeholder="2.5"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-lime-500/20 to-green-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"></div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-white/80 text-sm font-medium mb-2 group-focus-within:text-emerald-400 transition-colors">
                    Artist Fee (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={artistFeePercent}
                      onChange={(e) => setArtistFeePercent(e.target.value)}
                      required
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 hover:bg-white/10"
                      placeholder="10"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"></div>
                  </div>
                </div>
              </div>

              {/* Time inputs row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-white/80 text-sm font-medium mb-2 group-focus-within:text-green-400 transition-colors">
                    Start Time
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 hover:bg-white/10 [color-scheme:dark]"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"></div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-white/80 text-sm font-medium mb-2 group-focus-within:text-teal-400 transition-colors">
                    End Time
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 hover:bg-white/10 [color-scheme:dark]"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity -z-10"></div>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-6">
                <button
                  onClick={handleSubmit}
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Create Auction
                  </span>
                </button>
              </div>
            </div>

            {/* Floating elements for visual appeal */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-60 blur-sm animate-bounce"></div>
            <div
              className="absolute -bottom-4 -right-4 w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full opacity-60 blur-sm animate-bounce"
              style={{ animationDelay: "1s" }}
            ></div>
            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full opacity-40 blur-sm animate-pulse"></div>
          </div>
        </div>
      </div>
      {/* <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Create New Auction
        </h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <label>
            Artist Address:
            <input
              type="text"
              value={artistAddress}
              onChange={(e) => setArtistAddress(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Song ID:
            <input
              type="text"
              value={songId}
              onChange={(e) => setSongId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Minimum Bid:
            <input
              type="text"
              value={minBid}
              onChange={(e) => setMinBid(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Platform Fee (%):
            <input
              type="number"
              value={platformFeePercent}
              onChange={(e) => setPlatformFeePercent(e.target.value)}
              required
              min="0"
              max="100"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Artist Fee (%):
            <input
              type="number"
              value={artistFeePercent}
              onChange={(e) => setArtistFeePercent(e.target.value)}
              required
              min="0"
              max="100"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            Start Time (ISO 8601):
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            End Time (ISO 8601):
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#6366F1",
              color: "white",
              fontWeight: "bold",
              border: "none",
            }}
          >
            Create Auction
          </button>
        </form>
      </div> */}
    </>
  );
}
