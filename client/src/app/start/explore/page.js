'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'

// Dummy data
const dummyArtists = [
  {
    id: 1,
    name: 'Luna Nova',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
    genre: 'Electronic',
    followers: '2.5M'
  },
  {
    id: 2,
    name: 'The Midnight Echo',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    genre: 'Rock',
    followers: '1.8M'
  },
  {
    id: 3,
    name: 'Aurora Beats',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&h=500&fit=crop',
    genre: 'Pop',
    followers: '3.2M'
  },
  {
    id: 4,
    name: 'Neon Dreams',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&h=500&fit=crop',
    genre: 'Synthwave',
    followers: '1.2M'
  },
  {
    id: 5,
    name: 'Cosmic Waves',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    genre: 'Ambient',
    followers: '950K'
  }
]

const recentSongs = [
  {
    id: 1,
    title: 'Midnight Serenade',
    artist: 'Luna Nova',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
    duration: '3:45',
    genre: 'Electronic'
  },
  {
    id: 2,
    title: 'Echoes of Tomorrow',
    artist: 'The Midnight Echo',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    duration: '4:20',
    genre: 'Rock'
  },
  {
    id: 3,
    title: 'Starlight Dreams',
    artist: 'Aurora Beats',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&h=500&fit=crop',
    duration: '3:15',
    genre: 'Pop'
  },
  {
    id: 4,
    title: 'Neon Nights',
    artist: 'Neon Dreams',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&h=500&fit=crop',
    duration: '4:05',
    genre: 'Synthwave'
  },
  {
    id: 5,
    title: 'Cosmic Journey',
    artist: 'Cosmic Waves',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    duration: '5:30',
    genre: 'Ambient'
  }
]

const hitlistSongs = [
  {
    id: 1,
    title: 'Summer Vibes',
    artist: 'Luna Nova',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
    duration: '3:30',
    plays: '2.5M'
  },
  {
    id: 2,
    title: 'Electric Dreams',
    artist: 'The Midnight Echo',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    duration: '4:15',
    plays: '1.8M'
  },
  {
    id: 3,
    title: 'Dancing in the Stars',
    artist: 'Aurora Beats',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&h=500&fit=crop',
    duration: '3:45',
    plays: '3.2M'
  },
  {
    id: 4,
    title: 'Neon City Lights',
    artist: 'Neon Dreams',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&h=500&fit=crop',
    duration: '4:00',
    plays: '1.2M'
  },
  {
    id: 5,
    title: 'Cosmic Love',
    artist: 'Cosmic Waves',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop',
    duration: '5:15',
    plays: '950K'
  }
]

