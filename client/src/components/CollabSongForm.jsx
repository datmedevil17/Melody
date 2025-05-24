'use client'
import { useState, useRef } from 'react'
import { useSendTransaction, useAccount } from '@starknet-react/core'
import { uploadToIpfs } from '../contract/pinata'
import { num } from 'starknet'
import { artistContract } from '../contract/contract'
import { motion } from 'framer-motion'
import Link from 'next/link'

const CollabSongForm = () => {
  const [isLoading, setIsLoading] = useState(false)

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
        {/* Back button */}
        <div className='max-w-3xl mx-auto mb-4'>
          <Link
            href='/user/profile'
            className='inline-flex items-center px-4 py-2 bg-[#001a00]/70 text-[#90EE90] rounded-lg border border-[#004d00] hover:bg-[#002a00] transition-colors'>
            <svg
              className='w-5 h-5 mr-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M10 19l-7-7m0 0l7-7m-7 7h18'
              />
            </svg>
            Back to Profile
          </Link>
        </div>

        <div className='max-w-3xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-[#001a00]/50 rounded-xl border border-[#004d00] shadow-lg overflow-hidden p-6'>
            <h1
              className='text-3xl font-bold text-[#90EE90] mb-2'
              style={{ fontFamily: "'Audiowide', cursive" }}>
              Register Collaborative Song
            </h1>
            <p className='text-[#90EE90]/70 mb-6'>
              Create a new collaborative song between two artists on the
              blockchain.
            </p>

            {errorMessage && (
              <div className='mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-300 rounded-md'>
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className='mb-4 p-3 bg-green-900/30 border border-green-500/50 text-green-300 rounded-md'>
                {successMessage}
              </div>
            )}

            {txError && (
              <div className='mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-300 rounded-md'>
                Transaction Error: {txError.message}
              </div>
            )}

            <form
              onSubmit={submitCollaboration}
              className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='artist2'
                    className='block text-sm font-medium text-[#90EE90] mb-1'>
                    Artist 2 Address: <span className='text-red-400'>*</span>
                  </label>
                  <input
                    type='text'
                    id='artist2'
                    name='artist2'
                    value={formData.artist2}
                    onChange={handleChange}
                    placeholder='0x...'
                    className='w-full p-3 bg-[#002200]/50 border border-[#004d00] text-[#90EE90] rounded-md focus:ring-2 focus:ring-[#90EE90]/50 focus:border-[#90EE90] placeholder-[#90EE90]/30'
                    required
                  />
                  <p className='mt-1 text-xs text-[#90EE90]/50'>
                    Enter the contract address of the second artist
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor='songFile'
                  className='block text-sm font-medium text-[#90EE90] mb-1'>
                  Song File: <span className='text-red-400'>*</span>
                </label>
                <input
                  type='file'
                  id='songFile'
                  ref={fileInputRef}
                  accept='audio/*'
                  onChange={handleSongFileChange}
                  className='w-full p-3 bg-[#002200]/50 border border-[#004d00] text-[#90EE90] rounded-md focus:ring-2 focus:ring-[#90EE90]/50 focus:border-[#90EE90] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#90EE90]/10 file:text-[#90EE90] hover:file:bg-[#90EE90]/20'
                  required
                />
                <p className='mt-1 text-xs text-[#90EE90]/50'>
                  Upload your song file (mp3, wav, etc.)
                </p>
              </div>

              {songFile && (
                <div className='p-3 bg-[#002200]/30 rounded-md border border-[#004d00]'>
                  <p className='text-sm font-medium text-[#90EE90]'>
                    Selected File: {songFile.name}
                  </p>
                  <p className='text-xs text-[#90EE90]/50'>
                    Size: {(songFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className='bg-[#002200]/30 p-6 rounded-lg border border-[#004d00]'>
                <h2 className='text-xl font-medium text-[#90EE90] mb-4'>
                  Song Metadata
                </h2>

                <div className='space-y-4'>
                  <div>
                    <label
                      htmlFor='title'
                      className='block text-sm font-medium text-[#90EE90] mb-1'>
                      Title: <span className='text-red-400'>*</span>
                    </label>
                    <input
                      type='text'
                      id='title'
                      name='title'
                      value={formData.title}
                      onChange={handleChange}
                      className='w-full p-3 bg-[#002200]/50 border border-[#004d00] text-[#90EE90] rounded-md focus:ring-2 focus:ring-[#90EE90]/50 focus:border-[#90EE90]'
                      required
                    />
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label
                        htmlFor='genre'
                        className='block text-sm font-medium text-[#90EE90] mb-1'>
                        Genre:
                      </label>
                      <select
                        id='genre'
                        name='genre'
                        value={formData.genre}
                        onChange={handleChange}
                        className='w-full p-3 bg-[#002200]/50 border border-[#004d00] text-[#90EE90] rounded-md focus:ring-2 focus:ring-[#90EE90]/50 focus:border-[#90EE90]'>
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
                  </div>

                  <div>
                    <label
                      htmlFor='releaseDate'
                      className='block text-sm font-medium text-[#90EE90] mb-1'>
                      Release Date:
                    </label>
                    <input
                      type='date'
                      id='releaseDate'
                      name='releaseDate'
                      value={formData.releaseDate}
                      onChange={handleChange}
                      className='w-full p-3 bg-[#002200]/50 border border-[#004d00] text-[#90EE90] rounded-md focus:ring-2 focus:ring-[#90EE90]/50 focus:border-[#90EE90]'
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='coverImage'
                      className='block text-sm font-medium text-[#90EE90] mb-1'>
                      Cover Image:
                    </label>
                    <input
                      type='file'
                      id='coverImage'
                      ref={imageInputRef}
                      accept='image/*'
                      onChange={handleCoverImageChange}
                      className='w-full p-3 bg-[#002200]/50 border border-[#004d00] text-[#90EE90] rounded-md focus:ring-2 focus:ring-[#90EE90]/50 focus:border-[#90EE90] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#90EE90]/10 file:text-[#90EE90] hover:file:bg-[#90EE90]/20'
                    />
                    <p className='mt-1 text-xs text-[#90EE90]/50'>
                      Upload cover art for your song (optional)
                    </p>
                  </div>

                  {coverImage && (
                    <div className='p-3 bg-[#002200]/30 rounded-md border border-[#004d00] flex items-center space-x-3'>
                      <div className='w-16 h-16 bg-[#002200] rounded overflow-hidden'>
                        <img
                          src={URL.createObjectURL(coverImage)}
                          alt='Cover preview'
                          className='w-full h-full object-cover'
                        />
                      </div>
                      <div>
                        <p className='text-sm font-medium text-[#90EE90]'>
                          {coverImage.name}
                        </p>
                        <p className='text-xs text-[#90EE90]/50'>
                          Size: {(coverImage.size / (1024 * 1024)).toFixed(2)}{' '}
                          MB
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor='description'
                      className='block text-sm font-medium text-[#90EE90] mb-1'>
                      Description:
                    </label>
                    <textarea
                      id='description'
                      name='description'
                      value={formData.description}
                      onChange={handleChange}
                      rows='4'
                      placeholder='Describe the song and collaboration...'
                      className='w-full p-3 bg-[#002200]/50 border border-[#004d00] text-[#90EE90] rounded-md focus:ring-2 focus:ring-[#90EE90]/50 focus:border-[#90EE90] placeholder-[#90EE90]/30'
                    />
                  </div>
                </div>
              </div>

              <div className='p-4 bg-[#002200]/30 rounded-md border border-[#004d00]'>
                <div className='flex items-center space-x-2'>
                  <span className='text-sm font-medium text-[#90EE90]'>
                    Current Wallet Address:
                  </span>
                  <code className='bg-[#002200] p-1 rounded text-sm text-[#90EE90]/70'>
                    {address || 'Not connected'}
                  </code>
                </div>
                <p className='mt-1 text-xs text-[#90EE90]/50'>
                  Note: The transaction must be sent from one of the artist
                  addresses or by an authorized address
                </p>
              </div>

              <div className='mt-6'>
                <button
                  type='submit'
                  disabled={isLoading}
                  className={`w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-md shadow-lg transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#90EE90]/50 ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}>
                  {isLoading ? (
                    <div className='flex items-center justify-center'>
                      <div className='w-5 h-5 border-2 border-t-current border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mr-2'></div>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Collaboration'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default CollabSongForm
