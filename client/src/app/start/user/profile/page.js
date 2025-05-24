'use client'
import { useAccount } from '@starknet-react/core'
import React, { useEffect, useState } from 'react'
import {
  artistContract,
  decimalToAscii,
  songContract,
  userContract,
} from '../../../contract/contract'
import ArtistRegistration from '../../../components/ArtistRegistration'
import Link from 'next/link'
import { truncateAddress } from '../../../utils/format'
import { useRouter } from 'next/navigation'
import { num } from 'starknet'

const Page = () => {
  const { address } = useAccount()
  const [userProfile, setUserProfile] = useState(null)
  const [favourites, setFavourites] = useState([])
  const [likedSongs, setLikedSongs] = useState([])
  const [mode, setMode] = useState('user')
  const [isArtist, setIsArtist] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [artistLoading, setArtistLoading] = useState(true)
  const [artistProfile, setArtistProfile] = useState(null)
  const [artistSongs, setArtistSongs] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('favorites')
  const [isRegistered, setIsRegistered] = useState(false)
  const router = useRouter()
  const fetchFavourites = async () => {
    try {
      const addresses = await userContract.call('get_favorites', [address])
      const favs = []
      for (let artistAddress of addresses) {
        const res = await artistContract.call('get_artist_profile', [
          artistAddress,
        ])
        favs.push({
          address: num.toHex64(artistAddress),
          name: decimalToAscii(res.name),
          image: res.artist_profile,
        })
      }
      setFavourites(favs)
    } catch (e) {
      console.log(e)
    }
  }

  const fetchLikedSongs = async () => {
    try {
      const res = await songContract.call('get_user_liked_songs', [address])
      const songs = []
      for (let id of res) {
        const song = await artistContract.call('get_song_details', [id])
        songs.push({
          id: id,
          name: decimalToAscii(song.metadata.title),
          genre: decimalToAscii(song.metadata.genre),
          image: song.metadata.cover_image,
        })
      }
      setLikedSongs(songs)
    } catch (e) {
      console.log(e)
    }
  }

  const fecthUserProfile = async () => {
    setUserLoading(true)
    const isReg = await userContract.call('is_registered', [address])
    if (!isReg) {
      setIsRegistered(false)
      setUserLoading(false)
      return
    }
    try {
      setIsRegistered(true)
      const user = await userContract.call('get_user_profile', [address])
      await fetchFavourites()
      await fetchLikedSongs()
      setUserProfile({
        name: decimalToAscii(user.name),
        registration_date: new Date(
          Number(user.registration_date) * 1000
        ).toLocaleDateString(),
      })
    } catch (e) {
      console.log(e)
    } finally {
      setUserLoading(false)
    }
  }

  const fetchArtistSongs = async () => {
    try {
      const res = await artistContract.call('get_artist_songs', [address])
      const songs = []
      for (let id of res) {
        const song = await artistContract.call('get_song_details', [id])
        const likes = await songContract.call('get_likes_count', [id])
        songs.push({
          id: id,
          name: decimalToAscii(song.metadata.title),
          genre: decimalToAscii(song.metadata.genre),
          image: song.metadata.cover_image,
          likes: Number(likes),
          release_date: new Date(
            Number(song.metadata.release_date) * 1000
          ).toLocaleDateString(),
        })
      }
      setArtistSongs(songs)
    } catch (e) {
      console.log(e)
    }
  }

  const fetchArtistProfile = async () => {
    setArtistLoading(true)
    try {
      const check = await artistContract.call('is_registered_artist', [address])
      console.log('is artist', check)
      if (check) {
        setIsArtist(true)
        const artist = await artistContract.call('get_artist_profile', [
          address,
        ])
        const artistStats = await artistContract.call('get_artist_stats', [
          address,
        ])
        await fetchArtistSongs()
        console.log(artist)
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
              : 'No uploads yet',
        })
      } else {
        setIsArtist(false)
      }
    } catch (e) {
      setIsArtist(false)
      console.log(e)
    } finally {
      setArtistLoading(false)
    }
  }

  useEffect(() => {
    setUserProfile(null)
    setArtistProfile(null)
    setFavourites([])
    setLikedSongs([])
    setArtistSongs([])
    setMode('user')
    setIsArtist(false)
    if (userContract && address) {
      fecthUserProfile()
      fetchArtistProfile()
    }
  }, [address, router])

  const formatIpfsUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150'
    return `https://${url}`
  }
  if (!address) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-900 text-white'>
        <h1 className='text-2xl font-bold'>Please connect your wallet</h1>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      {/* Navigation Bar */}
      {isRegistered && (
        <div className='bg-gray-800 border-b border-gray-700'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between h-16'>
              <div className='flex items-center'>
                <h1 className='text-xl font-bold text-purple-400'>Profile</h1>
              </div>
              <div className='flex items-center'>
                {artistLoading ? (
                  <div className='flex items-center text-sm text-gray-400'>
                    <svg
                      className='animate-spin h-5 w-5 mr-2'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'>
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Checking artist status...
                  </div>
                ) : isArtist ? (
                  <div className='flex items-center'>
                    <span
                      className={`mr-2 text-sm ${
                        mode === 'user'
                          ? 'text-purple-400 font-medium'
                          : 'text-gray-400'
                      }`}>
                      User
                    </span>
                    <div
                      onClick={() =>
                        setMode(mode === 'user' ? 'artist' : 'user')
                      }
                      className='relative inline-flex h-6 w-11 items-center rounded-full bg-gray-700 cursor-pointer'>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          mode === 'artist' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                    <span
                      className={`ml-2 text-sm ${
                        mode === 'artist'
                          ? 'text-purple-400 font-medium'
                          : 'text-gray-400'
                      }`}>
                      Artist
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className='bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-full font-medium flex items-center transition-colors'>
                    <svg
                      className='w-5 h-5 mr-1'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M12 6v6m0 0v6m0-6h6m-6 0H6'></path>
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
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {userLoading ? (
          <div className='flex justify-center items-center h-64'>
            <div className='flex flex-col items-center'>
              <div className='w-12 h-12 border-4 border-t-purple-500 border-purple-200/20 rounded-full animate-spin'></div>
              <p className='mt-4 text-gray-400'>Loading profile...</p>
            </div>
          </div>
        ) : !isRegistered ? (
          <div className='flex items-center justify-center min-h-screen bg-gray-900 text-white'>
            <h1 className='text-2xl font-bold'>
              Please register to view your profile
            </h1>
            <Link
              href={'/start/user'}
              className='ml-4 text-purple-400 underline'>
              Register
            </Link>
          </div>
        ) : mode === 'user' ? (
          // User profile view
          <>
            <div className='bg-gray-800 rounded-xl p-6 shadow-lg mb-8 border border-gray-700'>
              <div className='flex items-start justify-between'>
                <div>
                  <h2 className='text-2xl font-bold text-white'>
                    {userProfile?.name || 'Anonymous User'}
                  </h2>
                  <p className='text-gray-400 mt-1 flex items-center'>
                    <span>
                      {address
                        ? truncateAddress(address)
                        : 'No address connected'}
                    </span>
                  </p>
                  <div className='mt-4 text-sm text-gray-400'>
                    <p>
                      Member since:{' '}
                      {userProfile?.registration_date || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className='flex space-x-4'>
                  <div className='text-center'>
                    <div className='text-2xl font-bold text-purple-400'>
                      {favourites.length}
                    </div>
                    <div className='text-xs text-gray-400'>Favorites</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-2xl font-bold text-purple-400'>
                      {likedSongs.length}
                    </div>
                    <div className='text-xs text-gray-400'>Liked Songs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className='mb-6'>
              <div className='border-b border-gray-700'>
                <nav className='flex space-x-8'>
                  <button
                    onClick={() => setActiveTab('favorites')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'favorites'
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
                    }`}>
                    Favorites
                  </button>
                  <button
                    onClick={() => setActiveTab('liked')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'liked'
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
                    }`}>
                    Liked Songs
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'favorites' && (
              <>
                {favourites.length === 0 ? (
                  <div className='text-center py-12 bg-gray-800 rounded-lg border border-gray-700'>
                    <svg
                      className='mx-auto h-12 w-12 text-gray-500'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='1'
                        d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                      />
                    </svg>
                    <h3 className='mt-2 text-lg font-medium text-gray-300'>
                      No favorites yet
                    </h3>
                    <p className='mt-1 text-sm text-gray-400'>
                      Explore artists and add them to your favorites!
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {favourites.map((artist, index) => (
                      <div
                        key={index}
                        className='bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:shadow-lg hover:shadow-purple-900/10 transition-all'>
                        <div className='aspect-square bg-gray-700 relative'>
                          <img
                            src={formatIpfsUrl(artist.image)}
                            alt={artist.name}
                            className='w-full h-full object-cover'
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src =
                                'https://via.placeholder.com/400x400/1f2937/6b7280?text=No+Image'
                            }}
                          />
                        </div>
                        <div className='p-4'>
                          <h3 className='font-bold text-white'>
                            {artist.name}
                          </h3>
                          <p className='text-xs text-gray-400 mt-1'>
                            {truncateAddress(artist.address)}
                          </p>
                          <button className='mt-3 w-full py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 text-sm transition-colors'>
                            View Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'liked' && (
              <>
                {likedSongs.length === 0 ? (
                  <div className='text-center py-12 bg-gray-800 rounded-lg border border-gray-700'>
                    <svg
                      className='mx-auto h-12 w-12 text-gray-500'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='1'
                        d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                      />
                    </svg>
                    <h3 className='mt-2 text-lg font-medium text-gray-300'>
                      No liked songs yet
                    </h3>
                    <p className='mt-1 text-sm text-gray-400'>
                      Start exploring and liking songs to build your collection!
                    </p>
                  </div>
                ) : (
                  <div className='bg-gray-800 rounded-xl border border-gray-700 overflow-hidden'>
                    <div className='divide-y divide-gray-700'>
                      {likedSongs.map((song, index) => (
                        <div
                          key={index}
                          className='flex items-center p-4 hover:bg-gray-700/50 transition-colors'>
                          <div className='h-12 w-12 mr-4 rounded overflow-hidden bg-gray-700 flex-shrink-0'>
                            <img
                              src={formatIpfsUrl(song.image)}
                              alt={song.name}
                              className='h-full w-full object-cover'
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src =
                                  'https://via.placeholder.com/60x60/1f2937/6b7280?text=No+Image'
                              }}
                            />
                          </div>
                          <div className='flex-grow min-w-0'>
                            <h4 className='font-medium text-white truncate'>
                              {song.name}
                            </h4>
                            <p className='text-xs text-gray-400'>
                              {song.genre}
                            </p>
                          </div>
                          <div className='flex space-x-2'>
                            <button className='p-2 text-gray-400 hover:text-purple-400 rounded-full'>
                              <svg
                                className='w-5 h-5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'>
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth='2'
                                  d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
                                />
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth='2'
                                  d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                />
                              </svg>
                            </button>
                            <button className='p-2 text-red-400 rounded-full'>
                              <svg
                                className='w-5 h-5'
                                fill='currentColor'
                                viewBox='0 0 20 20'>
                                <path
                                  fillRule='evenodd'
                                  d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
                                  clipRule='evenodd'
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
          <div className='flex justify-center items-center h-64'>
            <div className='flex flex-col items-center'>
              <div className='w-12 h-12 border-4 border-t-purple-500 border-purple-200/20 rounded-full animate-spin'></div>
              <p className='mt-4 text-gray-400'>Loading artist profile...</p>
            </div>
          </div>
        ) : (
          <>
            <div className='bg-gradient-to-r from-purple-900/40 to-gray-800 rounded-xl p-6 shadow-lg mb-8 border border-gray-700'>
              <div className='flex items-center'>
                <div className='h-24 w-24 rounded-full overflow-hidden bg-gray-700 mr-6 border-2 border-purple-500'>
                  <img
                    src={formatIpfsUrl(artistProfile?.image)}
                    alt={artistProfile?.name || 'artist'}
                    className='h-full w-full object-cover'
                  />
                </div>
                <div className='flex-grow'>
                  <h2 className='text-3xl font-bold text-white flex items-center'>
                    {artistProfile?.name}
                    <span className='ml-2 bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full'>
                      Artist
                    </span>
                  </h2>
                  <p className='text-gray-400 mt-1'>
                    {address
                      ? truncateAddress(address)
                      : 'No address connected'}
                  </p>
                  <div className='flex flex-wrap gap-x-6 gap-y-2 mt-3'>
                    <div className='text-sm'>
                      <span className='text-gray-400'>Registered: </span>
                      <span className='text-white'>
                        {artistProfile?.registration_date}
                      </span>
                    </div>
                    <div className='text-sm'>
                      <span className='text-gray-400'>Songs: </span>
                      <span className='text-white'>
                        {artistProfile?.song_count}
                      </span>
                    </div>
                    <div className='text-sm'>
                      <span className='text-gray-400'>Last upload: </span>
                      <span className='text-white'>
                        {artistProfile?.last_upload_timestamp}
                      </span>
                    </div>
                  </div>
                </div>
                <div className='flex items-center space-x-3 ml-4'>
                  <Link
                    href='/start/upload'
                    className='bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-full font-medium flex items-center transition-colors'>
                    <svg
                      className='w-5 h-5 mr-1'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M12 4v16m8-8H4'></path>
                    </svg>
                    Upload Song
                  </Link>
                  <Link
                    href='/collab'
                    className='bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-full font-medium flex items-center transition-colors'>
                    <svg
                      className='w-5 h-5 mr-1'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'></path>
                    </svg>
                    Create Collab
                  </Link>
                </div>
              </div>
            </div>

            {/* Artist Songs */}
            <h3 className='text-xl font-bold text-white mb-4 flex items-center'>
              <svg
                className='w-5 h-5 mr-2 text-purple-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                />
              </svg>
              Your Songs
            </h3>

            {artistSongs.length === 0 ? (
              <div className='text-center py-12 bg-gray-800 rounded-lg border border-gray-700'>
                <svg
                  className='mx-auto h-12 w-12 text-gray-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='1'
                    d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                  />
                </svg>
                <h3 className='mt-2 text-lg font-medium text-gray-300'>
                  No songs uploaded yet
                </h3>
                <p className='mt-1 text-sm text-gray-400'>
                  Start sharing your music with the world!
                </p>
                <Link
                  href='/start/upload'
                  className='inline-block mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors'>
                  Upload Your First Song
                </Link>
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {artistSongs.map((song, index) => (
                  <div
                    key={index}
                    className='bg-gray-800 rounded-xl overflow-hidden border border-gray-700 transition-all hover:shadow-lg hover:shadow-purple-900/20 flex flex-col'>
                    <div className='aspect-square bg-gray-900 relative'>
                      <img
                        src={formatIpfsUrl(song.image)}
                        alt={song.name}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src =
                            'https://via.placeholder.com/400x400/1f2937/6b7280?text=No+Image'
                        }}
                      />
                      <button className='absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors'>
                        <svg
                          className='w-6 h-6'
                          fill='currentColor'
                          viewBox='0 0 20 20'>
                          <path
                            fillRule='evenodd'
                            d='M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </button>
                    </div>
                    <div className='p-4 flex-1'>
                      <h3 className='font-bold text-lg text-white mb-1 truncate'>
                        {song.name}
                      </h3>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded'>
                          {song.genre}
                        </span>
                        <span className='text-xs text-gray-500'>
                          {song.release_date}
                        </span>
                      </div>
                      <div className='flex items-center justify-between mt-2 text-sm'>
                        <div className='text-red-400 flex items-center'>
                          <svg
                            className='w-5 h-5 mr-1'
                            fill='currentColor'
                            viewBox='0 0 20 20'>
                            <path
                              fillRule='evenodd'
                              d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
                              clipRule='evenodd'
                            />
                          </svg>
                          {song.likes} likes
                        </div>
                        <button className='text-gray-400 hover:text-gray-300'>
                          <svg
                            className='w-5 h-5'
                            fill='currentColor'
                            viewBox='0 0 20 20'>
                            <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
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
  )
}

export default Page
