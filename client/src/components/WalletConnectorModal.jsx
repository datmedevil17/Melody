'use client';

import {
  Connector,
  useAccount,
  useConnect,
  useDisconnect,
} from '@starknet-react/core';
import { StarknetkitConnector, useStarknetkitConnectModal } from 'starknetkit';

export default function WalletConnectorModal() {
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors,
  });

  async function connectWallet() {
    const { connector } = await starknetkitConnectModal();
    if (!connector) return;
    connect({ connector });
  }

  const { address } = useAccount();

  if (!address) {
    return (
      <button
      onClick={connectWallet}
      className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
      <svg 
        className="w-5 h-5 mr-2" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
        />
      </svg>
      Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex gap-3 min-w-[200px]">
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
      </div>
      <button
        onClick={() => disconnect()}
        className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-all duration-300 transform hover:scale-105"
      >
        <svg 
          className="w-4 h-4 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
          />
        </svg>
        Disconnect
      </button>
    </div>
  );
}
