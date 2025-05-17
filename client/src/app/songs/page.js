'use client'
import { useAccount, useSendTransaction } from '@starknet-react/core'
import { useEffect, useState } from 'react'
import {
  songABI,
  songContractAddress,
  songContract,
  artistContract,
} from '../../contract/contract'
import { Contract } from 'starknet'

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
        return;
      } else {
        audioPlayer.play();
        setIsPlaying(true);
        return;
      }
    }
    else{
      console.log(currentlyPlaying, songId)
      setIsPlaying(false);
      audioPlayer.src = "https://"+uri;
      audioPlayer.play();
      console.log(songId, uri)
      setCurrentlyPlaying(songId)
      setIsPlaying(true);
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
  };
  
  audio.onerror = (e) => {
    console.log('Audio error:', e);
    console.error(`Error playing audio: ${e}`);
    alert(`Could not play ${title}. The audio file may be unavailable.`);
    setIsPlaying(false);
  };
  
  // When audio finishes playing
  audio.onended = () => {
    setIsPlaying(false);
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
                      onClick={() => togglePlayPause(song.uri, songId, song.metadata.title)}>
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
          <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
            <div className='bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto'>
                              <div className='p-6'>
                <div className='flex justify-between items-center mb-6'>
                  <h2 className='text-2xl font-bold text-white'>
                    Song Details
                  </h2>
                  <div className='flex items-center gap-3'>
                    {selectedSong && (
                      <button
                        onClick={() => {
                          const song = songDetails.find(s => s.id === selectedSong);
                          if (song) {
                            togglePlayPause(song.uri, selectedSong, song.metadata.title);
                          }
                        }}
                        className='bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-md shadow transition-colors flex items-center gap-2'>
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
                      className='text-gray-400 hover:text-white'>
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

                {/* Song Artists Section */}
                <div className='mb-6'>
                  <h3 className='text-lg font-semibold text-purple-400 mb-4'>
                    Artists
                  </h3>
                  {selectedSong && songArtists[selectedSong] ? (
                    <div className='flex flex-wrap gap-2'>
                      {songArtists[selectedSong].length > 0 ? (
                        songArtists[selectedSong].map((artist, index) => (
                          <div 
                            key={index} 
                            className='bg-gray-700 px-3 py-2 rounded-lg flex items-center'>
                            <div className='w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-2'>
                              {artist ? artist.toString().substring(0, 1) : '?'}
                            </div>
                            <span className='text-white text-sm'>
                              {formatAddress(artist)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className='text-gray-400'>No artists found</div>
                      )}
                    </div>
                  ) : (
                    <div className='text-gray-400'>Loading artists...</div>
                  )}
                </div>

                {/* Song Stats */}
                <div className='mb-8'>
                  <h3 className='text-lg font-semibold text-purple-400 mb-4'>
                    Stats
                  </h3>
                  {songStats ? (
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='bg-gray-700 p-4 rounded-lg'>
                        <div className='text-sm text-gray-400'>Total Likes</div>
                        <div className='text-2xl font-bold text-white'>
                          {songStats.likes_count || 0}
                        </div>
                      </div>
                      <div className='bg-gray-700 p-4 rounded-lg'>
                        <div className='text-sm text-gray-400'>
                          Total Comments
                        </div>
                        <div className='text-2xl font-bold text-white'>
                          {songStats.comments_count || 0}
                        </div>
                      </div>
                      {/* Add more stats as needed */}
                    </div>
                  ) : (
                    <div className='text-gray-400'>Loading stats...</div>
                  )}
                </div>

                {/* Comments Section */}
                <div>
                  <h3 className='text-lg font-semibold text-purple-400 mb-4'>
                    Comments
                  </h3>

                  <div className='mb-4'>
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder='Add a comment...'
                        className='flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={isSubmitting || !newComment.trim()}
                        className={`bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors ${
                          isSubmitting || !newComment.trim()
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}>
                        {isSubmitting ? 'Adding...' : 'Add Comment'}
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className='space-y-4 max-h-[300px] overflow-y-auto pr-2'>
                    {comments && comments.length > 0 ? (
                      comments.map((comment, index) => (
                        <div
                          key={index}
                          className='bg-gray-700 p-4 rounded-lg'>
                          <div className='flex justify-between items-center mb-2'>
                            <div className='font-medium text-gray-300 truncate'>
                              {comment.user?.substring(0, 8)}...
                              {comment.user?.substring(comment.user.length - 6)}
                            </div>
                            <div className='text-xs text-gray-500'>
                              {new Date(
                                Number(comment.timestamp) * 1000
                              ).toLocaleString()}
                            </div>
                          </div>
                          <p className='text-white'>{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <div className='text-center py-6 text-gray-400'>
                        No comments yet. Be the first to comment!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Songs