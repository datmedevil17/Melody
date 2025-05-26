'use client'
import { artistContract, decimalToAscii } from '@/contract/contract'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Play,
  ChevronRight,
  Disc,
  Zap,
  Lock,
  Share2,
  Music,
} from 'lucide-react'
// import { button } from "@/components/ui/button"
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function HomePage2() {
  const { scrollYProgress } = useScroll()

  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])
  const headerScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.9])
  const [windowDimensions, setWindowDimensions] = useState({
    width: 1200,
    height: 800,
  })
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true)
      try {
        console.log('Fetching artists...')
        const total = await artistContract.call('get_artists_page', [0, 4])
        const artistsArray = []
        console.log('Total artists:', total)
        for (let i of total) {
          const artistData = await artistContract.call('get_artist_profile', [
            i,
          ])
          artistsArray.push({
            id: i,
            name: decimalToAscii(artistData.name),
            image: `https://${artistData.artist_profile}`,
          })
        }
        setArtists(artistsArray)
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    }
    if (typeof window !== 'undefined') {
      const updateDimensions = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }

      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      fetchArtists()
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  return (
    <div className='min-h-screen bg-black text-white overflow-hidden'>
      {/* Background gradient */}
      <div className='fixed bg-gradient-to-br from-[#002200] via-black to-[#001a00] z-0' />

      {/* Animated music elements background */}
      <div className='fixed inset-0 top-12 z-0 overflow-hidden'>
        {/* Music notes */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={`note-${i}`}
            initial={{
              opacity: 0,
              x: Math.random() * windowDimensions.width,
              y: Math.random() * windowDimensions.height,
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              x: [
                Math.random() * windowDimensions.width,
                Math.random() * windowDimensions.width,
                Math.random() * windowDimensions.width,
              ],
              y: [
                Math.random() * windowDimensions.height,
                Math.random() * windowDimensions.height,
                Math.random() * windowDimensions.height,
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

        {/* Vinyl records */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`vinyl-${i}`}
            initial={{
              opacity: 0,
              scale: 0,
              x: Math.random() * windowDimensions.width,
              y: Math.random() * windowDimensions.height,
            }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [0.5, 0.7, 0.5],
              x: [
                Math.random() * windowDimensions.width,
                Math.random() * windowDimensions.width,
                Math.random() * windowDimensions.width,
              ],
              y: [
                Math.random() * windowDimensions.height,
                Math.random() * windowDimensions.height,
                Math.random() * windowDimensions.height,
              ],
              rotate: [0, 360, 720],
            }}
            transition={{
              duration: Math.random() * 30 + 20,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'reverse',
            }}
            className='absolute rounded-full border-8 border-[#004d00]/20'
            style={{
              width: `${Math.random() * 100 + 80}px`,
              height: `${Math.random() * 100 + 80}px`,
              background:
                'radial-gradient(circle, rgba(0,77,0,0.3) 0%, rgba(0,0,0,0) 70%)',
            }}>
            <div className='absolute inset-0 m-auto w-4 h-4 rounded-full bg-[#90EE90]/30' />
          </motion.div>
        ))}

        {/* Equalizer bars */}
        <div className='absolute bottom-0 left-0 right-0 h-40 flex items-end justify-around opacity-20'>
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`eq-${i}`}
              initial={{ height: 10 }}
              animate={{
                height: [
                  Math.random() * 30 + 10,
                  Math.random() * 100 + 20,
                  Math.random() * 30 + 10,
                ],
              }}
              transition={{
                duration: Math.random() * 2 + 1,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'reverse',
              }}
              className='w-2 md:w-3 bg-gradient-to-t from-[#90EE90] to-[#004d00] rounded-t-md'
            />
          ))}
        </div>

        {/* Sound waves */}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={`wave-${i}`}
            initial={{
              opacity: 0,
              scale: 0.5,
            }}
            animate={{
              opacity: [0, 0.2, 0],
              scale: [0.5, 2, 0.5],
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 2,
            }}
            className='absolute rounded-full border border-[#90EE90]/10'
            style={{
              width: '300px',
              height: '300px',
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
            }}
          />
        ))}

        {/* Waveform lines */}
        <div className='absolute inset-0 flex flex-col justify-around opacity-10'>
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`waveform-${i}`}
              initial={{
                scaleX: 0.8,
              }}
              animate={{
                scaleX: [0.8, 1, 0.8],
              }}
              transition={{
                duration: Math.random() * 5 + 3,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'reverse',
              }}
              className='h-px bg-gradient-to-r from-transparent via-[#90EE90] to-transparent'
            />
          ))}
        </div>
      </div>

      <style
        jsx
        global>{`
        @keyframes float-0 {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            transform: translate(20px, -20px) rotate(5deg);
          }
        }
        @keyframes float-1 {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            transform: translate(-20px, 20px) rotate(-5deg);
          }
        }
        @keyframes float-2 {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            transform: translate(20px, 20px) rotate(5deg);
          }
        }

        @font-face {
          font-family: 'Audiowide';
          src: url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');
        }
      `}</style>

      {/* Header */}

      {/* Hero Section */}
      <motion.section
        style={{ opacity: headerOpacity, scale: headerScale }}
        className='relative z-10 min-h-[90vh] flex items-center'>
        <div className='container mx-auto px-4 py-20'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className='space-y-6'>
              <h1
                className='text-5xl md:text-7xl font-extrabold leading-tight tracking-tighter'
                style={{ fontFamily: "'Audiowide', cursive" }}>
                Music Meets <br />
                <span className='text-[#90EE90]'>Blockchain</span> Revolution
              </h1>

              <p className='text-xl text-gray-300 max-w-lg'>
                Own, trade, and experience music in a whole new way. Direct
                artist support with transparent royalties on the blockchain.
              </p>

              <div className='flex flex-col sm:flex-row gap-4'>
                <button className='inline-flex items-center justify-center px-4 py-2 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl'>
                  Explore Music
                </button>
                <button className='border-[#90EE90] text-[#90EE90] hover:bg-[#90EE90]/10 text-base px-4 py-2 rounded-xl'>
                  For Artists
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className='relative aspect-square max-w-md mx-auto'>
              {/* Outer glow effect */}
              <div className='absolute inset-0 rounded-full bg-[#006400]/20 animate-pulse' />

              {/* Vinyl record */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
                className='relative w-full h-full rounded-full bg-gradient-to-br from-black via-gray-900 to-black border-4 border-[#004d00] shadow-2xl overflow-hidden'>
                {/* Vinyl grooves */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className='absolute rounded-full border border-[#90EE90]/20'
                    style={{
                      width: `${90 - i * 10}%`,
                      height: `${90 - i * 10}%`,
                      top: `${5 + i * 5}%`,
                      left: `${5 + i * 5}%`,
                    }}
                  />
                ))}

                {/* Glossy reflection effect */}
                <div className='absolute inset-0 rounded-full overflow-hidden'>
                  <motion.div
                    initial={{ opacity: 0.6, x: '-100%' }}
                    animate={{
                      opacity: [0.6, 0.8, 0.6],
                      x: ['100%', '-100%', '100%'],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    }}
                    className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-[200%] h-full'
                    style={{ opacity: 0.1 }}
                  />
                </div>

                {/* Circular highlight */}
                <div className='absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent' />

                {/* Center label */}
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='w-24 h-24 rounded-full bg-gradient-to-br from-[#90EE90] to-[#006400] flex items-center justify-center shadow-lg'>
                    <div className='w-4 h-4 rounded-full bg-black' />
                  </div>
                </div>

                {/* Album label text */}
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='w-20 h-20 rounded-full flex flex-col items-center justify-center text-black text-xs font-bold'>
                    <span>BLOCK</span>
                    <span>BEATS</span>
                  </div>
                </div>

                {/* Edge highlight */}
                <div className='absolute inset-0 rounded-full border-2 border-white/5' />
              </motion.div>

              {/* Vinyl shadow */}
              <div className='absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] h-4 bg-black/40 blur-md rounded-full' />

              {/* Floating music notes around vinyl */}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className='relative z-10 py-20 bg-[#001a00]/80'>
        <div className='container mx-auto px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className='text-center mb-16'>
            <h2
              className='text-4xl font-bold mb-4'
              style={{ fontFamily: "'Audiowide', cursive" }}>
              Revolutionary <span className='text-[#90EE90]'>Features</span>
            </h2>
            <p className='text-xl text-gray-300 max-w-2xl mx-auto'>
              Experience music ownership like never before with our blockchain
              technology
            </p>
          </motion.div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {[
              {
                icon: <Lock className='h-10 w-10 text-[#90EE90]' />,
                title: 'Secure Ownership',
                description:
                  'Own your music as NFTs with verifiable proof of ownership on the blockchain',
              },
              {
                icon: <Zap className='h-10 w-10 text-[#90EE90]' />,
                title: 'Instant Royalties',
                description:
                  'Artists receive royalties instantly when their music is purchased or traded',
              },
              {
                icon: <Share2 className='h-10 w-10 text-[#90EE90]' />,
                title: 'Community Governance',
                description:
                  'Participate in platform decisions with our governance token system',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className='bg-gradient-to-br from-[#002200] to-black p-8 rounded-xl border border-[#004d00] hover:border-[#90EE90] transition-colors group'>
                <div className='mb-4 p-4 inline-block rounded-full bg-black/50 group-hover:bg-[#004d00]/50 transition-colors'>
                  {feature.icon}
                </div>
                <h3 className='text-2xl font-bold mb-2'>{feature.title}</h3>
                <p className='text-gray-300'>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Music Visualization Section */}
      <section className='relative z-10 py-20'>
        <div className='container mx-auto px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className='text-center mb-16'>
            <h2
              className='text-4xl font-bold mb-4'
              style={{ fontFamily: "'Audiowide', cursive" }}>
              Experience <span className='text-[#90EE90]'>Music</span>{' '}
              Differently
            </h2>
            <p className='text-xl text-gray-300 max-w-2xl mx-auto'>
              Visualize the rhythm and own the beat with blockchain technology
            </p>
          </motion.div>

          <div className='relative h-60 md:h-80 rounded-xl overflow-hidden'>
            {/* Animated music visualization */}
            <div className='absolute inset-0 flex items-end justify-around'>
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{
                    height: [
                      Math.random() * 20 + 10,
                      Math.random() * 100 + 20,
                      Math.random() * 60 + 30,
                      Math.random() * 20 + 10,
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: 'reverse',
                    delay: i * 0.05,
                  }}
                  className='w-2 md:w-4 rounded-t-md'
                  style={{
                    background: `linear-gradient(to top, #90EE90 ${
                      Math.random() * 20 + 10
                    }%, #004d00)`,
                    filter: 'blur(1px)',
                  }}
                />
              ))}
            </div>

            {/* Floating music elements */}
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={`floating-${i}`}
                initial={{
                  opacity: 0,
                  x: Math.random() * 1000,
                  y: Math.random() * 300,
                }}
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  x: [
                    Math.random() * 1000,
                    Math.random() * 1000,
                    Math.random() * 1000,
                  ],
                  y: [
                    Math.random() * 300,
                    Math.random() * 300,
                    Math.random() * 300,
                  ],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: Math.random() * 10 + 10,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'mirror',
                }}
                className='absolute text-[#90EE90] font-bold'
                style={{
                  fontSize: `${Math.random() * 30 + 20}px`,
                  filter: 'blur(0.5px)',
                }}>
                {['♪', '♫', '♬', '♩'][Math.floor(Math.random() * 4)]}
              </motion.div>
            ))}

            {/* Pulsing circles */}
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`pulse-${i}`}
                initial={{
                  opacity: 0,
                  scale: 0.5,
                }}
                animate={{
                  opacity: [0, 0.3, 0],
                  scale: [0.5, 1.5, 0.5],
                }}
                transition={{
                  duration: Math.random() * 4 + 3,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.7,
                }}
                className='absolute rounded-full border border-[#90EE90]'
                style={{
                  width: `${Math.random() * 100 + 50}px`,
                  height: `${Math.random() * 100 + 50}px`,
                  left: `${Math.random() * 80 + 10}%`,
                  top: `${Math.random() * 80 + 10}%`,
                }}
              />
            ))}

            {/* Overlay gradient */}
            <div className='absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-70' />

            <div className='absolute inset-0 flex items-center justify-center'>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className='bg-black/50 backdrop-blur-sm p-6 rounded-xl border border-[#004d00] max-w-md text-center'>
                <h3 className='text-2xl font-bold mb-2'>Blockchain Beats</h3>
                <p className='text-gray-300 mb-4'>
                  Every beat is a token, every melody an asset. Own the music
                  you love.
                </p>
                <button className='inline-flex items-center justify-center px-4 py-2 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl'>
                  Explore the Sound
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className='relative z-10 py-20'>
        <div className='container mx-auto px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className='text-center mb-16'>
            <h2
              className='text-4xl font-bold mb-4'
              style={{ fontFamily: "'Audiowide', cursive" }}>
              How <span className='text-[#90EE90]'>BlockBeats</span> Works
            </h2>
            <p className='text-xl text-gray-300 max-w-2xl mx-auto'>
              Join the music revolution in three simple steps
            </p>
          </motion.div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 relative'>
            {/* Connecting line */}
            <div className='hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#90EE90] to-transparent' />

            {[
              {
                number: '01',
                title: 'Connect Wallet',
                description:
                  'Link your crypto wallet to access the BlockBeats platform',
              },
              {
                number: '02',
                title: 'Discover Music',
                description:
                  'Browse exclusive tracks and albums from your favorite artists',
              },
              {
                number: '03',
                title: 'Collect & Enjoy',
                description:
                  'Purchase music NFTs and enjoy exclusive perks and content',
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                className='relative z-10'>
                <div className='bg-black p-8 rounded-xl border border-[#004d00] h-full flex flex-col items-center text-center'>
                  <div className='mb-6 h-16 w-16 rounded-full bg-[#004d00] flex items-center justify-center text-2xl font-bold text-[#90EE90]'>
                    {step.number}
                  </div>
                  <h3 className='text-2xl font-bold mb-2'>{step.title}</h3>
                  <p className='text-gray-300'>{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Artists */}
      <section className='relative z-10 py-20 bg-[#001a00]/80'>
        <div className='container mx-auto px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className='flex justify-between items-end mb-12'>
            <div>
              <h2
                className='text-4xl font-bold mb-4'
                style={{ fontFamily: "'Audiowide', cursive" }}>
                Featured <span className='text-[#90EE90]'>Artists</span>
              </h2>
              <p className='text-xl text-gray-300 max-w-2xl'>
                Discover trending creators on the platform
              </p>
            </div>
            <Link
              href='/start/artists'
              className='text-[#90EE90] flex items-center gap-1 hover:text-[#90EE90]/80 transition-colors'>
              View All <ChevronRight className='h-4 w-4' />
            </Link>
          </motion.div>

          {loading ? (
            <div className='flex flex-col items-center justify-center py-16'>
              <div className='w-16 h-16 border-4 border-[#004d00] border-t-[#90EE90] rounded-full animate-spin mb-4'></div>
              <p className='text-[#90EE90]/70'>Loading featured artists...</p>
            </div>
          ) : artists.length > 0 ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
              {artists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                  className='group'>
                  <div className='bg-gradient-to-br from-[#002200] to-black rounded-xl overflow-hidden'>
                    <div className='aspect-square relative overflow-hidden'>
                      <div className='absolute inset-0 bg-gradient-to-br from-[#90EE90]/20 to-[#006400]/20 group-hover:opacity-70 opacity-40 transition-opacity' />
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = `/placeholder.svg?height=400&width=400&text=${artist.name}`
                        }}
                      />
                      <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                        <div className='h-16 w-16 rounded-full bg-[#90EE90] flex items-center justify-center'>
                          <Play className='h-8 w-8 text-black ml-1' />
                        </div>
                      </div>
                    </div>
                    <div className='p-4'>
                      <h3 className='text-xl font-bold truncate'>
                        {artist.name}
                      </h3>
                      <div className='flex justify-between items-center mt-2'>
                        <span className='text-gray-300'>Artist</span>
                        <Link
                          href={`/start/artists`}
                          className='text-[#90EE90] hover:text-[#90EE90]/80 text-sm font-medium transition-colors'>
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className='text-center py-16 bg-[#002200]/30 rounded-xl border border-[#004d00]'>
              <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-[#002200] flex items-center justify-center'>
                <svg
                  className='w-8 h-8 text-[#90EE90]/70'
                  fill='currentColor'
                  viewBox='0 0 24 24'>
                  <path d='M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z' />
                  <path d='M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z' />
                </svg>
              </div>
              <p className='text-[#90EE90]/70'>No featured artists found</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className='relative z-10 py-20'>
        <div className='container mx-auto px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className='bg-gradient-to-r from-[#004d00] to-[#002200] rounded-2xl p-8 md:p-12 overflow-hidden relative'>
            {/* Animated background elements */}
            <div className='absolute inset-0 overflow-hidden'>
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.1, scale: 0 }}
                  animate={{
                    opacity: [0.1, 0.3, 0.1],
                    scale: [1, 1.5, 1],
                    x: [0, Math.random() * 100 - 50, 0],
                    y: [0, Math.random() * 100 - 50, 0],
                  }}
                  transition={{
                    duration: Math.random() * 10 + 10,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: 'reverse',
                  }}
                  className='absolute rounded-full bg-[#90EE90]/10'
                  style={{
                    width: Math.random() * 200 + 50,
                    height: Math.random() * 200 + 50,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>

            <div className='relative z-10 flex flex-col md:flex-row items-center justify-between gap-8'>
              <div className='max-w-2xl'>
                <h2
                  className='text-3xl md:text-4xl font-bold mb-4'
                  style={{ fontFamily: "'Audiowide', cursive" }}>
                  Ready to Join the{' '}
                  <span className='text-[#90EE90]'>Music Revolution</span>?
                </h2>
                <p className='text-xl text-gray-200'>
                  Get early access to exclusive drops, artist collaborations,
                  and special perks.
                </p>
              </div>

              <div className='w-full md:w-auto'>
                <button className='inline-flex items-center justify-center px-4 py-2 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl'>
                  Get Started Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className='relative z-10 py-12 border-t border-[#004d00]'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <Disc className='h-6 w-6 text-[#90EE90]' />
                <h2
                  className='text-xl font-bold'
                  style={{ fontFamily: "'Audiowide', cursive" }}>
                  BLOCKBEATS
                </h2>
              </div>
              <p className='text-gray-400'>
                Revolutionizing the music industry through blockchain technology
                and direct artist support.
              </p>
            </div>

            {[
              {
                title: 'Platform',
                links: ['Discover', 'Marketplace', 'For Artists', 'Tokenomics'],
              },
              {
                title: 'Resources',
                links: ['Help Center', 'Blog', 'Developers', 'Whitepaper'],
              },
              {
                title: 'Company',
                links: ['About Us', 'Careers', 'Contact', 'Press Kit'],
              },
            ].map((column, index) => (
              <div
                key={index}
                className='space-y-4'>
                <h3 className='text-lg font-bold'>{column.title}</h3>
                <ul className='space-y-2'>
                  {column.links.map((link, i) => (
                    <li key={i}>
                      <Link
                        href='#'
                        className='text-gray-400 hover:text-[#90EE90] transition-colors'>
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className='mt-12 pt-8 border-t border-[#004d00] flex flex-col md:flex-row justify-between items-center'>
            <p className='text-gray-400 text-sm'>
              © {new Date().getFullYear()} BlockBeats. All rights reserved.
            </p>

            <div className='flex gap-4 mt-4 md:mt-0'>
              <Link
                href='#'
                className='text-gray-400 hover:text-[#90EE90] transition-colors'>
                Terms
              </Link>
              <Link
                href='#'
                className='text-gray-400 hover:text-[#90EE90] transition-colors'>
                Privacy
              </Link>
              <Link
                href='#'
                className='text-gray-400 hover:text-[#90EE90] transition-colors'>
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
