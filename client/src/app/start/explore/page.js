'use client'
import { motion } from 'framer-motion'
import { useContext, useEffect, useState } from 'react'
import {
  artistContract,
  decimalToAscii,
  songContract,
} from '../../../contract/contract'
import { UserContext } from '../../../context/userContextProvider'

const Explore = () => {
  const [hoveredArtist, setHoveredArtist] = useState(null)
  const [hoveredSong, setHoveredSong] = useState(null)
  const [windowDimensions, setWindowDimensions] = useState({ width: 1200, height: 800 })

    // Handle window dimensions safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateDimensions = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }
      
      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  // Add state for fetched data
  const [artists, setArtists] = useState([])
  const [recentSongs, setRecentSongs] = useState([])
  const [hitlistSongs, setHitlistSongs] = useState([])
  const { isPlaying, currentlyPlaying, togglePlayPause } =
    useContext(UserContext)
  // Add loading states
  const [artistsLoading, setArtistsLoading] = useState(true)
  const [recentSongsLoading, setRecentSongsLoading] = useState(true)
  const [hitlistSongsLoading, setHitlistSongsLoading] = useState(true)

  const fetchInfo = async (j) => {
    try {
      const i = parseInt(j)
      const song = await artistContract.call('get_song_details', [i])
      const likes = await songContract.call('get_likes_count', [i])
      const artist = await artistContract.call('get_song_creators', [i])
      const updartist = Array.isArray(artist) ? artist[0] : artist
      const artistInfo = await artistContract.call('get_artist_profile', [
        updartist,
      ])

      return {
        id: i,
        title: decimalToAscii(song.metadata.title),
        artist: decimalToAscii(artistInfo.name),
        genre: decimalToAscii(song.metadata.genre),
        image: `https://${song.metadata.cover_image}`,
        likes: likes,
        url: `https://${song.uri}`,
      }
    } catch (e) {
      console.error('Error fetching info:', e)
      return null
    }
  }

  // Fetch all songs for hitlist (most liked)
  const fetchSongs = async () => {
    setHitlistSongsLoading(true)
    try {
      const total = await artistContract.call('get_song_count', [])
      console.log('Total songs fetched:', total)
      const songs = []
      for (let i = 1; i <= Number(total); i++) {
        const song = await fetchInfo(i)
        if (song) {
          songs.push(song)
        }
      }
      console.log('Fetched songs:', songs)
      // Sort by likes (highest first) to get the "hitlist"
      const sortedSongs = [...songs]
        .sort((a, b) => Number(b.likes) - Number(a.likes))
        .slice(0, 5)
      setHitlistSongs(sortedSongs)
    } catch (e) {
      console.error('Error fetching songs:', e)
    } finally {
      setHitlistSongsLoading(false)
    }
  }

  // Fetch recent songs
  const fetchRecentSongs = async () => {
    setRecentSongsLoading(true)
    try {
      const total = await artistContract.call('get_recent_songs', [5])
      console.log('Total recent songs fetched:', total)
      const songsArray = []
      for (let i = 0; i < total.length; i++) {
        const song = await fetchInfo(total[i])
        if (song) {
          songsArray.push(song)
        }
      }
      console.log('Fetched recent songs:', songsArray)
      setRecentSongs(songsArray)
    } catch (e) {
      console.error('Error fetching recent songs:', e)
    } finally {
      setRecentSongsLoading(false)
    }
  }

  // Fetch artists
  const fetchArtists = async () => {
    setArtistsLoading(true)
    try {
      const total = await artistContract.call('get_artists_page', [0, 5])
      console.log('Total artists fetched:', total)
      const artistsArray = []
      for (let i of total) {
        const artistData = await artistContract.call('get_artist_profile', [i])
        artistsArray.push({
          id: i,
          name: decimalToAscii(artistData.name),
          image: `https://${artistData.artist_profile}`,
        })
      }
      console.log('Fetched artists:', artistsArray)
      setArtists(artistsArray)
    } catch (e) {
      console.error('Error fetching artists:', e)
    } finally {
      setArtistsLoading(false)
    }
  }

  useEffect(() => {
    fetchSongs()
    fetchRecentSongs()
    fetchArtists()
  }, [])

    const MusicBars = ({ size = 'sm', className = '' }) => (
    <div className={`flex items-end space-x-0.5 ${className}`}>
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={`bg-emerald-400 rounded-full ${
            size === 'lg' ? 'w-1 h-6' : 'w-0.5 h-3'
          }`}
          animate={{
            height: [
              size === 'lg' ? '12px' : '6px',
              size === 'lg' ? '24px' : '12px',
              size === 'lg' ? '12px' : '6px',
            ],
          }}
          transition={{
            duration: 0.6 + i * 0.1,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      ))}
    </div>
  )
  

  

  // Format likes count for display
  const formatLikes = (count) => {
    if (!count) return '0'
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  // Loading component for consistent loader display
   const LoadingSection = () => (
    <div className='flex justify-center items-center py-16'>
      <div className='flex flex-col items-center'>
        <div className='relative'>
          <div className='w-8 h-8 border-2 border-emerald-400/30 rounded-full'></div>
          <div className='absolute top-0 left-0 w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin'></div>
        </div>
        <p className='mt-3 text-emerald-400/70 text-sm font-medium'>Loading...</p>
      </div>
    </div>
  )




  return (
    <div className='min-h-screen bg-black text-white'>
      {/* Background gradient */}
      <div className='fixed bg-gradient-to-br from-[#002200] via-black to-[#001a00] z-0' />

      {/* Animated music elements background */}
      <div className='fixed inset-0 top-12 z-0 overflow-hidden'>
        {/* Music notes */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={`note-${i}`}
            initial={{
              opacity: 0,
              x: Math.random() * windowDimensions.innerWidth,
              y: Math.random() * windowDimensions.innerHeight,
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              x: [
                Math.random() * windowDimensions.innerWidth,
                Math.random() * windowDimensions.innerWidth,
                Math.random() * windowDimensions.innerWidth,
              ],
              y: [
                Math.random() * windowDimensions.innerHeight,
                Math.random() * windowDimensions.innerHeight,
                Math.random() * windowDimensions.innerHeight,
              ],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'reverse',
            }}
            className='absolute text-[#90EE90]/30'
            style={{
              fontSize: `${Math.random() * 40 + 20}px`,
              filter: 'blur(0.5px)',
            }}>
            {['♪', '♫', '♬', '♩', '♭', '♮'][Math.floor(Math.random() * 6)]}
          </motion.div>
        ))}
      </div>

      <div className='relative '>
        {/* Header */}
        <div className='sticky top-0 bg-black/80 backdrop-blur-xl border-b border-emerald-900/30 z-20'>
          <div className='max-w-7xl mx-auto px-6 py-4'>
            <h1 className='text-3xl font-bold text-white tracking-tight'>
              Explore
            </h1>
          </div>
        </div>

        <div className='max-w-7xl mx-auto px-6 py-8 space-y-12'>
          {/* Featured Artists Section */}
          <section>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-white'>Featured Artists</h2>
              <button className='text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium'>
                See All
              </button>
            </div>

            {artistsLoading ? (
              <LoadingSection />
            ) : artists.length === 0 ? (
              <div className='text-center py-16 text-gray-500'>
                <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center'>
                  <svg className='w-8 h-8' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z'/>
                    <path d='M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z'/>
                  </svg>
                </div>
                <p>No artists found</p>
              </div>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
                {artists.map((artist) => (
                  <motion.div
                    key={artist.id}
                    className='group cursor-pointer'
                    onHoverStart={() => setHoveredArtist(artist.id)}
                    onHoverEnd={() => setHoveredArtist(null)}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}>
                    <div className='relative mb-3'>
                      <div className='aspect-square rounded-full overflow-hidden bg-gray-800 shadow-2xl'>
                        <img
                          src={artist.image}
                          alt={artist.name}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = 'https://via.placeholder.com/200x200/1f2937/10b981?text=Artist'
                          }}
                        />
                      </div>
                      {hoveredArtist === artist.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className='absolute inset-0 flex items-center justify-center bg-black/60 rounded-full'>
                          <button className='bg-emerald-400 hover:bg-emerald-300 text-black px-4 py-2 rounded-full font-semibold text-sm transition-colors shadow-lg'>
                            View
                          </button>
                        </motion.div>
                      )}
                    </div>
                    <div className='text-center'>
                      <h3 className='font-semibold text-white group-hover:text-emerald-400 transition-colors truncate'>
                        {artist.name || 'Unknown Artist'}
                      </h3>
                      <p className='text-sm text-gray-400 mt-1'>Artist</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Recently Added Section */}
          <section>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-white'>Recently Added</h2>
              <button className='text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium'>
                See All
              </button>
            </div>

            {recentSongsLoading ? (
              <LoadingSection />
            ) : recentSongs.length === 0 ? (
              <div className='text-center py-16 text-gray-500'>
                <div className='w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-800 flex items-center justify-center'>
                  <svg className='w-8 h-8' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/>
                  </svg>
                </div>
                <p>No recent songs found</p>
              </div>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
                {recentSongs.map((song) => (
                  <motion.div
                    key={song.id}
                    className='group cursor-pointer'
                    onHoverStart={() => setHoveredSong(song.id)}
                    onHoverEnd={() => setHoveredSong(null)}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}>
                    <div className='relative mb-3'>
                      <div className='aspect-square rounded-2xl overflow-hidden bg-gray-800 shadow-2xl'>
                        <img
                          src={song.image}
                          alt={song.title}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = 'https://via.placeholder.com/200x200/1f2937/10b981?text=Song'
                          }}
                        />
                      </div>
                      
                      {/* Playing indicator overlay */}
                      {currentlyPlaying === song.id && (
                        <div className='absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl'>
                          <MusicBars size="lg" />
                        </div>
                      )}

                      {/* Hover play button */}
                      {hoveredSong === song.id && currentlyPlaying !== song.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className='absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl'>
                          <button
                            className='bg-emerald-400 hover:bg-emerald-300 text-black p-3 rounded-full shadow-lg transition-colors'
                            onClick={() =>
                              togglePlayPause(song.url, song.id, {
                                title: song.title,
                                artist: song.artist,
                                genre: song.genre,
                                image: song.image,
                              })
                            }>
                            <svg className='w-6 h-6' viewBox='0 0 24 24' fill='currentColor'>
                              <path d='M8 5v14l11-7z' />
                            </svg>
                          </button>
                        </motion.div>
                      )}

                      {/* Pause button for currently playing */}
                      {hoveredSong === song.id && currentlyPlaying === song.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className='absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl'>
                          <button
                            className='bg-emerald-400 hover:bg-emerald-300 text-black p-3 rounded-full shadow-lg transition-colors'
                            onClick={() =>
                              togglePlayPause(song.url, song.id, {
                                title: song.title,
                                artist: song.artist,
                                genre: song.genre,
                                image: song.image,
                              })
                            }>
                            <svg className='w-6 h-6' viewBox='0 0 24 24' fill='currentColor'>
                              <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' />
                            </svg>
                          </button>
                        </motion.div>
                      )}
                    </div>
                    
                    <div>
                      <div className='flex items-center gap-2 mb-1'>
                        <h3 className='font-semibold text-white group-hover:text-emerald-400 transition-colors truncate flex-1'>
                          {song.title || 'Untitled'}
                        </h3>
                        {currentlyPlaying === song.id && (
                          <MusicBars />
                        )}
                      </div>
                      <p className='text-sm text-gray-400 truncate mb-2'>
                        {song.artist || 'Unknown Artist'}
                      </p>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center text-xs text-gray-500'>
                          <svg className='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z' clipRule='evenodd' />
                          </svg>
                          {formatLikes(song.likes)}
                        </div>
                        <span className='text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full'>
                          {song.genre || 'Other'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Today's Hitlist Section */}
          <section>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-white'>{`Today's Hitlist`}</h2>
              <button className='text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium'>
                See All
              </button>
            </div>

            {hitlistSongsLoading ? (
              <LoadingSection />
            ) : hitlistSongs.length === 0 ? (
              <div className='text-center py-16 text-gray-500 bg-gray-900/30 rounded-3xl border border-gray-800'>
                <div className='w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-800 flex items-center justify-center'>
                  <svg className='w-8 h-8' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/>
                  </svg>
                </div>
                <p>No songs in the hitlist yet</p>
              </div>
            ) : (
              <div className='bg-gray-900/40 backdrop-blur-sm rounded-3xl border border-gray-800 overflow-hidden'>
                {hitlistSongs.map((song, index) => (
                  <motion.div
                    key={song.id}
                    className='flex items-center p-4 hover:bg-gray-800/50 transition-all duration-200 group border-b border-gray-800/50 last:border-b-0'
                    whileHover={{ x: 4 }}>
                    
                    {/* Rank Number */}
                    <div className='w-12 flex items-center justify-center'>
                      {currentlyPlaying === song.id ? (
                        <MusicBars />
                      ) : (
                        <span className='text-2xl font-bold text-emerald-400'>
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Album Art */}
                    <div className='w-14 h-14 rounded-xl overflow-hidden mr-4 relative bg-gray-800 flex-shrink-0'>
                      <img
                        src={song.image}
                        alt={song.title}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = 'https://via.placeholder.com/56x56/1f2937/10b981?text=♪'
                        }}
                      />
                      {currentlyPlaying === song.id && (
                        <div className='absolute inset-0 bg-black/40 flex items-center justify-center'>
                          <div className='w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center'>
                            <div className='w-2 h-2 bg-black rounded-full'></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Song Info */}
                    <div className='flex-1 min-w-0 mr-4'>
                      <h3 className='font-semibold text-white group-hover:text-emerald-400 transition-colors truncate'>
                        {song.title || 'Untitled'}
                      </h3>
                      <p className='text-sm text-gray-400 truncate'>
                        {song.artist || 'Unknown Artist'}
                      </p>
                    </div>

                    {/* Like Count */}
                    <div className='flex items-center text-sm text-gray-400 mr-6'>
                      <svg className='w-4 h-4 mr-2' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z' clipRule='evenodd' />
                      </svg>
                      {formatLikes(song.likes)}
                    </div>

                    {/* Play Button */}
                    <button
                      className={`p-2 rounded-full transition-all duration-200 ${
                        currentlyPlaying === song.id
                          ? 'text-emerald-400 bg-emerald-400/10'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700 opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={() =>
                        togglePlayPause(song.url, song.id, {
                          title: song.title,
                          artist: song.artist,
                          genre: song.genre,
                          image: song.image,
                        })
                      }>
                      {currentlyPlaying === song.id && isPlaying ? (
                        <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
                          <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' />
                        </svg>
                      ) : (
                        <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
                          <path d='M8 5v14l11-7z' />
                        </svg>
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default Explore
