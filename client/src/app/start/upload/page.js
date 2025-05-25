'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { uploadToIpfs, uploadToIpfsJson } from '../../../contract/pinata'
import {
  useAccount,
  useContract,
  useProvider,
  useSendTransaction,
} from '@starknet-react/core'
import { artistABI, artistContractAddress } from '../../../contract/contract'
import { shortString, uint256, num, hash } from 'starknet'
import SHA256 from 'crypto-js/sha256'
import { motion } from 'framer-motion'

// Utility function to hash IPFS hash to a shorter format
const hashIpfsHash = (ipfsHash) => {
  // Generate SHA-256 hash of the IPFS hash
  const hash = SHA256(ipfsHash).toString()
  // Take first 31 characters to fit in felt
  return hash.substring(0, 31)
}

const extractIpfsHash = (ipfsUrl) => {
  // Extract hash from ipfs://QmHash format
  const hash = ipfsUrl.replace('ipfs://', '')
  return {
    originalHash: hash,
    shortenedHash: hashIpfsHash(hash),
  }
}

// Convert date string to UNIX timestamp (seconds since epoch) for u64 type
const dateToTimestamp = (dateString) => {
  if (!dateString) return 0
  const date = new Date(dateString)
  // Convert milliseconds to seconds and ensure it's a valid integer
  return Math.floor(date.getTime() / 1000)
}

