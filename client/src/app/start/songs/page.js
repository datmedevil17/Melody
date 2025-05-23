'use client'
import { useAccount, useSendTransaction } from '@starknet-react/core'
import { useEffect, useState, useContext } from 'react'
import {
  songABI,
  songContractAddress,
  songContract,
  artistContract,
} from '../../../contract/contract'
import { Contract } from 'starknet'
import {UserContext} from '../../../context/userContextProvider'

const decimalToAscii = (decimal) => {
  if (!decimal) return 'N/A'
  try {
    // Convert decimal to hex
    const hex = decimal.toString(16)
    // Add padding if necessary
    const paddedHex = hex.padStart(2, '0')
    // Convert hex pairs to ASCII
    const ascii =
      paddedHex
        .match(/.{2}/g)
        ?.map((hex) => String.fromCharCode(parseInt(hex, 16))) || []
    return ascii.join('')
  } catch (error) {
    console.error('Error converting decimal to ASCII:', error)
    return decimal.toString()
  }
}

const Songs = () => {

  const { setMusic,setIsPlaying : setPlaying } = useContext(UserContext);


  const [songDetails, setSongDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [likedSongs, setLikedSongs] = useState({})
  const [songLikesCount, setSongLikesCount] = useState({})
  const [likesLoading, setLikesLoading] = useState({})
  const [selectedSong, setSelectedSong] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [songStats, setSongStats] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [songArtists, setSongArtists] = useState({})
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null)
  const [audioPlayer, setAudioPlayer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { sendAsync, error: txError } = useSendTransaction({ calls: undefined })
  const { address } = useAccount()

  const togglePlayPause = (uri, songId, title) => {
  // Stop current song if any is playing
  if (audioPlayer) {
    audioPlayer.pause();
    console.log(audioPlayer)
    console.log(currentlyPlaying)
    console.log(songId, uri, title)
    // If we're clicking on the same song that's already playing, just toggle play/pause
    if (currentlyPlaying === songId) {
      if (isPlaying) {
        setIsPlaying(false);
        setPlaying(false);
        return;
      } else {
        audioPlayer.play();
        setIsPlaying(true);
        setPlaying(true);
        return;
      }
    }
    else{
      console.log(currentlyPlaying, songId)
      setIsPlaying(false);
      setPlaying(false);
      audioPlayer.src = "https://"+uri;
      audioPlayer.play();
      console.log(songId, uri)
      setCurrentlyPlaying(songId)
      setIsPlaying(true);
      setPlaying(true);
      return;
    }
  }
  
  // Create a new audio player for a different song
  const audio = new Audio();
  
  // Format URI properly
  let formattedUri = "https://" + uri
  // setCurrentlyPlaying(songId)
  audio.src = formattedUri;
  audio.oncanplay = () => {
    audio.play();
    setIsPlaying(true);
    setPlaying(true);
  };
  
  audio.onerror = (e) => {
    console.log('Audio error:', e);
    console.error(`Error playing audio: ${e}`);
    // alert(`Could not play ${title}. The audio file may be unavailable.`);
    setIsPlaying(false);
    setPlaying(false);
  };
  
  // When audio finishes playing
  audio.onended = () => {
    setIsPlaying(false);
    setPlaying(false);
  };
  setCurrentlyPlaying(songId)
  setAudioPlayer(audio);
}

  const fetchSongArtists = async (songId) => {
    try {
      // Get artists for the song
      const artists = await artistContract.call('get_song_creators', [songId])
      
      // Format artists data if needed
      const formattedArtists = Array.isArray(artists) ? artists : [artists]
      
      // Store in state with songId as key
      setSongArtists(prev => ({
        ...prev,
        [songId]: formattedArtists
      }))
      
      return formattedArtists
    } catch (err) {
      console.error(`Error fetching artists for song #${songId}:`, err)
      return []
    }
  }

  const fetchSongs = async () => {
    try {
      setLoading(true)

      const data = await artistContract.call('get_song_count', [])
      // const data = 2
      console.log('Song count:', data)

      const songs = []
      for (let i = 1; i <= Number(data); i++) {
        try {
          const song = await artistContract.call('get_song_details', [i])
          const likes = await songContract.call('get_likes_count', [i])
          let liked = false
          if(address){
              liked = await songContract.call('has_user_liked', [i, address])
          }
          
          // Fetch artists for this song
          const artists = await fetchSongArtists(i)
          
          songs.push({
              ...song,
              metadata:{
                  ...song.metadata,
                  title: decimalToAscii(song.metadata.title),
                  genre: decimalToAscii(song.metadata.genre),
                  release_date: song.metadata.release_date
                    ? new Date(
                        Number(song.metadata.release_date.toString()) * 1000
                      ).toLocaleDateString()
                    : 'Unknown Date',
              },
              likes: Number(likes),
              liked,
              artists
          })
        } catch (err) {
          console.error(`Error fetching song #${i}:`, err)
        }
      }

      // Format song data

      console.log('Processed songs:', songs)
      setSongDetails(songs)
    } catch (err) {
      console.error('Error loading songs:', err)
      setError('Failed to load songs. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  // Cleanup audio player when component unmounts
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
      }
    };
  }, [audioPlayer]);
  
  useEffect(() => {
    fetchSongs()
  }, [address])

  const handleLike = async (songId) => {
    if(!address){
        alert("Please connect your wallet to like a song")
        return
    }
    try {
      setLikesLoading((prev) => ({ ...prev, [songId]: true }))
      const songContract = new Contract(songABI, songContractAddress)

      const call = songContract.populate('like_song', [songId, address])
      await sendAsync([call])

      // Update likes count after liking
     setSongDetails((prev) => [
        ...prev.map((song) => {
          if (song.id === songId) {
            return {
              ...song,
              likes: song.likes + 1,
              liked: true,
            }
          }
          return song
        }),
     ])
    } catch (err) {
      console.error('Error liking song:', err)
    } finally {
      setLikesLoading((prev) => ({ ...prev, [songId]: false }))
    }
  }

  const openSongDetails = async (songId) => {
    try {
      setSelectedSong(songId)
      setModalOpen(true)

      // Fetch song stats
      const stats = await getSongStats(songId)
      setSongStats(stats)

      // Fetch comments
      const songComments = await getCommentsOfSong(songId)
      setComments(songComments || [])
      
      // Fetch artists if not already loaded
      if (!songArtists[songId]) {
        await fetchSongArtists(songId)
      }
    } catch (err) {
      console.error('Error fetching song details:', err)
    }
  }

  const getSongStats = async (songId) => {
    try {
      const res = songContract.call('get_song_stats', [songId])
      return res;
    } catch (err) {
      console.error('Error fetching song stats:', err)
      return null
    }
  }

  const getCommentsOfSong = async (songId) => {
    try {
      const result = await songContract.get_comments(songId)
      return result
    } catch (err) {
      console.error(`Error fetching comments for song #${songId}:`, err)
      return []
    }
  }
  

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedSong) return

    try {
      setIsSubmitting(true)
      const songContract = new Contract(songABI, songContractAddress)
      const call = songContract.populate('add_comment', [
        selectedSong,
        address,
        newComment,
      ])
      await sendAsync([call])

      // Refresh comments after adding
      const updatedComments = await getCommentsOfSong(selectedSong)
      setComments(updatedComments || [])
      setNewComment('')
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format URI to display as image
  const formatImageUrl = (uri) => {
    if (!uri) return 'https://placehold.co/400x400/1f2937/6b7280?text=No+Image'

    if (uri.startsWith('ipfs.io/ipfs/')) {
      return `https://${uri}`
    }

    if (uri.startsWith('ipfs://')) {
      return `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`
    }

    return uri
  }

  // Format wallet address for display
  const formatAddress = (address) => {
  if (!address) return 'Unknown Artist';
  const addressStr = address.toString();
  return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
};

  return (
    <div className='bg-gray-900 min-h-screen py-10 px-4 sm:px-6'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-3xl font-bold text-purple-400 mb-8'>
          Explore Music
        </h1>

        {loading ? (
          <div className='flex justify-center items-center h-64'>
            <div className='flex flex-col items-center'>
              <div className='w-12 h-12 border-4 border-t-purple-500 border-purple-200/20 rounded-full animate-spin'></div>
              <p className='mt-4 text-gray-300'>Loading songs...</p>
            </div>
          </div>
        ) : error ? (
          <div className='bg-red-900/30 border border-red-800 p-4 rounded-lg text-red-400'>
            <p>{error}</p>
          </div>
        ) : songDetails.length === 0 ? (
          <div className='bg-gray-800 border border-gray-700 p-8 rounded-lg text-center'>
            <div className='text-gray-400 mb-4 text-6xl'>🎵</div>
            <h3 className='text-xl text-white mb-2'>No songs available</h3>
            <p className='text-gray-400'>Be the first to upload a song!</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {songDetails.map((song, index) => {
              const songId = song.id
              const isLiked = !!likedSongs[songId]
              const isLikeLoading = !!likesLoading[songId]

              return (
                <div
                  key={index}
                  className='bg-gray-800 rounded-xl overflow-hidden border border-gray-700 transition-all hover:shadow-lg hover:shadow-purple-900/20 flex flex-col'>
                  <div className='aspect-square bg-gray-900 relative'>
                    <img
                      src={formatImageUrl(song.metadata.cover_image)}
                      alt={song.metadata.title}
                      className='w-full h-full object-cover'
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src =
                          'https://placehold.co/400x400/1f2937/6b7280?text=No+Image'
                      }}
                    />

                    <button
                      className='absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors'
                      onClick={() => {
                        setMusic(song.uri);
                        togglePlayPause(song.uri, songId, song.metadata.title);
                      }}>
                      {currentlyPlaying === songId && isPlaying ? (
                        <svg
                          className='w-6 h-6'
                          fill='currentColor'
                          viewBox='0 0 20 20'>
                          <path
                            fillRule='evenodd'
                            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z'
                            clipRule='evenodd'
                          />
                        </svg>
                      ) : (
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
                      )}
                    </button>
                  </div>

                  <div className='p-4 flex-1'>
                    <div className='flex justify-between items-start'>
                      <h3 className='font-bold text-lg text-white mb-1 truncate'>
                        {song.metadata.title}
                      </h3>

                      <div className='flex items-center'>
                        <span className='text-gray-400 text-xs mr-1'>
                          {song.likes}
                        </span>
                        <button
                          disabled={isLikeLoading || song.liked}
                          className={`text-gray-400 hover:text-red-500 transition-colors focus:outline-none ${
                            isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => handleLike(songId)}
                          aria-label={isLiked ? 'Unlike song' : 'Like song'}>
                          {isLikeLoading ? (
                            <svg
                              className='animate-spin h-5 w-5'
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
                          ) : song.liked ? (
                            <svg
                              className='w-6 h-6 text-red-500 fill-current'
                              viewBox='0 0 20 20'>
                              <path
                                fillRule='evenodd'
                                d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
                                clipRule='evenodd'
                              />
                            </svg>
                          ) : (
                            <svg
                              className='w-6 h-6'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth='2'
                                d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Artists Section */}
                    <div className='mb-2'>
                      <p className='text-xs text-gray-300'>
                        {song.artists && song.artists.length > 0 ? (
                          <span>
                            By: {song.artists.map(artist => formatAddress(artist)).join(', ')}
                          </span>
                        ) : (
                          <span className='text-gray-500'>Unknown Artist</span>
                        )}
                      </p>
                    </div>

                    <div className='flex items-center justify-between mb-3'>
                      <span className='bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded'>
                        {song.metadata.genre}
                      </span>

                      <div className='flex items-center gap-2'>
                        {currentlyPlaying === songId && isPlaying && (
                          <div className='flex items-center'>
                            <span className="flex gap-0.5">
                              <span className="w-1 h-3 bg-purple-400 rounded-sm animate-pulse" style={{animationDelay: '0ms'}}></span>
                              <span className="w-1 h-4 bg-purple-400 rounded-sm animate-pulse" style={{animationDelay: '200ms'}}></span>
                              <span className="w-1 h-2 bg-purple-400 rounded-sm animate-pulse" style={{animationDelay: '400ms'}}></span>
                            </span>
                          </div>
                        )}
                        <span className='text-xs text-gray-500'>
                          {song.metadata.release_date}
                        </span>
                      </div>
                    </div>

                    {song.metadata.description && (
                      <p className='text-sm text-gray-400 line-clamp-2 mt-2'>
                        {song.metadata.description}
                      </p>
                    )}
                  </div>

                  <div className='px-4 pb-4 pt-2 border-t border-gray-700 mt-auto'>
                    <div className='flex justify-between items-center'>
                      <span className='text-xs text-gray-500'>
                        ID: {songId}
                      </span>

                      <button
                        onClick={() => openSongDetails(songId)}
                        className='text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center'>
                        <span>Details</span>
                        <svg
                          className='w-4 h-4 ml-1'
                          viewBox='0 0 20 20'
                          fill='currentColor'>
                          <path
                            fillRule='evenodd'
                            d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Song Details Modal */}
        {modalOpen && (
          <div className='fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn'>
            <div className='bg-gradient-to-b from-slate-900 to-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700/30 animate-slideUp'>
              <div className='p-8'>
                {/* Header Section */}
                <div className='flex justify-between items-center mb-8'>
                  <h2 className='text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400'>
                    Song Details
                  </h2>
                  <div className='flex items-center gap-4'>
                    {selectedSong && (
                      <button
                        onClick={() => {
                          const song = songDetails.find(s => s.id === selectedSong);
                          if (song) {
                            togglePlayPause(song.uri, selectedSong, song.metadata.title);
                          }
                        }}
                        className='bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:scale-105'>
                        {currentlyPlaying === selectedSong && isPlaying ? (
                          <>
                            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                              <path 
                                fillRule='evenodd' 
                                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z'
                                clipRule='evenodd' 
                              />
                            </svg>
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                              <path 
                                fillRule='evenodd' 
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z'
                                clipRule='evenodd' 
                              />
                            </svg>
                            <span>Play</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setModalOpen(false)}
                      className='text-slate-400 hover:text-white transition-colors duration-300 p-2 hover:bg-slate-800/50 rounded-lg'>
                      <svg
                        className='w-6 h-6'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth='2'
                          d='M6 18L18 6M6 6l12 12'
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Music Visualization */}
                {currentlyPlaying === selectedSong && isPlaying && (
                  <div className='mb-8 bg-slate-800/30 p-6 rounded-xl border border-slate-700/30'>
                    <div className='flex items-center justify-center gap-1 h-16'>
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className='w-1 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full animate-music-bar'
                          style={{
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.8s'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Song Artists Section */}
                <div className='mb-8 bg-slate-800/30 p-6 rounded-xl border border-slate-700/30'>
                  <h3 className='text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4'>
                    Artists
                  </h3>
                  {selectedSong && songArtists[selectedSong] ? (
                    <div className='flex flex-wrap gap-3'>
                      {songArtists[selectedSong].length > 0 ? (
                        songArtists[selectedSong].map((artist, index) => (
                          <div 
                            key={index} 
                            className='bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 rounded-xl flex items-center shadow-lg transform hover:scale-105 transition-all duration-300 border border-slate-700/30'>
                            <div className='w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center mr-3 shadow-lg'>
                              <span className='text-white font-medium'>
                                {artist ? artist.toString().substring(0, 1).toUpperCase() : '?'}
                              </span>
                            </div>
                            <span className='text-white text-sm font-medium'>
                              {formatAddress(artist)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className='text-slate-400 italic'>No artists found</div>
                      )}
                    </div>
                  ) : (
                    <div className='flex items-center justify-center py-4'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                    </div>
                  )}
                </div>

                {/* Song Stats with Modern Charts */}
                <div className='mb-8'>
                  <h3 className='text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4'>
                    Stats
                  </h3>
                  {songStats ? (
                    <div className='grid grid-cols-2 gap-6'>
                      <div className='bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700/30 shadow-lg transform hover:scale-105 transition-all duration-300'>
                        <div className='text-sm text-slate-400 mb-2'>Total Likes</div>
                        <div className='text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400'>
                          {songStats.likes_count || 0}
                        </div>
                        {/* Like Trend Chart */}
                        <div className='mt-4 h-16 flex items-end gap-1'>
                          {[...Array(7)].map((_, i) => (
                            <div
                              key={i}
                              className='w-full bg-gradient-to-t from-blue-500/50 to-indigo-500/50 rounded-t-sm'
                              style={{
                                height: `${Math.random() * 100}%`,
                                animation: 'pulse 2s infinite',
                                animationDelay: `${i * 0.2}s`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className='bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700/30 shadow-lg transform hover:scale-105 transition-all duration-300'>
                        <div className='text-sm text-slate-400 mb-2'>
                          Total Comments
                        </div>
                        <div className='text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400'>
                          {songStats.comments_count || 0}
                        </div>
                        {/* Comment Activity Chart */}
                        <div className='mt-4 h-16 flex items-end gap-1'>
                          {[...Array(7)].map((_, i) => (
                            <div
                              key={i}
                              className='w-full bg-gradient-to-t from-indigo-500/50 to-blue-500/50 rounded-t-sm'
                              style={{
                                height: `${Math.random() * 100}%`,
                                animation: 'pulse 2s infinite',
                                animationDelay: `${i * 0.2}s`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='flex items-center justify-center py-4'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                    </div>
                  )}
                </div>

                {/* Engagement Metrics */}
                <div className='mb-8 bg-slate-800/30 p-6 rounded-xl border border-slate-700/30'>
                  <h3 className='text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4'>
                    Engagement
                  </h3>
                  <div className='grid grid-cols-3 gap-4'>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-blue-400 mb-1'>🔥</div>
                      <div className='text-sm text-slate-400'>Vibes</div>
                      <div className='text-lg font-bold text-white'>{Math.floor(Math.random() * 1000)}</div>
                    </div>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-indigo-400 mb-1'>🎵</div>
                      <div className='text-sm text-slate-400'>Plays</div>
                      <div className='text-lg font-bold text-white'>{Math.floor(Math.random() * 5000)}</div>
                    </div>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-blue-400 mb-1'>💫</div>
                      <div className='text-sm text-slate-400'>Shares</div>
                      <div className='text-lg font-bold text-white'>{Math.floor(Math.random() * 500)}</div>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className='bg-slate-800/30 p-6 rounded-xl border border-slate-700/30'>
                  <h3 className='text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4'>
                    Comments
                  </h3>

                  <div className='mb-6'>
                    <div className='flex gap-3'>
                      <input
                        type='text'
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder='Add a comment...'
                        className='flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300'
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={isSubmitting || !newComment.trim()}
                        className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                          isSubmitting || !newComment.trim()
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}>
                        {isSubmitting ? (
                          <div className='flex items-center gap-2'>
                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                            <span>Adding...</span>
                          </div>
                        ) : (
                          'Add Comment'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className='space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar'>
                    {comments && comments.length > 0 ? (
                      comments.map((comment, index) => (
                        <div
                          key={index}
                          className='bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 rounded-xl border border-slate-700/30 transform hover:scale-[1.02] transition-all duration-300'>
                          <div className='flex justify-between items-center mb-3'>
                            <div className='font-medium text-blue-300 truncate'>
                              {comment.user?.substring(0, 8)}...
                              {comment.user?.substring(comment.user.length - 6)}
                            </div>
                            <div className='text-xs text-slate-400'>
                              {new Date(
                                Number(comment.timestamp) * 1000
                              ).toLocaleString()}
                            </div>
                          </div>
                          <p className='text-gray-200'>{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <div className='text-center py-8 text-slate-400 italic'>
                        No comments yet. Be the first to comment!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes music-bar {
            0%, 100% { height: 20%; }
            50% { height: 100%; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .animate-music-bar {
            animation: music-bar 0.8s ease-in-out infinite;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.1);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #3b82f6, #6366f1);
            border-radius: 3px;
          }
        `}</style>
      </div>
    </div>
  )
}

export default Songs