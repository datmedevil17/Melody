import React, { useState, useEffect, useRef, use, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { artistContract, decimalToAscii } from '../contract/contract'
import { UserContext } from '../context/userContextProvider'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'YOUR_API_KEY'
)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const AiBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! I'm your music assistant. Ask me about artists or songs in our collection.",
    },
  ])
  const [artists, setArtists] = useState([])
  const [songs, setSongs] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {togglePlayPause, isPlaying, currentlyPlaying} = useContext(UserContext)
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch artists and songs data from contracts
  useEffect(() => {
    const fetchData = async () => {

      setIsLoading(true)
      try {
        setLoadingMessage('Fetching artists...')

        // Fetch artists
        const totalArtists = await artistContract.call(
          'get_all_artists',
          []
        )
        const artistsArr = []
        let j = 0;
        for (let i of totalArtists) {
          const artistData = await artistContract.call('get_artist_profile', [
            i,
          ])
          artistsArr.push({
            id: j,
            name: decimalToAscii(artistData.name),
            image: `https://${artistData.artist_profile}`,
          })

          // Update loading message occasionally to show progress
          if (j % 5 === 0) {
            setLoadingMessage(`Loaded ${j}/${totalArtists.length} artists...`)
          }
            j++;
        }

        setArtists(artistsArr)

        // Fetch songs
        setLoadingMessage('Fetching songs...')
        const totalSongs = await artistContract.call('get_song_count', [])
        const songsArr = []

        for (let i = 1; i <= Number(totalSongs); i++) {
          const song = await artistContract.call('get_song_details', [i])
          const artistId = await artistContract.call('get_song_creators', [i])
          const artist = await artistContract.call('get_song_creators', [i])
          const updartist = Array.isArray(artist) ? artist[0] : artist
          const artistInfo = await artistContract.call('get_artist_profile', [
            updartist,
          ])

          songsArr.push({
            id: parseInt(i),
            title: decimalToAscii(song.metadata.title),
            artist: decimalToAscii(artistInfo.name) || 'Unknown Artist',
            artistId: Number(artistId),
            genre: decimalToAscii(song.metadata.genre),
            image: `https://${song.metadata.cover_image}`,
            url: `https://${song.uri}`,
          })

          // Update loading message occasionally
          if (i % 3 === 0) {
            setLoadingMessage(`Loaded ${i}/${totalSongs} songs...`)
          }
        }

        setSongs(songsArr)
      } catch (error) {
        console.error('Error fetching data:', error)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Sorry, I had trouble loading the music data. Please try again later.',
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isSubmitting) return

    const userMessage = {
      role: 'user',
      content: inputValue,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsSubmitting(true)

    try {
      // Create chat context with available artists and songs
      const chatContext = {
        available_artists: artists,
        available_songs: songs,
      }

      // Create system prompt with instructions
      const systemPrompt = `
You are a music assistant for the Melody web3 music streaming app.
Your job is to help users discover music and artists in our collection.

Here's the available data (DO NOT share this data structure with the user, just use it for your responses):
- Artists: ${JSON.stringify(artists)}
- Songs: ${JSON.stringify(songs)}
      )}

RULES:
1. Only answer questions about music, artists and songs in our collection.
2. For questions not related to music or our collection, politely redirect them.
3. If asked about a specific artist, return relevant artist data.
4. If asked about songs (by genre, artist, title, etc), return relevant song data.
5. Keep responses concise, helpful and music-focused.

FORMAT YOUR RESPONSES CAREFULLY:
- For regular text responses, just respond normally.
- For artist results, start your response with "ARTIST_RESULTS:" and then include JSON data like: [{"id":1,"name":"Artist Name","image":"image_url"}]
- For song results, start your response with "SONG_RESULTS:" and then include JSON data like: [{"id":1,"title":"Song Title","genre":"Genre","artist": "Artist","image":"image_url","url":"song_url"}]

User's message: ${userMessage.content}
`

      // Chat history for context (exclude system messages)
      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || "test" }],
        }))
        .slice(-5) // Keep only last 5 messages for context window size
        history.unshift({
            role: 'user',
            parts: [{text: "Hi"}]
        })
      // Create chat session with history
      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024,
        },
      })

      // Send message to Gemini
      const result = await chat.sendMessage(systemPrompt)
      const response = result.response.text()

      // Parse response for special formatted results
      if (response.includes('ARTIST_RESULTS:')) {
        const dataStart = response.indexOf('[')
        const dataEnd = response.lastIndexOf(']') + 1

        if (dataStart > -1 && dataEnd > dataStart) {
          try {
            const jsonString = response.substring(dataStart, dataEnd)
            const artistResults = JSON.parse(jsonString)

            // Find full artist data including images
            const completeArtistData = artistResults.map((result) => {
              const fullArtist = artists.find(
                (a) => a.id === result.id || a.name === result.name
              )
              return fullArtist || result
            })

            // Add result to messages
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                type: 'artists',
                content: 'Artist_Results:',
                data: completeArtistData,
              },
            ])
          } catch (error) {
            console.error('Error parsing artist results:', error)
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content:
                  'Sorry, I had trouble processing the artist information. Please try asking in a different way.',
              },
            ])
          }
        }
      } else if (response.includes('SONG_RESULTS:')) {
        const dataStart = response.indexOf('[')
        const dataEnd = response.lastIndexOf(']') + 1

        if (dataStart > -1 && dataEnd > dataStart) {
          try {
            const jsonString = response.substring(dataStart, dataEnd)
            const songResults = JSON.parse(jsonString)

            // Find full song data including images and URLs
            const completeSongData = songResults.map((result) => {
              const fullSong = songs.find(
                (s) =>
                  s.id === result.id ||
                  (s.title.toLowerCase() === result.title.toLowerCase() &&
                    s.artist.toLowerCase() === result.artist.toLowerCase())
              )
              return fullSong || result
            })

            // Add result to messages
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                type: 'songs',
                content: 'Song_Results:',
                data: completeSongData,
              },
            ])
          } catch (error) {
            console.error('Error parsing song results:', error)
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content:
                  'Sorry, I had trouble processing the song information. Please try asking in a different way.',
              },
            ])
          }
        }
      } else {
        // Regular text response
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response,
          },
        ])
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsSubmitting(false)
      console.log(messages)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handlePlaySong = (song) => {
    if (togglePlayPause) {
      togglePlayPause(song.url, song.id, {
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        image: song.image,
      })

      setIsOpen(false) // Close chat after starting a song
    }
  }

  return (
    <>
      {/* Bot Icon Button */}
      {!isOpen&&(<motion.button
        className='fixed z-50 bottom-6 right-6 w-14 h-14 rounded-full bg-[#004d00] text-[#90EE90] shadow-lg flex items-center justify-center border border-[#90EE90]/30'
        whileHover={{
          scale: 1.1,
          boxShadow: '0 0 15px rgba(144, 238, 144, 0.3)',
        }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}>
        <div className='relative'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-7 w-7'
            viewBox='0 0 24 24'
            fill='currentColor'>
            <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' />
            <path d='M15.5 14l-1.41-1.41L15.17 11H14v-1h3v3h-1v-1.17l-1.09 1.09L16 14l-3.5 3.5L9 14l1.5-1.5L12 14z' />
          </svg>
          <motion.div
            className='absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#90EE90] rounded-full'
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'loop',
            }}
          />
        </div>
      </motion.button>)}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className='fixed z-40 bottom-6 right-6 w-[350px] md:w-[400px] bg-[#001a00] border border-[#004d00] rounded-2xl shadow-xl overflow-hidden flex flex-col'
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
            {/* Chat Header */}
            <div className='bg-[#003300] p-4 flex items-center justify-between border-b border-[#004d00]'>
              <div className='flex items-center'>
                <div className='w-10 h-10 rounded-full bg-[#004d00] flex items-center justify-center mr-3'>
                  <svg
                    className='h-6 w-6 text-[#90EE90]'
                    viewBox='0 0 24 24'
                    fill='currentColor'>
                    <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z' />
                  </svg>
                </div>
                <div>
                  <h3 className='font-bold text-[#90EE90]'>Melody Assistant</h3>
                  <p className='text-xs text-[#90EE90]/70'>
                    AI-powered music guide
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#004d00] transition-colors text-[#90EE90]'>
                <svg
                  className='h-5 w-5'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            {/* Chat Body */}
            {isLoading ? (
              <div className='flex-1 flex flex-col items-center justify-center p-6 gap-3'>
                <div className='w-12 h-12 border-4 border-[#004d00] border-t-[#90EE90] rounded-full animate-spin'></div>
                <p className='text-[#90EE90] text-center'>{loadingMessage}</p>
              </div>
            ) : (
              <div
                ref={chatContainerRef}
                className='flex-1 overflow-y-auto p-4 flex flex-col gap-4'
                style={{ maxHeight: '400px' }}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                    <div
                      className={`max-w-[80%] rounded-xl p-3 ${
                        message.role === 'user'
                          ? 'bg-[#004d00] text-white ml-auto'
                          : 'bg-[#002200] border border-[#004d00]'
                      }`}>
                      {/* Regular text message */}
                      {!message.type && (
                        <div className='text-[#90EE90]'>{message.content}</div>
                      )}

                      {/* Artist cards */}
                      {message.type === 'artists' && (
                        <div>
                          <p className='text-[#90EE90] mb-2'>
                            {message.content}
                          </p>
                          <div
                            className='flex gap-3 overflow-x-auto pb-2 pt-1'
                            style={{ scrollbarWidth: 'none' }}>
                            {message.data.map((artist) => (
                              <div
                                key={artist.id}
                                className='min-w-[100px] flex-shrink-0'>
                                <div className='w-[100px] h-[100px] rounded-full overflow-hidden border border-[#004d00] mb-2'>
                                  <img
                                    src={artist.image}
                                    alt={artist.name}
                                    className='w-full h-full object-cover'
                                    onError={(e) => {
                                      e.target.onerror = null
                                      e.target.src =
                                        'https://via.placeholder.com/100x100/001a00/90EE90?text=Artist'
                                    }}
                                  />
                                </div>
                                <p className='text-[#90EE90] text-center text-sm font-medium truncate'>
                                  {artist.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Song cards */}
                      {message.type === 'songs' && (
                        <div>
                          <p className='text-[#90EE90] mb-2'>
                            {message.content}
                          </p>
                          <div
                            className='flex gap-3 overflow-x-auto pb-2 pt-1'
                            style={{ scrollbarWidth: 'none' }}>
                            {message.data.map((song) => (
                              <div
                                key={song.id}
                                className='min-w-[120px] max-w-[120px] bg-[#002200] rounded-lg overflow-hidden border border-[#004d00] flex-shrink-0'>
                                <div className='relative'>
                                  <img
                                    src={song.image}
                                    alt={song.title}
                                    className='w-full h-[120px] object-cover'
                                    onError={(e) => {
                                      e.target.onerror = null
                                      e.target.src =
                                        'https://via.placeholder.com/120x120/001a00/90EE90?text=Song'
                                    }}
                                  />
                                  <button
                                    className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity'
                                    onClick={() => handlePlaySong(song)}>
                                    <div className='w-10 h-10 rounded-full bg-[#90EE90] flex items-center justify-center'>
                                      <svg
                                        className='h-6 w-6 text-black'
                                        viewBox='0 0 24 24'
                                        fill='currentColor'>
                                        <path d={currentlyPlaying===song.id && isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' :'M8 5v14l11-7z'} />
                                      </svg>
                                    </div>
                                  </button>
                                </div>
                                <div className='p-2'>
                                  <h4 className='text-[#90EE90] text-sm font-medium truncate'>
                                    {song.title}
                                  </h4>
                                  <p className='text-[#90EE90]/70 text-xs truncate'>
                                    {song.artist}
                                  </p>
                                  <div className='mt-1 flex justify-between items-center'>
                                    <span className='bg-[#004d00]/50 text-[#90EE90] text-[10px] px-2 py-0.5 rounded-full'>
                                      {song.genre}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator when waiting for response */}
                {isSubmitting && (
                  <div className='flex justify-start'>
                    <div className='bg-[#002200] border border-[#004d00] rounded-xl p-3 flex items-center'>
                      <div className='flex gap-1'>
                        <motion.div
                          className='w-2 h-2 rounded-full bg-[#90EE90]'
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        />
                        <motion.div
                          className='w-2 h-2 rounded-full bg-[#90EE90]'
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className='w-2 h-2 rounded-full bg-[#90EE90]'
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: 0.4,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Chat Input */}
            <div className='p-3 border-t border-[#004d00]'>
              <div className='flex items-center bg-[#002200] rounded-full border border-[#004d00] pl-4 pr-2 py-2'>
                <input
                  type='text'
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder='Ask about music...'
                  className='bg-transparent outline-none flex-1 text-[#90EE90] placeholder-[#90EE90]/50'
                  disabled={isLoading || isSubmitting}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || isSubmitting || !inputValue.trim()}
                  className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center ${
                    isLoading || isSubmitting || !inputValue.trim()
                      ? 'bg-[#003300] text-[#90EE90]/40 cursor-not-allowed'
                      : 'bg-[#004d00] text-[#90EE90] hover:bg-[#005a00] transition-colors'
                  }`}>
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 24 24'
                    fill='currentColor'>
                    <path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
                  </svg>
                </button>
              </div>
              <div className='text-center text-[10px] text-[#90EE90]/50 mt-1'>
                Ask me about artists and songs in our collection
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style
        jsx
        global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .overflow-x-auto {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </>
  )
}

export default AiBot
