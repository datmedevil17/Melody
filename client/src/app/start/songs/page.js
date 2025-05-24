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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setShowDetailPage(false)}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Song Details</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="flex flex-col lg:flex-row gap-8 mb-12">
            <div className="flex-shrink-0">
              <div className="w-80 h-80 rounded-2xl overflow-hidden shadow-2xl group">
                <img
                  src={formatImageUrl(selectedSongData.metadata.cover_image)}
                  alt={selectedSongData.metadata.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end">
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Song
                </span>
              </div>
              <h1 className="text-6xl font-black mb-6 leading-none">
                {selectedSongData.metadata.title}
              </h1>

              <div className="flex items-center gap-2 text-gray-300 mb-8">
                <span className="font-medium">
                  {selectedSongData.artists &&
                  selectedSongData.artists.length > 0
                    ? selectedSongData.artists
                        .join(", ")
                    : "Unknown Artist"}
                </span>
                <span>•</span>
                <span>{selectedSongData.metadata.release_date}</span>
                <span>•</span>
                <span className="bg-gray-800 px-2 py-1 rounded text-sm">
                  {selectedSongData.metadata.genre}
                </span>
              </div>

              <div className="flex items-center gap-6">
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
                  className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-xl"
                >
                  {currentlyPlaying === selectedSong && isPlaying ? (
                    <svg
                      className="w-7 h-7 text-black"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-7 h-7 text-black ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleLike(selectedSong)}
                  disabled={selectedSongData.liked}
                  className="p-3 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <svg
                    className={`w-8 h-8 ${
                      selectedSongData.liked
                        ? "text-green-500 fill-current"
                        : "text-gray-400"
                    }`}
                    fill={selectedSongData.liked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>

                <span className="text-gray-400 text-lg font-medium">
                  {selectedSongData.likes} likes
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
              <div className="text-3xl mb-2">❤️</div>
              <div className="text-2xl font-bold mb-1">
                {selectedSongData.likes}
              </div>
              <div className="text-gray-400 text-sm">Total Likes</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-2xl font-bold mb-1">{comments.length}</div>
              <div className="text-gray-400 text-sm">Comments</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
              <div className="text-3xl mb-2">🎵</div>
              <div className="text-2xl font-bold mb-1">
                {Math.floor(Math.random() * 1000)}
              </div>
              <div className="text-gray-400 text-sm">Total Plays</div>
            </div>
          </div>

          {/* Description */}
          {selectedSongData.metadata.description && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">About this song</h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                {selectedSongData.metadata.description}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-gray-900/50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Comments</h2>

            {/* Add Comment */}
            <div className="mb-8">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  {isSubmitting ? "Adding..." : "Comment"}
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments && comments.length > 0 ? (
                comments.map((comment, index) => (
                  <div key={index} className="bg-gray-800/50 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-green-400">
                        {formatAddress(comment.user)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(
                          Number(comment.timestamp) * 1000
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300">{comment.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-4">💬</div>
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-black">Browse Music</h1>
          <p className="text-gray-400 mt-2">
            Discover amazing tracks from our community
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-t-green-500 border-gray-700 rounded-full animate-spin"></div>
              <p className="text-gray-400">Loading your music...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500 p-6 rounded-xl text-red-400 text-center">
            <p>{error}</p>
          </div>
        ) : songDetails.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🎵</div>
            <h3 className="text-2xl font-bold mb-4">No music found</h3>
            <p className="text-gray-400">Be the first to upload a track!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {songDetails.map((song, index) => {
              const songId = song.id;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group cursor-pointer"
                  onClick={() => openSongDetails(songId)}
                >
                  <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/80 hover:to-gray-800/80 p-6 rounded-2xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] backdrop-blur-sm border border-gray-700/50 hover:border-gray-600/50">
                    <div className="relative mb-6">
                      <div className="aspect-square rounded-xl overflow-hidden shadow-xl ring-1 ring-gray-700/50">
                        <img
                          src={formatImageUrl(song.metadata.cover_image)}
                          alt={song.metadata.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            e.target.src =
                              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                        className="absolute bottom-3 right-3 w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-2xl backdrop-blur-sm border border-green-400/20"
                      >
                        {currentlyPlaying === songId && isPlaying ? (
                          <svg
                            className="w-6 h-6 text-black"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-6 h-6 text-black ml-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>

                      {/* Now Playing Indicator */}
                      {currentlyPlaying === songId && isPlaying && (
                        <div className="absolute top-3 left-3 bg-green-500 text-black px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                          <div className="flex gap-0.5">
                            <div
                              className="w-1 h-3 bg-black rounded-full animate-pulse"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-1 h-2 bg-black rounded-full animate-pulse"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-1 h-4 bg-black rounded-full animate-pulse"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                          PLAYING
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-lg text-white truncate group-hover:text-green-400 transition-colors duration-300">
                        {song.metadata.title}
                      </h3>
                      <p className="text-sm text-gray-300 truncate font-medium">
                        {song.artists && song.artists.length > 0
                          ? song.artists
                              .join(", ")
                          : "Unknown Artist"}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                        <span className="text-xs text-gray-300 bg-gray-800/80 px-3 py-1.5 rounded-full font-medium border border-gray-700/50">
                          {song.metadata.genre}
                        </span>
                        <div className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors group/like">
                          <svg
                            className="w-4 h-4 group-hover/like:scale-110 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                          <span className="text-sm font-medium">
                            {song.likes}
                          </span>
                        </div>
                      </div>

                      {/* Additional metadata */}
                      <div className="pt-2">
                        <p className="text-xs text-gray-500">
                          Released {song.metadata.release_date}
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
