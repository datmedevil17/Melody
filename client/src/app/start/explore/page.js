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
    <div className='flex justify-center items-center py-20'>
      <div className='flex flex-col items-center'>
        <div className='w-12 h-12 border-4 border-t-[#90EE90] border-[#004d00]/30 rounded-full animate-spin'></div>
        <p className='mt-4 text-[#90EE90]/70 text-sm'>Loading content...</p>
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
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
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

      <div className='relative z-10 py-10 px-4 sm:px-6'>
        <div className='max-w-7xl mx-auto'>
          <h1
            className='text-4xl font-bold mb-8 text-center text-[#90EE90]'
            style={{ fontFamily: "'Audiowide', cursive" }}>
            Explore Music
          </h1>

          {/* Featured Artists Section */}
          <section className='mb-12'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-[#90EE90]'>
                Featured Artists
              </h2>
              <button className='text-[#90EE90]/70 hover:text-[#90EE90] transition-colors'>
                View All
              </button>
            </div>

            {artistsLoading ? (
              <LoadingSection />
            ) : artists.length === 0 ? (
              <div className='text-center py-12 text-[#90EE90]/70'>
                No artists found at the moment
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
                {artists.map((artist) => (
                  <motion.div
                    key={artist.id}
                    className='bg-[#001a00]/50 rounded-xl overflow-hidden border border-[#004d00] transition-all hover:shadow-lg hover:shadow-[#90EE90]/20'
                    onHoverStart={() => setHoveredArtist(artist.id)}
                    onHoverEnd={() => setHoveredArtist(null)}
                    whileHover={{ y: -5 }}>
                    <div className='aspect-square relative'>
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src =
                            'https://via.placeholder.com/400x400/002200/90EE90?text=Artist'
                        }}
                      />
                      {hoveredArtist === artist.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                          <button className='bg-[#90EE90] text-black px-4 py-2 rounded-full font-medium hover:bg-[#90EE90]/90 transition-colors'>
                            View Profile
                          </button>
                        </motion.div>
                      )}
                    </div>
                    <div className='p-4'>
                      <h3 className='font-bold text-lg text-[#90EE90] mb-1'>
                        {artist.name || 'Unknown Artist'}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Recently Added Section */}
          <section className='mb-12'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-[#90EE90]'>
                Recently Added
              </h2>
              <button className='text-[#90EE90]/70 hover:text-[#90EE90] transition-colors'>
                View All
              </button>
            </div>

            {recentSongsLoading ? (
              <LoadingSection />
            ) : recentSongs.length === 0 ? (
              <div className='text-center py-12 text-[#90EE90]/70'>
                No recent songs found
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
                {recentSongs.map((song) => (
                  <motion.div
                    key={song.id}
                    className='bg-[#001a00]/50 rounded-xl overflow-hidden border border-[#004d00] transition-all hover:shadow-lg hover:shadow-[#90EE90]/20'
                    onHoverStart={() => setHoveredSong(song.id)}
                    onHoverEnd={() => setHoveredSong(null)}
                    whileHover={{ y: -5 }}>
                    <div className='aspect-square relative'>
                      <img
                        src={song.image}
                        alt={song.title}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src =
                            'https://via.placeholder.com/400x400/002200/90EE90?text=Song'
                        }}
                      />
                      {/* Playing animation overlay */}
                      {currentlyPlaying === song.id && (
                        <div className='absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none'>
                          <div className='playing-animation flex items-end h-8 space-x-1'>
                            <motion.span
                              className='w-1.5 bg-[#90EE90] rounded-sm'
                              animate={{ height: ['40%', '90%', '40%'] }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                            />
                            <motion.span
                              className='w-1.5 bg-[#90EE90] rounded-sm'
                              animate={{ height: ['20%', '100%', '20%'] }}
                              transition={{
                                duration: 0.9,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 0.2,
                              }}
                            />
                            <motion.span
                              className='w-1.5 bg-[#90EE90] rounded-sm'
                              animate={{ height: ['60%', '80%', '60%'] }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 0.1,
                              }}
                            />
                            <motion.span
                              className='w-1.5 bg-[#90EE90] rounded-sm'
                              animate={{ height: ['30%', '70%', '30%'] }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 0.3,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {hoveredSong === song.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                          <button
                            className='bg-[#90EE90] text-black px-4 py-2 rounded-full font-medium hover:bg-[#90EE90]/90 transition-colors flex items-center gap-2'
                            onClick={() =>
                              togglePlayPause(song.url, song.id, {
                                title: song.title,
                                artist: song.artist,
                                genre: song.genre,
                                image: song.image,
                              })
                            }>
                            {currentlyPlaying === song.id && isPlaying ? (
                              <>
                                <svg
                                  className='w-5 h-5'
                                  viewBox='0 0 24 24'
                                  fill='currentColor'>
                                  <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' />
                                </svg>
                                Pause
                              </>
                            ) : (
                              <>
                                <svg
                                  className='w-5 h-5'
                                  viewBox='0 0 24 24'
                                  fill='currentColor'>
                                  <path d='M8 5v14l11-7z' />
                                </svg>
                                Play Now
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </div>
                    <div className='p-4'>
                      <div className='flex items-center gap-2'>
                        <h3 className='font-bold text-lg text-[#90EE90] mb-1 truncate'>
                          {song.title || 'Untitled'}
                        </h3>

                        {/* Animated icon for currently playing */}
                        {currentlyPlaying === song.id && (
                          <motion.div
                            className='flex items-center space-x-0.5 h-4'
                            initial={{ opacity: 0.7 }}
                            animate={{ opacity: 1 }}>
                            <motion.span
                              className='w-1 h-3 bg-[#90EE90] rounded-sm'
                              animate={{ height: ['30%', '100%', '30%'] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                            />
                            <motion.span
                              className='w-1 h-3 bg-[#90EE90] rounded-sm'
                              animate={{ height: ['100%', '30%', '100%'] }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: 0.2,
                              }}
                            />
                            <motion.span
                              className='w-1 h-3 bg-[#90EE90] rounded-sm'
                              animate={{ height: ['60%', '90%', '60%'] }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: 0.4,
                              }}
                            />
                          </motion.div>
                        )}
                      </div>
                      <p className='text-sm text-[#90EE90]/70 truncate'>
                        {song.artist || 'Unknown Artist'}
                      </p>
                      <div className='flex justify-between items-center mt-2'>
                        <div className='flex items-center text-sm text-[#90EE90]/70'>
                          <svg
                            className='w-4 h-4 mr-1'
                            fill='currentColor'
                            viewBox='0 0 20 20'>
                            <path
                              fillRule='evenodd'
                              d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
                              clipRule='evenodd'
                            />
                          </svg>
                          {formatLikes(song.likes)}
                        </div>
                        <span className='text-xs bg-[#004d00]/30 text-[#90EE90] px-2 py-1 rounded-full'>
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
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-[#90EE90]'>
                Today's Hitlist
              </h2>
              <button className='text-[#90EE90]/70 hover:text-[#90EE90] transition-colors'>
                View All
              </button>
            </div>

            {hitlistSongsLoading ? (
              <LoadingSection />
            ) : hitlistSongs.length === 0 ? (
              <div className='text-center py-12 text-[#90EE90]/70 bg-[#001a00]/30 rounded-xl border border-[#004d00]'>
                No songs in the hitlist yet
              </div>
            ) : (
              <div className='bg-[#001a00]/30 rounded-xl border border-[#004d00] overflow-hidden'>
                {hitlistSongs.map((song, index) => (
                  <motion.div
                    key={song.id}
                    className='flex items-center p-4 hover:bg-[#001a00]/50 transition-colors group'
                    whileHover={{ x: 10 }}>
                    <div className='w-12 text-[#90EE90]/50 font-bold'>
                      {index + 1}
                    </div>
                    <div className='w-16 h-16 rounded-lg overflow-hidden mr-4 relative'>
                      <img
                        src={song.image}
                        alt={song.title}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src =
                            'https://via.placeholder.com/400x400/002200/90EE90?text=Song'
                        }}
                      />

                      {/* Playing animation overlay for hitlist */}
                      {currentlyPlaying === song.id && (
                        <div className='absolute inset-0 flex items-center justify-center bg-black/40'>
                          <motion.div
                            className='flex items-center justify-center'
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}>
                            <svg
                              className='w-8 h-8 text-[#90EE90]'
                              viewBox='0 0 24 24'
                              fill='currentColor'>
                              <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' />
                            </svg>
                          </motion.div>
                        </div>
                      )}
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <h3 className='font-bold text-[#90EE90] group-hover:text-[#90EE90]/90 transition-colors'>
                          {song.title || 'Untitled'}
                        </h3>

                        {/* Animated soundwave for currently playing in list view */}
                        {currentlyPlaying === song.id && (
                          <div className='flex items-center h-3 space-x-0.5 ml-2'>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <motion.span
                                key={i}
                                className='w-0.5 bg-[#90EE90] rounded-full'
                                animate={{
                                  height: [
                                    `${Math.floor(Math.random() * 40) + 30}%`,
                                    `${Math.floor(Math.random() * 70) + 70}%`,
                                    `${Math.floor(Math.random() * 40) + 30}%`,
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
                        )}
                      </div>
                      <p className='text-sm text-[#90EE90]/70'>
                        {song.artist || 'Unknown Artist'}
                      </p>
                    </div>
                    <div className='flex items-center gap-6'>
                      <div className='flex items-center text-sm text-[#90EE90]/70'>
                        <svg
                          className='w-4 h-4 mr-1'
                          fill='currentColor'
                          viewBox='0 0 20 20'>
                          <path
                            fillRule='evenodd'
                            d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
                            clipRule='evenodd'
                          />
                        </svg>
                        {formatLikes(song.likes)}
                      </div>
                      <button
                        className={`p-2 transition-all ${
                          currentlyPlaying === song.id
                            ? 'text-[#90EE90] opacity-100'
                            : 'text-[#90EE90]/70 hover:text-[#90EE90] opacity-0 group-hover:opacity-100'
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
                          <svg
                            className='w-5 h-5'
                            fill='currentColor'
                            viewBox='0 0 20 20'>
                            <path
                              fillRule='evenodd'
                              d='M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z'
                              clipRule='evenodd'
                            />
                          </svg>
                        ) : (
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
                        )}
                      </button>
                    </div>
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
