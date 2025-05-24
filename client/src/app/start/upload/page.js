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

      <div className='relative z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          {/* Back button */}
          <div className='mb-6'>
            <Link
              href='/user/profile'
              className='inline-flex items-center px-4 py-2 bg-[#001a00]/70 text-[#90EE90] rounded-lg border border-[#004d00] hover:bg-[#002a00] transition-colors transform hover:scale-105 duration-200'>
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

          <h1
            className='text-4xl font-bold mb-8 text-center text-[#90EE90]'
            style={{ fontFamily: "'Audiowide', cursive" }}>
            Upload Your Music
          </h1>

          {!address ? (
            <div className='text-center p-4 bg-[#004d00]/30 rounded-lg max-w-md mx-auto'>
              <p className='text-[#90EE90] font-medium'>
                Please connect your wallet first
              </p>
            </div>
          ) : (
            <div className='space-y-6'>
              <form
                onSubmit={handleSubmit}
                className='space-y-6'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  <div className='space-y-6'>
                    <div className='bg-[#001a00]/50 p-4 rounded-xl'>
                      <label className='block text-lg font-medium mb-3 text-[#90EE90]'>
                        Song File
                      </label>
                      <div className='relative'>
                        <div className='flex items-center'>
                          <label className='cursor-pointer bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-l-lg transition-all duration-300 transform hover:scale-105'>
                            <span>Choose File</span>
                            <input
                              type='file'
                              accept='audio/*'
                              onChange={handleFileChange}
                              className='sr-only'
                              disabled={loading}
                              required
                            />
                          </label>
                          <div className='bg-[#002200] text-[#90EE90] truncate border-l-0 border border-[#004d00] rounded-r-lg px-3 py-2 flex-1'>
                            {songFile ? songFile.name : 'No file chosen'}
                          </div>
                        </div>
                      </div>
                      {songUploading && (
                        <div className='mt-3 flex items-center text-sm text-[#90EE90]'>
                          <svg
                            className='animate-spin h-4 w-4 mr-2'
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
                          Uploading to IPFS...
                        </div>
                      )}
                      {songFile && !songUploading && (
                        <p className='mt-3 text-sm text-[#90EE90]'>
                          ✓ File uploaded successfully
                        </p>
                      )}
                      {songHash && (
                        <div className='mt-3 text-xs text-[#90EE90]/70 break-all'>
                          <p>IPFS Hash: {songHash}</p>
                        </div>
                      )}
                    </div>

                    <div className='bg-[#001a00]/50 p-4 rounded-xl'>
                      <label className='block text-lg font-medium mb-3 text-[#90EE90]'>
                        Cover Image
                      </label>
                      <div className='relative'>
                        <div className='flex items-center'>
                          <label className='cursor-pointer bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-l-lg transition-all duration-300 transform hover:scale-105'>
                            <span>Choose Image</span>
                            <input
                              type='file'
                              accept='image/*'
                              onChange={handleCoverImageChange}
                              className='sr-only'
                              disabled={loading}
                            />
                          </label>
                          <div className='bg-[#002200] text-[#90EE90] truncate border-l-0 border border-[#004d00] rounded-r-lg px-3 py-2 flex-1'>
                            {coverImageFile
                              ? coverImageFile.name
                              : 'No image chosen'}
                          </div>
                        </div>
                      </div>
                      {imageUploading && (
                        <div className='mt-3 flex items-center text-sm text-[#90EE90]'>
                          <svg
                            className='animate-spin h-4 w-4 mr-2'
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
                          Uploading to IPFS...
                        </div>
                      )}
                      {coverImage && !imageUploading && (
                        <div className='mt-3'>
                          <p className='text-sm text-[#90EE90] mb-2'>
                            ✓ Image uploaded successfully
                          </p>
                          <div className='relative w-full h-40 bg-[#002200] rounded-lg overflow-hidden'>
                            <img
                              src={coverImage}
                              alt='Cover preview'
                              className='object-contain w-full h-full'
                            />
                          </div>
                          {coverImageHash && (
                            <div className='mt-3 text-xs text-[#90EE90]/70 break-all'>
                              <p>IPFS Hash: {coverImageHash}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className='bg-[#001a00]/50 p-4 rounded-xl'>
                      <label className='block text-lg font-medium mb-3 text-[#90EE90]'>
                        Release Date
                      </label>
                      <input
                        type='date'
                        name='release_date'
                        value={metadata.release_date}
                        onChange={handleMetadataChange}
                        className='w-full p-2 bg-[#002200] text-[#90EE90] rounded-lg focus:ring-2 focus:ring-[#90EE90] focus:border-[#90EE90]'
                        required
                      />
                      {metadata.release_date && (
                        <p className='text-xs text-[#90EE90]/70 mt-2'>
                          Will be sent as timestamp:{' '}
                          {dateToTimestamp(metadata.release_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='space-y-6'>
                    <div className='bg-[#001a00]/50 p-4 rounded-xl'>
                      <label className='block text-lg font-medium mb-3 text-[#90EE90]'>
                        Title
                      </label>
                      <input
                        type='text'
                        name='title'
                        value={metadata.title}
                        onChange={handleMetadataChange}
                        placeholder='e.g. My Awesome Song'
                        className='w-full p-2 bg-[#002200] text-[#90EE90] rounded-lg focus:ring-2 focus:ring-[#90EE90] focus:border-[#90EE90]'
                        required
                      />
                    </div>

                    <div className='bg-[#001a00]/50 p-4 rounded-xl'>
                      <label className='block text-lg font-medium mb-3 text-[#90EE90]'>
                        Genre
                      </label>
                      <input
                        type='text'
                        name='genre'
                        value={metadata.genre}
                        onChange={handleMetadataChange}
                        placeholder='e.g. Rock, Pop, Jazz'
                        className='w-full p-2 bg-[#002200] text-[#90EE90] rounded-lg focus:ring-2 focus:ring-[#90EE90] focus:border-[#90EE90]'
                        required
                      />
                    </div>

                    <div className='bg-[#001a00]/50 p-4 rounded-xl'>
                      <label className='block text-lg font-medium mb-3 text-[#90EE90]'>
                        Description
                      </label>
                      <textarea
                        name='description'
                        value={metadata.description}
                        onChange={handleMetadataChange}
                        placeholder='Brief description of your song'
                        className='w-full p-2 bg-[#002200] text-[#90EE90] rounded-lg focus:ring-2 focus:ring-[#90EE90] focus:border-[#90EE90]'
                        rows='3'
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className='max-w-xl mx-auto'>
                  <button
                    type='submit'
                    disabled={!songFile || loading || !address}
                    className='w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg font-medium'>
                    {loading ? (
                      <span className='flex items-center justify-center'>
                        <svg
                          className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
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
                        Processing...
                      </span>
                    ) : (
                      'Upload Song'
                    )}
                  </button>

                  {(error || txError) && (
                    <div className='text-red-400 mt-4 p-4 bg-red-900/30 rounded-lg text-center'>
                      Error: {error || txError?.message}
                    </div>
                  )}

                  {success && (
                    <div className='text-[#90EE90] mt-4 p-4 bg-[#004d00]/30 rounded-lg flex items-center justify-center'>
                      <svg
                        className='h-5 w-5 mr-2'
                        fill='currentColor'
                        viewBox='0 0 20 20'>
                        <path
                          fillRule='evenodd'
                          d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                          clipRule='evenodd'
                        />
                      </svg>
                      Song uploaded successfully!
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadSong
