'use client'
import { useEffect, useState } from 'react'
import {
  artistContract,
  decimalToAscii,
  songContract,
  userContract,
} from '../../contract/contract'
import { num } from 'starknet'
import { useAccount, useSendTransaction } from '@starknet-react/core'
import { motion, AnimatePresence } from 'framer-motion'

const Page = () => {
  const { address } = useAccount()
  const [artistsData, setArtistsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [songsData, setSongsData] = useState([])
  const [songLoading, setSongLoading] = useState(true)
  const [songError, setSongError] = useState(false)
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [likingStates, setLikingStates] = useState({})
  const [favoriteLoading, setFavoriteLoading] = useState({})
  const { sendAsync } = useSendTransaction({ calls: [] })

  const fetchSongs = async (artistAddress) => {
    setSongLoading(true)
    setSongsData([])
    try {
      const res = await artistContract.call('get_artist_songs', [artistAddress])
      let songs = []
      for (let i of res) {
        const song = await artistContract.call('get_song_details', [i])
        const likes = await songContract.call('get_likes_count', [i])
        let liked = false
        if (address) {
          liked = await songContract.call('has_user_liked', [i, address])
        }
        songs.push({
          id: i,
          name: decimalToAscii(song.metadata.title),
          genre: decimalToAscii(song.metadata.genre),
          image: formatUrl(song.metadata.cover_image),
          song_url: formatUrl(song.uri),
          release_date: new Date(
            Number(song.metadata.release_date) * 1000
          ).toLocaleString(),
          likes: Number(likes),
          liked: liked,
        })
      }
      setSongError(false)
      setSongsData(songs)
    } catch (e) {
      setSongError(true)
      console.log(e)
    } finally {
      setSongLoading(false)
    }
  }

  const formatUrl = (url) => {
    if (!url) return ''
    return 'https://' + url
  }

  const fetchArtists = async () => {
    setLoading(true)
    try {
      const res = await artistContract.call('get_all_artists', [])
      const artists = []
      console.log('Artists response:', res)
      for (let i of res) {
        try {
          const artist = await artistContract.call('get_artist_profile', [i])
          const stats = await artistContract.call('get_artist_stats', [i])
          let is_favorite = false
          let is_self = false
          if (address) {
            is_favorite = await userContract.call('is_artist_favorited', [
              address,
              i,
            ])
            is_self = (i === num.toBigInt(address))
          }

          artists.push({
            address: num.toHex64(i),
            name: decimalToAscii(artist.name),
            image: formatUrl(artist.artist_profile),
            song_count: Number(stats.song_count),
            last_upload:
              stats.last_upload_timestamp > 0
                ? new Date(
                    Number(stats.last_upload_timestamp) * 1000
                  ).toLocaleString()
                : 'No uploads yet',
            is_favorite: is_favorite,
            is_self: is_self,
          })
          
        } catch (artistError) {
          console.error(
            `Error fetching artist data for ${num.toHex(i)}:`,
            artistError
          )
        }
      }
      console.log('Processed artists:', artists)
      setArtistsData(artists)
    } catch (e) {
      console.log('Error fetching all artists:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToFavorites = async (artistAddress) => {
    if (!address) {
      window.alert('Please connect your wallet')
      return
    }

    setFavoriteLoading((prev) => ({ ...prev, [artistAddress]: true }))
    try {
      const call = userContract.populate('favorite_artist', [
        address,
        artistAddress,
      ])
      const tx = await sendAsync([call])
      console.log('Favorite tx:', tx)
      setArtistsData((prev) => {
        return prev.map((artist) => {
          if (artist.address === artistAddress) {
            return {
              ...artist,
              is_favorite: true,
            }
          }
          return artist
        })
      })
    } catch (e) {
      window.alert('Transaction failed')
      console.log(e)
    } finally {
      setFavoriteLoading((prev) => ({ ...prev, [artistAddress]: false }))
    }
  }

  const handleLike = async (songId) => {
    if (!address) {
      alert('Please connect your wallet')
      return
    }

    setLikingStates((prev) => ({ ...prev, [songId]: true }))
    try {
      const call = songContract.populate('like_song', [songId, address])
      await sendAsync([call])
      setSongsData((prev) =>
        prev.map((song) => {
          if (song.id === songId) {
            return {
              ...song,
              likes: song.likes + 1,
              liked: true,
            }
          }
          return song
        })
      )
    } catch (err) {
      window.alert('Transaction failed')
      console.error('Error liking song:', err)
    } finally {
      setLikingStates((prev) => ({ ...prev, [songId]: false }))
    }
  }

  const openModal = (artist) => {
    setSelectedArtist(artist)
    setIsModalOpen(true)
    fetchSongs(artist.address)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedArtist(null)
    setSongsData([])
  }

  useEffect(() => {
    if (artistContract) {
      fetchArtists()
    }
  }, [artistContract, address])

  function truncateText(text, maxLength) {
    if (!text) return ''
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }

  // Modal outside click handler
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isModalOpen && e.target.classList.contains('modal-overlay')) {
        closeModal()
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [isModalOpen])

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (e) => {
      if (isModalOpen && e.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleEscKey)
    return () => window.removeEventListener('keydown', handleEscKey)
  }, [isModalOpen])

  return (
    <div className='min-h-screen bg-gray-900 text-white pb-20'>
      {/* Header */}
      <div className='bg-gradient-to-r from-purple-900/30 to-gray-800 py-12 mb-8'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <h1 className='text-4xl font-bold text-white mb-2'>Artists</h1>
          <p className='text-gray-300'>
            Discover amazing musicians from around the world
          </p>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {loading ? (
          <div className='flex justify-center items-center py-20'>
            <div className='flex flex-col items-center'>
              <div className='w-16 h-16 border-4 border-t-purple-500 border-purple-200/20 rounded-full animate-spin'></div>
              <p className='mt-4 text-gray-400 text-lg'>Loading artists...</p>
            </div>
          </div>
        ) : artistsData.length === 0 ? (
          <div className='text-center py-16 max-w-xl mx-auto'>
            <div className='bg-gray-800/50 p-8 rounded-2xl border border-gray-700 shadow-lg'>
              <svg
                className='w-16 h-16 mx-auto text-gray-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='1.5'
                  d='M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
                />
              </svg>
              <h2 className='text-2xl font-bold mt-4 text-white'>
                No artists found
              </h2>
              <p className='text-gray-400 mt-2 mb-6'>
                Be the first to register as an artist and share your music with
                the world!
              </p>
              <button className='inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors'>
                <svg
                  className='w-5 h-5 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M12 6v6m0 0v6m0-6h6m-6 0H6'></path>
                </svg>
                Register as an Artist
              </button>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {artistsData.map((artist) => (
              <div
                key={artist.address}
                className='bg-gray-800/40 rounded-2xl overflow-hidden border border-gray-700 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20 hover:border-purple-500/50 group'>
                <div
                  className='h-48 overflow-hidden relative cursor-pointer'
                  onClick={() => openModal(artist)}>
                  <div className='absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-70 z-10'></div>
                  <img
                    src={
                      artist.image ||
                      'https://via.placeholder.com/400x300/1F2937/A78BFA?text=No+Image'
                    }
                    alt={artist.name}
                    className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src =
                        'https://via.placeholder.com/400x300/1F2937/A78BFA?text=No+Image'
                    }}
                  />
                  {artist.is_self && (
                    <div className='absolute top-3 left-3 bg-purple-600 text-xs font-medium text-white px-2 py-1 rounded-full z-20'>
                      Your Profile
                    </div>
                  )}
                </div>

                <div className='p-5'>
                  <div className='flex justify-between items-start mb-3'>
                    <h3
                      className='text-xl font-bold text-white truncate cursor-pointer hover:text-purple-400 transition-colors'
                      onClick={() => openModal(artist)}>
                      {artist.name || 'Unknown Artist'}
                    </h3>
                    {!artist.is_self &&
                      (artist.is_favorite ? (
                        <div className='flex items-center justify-center w-8 h-8 text-pink-500'>
                          <svg
                            className='w-5 h-5'
                            fill='currentColor'
                            viewBox='0 0 20 20'>
                            <path
                              fillRule='evenodd'
                              d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                              clipRule='evenodd'></path>
                          </svg>
                        </div>
                      ) : (
                        <button
                          disabled={favoriteLoading[artist.address]}
                          onClick={() => handleAddToFavorites(artist.address)}
                          className='flex items-center justify-center w-8 h-8 rounded-full transition-colors text-gray-400 hover:text-pink-500'>
                          {favoriteLoading[artist.address] ? (
                            <span className='w-5 h-5 border-2 border-t-current border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin'></span>
                          ) : (
                            <svg
                              className='w-5 h-5'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth='2'
                                d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'></path>
                            </svg>
                          )}
                        </button>
                      ))}
                  </div>

                  <div className='space-y-2 mb-4'>
                    <div className='flex items-center text-sm'>
                      <svg
                        className='w-4 h-4 text-purple-400 mr-2'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth='2'
                          d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'></path>
                      </svg>
                      <span className='text-gray-300'>
                        {artist.song_count} songs
                      </span>
                    </div>
                    <div className='flex items-center text-sm'>
                      <svg
                        className='w-4 h-4 text-purple-400 mr-2'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth='2'
                          d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'></path>
                      </svg>
                      <span className='text-gray-300'>
                        Last upload: {truncateText(artist.last_upload, 20)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => openModal(artist)}
                    className='w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center'>
                    <svg
                      className='w-5 h-5 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M9 5l7 7-7 7'></path>
                    </svg>
                    View Songs
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Songs Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div
              className='bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl'
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              {selectedArtist && (
                <>
                  <div className='relative h-48 md:h-64 bg-gradient-to-r from-purple-900/70 to-gray-800/70 flex items-center'>
                    <button
                      onClick={closeModal}
                      className='absolute top-4 right-4 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors'>
                      <svg
                        className='w-5 h-5'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth='2'
                          d='M6 18L18 6M6 6l12 12'></path>
                      </svg>
                    </button>

                    <div className='px-8 flex items-center'>
                      <div className='h-28 w-28 md:h-36 md:w-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-xl'>
                        <img
                          src={
                            selectedArtist.image ||
                            'https://via.placeholder.com/400x400/1F2937/A78BFA?text=No+Image'
                          }
                          alt={selectedArtist.name}
                          className='h-full w-full object-cover'
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src =
                              'https://via.placeholder.com/400x400/1F2937/A78BFA?text=No+Image'
                          }}
                        />
                      </div>
                      <div className='ml-6'>
                        <div className='text-sm text-purple-300 font-medium'>
                          Artist
                        </div>
                        <h2 className='text-3xl md:text-4xl font-bold text-white mt-1'>
                          {selectedArtist.name}
                        </h2>
                        <div className='flex items-center mt-2 text-gray-300 text-sm'>
                          <span>{selectedArtist.song_count} songs</span>
                          {!selectedArtist.is_self &&
                            (selectedArtist.is_favorite ? (
                              <div className='ml-4 flex items-center text-pink-500'>
                                <svg
                                  className='w-5 h-5 mr-1'
                                  fill='currentColor'
                                  viewBox='0 0 20 20'>
                                  <path
                                    fillRule='evenodd'
                                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                    clipRule='evenodd'></path>
                                </svg>
                                Added to favorites
                              </div>
                            ) : (
                              <button
                                disabled={
                                  favoriteLoading[selectedArtist.address]
                                }
                                onClick={() =>
                                  handleAddToFavorites(selectedArtist.address)
                                }
                                className='ml-4 flex items-center text-gray-400 hover:text-pink-500'>
                                {favoriteLoading[selectedArtist.address] ? (
                                  <span className='w-4 h-4 border-2 border-t-current border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mr-2'></span>
                                ) : (
                                  <svg
                                    className='w-5 h-5 mr-1'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'>
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth='2'
                                      d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'></path>
                                  </svg>
                                )}
                                Add to favorites
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='p-6'>
                    <h3 className='text-xl font-bold text-white mb-4'>Songs</h3>

                    {songLoading ? (
                      <div className='flex justify-center items-center py-12'>
                        <div className='flex flex-col items-center'>
                          <div className='w-10 h-10 border-3 border-t-purple-500 border-purple-200/20 rounded-full animate-spin'></div>
                          <p className='mt-3 text-gray-400'>Loading songs...</p>
                        </div>
                      </div>
                    ) : songError ? (
                      <div className='text-center py-8'>
                        <svg
                          className='w-12 h-12 mx-auto text-gray-600'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='1.5'
                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                          />
                        </svg>
                        <h3 className='mt-2 text-lg font-medium text-gray-300'>
                          Failed to load songs
                        </h3>
                        <p className='mt-1 text-sm text-gray-400'>
                          There was an error loading the artist's songs.
                        </p>
                      </div>
                    ) : songsData.length === 0 ? (
                      <div className='text-center py-8'>
                        <svg
                          className='w-12 h-12 mx-auto text-gray-600'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='1.5'
                            d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                          />
                        </svg>
                        <h3 className='mt-2 text-lg font-medium text-gray-300'>
                          No songs uploaded yet
                        </h3>
                        <p className='mt-1 text-sm text-gray-400'>
                          This artist hasn't uploaded any songs yet.
                        </p>
                      </div>
                    ) : (
                      <div className='max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar'>
                        <table className='w-full'>
                          <thead>
                            <tr className='text-left text-gray-400 border-b border-gray-800'>
                              <th className='pb-3 pl-3'>#</th>
                              <th className='pb-3'>Title</th>
                              <th className='pb-3'>Genre</th>
                              <th className='pb-3 text-right'>Likes</th>
                              <th className='pb-3 text-right'>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {songsData.map((song, index) => (
                              <tr
                                key={song.id}
                                className='border-b border-gray-800/50 hover:bg-gray-800/30 group transition-colors'>
                                <td className='py-3 pl-3 text-gray-400'>
                                  {index + 1}
                                </td>
                                <td className='py-3'>
                                  <div className='flex items-center'>
                                    <div className='h-10 w-10 mr-3 bg-gray-700 rounded overflow-hidden flex-shrink-0'>
                                      <img
                                        src={
                                          song.image ||
                                          'https://via.placeholder.com/40x40/1F2937/A78BFA?text=No+Image'
                                        }
                                        alt={song.name}
                                        className='h-full w-full object-cover'
                                        onError={(e) => {
                                          e.target.onerror = null
                                          e.target.src =
                                            'https://via.placeholder.com/40x40/1F2937/A78BFA?text=No+Image'
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <div className='text-white font-medium'>
                                        {song.name}
                                      </div>
                                      <div className='text-xs text-gray-400'>
                                        {new Date(
                                          song.release_date
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className='py-3'>
                                  <span className='bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded-full'>
                                    {song.genre}
                                  </span>
                                </td>
                                <td className='py-3 text-right text-gray-300'>
                                  {song.likes}
                                </td>
                                <td className='py-3'>
                                  <div className='flex items-center justify-end space-x-2'>
                                    <button
                                      className='p-2 text-gray-400 hover:text-white rounded-full transition-colors opacity-0 group-hover:opacity-100'
                                      title='Play song'>
                                      <svg
                                        className='w-5 h-5'
                                        fill='currentColor'
                                        viewBox='0 0 20 20'>
                                        <path
                                          fillRule='evenodd'
                                          d='M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z'
                                          clipRule='evenodd'
                                        />
                                      </svg>
                                    </button>
                                    {song.liked ? (
                                      <div
                                        className='p-2 text-red-500 rounded-full'
                                        title="You've liked this song">
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
                                      </div>
                                    ) : (
                                      <button
                                        disabled={likingStates[song.id]}
                                        onClick={() => handleLike(song.id)}
                                        className='p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors'
                                        title='Like this song'>
                                        {likingStates[song.id] ? (
                                          <span className='w-5 h-5 border-2 border-t-current border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin'></span>
                                        ) : (
                                          <svg
                                            className='w-5 h-5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'>
                                            <path
                                              strokeLinecap='round'
                                              strokeLinejoin='round'
                                              strokeWidth='2'
                                              d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'></path>
                                          </svg>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  )
}

export default Page
