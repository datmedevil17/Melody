"use client";
import React, { useState, useEffect } from "react";
import {
  Clock,
  Music,
  User,
  DollarSign,
  Calendar,
  Trophy,
  X,
  TrendingUp,
  Timer,
  Gavel,
} from "lucide-react";
import { BackgroundBeams } from "../../../components/reactbits/BackgroundBeams";

const MusicAuctionPage = () => {
  const [auctions, setAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showAuctionDetails, setShowAuctionDetails] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, ending-soon, new

  // Mock data based on your backend structure
  useEffect(() => {
    const mockAuctions = [
      {
        id: "1",
        song_id: "song_001",
        artist: "0x1234...abcd",
        artistName: "Electronic Dreams",
        songTitle: "Neon Nights",
        genre: "Electronic",
        start_time: Date.now() - 86400000, // 1 day ago
        end_time: Date.now() + 172800000, // 2 days from now
        starting_price: "0.1",
        current_bid: "0.45",
        highest_bidder: "0x5678...efgh",
        is_active: true,
        reserve_price: "0.3",
        minimum_increment: "0.05",
        bid_count: 8,
        album_art: "/api/placeholder/300/300",
      },
      {
        id: "2",
        song_id: "song_002",
        artist: "0x9876...zyxw",
        artistName: "Cosmic Beats",
        songTitle: "Stellar Journey",
        genre: "Ambient",
        start_time: Date.now() - 43200000, // 12 hours ago
        end_time: Date.now() + 21600000, // 6 hours from now
        starting_price: "0.2",
        current_bid: "0.8",
        highest_bidder: "0x1111...2222",
        is_active: true,
        reserve_price: "0.5",
        minimum_increment: "0.1",
        bid_count: 12,
        album_art: "/api/placeholder/300/300",
      },
      {
        id: "3",
        song_id: "song_003",
        artist: "0x3333...4444",
        artistName: "Retro Synth",
        songTitle: "Digital Memories",
        genre: "Synthwave",
        start_time: Date.now() - 172800000, // 2 days ago
        end_time: Date.now() + 7200000, // 2 hours from now
        starting_price: "0.15",
        current_bid: "0.6",
        highest_bidder: "0x5555...6666",
        is_active: true,
        reserve_price: "0.4",
        minimum_increment: "0.05",
        bid_count: 15,
        album_art: "/api/placeholder/300/300",
      },
      {
        id: "4",
        song_id: "song_004",
        artist: "0x7777...8888",
        artistName: "Bass Thunder",
        songTitle: "Underground Pulse",
        genre: "Dubstep",
        start_time: Date.now() - 3600000, // 1 hour ago
        end_time: Date.now() + 259200000, // 3 days from now
        starting_price: "0.25",
        current_bid: "0.25",
        highest_bidder: "0x0000...0000",
        is_active: true,
        reserve_price: "0.5",
        minimum_increment: "0.05",
        bid_count: 1,
        album_art: "/api/placeholder/300/300",
      },
    ];

    setTimeout(() => {
      setAuctions(mockAuctions);
      setLoading(false);
    }, 1000);
  }, []);

  const formatTimeRemaining = (endTime) => {
    const now = Date.now();
    const remaining = endTime - now;

    if (remaining <= 0) return "Ended";

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTimeUrgency = (endTime) => {
    const remaining = endTime - Date.now();
    const hours = remaining / (1000 * 60 * 60);

    if (hours <= 2) return "urgent";
    if (hours <= 24) return "soon";
    return "normal";
  };

  const handlePlaceBid = (auction) => {
    setSelectedAuction(auction);
    setBidAmount("");
    setShowBidModal(true);
  };

  const handleViewDetails = (auction) => {
    setSelectedAuction(auction);
    setShowAuctionDetails(true);
  };

  const submitBid = () => {
    if (!bidAmount || !userAddress) return;

    const bid = parseFloat(bidAmount);
    const minBid =
      selectedAuction.current_bid === selectedAuction.starting_price
        ? parseFloat(selectedAuction.starting_price)
        : parseFloat(selectedAuction.current_bid) +
          parseFloat(selectedAuction.minimum_increment);

    if (bid < minBid) {
      alert(`Minimum bid is ${minBid} ETH`);
      return;
    }

    // Simulate bid placement
    const updatedAuctions = auctions.map((auction) =>
      auction.id === selectedAuction.id
        ? {
            ...auction,
            current_bid: bidAmount,
            highest_bidder: userAddress,
            bid_count: auction.bid_count + 1,
          }
        : auction
    );

    setAuctions(updatedAuctions);
    setShowBidModal(false);
    setBidAmount("");
  };

  const filteredAuctions = auctions.filter((auction) => {
    if (filter === "ending-soon") {
      const hours = (auction.end_time - Date.now()) / (1000 * 60 * 60);
      return hours <= 24;
    }
    if (filter === "new") {
      const hours = (Date.now() - auction.start_time) / (1000 * 60 * 60);
      return hours <= 24;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-400 text-xl">Loading auctions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <BackgroundBeams />
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-600/3 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 mb-4">
            Music Auctions
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Discover and bid on exclusive music NFTs from talented artists
            around the world
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-full p-2 border border-green-500/20">
            {[
              { key: "all", label: "All Auctions" },
              { key: "ending-soon", label: "Ending Soon" },
              { key: "new", label: "New Auctions" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-6 py-2 rounded-full transition-all duration-300 ${
                  filter === key
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                    : "text-gray-300 hover:text-green-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Auctions</p>
                <p className="text-3xl font-bold text-green-400">
                  {auctions.length}
                </p>
              </div>
              <Gavel className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Volume</p>
                <p className="text-3xl font-bold text-green-400">2.8 ETH</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Ending Today</p>
                <p className="text-3xl font-bold text-green-400">
                  {
                    auctions.filter(
                      (a) => (a.end_time - Date.now()) / (1000 * 60 * 60) <= 24
                    ).length
                  }
                </p>
              </div>
              <Timer className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Auctions List */}
        <div className="space-y-6">
          {filteredAuctions.map((auction) => {
            const timeUrgency = getTimeUrgency(auction.end_time);
            const timeRemaining = formatTimeRemaining(auction.end_time);

            return (
              <div
                key={auction.id}
                className="group bg-gray-800/40 backdrop-blur-sm rounded-3xl p-6 border border-green-500/20 hover:border-green-500/50 transition-all duration-500 hover:transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/20"
              >
                <div className="flex items-center gap-6">
                  {/* Album Art */}
                  <div className="relative flex-shrink-0">
                    <div className="w-32 h-32 bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl flex items-center justify-center">
                      <Music className="w-12 h-12 text-green-400" />
                    </div>

                    {/* Genre badge */}
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-gray-900/80 backdrop-blur-sm rounded-full text-xs text-green-400 font-medium">
                      {auction.genre}
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                          {auction.songTitle}
                        </h3>
                        <p className="text-green-400 text-lg mb-1">
                          by {auction.artistName}
                        </p>
                        <p className="text-gray-500 text-sm font-mono">
                          {auction.artist.slice(0, 6)}...
                          {auction.artist.slice(-4)}
                        </p>
                      </div>

                      {/* Time remaining badge */}
                      <div
                        className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                          timeUrgency === "urgent"
                            ? "bg-red-500 text-white"
                            : timeUrgency === "soon"
                            ? "bg-yellow-500 text-black"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {timeRemaining}
                      </div>
                    </div>

                    {/* Bidding Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-700/30 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-1">
                          Current Bid
                        </p>
                        <p className="text-green-400 font-bold text-lg">
                          {auction.current_bid} ETH
                        </p>
                      </div>
                      <div className="bg-gray-700/30 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-1">
                          Reserve Price
                        </p>
                        <p className="text-gray-300 font-medium">
                          {auction.reserve_price} ETH
                        </p>
                      </div>
                      <div className="bg-gray-700/30 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-1">Total Bids</p>
                        <p className="text-gray-300 font-medium">
                          {auction.bid_count}
                        </p>
                      </div>
                      <div className="bg-gray-700/30 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-1">
                          Min. Increment
                        </p>
                        <p className="text-gray-300 font-medium">
                          {auction.minimum_increment} ETH
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handlePlaceBid(auction)}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Place Bid
                      </button>
                      <button
                        onClick={() => handleViewDetails(auction)}
                        className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 border border-gray-600/50 hover:border-green-500/50"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAuctions.length === 0 && (
          <div className="text-center py-16">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No auctions found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters to see more auctions.
            </p>
          </div>
        )}
      </div>

      {/* Bid Modal */}
      {showBidModal && selectedAuction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-3xl p-8 max-w-md w-full border border-green-500/20 relative">
            <button
              onClick={() => setShowBidModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Place Your Bid
              </h2>
              <p className="text-green-400 font-medium">
                {selectedAuction.songTitle}
              </p>
              <p className="text-gray-400 text-sm">
                by {selectedAuction.artistName}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Your Wallet Address
                </label>
                <input
                  type="text"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Bid Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none transition-colors"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Minimum bid:{" "}
                  {selectedAuction.current_bid ===
                  selectedAuction.starting_price
                    ? selectedAuction.starting_price
                    : (
                        parseFloat(selectedAuction.current_bid) +
                        parseFloat(selectedAuction.minimum_increment)
                      ).toFixed(2)}{" "}
                  ETH
                </p>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Current Highest Bid</span>
                <span className="text-green-400 font-bold">
                  {selectedAuction.current_bid} ETH
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-400">Time Remaining</span>
                <span className="text-white font-medium">
                  {formatTimeRemaining(selectedAuction.end_time)}
                </span>
              </div>
            </div>

            <button
              onClick={submitBid}
              disabled={!bidAmount || !userAddress}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-green-500/25"
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Confirm Bid
            </button>
          </div>
        </div>
      )}

      {/* Auction Details Modal */}
      {showAuctionDetails && selectedAuction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-3xl p-8 max-w-2xl w-full border border-green-500/20 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAuctionDetails(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {selectedAuction.songTitle}
              </h2>
              <p className="text-green-400 text-lg font-medium">
                by {selectedAuction.artistName}
              </p>
              <p className="text-gray-400 text-sm font-mono mt-2">
                Artist: {selectedAuction.artist.slice(0, 10)}...
                {selectedAuction.artist.slice(-6)}
              </p>
            </div>

            {/* Album Art */}
            <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl flex items-center justify-center">
              <Music className="w-24 h-24 text-green-400" />
            </div>

            {/* Auction Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-green-400 font-semibold mb-3">
                  Auction Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Starting Price</span>
                    <span className="text-white">
                      {selectedAuction.starting_price} ETH
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reserve Price</span>
                    <span className="text-white">
                      {selectedAuction.reserve_price} ETH
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min. Increment</span>
                    <span className="text-white">
                      {selectedAuction.minimum_increment} ETH
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Genre</span>
                    <span className="text-white">{selectedAuction.genre}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-green-400 font-semibold mb-3">
                  Current Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Bid</span>
                    <span className="text-green-400 font-bold">
                      {selectedAuction.current_bid} ETH
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Bids</span>
                    <span className="text-white">
                      {selectedAuction.bid_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time Left</span>
                    <span className="text-white">
                      {formatTimeRemaining(selectedAuction.end_time)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Highest Bidder</span>
                    <span className="text-white font-mono text-xs">
                      {selectedAuction.highest_bidder.slice(0, 6)}...
                      {selectedAuction.highest_bidder.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowAuctionDetails(false);
                  handlePlaceBid(selectedAuction);
                }}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25"
              >
                <DollarSign className="w-5 h-5 inline mr-2" />
                Place Bid
              </button>
              <button
                onClick={() => setShowAuctionDetails(false)}
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-300 border border-gray-600/50 hover:border-green-500/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicAuctionPage;
