'use client'
import { useState, useRef, useEffect } from 'react'
import { useSendTransaction, useAccount } from '@starknet-react/core'
import { uploadToIpfs } from '../contract/pinata'
import { num } from 'starknet'
import { artistContract } from '../contract/contract'
import { motion } from 'framer-motion'
import Link from 'next/link'

const CollabSongForm = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: 1200, height: 800 })

  const [formData, setFormData] = useState({
    artist2: '',
    title: '',
    genre: '',
    releaseDate: '',
    description: '',
  })
  const [songFile, setSongFile] = useState(null)
  const [coverImage, setCoverImage] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)

  const { sendAsync, error: txError } = useSendTransaction({
    calls: undefined,
  })
  const { address } = useAccount()

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSongFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSongFile(e.target.files[0])
    }
  }

  const handleCoverImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0])
    }
  }

  const submitCollaboration = async (e) => {
    e.preventDefault()

    if (!artistContract) {
      setErrorMessage('Contract not initialized')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      // Check if required fields are filled
      if (!formData.artist2 || !formData.title || !songFile) {
        throw new Error(
          'Please fill all required fields and upload a song file'
        )
      }

      // Upload song to IPFS
      const songUri = await uploadToIpfs(songFile)

      // Upload cover image to IPFS if provided
      let coverImageUri = ''
      if (coverImage) {
        coverImageUri = await uploadToIpfs(coverImage)
        console.log(coverImageUri)
      }

      // Convert release date to timestamp
      const releaseTimestamp = formData.releaseDate
        ? new Date(formData.releaseDate).getTime() / 1000
        : Math.floor(Date.now() / 1000)

      // Prepare metadata structure
      const songMetadataStruct = {
        title: formData.title,
        genre: formData.genre || '',
        release_date: num.toBigInt(releaseTimestamp),
        description: formData.description || '',
        cover_image: coverImageUri,
      }

      // Prepare and send transaction
      const call = artistContract.populate('collab_song', [
        address,
        formData.artist2,
        songUri,
        songMetadataStruct,
      ])

      const res = await sendAsync([call])
      setSuccessMessage(
        'Collaboration submitted successfully! Transaction: ' +
          res.transaction_hash
      )

      // Reset form after successful submission
      setFormData({
        artist2: '',
        title: '',
        genre: '',
        releaseDate: '',
        description: '',
      })
      setSongFile(null)
      setCoverImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (imageInputRef.current) imageInputRef.current.value = ''
    } catch (error) {
      console.error('Error submitting collaboration:', error)
      setErrorMessage(error.message || 'Failed to submit collaboration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-black via-gray-900 to-black'>
      {/* Background gradient overlay */}
      <div className='fixed inset-0 bg-gradient-to-br from-green-900/10 via-transparent to-green-800/10 z-0' />

      {/* Animated music elements background */}
      <div className='fixed inset-0 top-12 z-0 overflow-hidden'>
        {/* Music notes */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={`note-${i}`}
            initial={{
              opacity: 0,
              x: Math.random() * windowDimensions.width,
              y: Math.random() * windowDimensions.height,
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
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
            className='absolute text-green-400/20'
            style={{
              fontSize: `${Math.random() * 40 + 20}px`,
              filter: 'blur(0.5px)',
            }}>
            {['♪', '♫', '♬', '♩', '♭', '♮'][Math.floor(Math.random() * 6)]}
          </motion.div>
        ))}
      </div>

      <div className='relative z-10 py-6 px-4 sm:px-6'>
        {/* Navigation Header */}
        <div className='max-w-4xl mx-auto mb-6'>
          <div className='flex items-center justify-between'>
            <Link
              href='/start/user/profile'
              className='inline-flex items-center px-4 py-2 bg-gray-800/80 backdrop-blur-sm text-white rounded-full border border-gray-700/50 hover:bg-gray-700/80 transition-all duration-200 hover:scale-105'>
              <svg
                className='w-4 h-4 mr-2'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M10 19l-7-7m0 0l7-7m-7 7h18'
                />
              </svg>
              Back
            </Link>
            <div className='text-sm text-gray-400 font-medium'>
              Collaborate
            </div>
          </div>
        </div>

        <div className='max-w-4xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden'>
            
            {/* Header Section */}
            <div className='bg-gradient-to-r from-green-600/20 to-green-500/20 p-8 pb-6 border-b border-white/10'>
              <h1 className='text-4xl font-bold text-white mb-2 tracking-tight'>
                New Collaboration
              </h1>
              <p className='text-gray-300 text-lg'>
                Create a collaborative song between two artists
              </p>
            </div>

            <div className='p-8'>
              {/* Alert Messages */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className='mb-6 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-300 rounded-2xl'>
                  <div className='flex items-center'>
                    <svg className='w-5 h-5 mr-3 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' />
                    </svg>
                    {errorMessage}
                  </div>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className='mb-6 p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/20 text-green-300 rounded-2xl'>
                  <div className='flex items-center'>
                    <svg className='w-5 h-5 mr-3 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' />
                    </svg>
                    {successMessage}
                  </div>
                </motion.div>
              )}

              {txError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className='mb-6 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-300 rounded-2xl'>
                  <div className='flex items-center'>
                    <svg className='w-5 h-5 mr-3 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' />
                    </svg>
                    Transaction Error: {txError.message}
                  </div>
                </motion.div>
              )}

              <form onSubmit={submitCollaboration} className='space-y-8'>
                {/* Artist Address Section */}
                <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10'>
                  <h3 className='text-xl font-semibold text-white mb-4 flex items-center'>
                    <svg className='w-6 h-6 mr-3 text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' />
                    </svg>
                    Collaborator
                  </h3>
                  <div>
                    <label htmlFor='artist2' className='block text-sm font-medium text-gray-300 mb-2'>
                      Artist 2 Address <span className='text-red-400'>*</span>
                    </label>
                    <input
                      type='text'
                      id='artist2'
                      name='artist2'
                      value={formData.artist2}
                      onChange={handleChange}
                      placeholder='0x...'
                      className='w-full p-4 bg-black/20 backdrop-blur-sm border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 placeholder-gray-400 transition-all duration-200'
                      required
                    />
                    <p className='mt-2 text-xs text-gray-400'>
                      Enter the contract address of the second artist
                    </p>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10'>
                  <h3 className='text-xl font-semibold text-white mb-4 flex items-center'>
                    <svg className='w-6 h-6 mr-3 text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M9 19V6l6-6v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z' />
                    </svg>
                    Audio File
                  </h3>
                  <div>
                    <label htmlFor='songFile' className='block text-sm font-medium text-gray-300 mb-2'>
                      Song File <span className='text-red-400'>*</span>
                    </label>
                    <div className='relative'>
                      <input
                        type='file'
                        id='songFile'
                        ref={fileInputRef}
                        accept='audio/*'
                        onChange={handleSongFileChange}
                        className='w-full p-4 bg-black/20 backdrop-blur-sm border-2 border-dashed border-white/20 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500/20 file:text-green-300 hover:file:bg-green-500/30 transition-all duration-200'
                        required
                      />
                    </div>
                    <p className='mt-2 text-xs text-gray-400'>
                      Upload your song file (MP3, WAV, FLAC, etc.)
                    </p>
                  </div>

                  {songFile && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mt-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20'>
                      <div className='flex items-center'>
                        <div className='w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mr-4'>
                          <svg className='w-6 h-6 text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M9 19V6l6-6v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z' />
                          </svg>
                        </div>
                        <div>
                          <p className='text-sm font-medium text-white'>{songFile.name}</p>
                          <p className='text-xs text-gray-400'>
                            {(songFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Song Metadata Section */}
                <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10'>
                  <h3 className='text-xl font-semibold text-white mb-6 flex items-center'>
                    <svg className='w-6 h-6 mr-3 text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                    Song Details
                  </h3>

                  <div className='space-y-6'>
                    <div>
                      <label htmlFor='title' className='block text-sm font-medium text-gray-300 mb-2'>
                        Song Title <span className='text-red-400'>*</span>
                      </label>
                      <input
                        type='text'
                        id='title'
                        name='title'
                        value={formData.title}
                        onChange={handleChange}
                        placeholder='Enter song title'
                        className='w-full p-4 bg-black/20 backdrop-blur-sm border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 placeholder-gray-400 transition-all duration-200'
                        required
                      />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div>
                        <label htmlFor='genre' className='block text-sm font-medium text-gray-300 mb-2'>
                          Genre
                        </label>
                        <select
                          id='genre'
                          name='genre'
                          value={formData.genre}
                          onChange={handleChange}
                          className='w-full p-4 bg-black/20 backdrop-blur-sm border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-200'>
                          <option value=''>Select a genre</option>
                          <option value='pop'>Pop</option>
                          <option value='rock'>Rock</option>
                          <option value='hip-hop'>Hip-Hop</option>
                          <option value='r&b'>R&B</option>
                          <option value='electronic'>Electronic</option>
                          <option value='jazz'>Jazz</option>
                          <option value='classical'>Classical</option>
                          <option value='country'>Country</option>
                          <option value='folk'>Folk</option>
                          <option value='metal'>Metal</option>
                          <option value='indie'>Indie</option>
                          <option value='other'>Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor='releaseDate' className='block text-sm font-medium text-gray-300 mb-2'>
                          Release Date
                        </label>
                        <input
                          type='date'
                          id='releaseDate'
                          name='releaseDate'
                          value={formData.releaseDate}
                          onChange={handleChange}
                          className='w-full p-4 bg-black/20 backdrop-blur-sm border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-200'
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor='coverImage' className='block text-sm font-medium text-gray-300 mb-2'>
                        Cover Art
                      </label>
                      <input
                        type='file'
                        id='coverImage'
                        ref={imageInputRef}
                        accept='image/*'
                        onChange={handleCoverImageChange}
                        className='w-full p-4 bg-black/20 backdrop-blur-sm border-2 border-dashed border-white/20 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500/20 file:text-green-300 hover:file:bg-green-500/30 transition-all duration-200'
                      />
                      <p className='mt-2 text-xs text-gray-400'>
                        Upload cover art for your song (optional)
                      </p>
                    </div>

                    {coverImage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='p-4 bg-white/5 rounded-xl border border-white/10 flex items-center space-x-4'>
                        <div className='w-16 h-16 bg-black/20 rounded-xl overflow-hidden'>
                          <img
                            src={URL.createObjectURL(coverImage)}
                            alt='Cover preview'
                            className='w-full h-full object-cover'
                          />
                        </div>
                        <div>
                          <p className='text-sm font-medium text-white'>{coverImage.name}</p>
                          <p className='text-xs text-gray-400'>
                            {(coverImage.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <div>
                      <label htmlFor='description' className='block text-sm font-medium text-gray-300 mb-2'>
                        Description
                      </label>
                      <textarea
                        id='description'
                        name='description'
                        value={formData.description}
                        onChange={handleChange}
                        rows='4'
                        placeholder='Describe the song and collaboration...'
                        className='w-full p-4 bg-black/20 backdrop-blur-sm border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 placeholder-gray-400 resize-none transition-all duration-200'
                      />
                    </div>
                  </div>
                </div>

                {/* Wallet Info Section */}
                <div className='bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <div className='w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center'>
                        <svg className='w-5 h-5 text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                        </svg>
                      </div>
                      <div>
                        <p className='text-sm font-medium text-white'>Connected Wallet</p>
                        <code className='text-xs text-gray-400 font-mono'>
                          {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Not connected'}
                        </code>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      address ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {address ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                  <p className='mt-3 text-xs text-gray-400'>
                    The transaction must be sent from one of the artist addresses or by an authorized address
                  </p>
                </div>

                {/* Submit Button */}
                <div className='pt-4'>
                  <motion.button
                    type='submit'
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className={`w-full py-4 px-6 bg-gradient-to-r from-green-600 via-green-500 to-green-600 hover:from-green-500 hover:via-green-400 hover:to-green-500 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-transparent ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-green-500/25'
                    }`}>
                    {isLoading ? (
                      <div className='flex items-center justify-center'>
                        <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3'></div>
                        Creating Collaboration...
                      </div>
                    ) : (
                      <div className='flex items-center justify-center'>
                        <svg className='w-5 h-5 mr-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 4v16m8-8H4' />
                        </svg>
                        Create Collaboration
                      </div>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default CollabSongForm