'use client'
import { useState, useRef, useEffect } from 'react'
import { uploadToIpfs } from '../contract/pinata'
import {
  useAccount,
  useContract,
  useProvider,
  useSendTransaction,
} from '@starknet-react/core'
import { artistABI, artistContractAddress } from '../contract/contract'
import { useRouter } from 'next/navigation'

const ArtistRegistration = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('')
  const [profileImage, setProfileImage] = useState(null)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImageHash, setProfileImageHash] = useState(null)
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState(null)
  const { address } = useAccount()
  const provider = useProvider()
  const { contract } = useContract({
    address: artistContractAddress,
    abi: artistABI,
    provider,
  })
  const modalRef = useRef(null)
  const { sendAsync, error: txerror } = useSendTransaction({ calls: null })
  const router = useRouter()
  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscKey)

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [onClose])

  // Handle profile image upload
  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0]
    setImageUploading(true)
    setError(null)

    if (file) {
      try {
        // Preview the image
        const reader = new FileReader()
        reader.onload = (e) => {
          setProfileImage(e.target.result)
        }
        reader.readAsDataURL(file)
        setProfileImageFile(file)

        // Upload to IPFS
        const hash = await uploadToIpfs(file)
        console.log('Profile image upload response:', hash)
        setProfileImageHash(hash)
      } catch (err) {
        console.error('Error uploading profile image:', err)
        setError('Failed to upload profile image to IPFS')
      }
    } else {
      setProfileImage(null)
      setProfileImageFile(null)
      setProfileImageHash(null)
    }
    setImageUploading(false)
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (!profileImageHash) {
      setError('Please upload a profile image')
      return
    }
    if (!contract) {
      setError('Contract not found')
      return
    }
    setLoading(true)

    try {
      // Pass registration data to parent component
      console.log(contract)
      const call = contract.populate('register_artist', [
        address,
        name,
        profileImageHash,
      ])

      const tx = await sendAsync([call])
      console.log('Transaction sent:', tx)

      // Reset form
      setName('')
      setProfileImage(null)
      setProfileImageFile(null)
      setProfileImageHash(null)
      router.push('/start');
      onClose()
      console.log('Artist registered successfully:', tx)

      // Close modal
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to register artist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4'>
      <div
        ref={modalRef}
        className='bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6'>
        <div className='flex justify-between items-center mb-6'>
          <h2 className='text-2xl font-bold text-purple-400'>
            Register as Artist
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-white'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className='space-y-6'>
          <div>
            <label className='block text-sm font-medium mb-2 text-gray-300'>
              Artist Name
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Enter your artist name'
              className='w-full p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium mb-2 text-gray-300'>
              Profile Picture
            </label>
            <div className='relative'>
              <div className='flex items-center'>
                <label className='cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-l-md transition-colors'>
                  <span>Choose Image</span>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={handleProfileImageChange}
                    className='sr-only'
                    disabled={loading || imageUploading}
                    required
                  />
                </label>
                <div className='bg-gray-700 text-gray-300 truncate border-l-0 border border-gray-600 rounded-r-md px-3 py-2 flex-1'>
                  {profileImageFile ? profileImageFile.name : 'No image chosen'}
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

            {profileImage && !imageUploading && (
              <div className='mt-4'>
                <p className='text-sm text-green-400 mb-2'>
                  ✓ Image uploaded successfully
                </p>
                <div className='relative w-full h-48 bg-gray-700 rounded-lg overflow-hidden border border-gray-600'>
                  <img
                    src={profileImage}
                    alt='Profile preview'
                    className='object-cover w-full h-full'
                  />
                </div>
                {profileImageHash && (
                  <div className='mt-2 text-xs text-gray-400 break-all'>
                    <p>IPFS Hash: {profileImageHash}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className='text-red-400 p-3 bg-red-900/30 rounded-lg border border-red-800'>
              {error}
            </div>
          )}
          {txerror && (
            <div className='text-red-400 p-3 bg-red-900/30 rounded-lg border border-red-800'>
              {txerror.message}
            </div>
          )}

          <div className='flex justify-end space-x-3 mt-6'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors'
              disabled={loading || imageUploading}>
              Cancel
            </button>
            <button
              type='submit'
              className='px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center min-w-[100px]'
              disabled={loading || imageUploading || !profileImageHash}>
              {loading ? (
                <>
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
                  <span>Registering...</span>
                </>
              ) : (
                'Register'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ArtistRegistration
