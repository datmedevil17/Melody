'use client';

import React from 'react';
import { tokenABI, tokenContractAddress } from '../../contract/contract';
import { useReadContract } from "@starknet-react/core";

// Add these utility functions at the top of the file
const decimalToAscii = (decimal) => {
  if (!decimal) return 'N/A';
  try {
    // Convert decimal to hex
    const hex = decimal.toString(16);
    // Add padding if necessary
    const paddedHex = hex.padStart(2, '0');
    // Convert hex pairs to ASCII
    const ascii = paddedHex.match(/.{2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))) || [];
    return ascii.join('');
  } catch (error) {
    console.error('Error converting decimal to ASCII:', error);
    return decimal.toString();
  }
};

const formatData = (data, type) => {
  if (!data) return 'N/A';
  
  switch (type) {
    case 'text':
      return decimalToAscii(data);
    case 'number':
      return data.toString();
    default:
      return data.toString();
  }
};

const TokenDetails = () => {
  // Read token name
  const { data: nameData, isLoading: isNameLoading, isError: isNameError } = useReadContract({
    address: tokenContractAddress,
    abi: tokenABI,
    functionName: 'name',
    args: [], // Add empty args array
    watch: true, // Enable auto-refresh
  });

  // Read token symbol
  const { data: symbolData, isLoading: isSymbolLoading, isError: isSymbolError } = useReadContract({
    address: tokenContractAddress,
    abi: tokenABI,
    functionName: 'symbol',
    args: [],
    watch: true,
  });

  // Read decimals
  const { data: decimalsData, isLoading: isDecimalsLoading, isError: isDecimalsError } = useReadContract({
    address: tokenContractAddress,
    abi: tokenABI,
    functionName: 'decimals',
    args: [],
    watch: true,
  });

  // Read total supply
  const { data: totalSupplyData, isLoading: isTotalSupplyLoading, isError: isTotalSupplyError } = useReadContract({
    address: tokenContractAddress,
    abi: tokenABI,
    functionName: 'total_supply',
    args: [],
    watch: true,
  });

  // Read get listen reward rate
  const { data: listenRewardRateData, isLoading: isRewardRateLoading, isError: isRewardRateError } = useReadContract({
    address: tokenContractAddress,
    abi: tokenABI,
    functionName: 'get_listen_reward_rate',
    args: [],
    watch: true,
  });

  // Read get admin
  const { data: adminData, isLoading: isAdminLoading, isError: isAdminError } = useReadContract({
    address: tokenContractAddress,
    abi: tokenABI,
    functionName: 'get_admin',
    args: [],
    watch: true,
  });

  const LoadingSpinner = () => (
    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
  );

  const DataField = ({ label, data, isLoading, isError, type = 'number' }) => (
    <div className="p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <h2 className="font-semibold text-gray-700">{label}:</h2>
      {isError ? (
        <p className="text-red-500">Error loading data</p>
      ) : isLoading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner />
          <span className="text-gray-500">Loading...</span>
        </div>
      ) : (
        <p className="text-gray-900 font-medium">{formatData(data, type)}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 text-black">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Token Details</h1>
      
      <div className="space-y-4">
        <DataField 
          label="Name" 
          data={nameData} 
          isLoading={isNameLoading} 
          isError={isNameError}
          type="text"
        />
        <DataField 
          label="Symbol" 
          data={symbolData} 
          isLoading={isSymbolLoading} 
          isError={isSymbolError}
          type="text"
        />
        <DataField 
          label="Decimals" 
          data={decimalsData} 
          isLoading={isDecimalsLoading} 
          isError={isDecimalsError} 
        />
        <DataField 
          label="Total Supply" 
          data={totalSupplyData} 
          isLoading={isTotalSupplyLoading} 
          isError={isTotalSupplyError} 
        />
        <DataField 
          label="Listen Reward Rate" 
          data={listenRewardRateData} 
          isLoading={isRewardRateLoading} 
          isError={isRewardRateError} 
        />
        <DataField 
          label="Admin Address" 
          data={adminData} 
          isLoading={isAdminLoading} 
          isError={isAdminError} 
        />
      </div>
    </div>
  );
};

export default TokenDetails;
