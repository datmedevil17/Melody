'use client';

import React, { useState } from 'react';
import { uploadToIpfs, uploadToIpfsJson } from '../../contract/pinata';
import { useAccount, useContract, useProvider, useSendTransaction } from '@starknet-react/core';
import { artistABI, artistContractAddress } from '../../contract/contract';

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

  const { send, error: txError } = useSendTransaction({
    calls: contract && address ? [
      {
        contractAddress: artistContractAddress,
        entrypoint: "upload_song"
      }
    ] : [],
  });

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

    try {
      // Upload song file to IPFS
      const songUrl = await uploadToIpfs(songFile);
      console.log(songUrl)
      
      // Upload metadata to IPFS
      const metadataUrl = await uploadToIpfsJson({
        ...metadata,
        song_uri: songUrl,
        artist_address: address
      });

      // Prepare contract calls
      const calls = [{
        contractAddress: artistContractAddress,
        entrypoint: "upload_song",
        calldata: [
          address,
          songUrl,
          metadata.title,
          metadata.genre,
          metadata.release_date,
          metadata.description,
          metadataUrl
        ]
      }];

      // Send transaction
      await send({ calls });
      
    } catch (err) {
      console.error('Error uploading song:', err);
      setError(err.message || 'An error occurred while uploading the song');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Upload Song</h1>
      
      {!address ? (
        <div className="text-center p-4 bg-yellow-100 rounded-lg">
          Please connect your wallet first
        </div>
      ) : (
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
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Release Date</label>
            <input
              type="date"
              name="release_date"
              value={metadata.release_date}
              onChange={handleMetadataChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={metadata.description}
              onChange={handleMetadataChange}
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
        </form>
      )}
    </div>
  );
};

export default UploadSong;
