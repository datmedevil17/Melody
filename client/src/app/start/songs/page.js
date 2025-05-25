"use client";
import { useAccount, useSendTransaction } from "@starknet-react/core";
import { useEffect, useState, useContext } from "react";
import {
  songABI,
  songContractAddress,
  songContract,
  artistContract,
} from "../../../contract/contract";
import { Contract } from "starknet";
import { UserContext } from "../../../context/userContextProvider";
import { motion } from "framer-motion";
import { title } from "process";

const decimalToAscii = (decimal) => {
  if (!decimal) return "N/A";
  try {
    const hex = decimal.toString(16);
    const paddedHex = hex.padStart(2, "0");
    const ascii =
      paddedHex
        .match(/.{2}/g)
        ?.map((hex) => String.fromCharCode(parseInt(hex, 16))) || [];
    return ascii.join("");
  } catch (error) {
    console.error("Error converting decimal to ASCII:", error);
    return decimal.toString();
  }
};

const Songs = () => {
  const { togglePlayPause, isPlaying, currentlyPlaying } = useContext(UserContext);

  const [songDetails, setSongDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [songStats, setSongStats] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [songArtists, setSongArtists] = useState({});
  const { sendAsync, error: txError } = useSendTransaction({
    calls: undefined,
  });
  const { address } = useAccount();

  const fetchSongArtists = async (songId) => {
    try {
      const artists = await artistContract.call("get_song_creators", [songId]);
      const formattedArtists = Array.isArray(artists) ? artists : [artists];
      const artistNames = [];
      for(const artist of formattedArtists) {
        const info = await artistContract.call("get_artist_profile", [artist]);
        if (info && info.name) {
          artistNames.push(decimalToAscii(info.name));
        } else {
          artistNames.push("Unknown Artist");
        }
      }
      setSongArtists((prev) => ({
        ...prev,
        [songId]: artistNames,
      }));
      return artistNames;
    } catch (err) {
      console.error(`Error fetching artists for song #${songId}:`, err);
      return [];
    }
  };

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const data = await artistContract.call("get_song_count", []);
      console.log("Song count:", data);

      const songs = [];
      for (let i = 1; i <= Number(data); i++) {
        try {
          const song = await artistContract.call("get_song_details", [i]);
          const likes = await songContract.call("get_likes_count", [i]);
          let liked = false;
          if (address) {
            liked = await songContract.call("has_user_liked", [i, address]);
          }

          const artists = await fetchSongArtists(i);

          songs.push({
            ...song,
            id: i,
            metadata: {
              ...song.metadata,
              title: decimalToAscii(song.metadata.title),
              genre: decimalToAscii(song.metadata.genre),
              release_date: song.metadata.release_date
                ? new Date(
                    Number(song.metadata.release_date.toString()) * 1000
                  ).toLocaleDateString()
                : "Unknown Date",
            },
            likes: Number(likes),
            liked,
            artists,
          });
        } catch (err) {
          console.error(`Error fetching song #${i}:`, err);
        }
      }

      console.log("Processed songs:", songs);
      setSongDetails(songs);
    } catch (err) {
      console.error("Error loading songs:", err);
      setError("Failed to load songs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [address]);

  const handleLike = async (songId) => {
    if (!address) {
      alert("Please connect your wallet to like a song");
      return;
    }
    try {
      const songContract = new Contract(songABI, songContractAddress);
      const call = songContract.populate("like_song", [songId, address]);
      await sendAsync([call]);

      setSongDetails((prev) => [
        ...prev.map((song) => {
          if (song.id === songId) {
            return {
              ...song,
              likes: song.likes + 1,
              liked: true,
            };
          }
          return song;
        }),
      ]);
    } catch (err) {
      console.error("Error liking song:", err);
    }
  };

  const openSongDetails = async (songId) => {
    try {
      setSelectedSong(songId);
      setShowDetailPage(true);

      const stats = await getSongStats(songId);
      setSongStats(stats);

      const songComments = await getCommentsOfSong(songId);
      setComments(songComments || []);

      if (!songArtists[songId]) {
        await fetchSongArtists(songId);
      }
    } catch (err) {
      console.error("Error fetching song details:", err);
    }
  };

  const getSongStats = async (songId) => {
    try {
      const res = songContract.call("get_song_stats", [songId]);
      return res;
    } catch (err) {
      console.error("Error fetching song stats:", err);
      return null;
    }
  };

  const getCommentsOfSong = async (songId) => {
    try {
      const result = await songContract.get_comments(songId);
      return result;
    } catch (err) {
      console.error(`Error fetching comments for song #${songId}:`, err);
      return [];
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedSong) return;
    console.log(selectedSong,address,newComment)

    try {
      setIsSubmitting(true);
      const call = songContract.populate("comment_on_song", [
        selectedSong,
        address,
        newComment,
      ]);
      await sendAsync([call]);

      const updatedComments = await getCommentsOfSong(selectedSong);
      setComments(updatedComments || []);
      setNewComment("");
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatImageUrl = (uri) => {
    if (!uri)
      return "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center";

    if (uri.startsWith("ipfs.io/ipfs/")) {
      return `https://${uri}`;
    }

    if (uri.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
    }

    return uri;
  };

  const formatAddress = (address) => {
    if (!address) return "Unknown Artist";
    const addressStr = address.toString();
    return `${addressStr.substring(0, 6)}...${addressStr.substring(
      addressStr.length - 4
    )}`;
  };

  const selectedSongData = songDetails.find((song) => song.id === selectedSong);

  if (showDetailPage && selectedSongData) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-3xl bg-black/95 border-b border-gray-800/40">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-4">
            <button
              onClick={() => setShowDetailPage(false)}
              className="p-2.5 hover:bg-gray-800/60 rounded-full transition-all duration-200 hover:scale-105 group"
            >
              <svg
                className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-white/90">Song Details</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Hero Section */}
          <div className="flex flex-col lg:flex-row gap-10 mb-16">
            <div className="flex-shrink-0">
              <div className="w-80 h-80 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
                <img
                  src={formatImageUrl(selectedSongData.metadata.cover_image)}
                  alt={selectedSongData.metadata.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end">
              <div className="mb-6">
                <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">
                  Song
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight tracking-tight">
                {selectedSongData.metadata.title}
              </h1>

              <div className="flex items-center gap-2 text-gray-300 mb-10 text-lg">
                <span className="font-medium text-white">
                  {selectedSongData.artists &&
                  selectedSongData.artists.length > 0
                    ? selectedSongData.artists.join(", ")
                    : "Unknown Artist"}
                </span>
                <span className="text-gray-500">•</span>
                <span>{selectedSongData.metadata.release_date}</span>
                <span className="text-gray-500">•</span>
                <span className="bg-gray-800/60 px-3 py-1 rounded-full text-sm font-medium border border-gray-700/50">
                  {selectedSongData.metadata.genre}
                </span>
              </div>

              <div className="flex items-center gap-8">
                <button
                  onClick={() => {
                    togglePlayPause(
                      `https://${selectedSongData.uri}`,
                      selectedSong,
                      {
                        title: selectedSongData.metadata.title,
                        genre: selectedSongData.metadata.genre,
                        artist: selectedSongData.artists
                          ? selectedSongData.artists.join(", ")
                          : "Unknown Artist",
                        image: formatImageUrl(
                          selectedSongData.metadata.cover_image
                        ),
                      }
                    );
                  }}
                  className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-xl shadow-emerald-500/25"
                >
                  {currentlyPlaying === selectedSong && isPlaying ? (
                    <svg
                      className="w-8 h-8 text-black"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h6a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 16.5v-13zM7 3.5v13h2v-13H7zm4 0v13h2v-13h-2z"/>
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8 text-black ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84z"/>
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleLike(selectedSong)}
                  disabled={selectedSongData.liked}
                  className="p-4 hover:bg-gray-800/60 rounded-full transition-all duration-200 group"
                >
                  <svg
                    className={`w-7 h-7 transition-all duration-200 ${
                      selectedSongData.liked
                        ? "text-emerald-500 fill-current scale-110"
                        : "text-gray-400 group-hover:text-white group-hover:scale-110"
                    }`}
                    fill={selectedSongData.liked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>

                <span className="text-gray-300 text-lg font-medium">
                  {selectedSongData.likes.toLocaleString()} likes
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/40 hover:border-emerald-500/30 transition-all duration-300 group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">❤️</div>
              <div className="text-3xl font-bold mb-2 text-white">
                {selectedSongData.likes.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm font-medium">Total Likes</div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/40 hover:border-emerald-500/30 transition-all duration-300 group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">💬</div>
              <div className="text-3xl font-bold mb-2 text-white">{comments.length}</div>
              <div className="text-gray-400 text-sm font-medium">Comments</div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/40 hover:border-emerald-500/30 transition-all duration-300 group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🎵</div>
              <div className="text-3xl font-bold mb-2 text-white">
                {Math.floor(Math.random() * 1000).toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm font-medium">Total Plays</div>
            </div>
          </div>

          {/* Description */}
          {selectedSongData.metadata.description && (
            <div className="mb-16">
              <h2 className="text-3xl font-bold mb-6 text-white">About this song</h2>
              <p className="text-gray-300 text-lg leading-relaxed max-w-4xl">
                {selectedSongData.metadata.description}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-xl rounded-3xl p-10 border border-gray-700/40">
            <h2 className="text-3xl font-bold mb-8 text-white">Comments</h2>

            {/* Add Comment */}
            <div className="mb-10">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-800/60 backdrop-blur-sm border border-gray-600/50 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                />
                <button
                  onClick={handleAddComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black px-8 py-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg shadow-emerald-500/25"
                >
                  {isSubmitting ? "Adding..." : "Comment"}
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-6">
              {comments && comments.length > 0 ? (
                comments.map((comment, index) => (
                  <div key={index} className="bg-gray-800/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-emerald-400">
                        {formatAddress(comment.user)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(
                          Number(comment.timestamp) * 1000
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-200 leading-relaxed">{comment.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-6xl mb-6 opacity-50">💬</div>
                  <p className="text-xl font-medium">No comments yet</p>
                  <p className="text-gray-500 mt-2">Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-3xl bg-black/95 border-b border-gray-800/40">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-3">Browse Music</h1>
          <p className="text-gray-400 text-lg">
            Discover amazing tracks from our community
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-t-emerald-500 border-r-emerald-400 border-b-emerald-300 border-l-gray-700 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-4 border-t-emerald-300 border-r-emerald-200 border-b-emerald-100 border-l-gray-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
              </div>
              <p className="text-gray-400 text-lg font-medium">Loading your music...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 backdrop-blur-xl border border-red-500/40 p-8 rounded-2xl text-red-300 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-lg font-medium">{error}</p>
          </div>
        ) : songDetails.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-8xl mb-8 opacity-50">🎵</div>
            <h3 className="text-3xl font-bold mb-4 text-white">No music found</h3>
            <p className="text-gray-400 text-lg">Be the first to upload a track!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {songDetails.map((song, index) => {
              const songId = song.id;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, type: "spring", stiffness: 100 }}
                  className="group cursor-pointer"
                  onClick={() => openSongDetails(songId)}
                >
                  <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 hover:from-gray-800/80 hover:to-gray-700/60 backdrop-blur-xl p-4 rounded-2xl transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 hover:scale-[1.02] border border-gray-700/30 hover:border-emerald-500/30">
                    <div className="relative mb-4">
                      <div className="aspect-square rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10 group-hover:ring-emerald-500/30 transition-all duration-500">
                        <img
                          src={formatImageUrl(song.metadata.cover_image)}
                          alt={song.metadata.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            e.target.src =
                              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>

                      {/* Play Button Overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlayPause(
                            `https://${song.uri}`,
                            songId,
                            {
                              title: song.metadata.title,
                              genre: song.metadata.genre,
                              artist: song.artists
                                ? song.artists.join(", ")
                                : "Unknown Artist",
                              image: formatImageUrl(song.metadata.cover_image),
                            }
                          );
                        }}
                        className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl shadow-emerald-500/30 backdrop-blur-sm"
                      >
                        {currentlyPlaying === songId && isPlaying ? (
                          <svg
                            className="w-5 h-5 text-black"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h6a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 16.5v-13zM7 3.5v13h2v-13H7zm4 0v13h2v-13h-2z"/>
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-black ml-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84z"/>
                          </svg>
                        )}
                      </button>

                      {/* Now Playing Indicator */}
                      {currentlyPlaying === songId && isPlaying && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/30">
                          <div className="flex gap-0.5">
                            <div
                              className="w-0.5 h-2.5 bg-black rounded-full animate-pulse"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-0.5 h-2 bg-black rounded-full animate-pulse"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-0.5 h-3 bg-black rounded-full animate-pulse"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                          NOW PLAYING
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-base text-white truncate group-hover:text-emerald-400 transition-colors duration-300 leading-tight">
                        {song.metadata.title}
                      </h3>
                      <p className="text-sm text-gray-400 truncate font-medium">
                        {song.artists && song.artists.length > 0
                          ? song.artists.join(", ")
                          : "Unknown Artist"}
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-300 bg-gray-800/60 px-2.5 py-1 rounded-full font-medium border border-gray-700/40">
                          {song.metadata.genre}
                        </span>
                        <div className="flex items-center gap-1.5 text-gray-400 hover:text-emerald-400 transition-colors group/like">
                          <svg
                            className="w-3.5 h-3.5 group-hover/like:scale-110 transition-transform"
                            fill={song.liked ? "currentColor" : "none"}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                          <span className="text-xs font-medium">
                            {song.likes > 999 ? `${(song.likes / 1000).toFixed(1)}k` : song.likes}
                          </span>
                        </div>
                      </div>

                      {/* Additional metadata */}
                      <div className="pt-1">
                        <p className="text-xs text-gray-500 font-medium">
                          {song.metadata.release_date}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Songs;