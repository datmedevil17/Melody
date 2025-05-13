'use client';

import React, { useState } from 'react';
import { uploadToIpfs, uploadToIpfsJson } from '../../contract/pinata';
import { useAccount, useContract, useProvider, useSendTransaction } from '@starknet-react/core';
import { artistABI, artistContractAddress } from '../../contract/contract';
import { shortString, uint256, num } from 'starknet';
import SHA256 from 'crypto-js/sha256';

// Utility function to hash IPFS hash to a shorter format
const hashIpfsHash = (ipfsHash) => {
  // Generate SHA-256 hash of the IPFS hash
  const hash = SHA256(ipfsHash).toString();
  // Take first 31 characters to fit in felt
  return hash.substring(0, 31);
};

const extractIpfsHash = (ipfsUrl) => {
  // Extract hash from ipfs://QmHash format
  const hash = ipfsUrl.replace('ipfs://', '');
  return {
    originalHash: hash,
    shortenedHash: hashIpfsHash(hash)
  };
};

// Convert date string to UNIX timestamp (seconds since epoch) for u64 type
const dateToTimestamp = (dateString) => {
  if (!dateString) return 0;
  const date = new Date(dateString);
  // Convert milliseconds to seconds and ensure it's a valid integer
  return Math.floor(date.getTime() / 1000);
};

const UploadSong = () => {
  const { address } = useAccount();
  const provider = useProvider();
  const { contract } = useContract({
    address: artistContractAddress,
    abi: artistABI,
    provider
  });

  const [songFile, setSongFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    genre: '',
    release_date: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Fix: Initialize useSendTransaction hook with proper function destructuring
  const { sendAsync, error: txError } = useSendTransaction({calls : undefined});

  const handleFileChange = (e) => {
    setSongFile(e.target.files[0]);
  };
  

  const handleMetadataChange = (e) => {
    setMetadata({
      ...metadata,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !address || !songFile) {
      setError('Missing required data');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Upload song file to IPFS
      const songUrl = await uploadToIpfs(songFile);
      const { originalHash: songOriginalHash, shortenedHash: songHash } = extractIpfsHash(songUrl);
      
      // Upload metadata to IPFS with hash mappings
      const metadataUrl = await uploadToIpfsJson({
        ...metadata,
        song_uri: songUrl,
        song_hash_mapping: {
          shortened: songHash,
          original: songOriginalHash
        },
        artist_address: address
      });
      // const obj = {
      //   title : shortString.encodeShortString(metadata.title),
      //   genre : shortString.encodeShortString(metadata.genre),
      //   release_date : dateToTimestamp(metadata.release_date),
      //   description : shortString.encodeShortString(metadata.description),
      // }
      
      // Encode the song hash as felt252
      const encodedSongHash = shortString.encodeShortString(songHash);
      
      // Convert release_date to u64 timestamp
      const releaseTimestamp = dateToTimestamp(metadata.release_date);
      const test = num.isBigNumberish(releaseTimestamp)
      console.log("Release date timestamp:", releaseTimestamp, "Is BigNumberish:", test);
      // Create the metadata struct with proper types as expected by the contract
      const songMetadataStruct = {
        title: metadata.title,
        genre: metadata.genre,
        release_date: num.toBigInt(releaseTimestamp), // This should be a u64 number
        description: metadata.description
      };
      
      console.log("Sending transaction with data:", {
        address,
        encodedSongHash,
        songMetadataStruct
      });
      
      // Fix: Properly prepare the transaction call
      if (!contract) {
        throw new Error('Contract is not initialized');
      }
      
      // Prepare calls array for StarkNet transaction
      // const calls = [{
      //   contractAddress: artistContractAddress,
      //   entrypoint: "upload_song",
      //   calldata: [
      //     address,
      //     encodedSongHash,
      //     songMetadataStruct.title,
      //     songMetadataStruct.genre,
      //     songMetadataStruct.release_date,
      //     songMetadataStruct.description
      //   ]
      // }];

      
      
      // Execute the transaction with the calls array
      console.log({
        address,
        encodedSongHash,
        songMetadataStruct
      })
      // console.log("Call:", call);
      const call = contract.populate("upload_song", [
        address,
        encodedSongHash,
        {
          title: songMetadataStruct.title,
          genre: songMetadataStruct.genre,
          release_date: songMetadataStruct.release_date,
          description: songMetadataStruct.description
        }
      ])
      const res  = await sendAsync([call])

      console.log("Transaction response:", res);
      
      setSuccess(true);
      
      // Reset form on success
      setSongFile(null);
      setMetadata({
        title: '',
        genre: '',
        release_date: '',
        description: '',
      });
      
    } catch (err) {
      console.error('Error uploading song:', err);
      setError(err.message || 'An error occurred while uploading the song');
    } finally {
      setLoading(false);
    }
  };

  // For sample input display
  const getSampleInput = () => {
    const sampleAddress = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const sampleSongHash = shortString.encodeShortString("QmSample");
    const sampleDate = dateToTimestamp("2023-05-12");
    
    return {
      artist_address: sampleAddress,
      song_uri: sampleSongHash,
      metadata: {
        title: shortString.encodeShortString("Sample Title"),
        genre: shortString.encodeShortString("Sample Genre"),
        release_date: sampleDate,
        description: shortString.encodeShortString("Sample Description")
      }
    };
  };

  const sampleInput = getSampleInput();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Upload Song</h1>
      
      {!address ? (
        <div className="text-center p-4 bg-yellow-100 rounded-lg">
          Please connect your wallet first
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm">
            <h2 className="font-bold mb-2">Sample Input Format</h2>
            <pre className="overflow-x-auto">{JSON.stringify(sampleInput, null, 2)}</pre>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Song File</label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                name="title"
                value={metadata.title}
                onChange={handleMetadataChange}
                placeholder="e.g. My Awesome Song"
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Genre</label>
              <input
                type="text"
                name="genre"
                value={metadata.genre}
                onChange={handleMetadataChange}
                placeholder="e.g. Rock, Pop, Jazz"
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Release Date (will be converted to u64 timestamp)</label>
              <input
                type="date"
                name="release_date"
                value={metadata.release_date}
                onChange={handleMetadataChange}
                className="w-full p-2 border rounded"
                required
              />
              {metadata.release_date && (
                <p className="text-xs text-gray-500 mt-1">
                  Will be sent as timestamp: {dateToTimestamp(metadata.release_date)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={metadata.description}
                onChange={handleMetadataChange}
                placeholder="Brief description of your song"
                className="w-full p-2 border rounded"
                rows="4"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!songFile || loading || !address}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Upload Song'
              )}
            </button>

            {(error || txError) && (
              <div className="text-red-500 mt-4 p-3 bg-red-50 rounded-lg">
                Error: {error || txError?.message}
              </div>
            )}
            
            {success && (
              <div className="text-green-500 mt-4 p-3 bg-green-50 rounded-lg">
                Song uploaded successfully!
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
};

export default UploadSong;