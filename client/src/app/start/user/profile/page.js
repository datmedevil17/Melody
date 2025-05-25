"use client";
import { useAccount } from "@starknet-react/core";
import React, { useEffect, useState } from "react";
import {
  artistContract,
  decimalToAscii,
  songContract,
  userContract,
} from "../../../../contract/contract";
import ArtistRegistration from "../../../../components/ArtistRegistration";
import Link from "next/link";
import { truncateAddress } from "../../../../utils/format";
import { useRouter } from "next/navigation";
import { num } from "starknet";

const Page = () => {
  const { address } = useAccount();
  const [userProfile, setUserProfile] = useState(null);
  const [favourites, setFavourites] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [mode, setMode] = useState("user");
  const [isArtist, setIsArtist] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [artistLoading, setArtistLoading] = useState(true);
  const [artistProfile, setArtistProfile] = useState(null);
  const [artistSongs, setArtistSongs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("favorites");
  const [isRegistered, setIsRegistered] = useState(false);
  const router = useRouter();
  const fetchFavourites = async () => {
    try {
      const addresses = await userContract.call("get_favorites", [address]);
      const favs = [];
      for (let artistAddress of addresses) {
        const res = await artistContract.call("get_artist_profile", [
          artistAddress,
        ]);
        favs.push({
          address: num.toHex64(artistAddress),
          name: decimalToAscii(res.name),
          image: res.artist_profile,
        });
      }
      setFavourites(favs);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchLikedSongs = async () => {
    try {
      const res = await songContract.call("get_user_liked_songs", [address]);
      const songs = [];
      for (let id of res) {
        const song = await artistContract.call("get_song_details", [id]);
        songs.push({
          id: id,
          name: decimalToAscii(song.metadata.title),
          genre: decimalToAscii(song.metadata.genre),
          image: song.metadata.cover_image,
        });
      }
      setLikedSongs(songs);
    } catch (e) {
      console.log(e);
    }
  };

  const fecthUserProfile = async () => {
    setUserLoading(true);
    const isReg = await userContract.call("is_registered", [address]);
    if (!isReg) {
      setIsRegistered(false);
      setUserLoading(false);
      return;
    }
    try {
      setIsRegistered(true);
      const user = await userContract.call("get_user_profile", [address]);
      await fetchFavourites();
      await fetchLikedSongs();
      setUserProfile({
        name: decimalToAscii(user.name),
        registration_date: new Date(
          Number(user.registration_date) * 1000
        ).toLocaleDateString(),
      });
    } catch (e) {
      console.log(e);
    } finally {
      setUserLoading(false);
    }
  };

  const fetchArtistSongs = async () => {
    try {
      const res = await artistContract.call("get_artist_songs", [address]);
      const songs = [];
      for (let id of res) {
        const song = await artistContract.call("get_song_details", [id]);
        const likes = await songContract.call("get_likes_count", [id]);
        songs.push({
          id: id,
          name: decimalToAscii(song.metadata.title),
          genre: decimalToAscii(song.metadata.genre),
          image: song.metadata.cover_image,
          likes: Number(likes),
          release_date: new Date(
            Number(song.metadata.release_date) * 1000
          ).toLocaleDateString(),
        });
      }
      setArtistSongs(songs);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchArtistProfile = async () => {
    setArtistLoading(true);
    try {
      const check = await artistContract.call("is_registered_artist", [
        address,
      ]);
      console.log("is artist", check);
      if (check) {
        setIsArtist(true);
        const artist = await artistContract.call("get_artist_profile", [
          address,
        ]);
        const artistStats = await artistContract.call("get_artist_stats", [
          address,
        ]);
        await fetchArtistSongs();
        console.log(artist);
        setArtistProfile({
          name: decimalToAscii(artist.name),
          image: artist.artist_profile,
          song_count: artistStats.song_count,
          address: address,
          registration_date: new Date(
            Number(artistStats.registration_date) * 1000
          ).toLocaleDateString(),
          last_upload_timestamp:
            artistStats.last_upload_timestamp > 0
              ? new Date(
                  Number(artistStats.last_upload_timestamp) * 1000
                ).toLocaleDateString()
              : "No uploads yet",
        });
      } else {
        setIsArtist(false);
      }
    } catch (e) {
      setIsArtist(false);
      console.log(e);
    } finally {
      setArtistLoading(false);
    }
  };

  useEffect(() => {
    setUserProfile(null);
    setArtistProfile(null);
    setFavourites([]);
    setLikedSongs([]);
    setArtistSongs([]);
    setMode("user");
    setIsArtist(false);
    if (userContract && address) {
      fecthUserProfile();
      fetchArtistProfile();
    }
  }, [address, router]);

  const formatIpfsUrl = (url) => {
    if (!url) return "https://via.placeholder.com/150";
    return `https://${url}`;
  };
  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <h1 className="text-2xl font-bold">Please connect your wallet</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      
{isRegistered && (
  <div className="bg-black  border-emerald-100 dark:border-emerald-900/30 backdrop-blur-xl">
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-20">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent">
            Profile
          </h1>
        </div>
        <div className="flex items-center">
          {artistLoading ? (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-4 py-2 rounded-full backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30">
              <svg
                className="animate-spin h-5 w-5 mr-3 text-emerald-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="font-medium">Checking artist status...</span>
            </div>
          ) : isArtist ? (
            <div className="flex items-center bg-white/60 dark:bg-gray-800/60 px-6 py-3 rounded-full backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30 shadow-lg">
              <span
                className={`mr-4 text-sm font-semibold transition-colors duration-200 ${
                  mode === "user"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                User
              </span>
              <div
                onClick={() =>
                  setMode(mode === "user" ? "artist" : "user")
                }
                className="relative inline-flex h-7 w-12 items-center rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 cursor-pointer transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-gradient-to-r shadow-lg transition-all duration-300 ${
                    mode === "artist" 
                      ? "translate-x-6 from-emerald-400 to-emerald-600" 
                      : "translate-x-1 from-emerald-500 to-emerald-700"
                  }`}
                />
              </div>
              <span
                className={`ml-4 text-sm font-semibold transition-colors duration-200 ${
                  mode === "artist"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Artist
              </span>
            </div>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 px-6 rounded-full font-semibold flex items-center transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
              Register as Artist
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-200/20 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-400">Loading profile...</p>
            </div>
          </div>
        ) : !isRegistered ? (
          <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <h1 className="text-2xl font-bold">
              Please register to view your profile
            </h1>
            <Link
              href={"/start/user"}
              className="ml-4 text-purple-400 underline"
            >
              Register
            </Link>
          </div>
        ) : mode === "user" ? (
          // User profile view
          <>
  <div className="bg-gradient-to-br from-emerald-50 via-white to-gray-50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-black rounded-2xl p-8 shadow-xl mb-8 border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm">
    <div className="flex items-start justify-between">
      <div className="flex-grow">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent mb-2">
          {userProfile?.name || "Anonymous User"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium flex items-center mb-4">
          <span>
            {address
              ? truncateAddress(address)
              : "No address connected"}
          </span>
        </p>
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30 inline-block">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Member since:</span>{" "}
            {userProfile?.registration_date || "Unknown"}
          </p>
        </div>
      </div>
      <div className="flex space-x-6 ml-8">
        <div className="text-center bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30 min-w-[100px]">
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent">
            {favourites.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Favorites</div>
        </div>
        <div className="text-center bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30 min-w-[100px]">
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent">
            {likedSongs.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Liked Songs</div>
        </div>
      </div>
    </div>
  </div>

  {/* Tabs */}
  <div className="mb-8">
    <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl p-2 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30 inline-flex">
      <nav className="flex space-x-2">
        <button
          onClick={() => setActiveTab("favorites")}
          className={`py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
            activeTab === "favorites"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50"
          }`}
        >
          Favorites
        </button>
        <button
          onClick={() => setActiveTab("liked")}
          className={`py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
            activeTab === "liked"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50"
          }`}
        >
          Liked Songs
        </button>
      </nav>
    </div>
  </div>

  {/* Tab Content */}
  {activeTab === "favorites" && (
    <>
      {favourites.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-gray-50 dark:from-gray-900 dark:via-emerald-950/10 dark:to-black rounded-2xl border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg
              className="h-10 w-10 text-emerald-500 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            No favorites yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Explore artists and add them to your favorites!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favourites.map((artist, index) => (
            <div
              key={index}
              className="bg-white/80 dark:bg-gray-800/80 rounded-2xl overflow-hidden border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20 hover:scale-105 group"
            >
              <div className="aspect-square bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-gray-900 relative overflow-hidden">
                <img
                  src={formatIpfsUrl(artist.image)}
                  alt={artist.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://via.placeholder.com/400x400/10b981/ffffff?text=No+Image";
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
              </div>
              <div className="p-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                  {artist.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {truncateAddress(artist.address)}
                </p>
                <button className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105">
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )}

  {activeTab === "liked" && (
    <>
      {likedSongs.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-gray-50 dark:from-gray-900 dark:via-emerald-950/10 dark:to-black rounded-2xl border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg
              className="h-10 w-10 text-emerald-500 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            No liked songs yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Start exploring and liking songs to build your collection!
          </p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm overflow-hidden shadow-lg">
          <div className="divide-y divide-emerald-100 dark:divide-emerald-900/30">
            {likedSongs.map((song, index) => (
              <div
                key={index}
                className="flex items-center p-5 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-200 group"
              >
                <div className="h-14 w-14 mr-5 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-gray-900 flex-shrink-0 shadow-md">
                  <img
                    src={formatIpfsUrl(song.image)}
                    alt={song.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://via.placeholder.com/60x60/10b981/ffffff?text=No+Image";
                    }}
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate text-base mb-1">
                    {song.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {song.genre}
                  </p>
                </div>
                <div className="flex space-x-3 ml-4">
                  <button className="p-3 text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-200">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button className="p-3 text-red-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )}
</>
        ) : // Artist profile view
        artistLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-200/20 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-400">Loading artist profile...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-emerald-50 via-white to-gray-50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-black rounded-2xl p-8 shadow-xl mb-8 border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="h-28 w-28 rounded-full overflow-hidden bg-gradient-to-br from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 mr-8 shadow-lg ring-4 ring-white dark:ring-emerald-900/50">
                  <img
                    src={formatIpfsUrl(artistProfile?.image)}
                    alt={artistProfile?.name || "artist"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-grow">
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent flex items-center mb-2">
                    {artistProfile?.name}
                    <span className="ml-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm px-3 py-1 rounded-full font-medium shadow-sm">
                      Artist
                    </span>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-4 font-medium">
                    {address
                      ? truncateAddress(address)
                      : "No address connected"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-gray-500 dark:text-gray-400 text-sm font-medium block">
                        Registered
                      </span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        {artistProfile?.registration_date}
                      </span>
                    </div>
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-gray-500 dark:text-gray-400 text-sm font-medium block">
                        Songs
                      </span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        {artistProfile?.song_count}
                      </span>
                    </div>
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-gray-500 dark:text-gray-400 text-sm font-medium block">
                        Last Upload
                      </span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        {artistProfile?.last_upload_timestamp}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-3 ml-8">
                  <Link
                    href="/start/upload"
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 px-6 rounded-full font-semibold flex items-center transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v16m8-8H4"
                      ></path>
                    </svg>
                    Upload Song
                  </Link>
                  <Link
                    href="/start/collab"
                    className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black dark:from-emerald-800 dark:to-emerald-900 dark:hover:from-emerald-700 dark:hover:to-emerald-800 text-white py-3 px-6 rounded-full font-semibold flex items-center transition-all duration-200 shadow-lg hover:shadow-gray-500/25 dark:hover:shadow-emerald-500/25 transform hover:scale-105"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      ></path>
                    </svg>
                    Create Collab
                  </Link>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-200 bg-clip-text text-transparent mb-6 flex items-center">
              <svg
                className="w-6 h-6 mr-3 text-emerald-500 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              Your Songs
            </h3>

            {artistSongs.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-gray-50 dark:from-gray-900 dark:via-emerald-950/10 dark:to-black rounded-2xl border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <svg
                    className="h-10 w-10 text-emerald-500 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  No songs uploaded yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Start sharing your music with the world and build your
                  audience!
                </p>
                <Link
                  href="/start/upload"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    ></path>
                  </svg>
                  Upload Your First Song
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {artistSongs.map((song, index) => (
                  <div
                    key={index}
                    className="bg-white/80 dark:bg-gray-800/80 rounded-2xl overflow-hidden border border-emerald-100 dark:border-emerald-900/30 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20 hover:scale-105 flex flex-col group"
                  >
                    <div className="aspect-square bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-gray-900 relative overflow-hidden">
                      <img
                        src={formatIpfsUrl(song.image)}
                        alt={song.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://via.placeholder.com/400x400/10b981/ffffff?text=No+Image";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                      <button className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-emerald-600 dark:text-emerald-400 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="p-5 flex-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 truncate">
                        {song.name}
                      </h3>
                      <div className="flex items-center justify-between mb-4">
                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm px-3 py-1 rounded-full font-medium">
                          {song.genre}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {song.release_date}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-red-500 dark:text-red-400 flex items-center font-medium">
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {song.likes}
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Artist Registration Modal */}
      {isModalOpen && (
        <ArtistRegistration
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchArtistProfile}
        />
      )}
    </div>
  );
};

export default Page;
