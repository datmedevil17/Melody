'use client'

import React, { useState } from 'react'
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
    <div className='max-w-3xl mx-auto p-6 bg-gray-900 shadow-lg rounded-xl my-8 text-gray-200'>
      <h1 className='text-3xl font-bold mb-8 text-center text-purple-400'>
        Upload Song
      </h1>

      {!address ? (
        <div className='text-center p-6 bg-yellow-900/30 rounded-lg border border-yellow-700'>
          <p className='text-yellow-300 font-medium'>
            Please connect your wallet first
          </p>
        </div>
      ) : (
        <div className='space-y-8'>
          <form
            onSubmit={handleSubmit}
            className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-6'>
                <div className='bg-gray-800 p-4 rounded-lg border border-gray-700'>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Song File
                  </label>
                  <div className='relative'>
                    <div className='flex items-center'>
                      <label className='cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-l-md transition-colors'>
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
                      <div className='bg-gray-700 text-gray-300 truncate border-l-0 border border-gray-600 rounded-r-md px-3 py-2 flex-1'>
                        {songFile ? songFile.name : 'No file chosen'}
                      </div>
                    </div>
                  </div>
                  {songUploading && (
                    <div className='mt-2 flex items-center text-sm text-purple-400'>
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
                    <p className='mt-2 text-sm text-green-400'>
                      ✓ File uploaded successfully
                    </p>
                  )}
                  {songHash && (
                    <div className='mt-2 text-xs text-gray-400 break-all'>
                      <p>IPFS Hash: {songHash}</p>
                    </div>
                  )}
                </div>

                <div className='bg-gray-800 p-4 rounded-lg border border-gray-700'>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Cover Image
                  </label>
                  <div className='relative'>
                    <div className='flex items-center'>
                      <label className='cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-l-md transition-colors'>
                        <span>Choose Image</span>
                        <input
                          type='file'
                          accept='image/*'
                          onChange={handleCoverImageChange}
                          className='sr-only'
                          disabled={loading}
                        />
                      </label>
                      <div className='bg-gray-700 text-gray-300 truncate border-l-0 border border-gray-600 rounded-r-md px-3 py-2 flex-1'>
                        {coverImageFile
                          ? coverImageFile.name
                          : 'No image chosen'}
                      </div>
                    </div>
                  </div>
                  {imageUploading && (
                    <div className='mt-2 flex items-center text-sm text-purple-400'>
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
                      <p className='text-sm text-green-400 mb-2'>
                        ✓ Image uploaded successfully
                      </p>
                      <div className='relative w-full h-48 bg-gray-700 rounded-lg overflow-hidden border border-gray-600'>
                        <img
                          src={coverImage}
                          alt='Cover preview'
                          className='object-contain w-full h-full'
                        />
                      </div>
                      {coverImageHash && (
                        <div className='mt-2 text-xs text-gray-400 break-all'>
                          <p>IPFS Hash: {coverImageHash}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className='space-y-6'>
                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Title
                  </label>
                  <input
                    type='text'
                    name='title'
                    value={metadata.title}
                    onChange={handleMetadataChange}
                    placeholder='e.g. My Awesome Song'
                    className='w-full p-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Genre
                  </label>
                  <input
                    type='text'
                    name='genre'
                    value={metadata.genre}
                    onChange={handleMetadataChange}
                    placeholder='e.g. Rock, Pop, Jazz'
                    className='w-full p-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Release Date
                  </label>
                  <input
                    type='date'
                    name='release_date'
                    value={metadata.release_date}
                    onChange={handleMetadataChange}
                    className='w-full p-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                    required
                  />
                  {metadata.release_date && (
                    <p className='text-xs text-gray-400 mt-1'>
                      Will be sent as timestamp:{' '}
                      {dateToTimestamp(metadata.release_date)}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Description
                  </label>
                  <textarea
                    name='description'
                    value={metadata.description}
                    onChange={handleMetadataChange}
                    placeholder='Brief description of your song'
                    className='w-full p-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                    rows='4'
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type='submit'
              disabled={!songFile || loading || !address}
              className='w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
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
              <div className='text-red-400 mt-4 p-4 bg-red-900/30 rounded-lg border border-red-800'>
                Error: {error || txError?.message}
              </div>
            )}

            {success && (
              <div className='text-green-400 mt-4 p-4 bg-green-900/30 rounded-lg border border-green-800 flex items-center'>
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
          </form>
        </div>
      )}
    </div>
  )
}

export default UploadSong