const Explore = () => {
  const [hoveredArtist, setHoveredArtist] = useState(null)
  const [hoveredSong, setHoveredSong] = useState(null)

  return (
    <div className='min-h-screen bg-black text-white'>
      {/* Background gradient */}
      <div className="fixed bg-gradient-to-br from-[#002200] via-black to-[#001a00] z-0" />

      {/* Animated music elements background */}
      <div className="fixed inset-0 top-12 z-0 overflow-hidden">
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
              repeatType: "reverse",
            }}
            className="absolute text-[#90EE90]/30"
            style={{
              fontSize: `${Math.random() * 40 + 20}px`,
              filter: "blur(0.5px)",
            }}
          >
            {["♪", "♫", "♬", "♩", "♭", "♮"][Math.floor(Math.random() * 6)]}
          </motion.div>
        ))}
      </div>

      <div className='relative z-10 py-10 px-4 sm:px-6'>
        <div className='max-w-7xl mx-auto'>
          <h1 className='text-4xl font-bold mb-8 text-center text-[#90EE90]' style={{ fontFamily: "'Audiowide', cursive" }}>
            Explore Music
          </h1>

          {/* Featured Artists Section */}
          <section className='mb-12'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-[#90EE90]'>Featured Artists</h2>
              <button className='text-[#90EE90]/70 hover:text-[#90EE90] transition-colors'>
                View All
              </button>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
              {dummyArtists.map((artist) => (
                <motion.div
                  key={artist.id}
                  className='bg-[#001a00]/50 rounded-xl overflow-hidden border border-[#004d00] transition-all hover:shadow-lg hover:shadow-[#90EE90]/20'
                  onHoverStart={() => setHoveredArtist(artist.id)}
                  onHoverEnd={() => setHoveredArtist(null)}
                  whileHover={{ y: -5 }}
                >
                  <div className='aspect-square relative'>
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className='w-full h-full object-cover'
                    />
                    {hoveredArtist === artist.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className='absolute inset-0 bg-black/50 flex items-center justify-center'
                      >
                        <button className='bg-[#90EE90] text-black px-4 py-2 rounded-full font-medium hover:bg-[#90EE90]/90 transition-colors'>
                          View Profile
                        </button>
                      </motion.div>
                    )}
                  </div>
                  <div className='p-4'>
                    <h3 className='font-bold text-lg text-[#90EE90] mb-1'>{artist.name}</h3>
                    <p className='text-sm text-[#90EE90]/70'>{artist.genre}</p>
                    <p className='text-sm text-[#90EE90]/50 mt-1'>{artist.followers} followers</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Recently Added Section */}
          <section className='mb-12'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-[#90EE90]'>Recently Added</h2>
              <button className='text-[#90EE90]/70 hover:text-[#90EE90] transition-colors'>
                View All
              </button>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
              {recentSongs.map((song) => (
                <motion.div
                  key={song.id}
                  className='bg-[#001a00]/50 rounded-xl overflow-hidden border border-[#004d00] transition-all hover:shadow-lg hover:shadow-[#90EE90]/20'
                  onHoverStart={() => setHoveredSong(song.id)}
                  onHoverEnd={() => setHoveredSong(null)}
                  whileHover={{ y: -5 }}
                >
                  <div className='aspect-square relative'>
                    <img
                      src={song.image}
                      alt={song.title}
                      className='w-full h-full object-cover'
                    />
                    {hoveredSong === song.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className='absolute inset-0 bg-black/50 flex items-center justify-center'
                      >
                        <button className='bg-[#90EE90] text-black px-4 py-2 rounded-full font-medium hover:bg-[#90EE90]/90 transition-colors'>
                          Play Now
                        </button>
                      </motion.div>
                    )}
                  </div>
                  <div className='p-4'>
                    <h3 className='font-bold text-lg text-[#90EE90] mb-1 truncate'>{song.title}</h3>
                    <p className='text-sm text-[#90EE90]/70 truncate'>{song.artist}</p>
                    <div className='flex justify-between items-center mt-2'>
                      <span className='text-xs text-[#90EE90]/50'>{song.duration}</span>
                      <span className='text-xs bg-[#004d00]/30 text-[#90EE90] px-2 py-1 rounded-full'>
                        {song.genre}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Today's Hitlist Section */}
          <section>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-[#90EE90]'>Today's Hitlist</h2>
              <button className='text-[#90EE90]/70 hover:text-[#90EE90] transition-colors'>
                View All
              </button>
            </div>
            <div className='bg-[#001a00]/30 rounded-xl border border-[#004d00] overflow-hidden'>
              {hitlistSongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  className='flex items-center p-4 hover:bg-[#001a00]/50 transition-colors group'
                  whileHover={{ x: 10 }}
                >
                  <div className='w-12 text-[#90EE90]/50 font-bold'>{index + 1}</div>
                  <div className='w-16 h-16 rounded-lg overflow-hidden mr-4'>
                    <img
                      src={song.image}
                      alt={song.title}
                      className='w-full h-full object-cover'
                    />
                  </div>
                  <div className='flex-1'>
                    <h3 className='font-bold text-[#90EE90] group-hover:text-[#90EE90]/90 transition-colors'>
                      {song.title}
                    </h3>
                    <p className='text-sm text-[#90EE90]/70'>{song.artist}</p>
                  </div>
                  <div className='flex items-center gap-6'>
                    <span className='text-sm text-[#90EE90]/50'>{song.plays} plays</span>
                    <span className='text-sm text-[#90EE90]/50'>{song.duration}</span>
                    <button className='p-2 text-[#90EE90]/70 hover:text-[#90EE90] transition-colors opacity-0 group-hover:opacity-100'>
                      <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z' clipRule='evenodd' />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Explore
