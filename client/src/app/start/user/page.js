'use client';

import React, { useState } from 'react';
import { userABI, userContractAddress } from '../../../contract/contract';
import { useAccount, useContract, useProvider, useSendTransaction } from '@starknet-react/core';
import { shortString } from 'starknet';
import { useRouter } from 'next/navigation';
const UserRegistration = () => {
  const { address } = useAccount();
  const provider = useProvider();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { contract } = useContract({
    address: userContractAddress,
    abi: userABI,
    provider,
  });

  const { sendAsync, error: txError } = useSendTransaction({
    calls: contract && address && name
      ? [contract.populate("register_user", [
          address,
          shortString.encodeShortString(name)
        ])]
      : undefined,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !address || !name) {
      setError('Please connect wallet and enter a name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await sendAsync();
      console.log(res);
      setSuccess(true);
      router.push('/start');
      setName('');
    } catch (err) {
      console.error('Registration error:', err);
      setError(txError?.message || err.message || 'Failed to register user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            User Registration
          </h2>

          {!address ? (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-700">Please connect your wallet first</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !address}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </div>
                ) : (
                  'Register'
                )}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-600">Registration successful!</p>
            </div>
          )}

          {address && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Connected Address:
                <span className="block font-mono text-gray-700 mt-1">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;