const UploadSong = () => {
  const { address } = useAccount()
  const provider = useProvider()
  const { contract } = useContract({
    address: artistContractAddress,
    abi: artistABI,
    provider,
  })

  const [songFile, setSongFile] = useState('')
  const [songHash, setSongHash] = useState(null)
  const [coverImage, setCoverImage] = useState('')
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [coverImageHash, setCoverImageHash] = useState(null)
  const [metadata, setMetadata] = useState({
    title: '',
    genre: '',
    release_date: '',
    description: '',
    cover_image: '',
    song_hash: '',
  })
  const [loading, setLoading] = useState(false)
  const [songUploading, setSongUploading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Fix: Initialize useSendTransaction hook with proper function destructuring
  const { sendAsync, error: txError } = useSendTransaction({ calls: undefined })

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    setSongUploading(true)
    setLoading(true)
    if (file && file !== songFile) {
      try {
        const res = await uploadToIpfs(file)
        console.log('File upload response:', res)
        setSongFile(file)
        setSongHash(res)

        // Update metadata with song hash
        setMetadata((prev) => ({
          ...prev,
          song_hash: res,
        }))
      } catch (err) {
        console.error('Error uploading song:', err)
        setError('Failed to upload song file to IPFS')
      }
    }
    setSongUploading(false)
    setLoading(false)
  }

  const handleCoverImageChange = async (e) => {
    const file = e.target.files[0]
    setImageUploading(true)
    setLoading(true)
    if (file && file !== coverImageFile) {
      try {
        // Preview the image
        const reader = new FileReader()
        reader.onload = (e) => {
          setCoverImage(e.target.result)
        }
        reader.readAsDataURL(file)
        setCoverImageFile(file)

        // Upload to IPFS
        const res = await uploadToIpfs(file)
        console.log('Cover image upload response:', res)
        setCoverImageHash(res)

        // Update metadata
        setMetadata((prev) => ({
          ...prev,
          cover_image: res,
        }))
      } catch (err) {
        console.error('Error uploading cover image:', err)
        setError('Failed to upload cover image to IPFS')
      }
    }
    setImageUploading(false)
    setLoading(false)
  }

  const handleMetadataChange = (e) => {
    setMetadata({
      ...metadata,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!contract || !address || !songFile) {
      setError('Missing required data')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Convert release_date to u64 timestamp
      const releaseTimestamp = dateToTimestamp(metadata.release_date)
      // Create the metadata struct with proper types as expected by the contract
      const songMetadataStruct = {
        title: metadata.title,
        genre: metadata.genre,
        release_date: num.toBigInt(releaseTimestamp), // This should be a u64 number
        description: metadata.description,
        cover_image: metadata.cover_image, // Include cover image hash if available
      }

      // Fix: Properly prepare the transaction call
      if (!contract) {
        throw new Error('Contract is not initialized')
      }
      console.log({
        address,
        songHash,
        coverImageHash,
        songMetadataStruct,
      })

      const call = contract.populate('upload_song', [
        address,
        songHash,
        songMetadataStruct,
      ])
      const res = await sendAsync([call])

      console.log('Transaction response:', res)

      setSuccess(true)

      // Reset form on success
      setSongFile(null)
      setCoverImage(null)
      setCoverImageFile(null)
      setCoverImageHash(null)
      setMetadata({
        title: '',
        genre: '',
        release_date: '',
        description: '',
        cover_image: '',
        song_hash: '',
      })
    } catch (err) {
      console.error('Error uploading song:', err)
      setError(err.message || 'An error occurred while uploading the song')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-black text-white overflow-hidden'>
      {/* Enhanced Background with Apple-like gradient */}
      <div className='fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black' />
      <div className='fixed inset-0 bg-gradient-to-t from-green-950/20 via-transparent to-green-900/10' />
      
      {/* Animated floating elements - more subtle and Apple-like */}
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        {/* Floating orbs */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            initial={{
              opacity: 0,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
            }}
            transition={{
              duration: Math.random() * 30 + 20,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            className='absolute w-32 h-32 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-500/20 blur-xl'
          />
        ))}
        
        {/* Music notes - more refined */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`note-${i}`}
            initial={{
              opacity: 0,
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 50,
            }}
            animate={{
              opacity: [0, 0.4, 0],
              x: Math.random() * window.innerWidth,
              y: -50,
              rotate: 360,
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              ease: 'linear',
              delay: Math.random() * 5,
            }}
            className='absolute text-green-400/30 text-2xl font-light'
          >
            {['♪', '♫', '♬'][Math.floor(Math.random() * 3)]}
          </motion.div>
        ))}
      </div>

      <div className='relative z-10'>
        <div className='max-w-6xl mx-auto px-6 py-8'>
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className='mb-12'
          >
            {/* Back button - Apple style */}
            <Link
              href='/start/user/profile'
              className='inline-flex items-center text-green-400 hover:text-green-300 transition-colors mb-8 group'
            >
              <svg
                className='w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M10 19l-7-7m0 0l7-7m-7 7h18'
                />
              </svg>
              Back to Profile
            </Link>

            {/* Title */}
            <h1 className='text-5xl font-bold text-white mb-3 tracking-tight'>
              Upload Music
            </h1>
            <p className='text-gray-400 text-lg font-medium'>
              Share your sound with the world
            </p>
          </motion.div>

          {!address ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className='text-center p-8 bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 max-w-md mx-auto'
            >
              <div className='w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg className='w-8 h-8 text-white' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z' clipRule='evenodd' />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-white mb-2'>Wallet Required</h3>
              <p className='text-gray-400'>Connect your wallet to start uploading music</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <form onSubmit={handleSubmit} className='space-y-8'>
                <div className='grid grid-cols-1 xl:grid-cols-3 gap-8'>
                  {/* Left Column - Media Upload */}
                  <div className='xl:col-span-1 space-y-6'>
                    {/* Cover Art Section */}
                    <div className='bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6'>
                      <h3 className='text-lg font-semibold text-white mb-4 flex items-center'>
                        <svg className='w-5 h-5 mr-2 text-green-400' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z' clipRule='evenodd' />
                        </svg>
                        Cover Art
                      </h3>
                      
                      <div className='relative'>
                        {coverImage ? (
                          <div className='relative aspect-square rounded-xl overflow-hidden bg-gray-800 mb-4'>
                            <img
                              src={coverImage}
                              alt='Cover preview'
                              className='w-full h-full object-cover'
                            />
                            <div className='absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity'>
                              <label className='cursor-pointer bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/70 transition-colors'>
                                Change Image
                                <input
                                  type='file'
                                  accept='image/*'
                                  onChange={handleCoverImageChange}
                                  className='sr-only'
                                  disabled={loading}
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className='aspect-square rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center mb-4 hover:border-green-400 transition-colors'>
                            <label className='cursor-pointer text-center p-8'>
                              <svg className='w-12 h-12 text-gray-500 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 0 48 48'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02' />
                              </svg>
                              <p className='text-gray-400 text-sm mb-2'>Click to upload cover art</p>
                              <p className='text-gray-500 text-xs'>PNG, JPG up to 10MB</p>
                              <input
                                type='file'
                                accept='image/*'
                                onChange={handleCoverImageChange}
                                className='sr-only'
                                disabled={loading}
                              />
                            </label>
                          </div>
                        )}
                        
                        {imageUploading && (
                          <div className='flex items-center justify-center text-sm text-green-400 mb-2'>
                            <svg className='animate-spin h-4 w-4 mr-2' fill='none' viewBox='0 0 24 24'>
                              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                            </svg>
                            Uploading...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio File Section */}
                    <div className='bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6'>
                      <h3 className='text-lg font-semibold text-white mb-4 flex items-center'>
                        <svg className='w-5 h-5 mr-2 text-green-400' fill='currentColor' viewBox='0 0 20 20'>
                          <path d='M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z' />
                        </svg>
                        Audio File *
                      </h3>
                      
                      <div className='space-y-3'>
                        <div className='relative'>
                          <label className='block w-full cursor-pointer'>
                            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                              songFile 
                                ? 'border-green-400 bg-green-400/5' 
                                : 'border-gray-600 hover:border-green-400'
                            }`}>
                              {songFile ? (
                                <div className='space-y-2'>
                                  <svg className='w-8 h-8 text-green-400 mx-auto' fill='currentColor' viewBox='0 0 20 20'>
                                    <path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                                  </svg>
                                  <p className='text-green-400 font-medium'>{songFile.name}</p>
                                  <p className='text-green-300 text-sm'>Click to change file</p>
                                </div>
                              ) : (
                                <div className='space-y-2'>
                                  <svg className='w-8 h-8 text-gray-500 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
                                  </svg>
                                  <p className='text-gray-400'>Click to upload audio file</p>
                                  <p className='text-gray-500 text-sm'>MP3, WAV, FLAC up to 100MB</p>
                                </div>
                              )}
                            </div>
                            <input
                              type='file'
                              accept='audio/*'
                              onChange={handleFileChange}
                              className='sr-only'
                              disabled={loading}
                              required
                            />
                          </label>
                        </div>
                        
                        {songUploading && (
                          <div className='flex items-center justify-center text-sm text-green-400'>
                            <svg className='animate-spin h-4 w-4 mr-2' fill='none' viewBox='0 0 24 24'>
                              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                            </svg>
                            Uploading to IPFS...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Columns - Metadata */}
                  <div className='xl:col-span-2 space-y-6'>
                    <div className='bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6'>
                      <h3 className='text-lg font-semibold text-white mb-6 flex items-center'>
                        <svg className='w-5 h-5 mr-2 text-green-400' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z' clipRule='evenodd' />
                        </svg>
                        Track Information
                      </h3>
                      
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div>
                          <label className='block text-sm font-medium text-gray-300 mb-2'>
                            Title *
                          </label>
                          <input
                            type='text'
                            name='title'
                            value={metadata.title}
                            onChange={handleMetadataChange}
                            placeholder='Enter song title'
                            className='w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all'
                            required
                          />
                        </div>
                        
                        <div>
                          <label className='block text-sm font-medium text-gray-300 mb-2'>
                            Genre *
                          </label>
                          <input
                            type='text'
                            name='genre'
                            value={metadata.genre}
                            onChange={handleMetadataChange}
                            placeholder='e.g. Pop, Rock, Electronic'
                            className='w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all'
                            required
                          />
                        </div>
                        
                        <div>
                          <label className='block text-sm font-medium text-gray-300 mb-2'>
                            Release Date *
                          </label>
                          <input
                            type='date'
                            name='release_date'
                            value={metadata.release_date}
                            onChange={handleMetadataChange}
                            className='w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all'
                            required
                          />
                        </div>
                        
                        <div className='md:col-span-2'>
                          <label className='block text-sm font-medium text-gray-300 mb-2'>
                            Description *
                          </label>
                          <textarea
                            name='description'
                            value={metadata.description}
                            onChange={handleMetadataChange}
                            placeholder='Tell us about your track...'
                            className='w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all resize-none'
                            rows='4'
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Section */}
                <div className='flex flex-col items-center space-y-4 pt-8'>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type='submit'
                    disabled={!songFile || loading || !address}
                    className='w-full max-w-md bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-8 rounded-2xl font-semibold text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl'
                  >
                    {loading ? (
                      <span className='flex items-center justify-center'>
                        <svg className='animate-spin h-5 w-5 mr-3' fill='none' viewBox='0 0 24 24'>
                          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                        Publishing...
                      </span>
                    ) : (
                      'Publish Track'
                    )}
                  </motion.button>

                  {/* Error Message */}
                  {(error || txError) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='w-full max-w-md p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-center backdrop-blur-sm'
                    >
                      <div className='flex items-center justify-center mb-2'>
                        <svg className='w-5 h-5 mr-2' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                        </svg>
                        Upload Failed
                      </div>
                      <p className='text-sm'>{error || txError?.message}</p>
                    </motion.div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className='w-full max-w-md p-4 bg-green-900/30 border border-green-800 rounded-xl text-green-400 text-center backdrop-blur-sm'
                    >
                      <div className='flex items-center justify-center mb-2'>
                        <svg className='w-5 h-5 mr-2' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                        </svg>
                        Success!
                      </div>
                      <p className='text-sm'>Your track has been published successfully</p>
                    </motion.div>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadSong