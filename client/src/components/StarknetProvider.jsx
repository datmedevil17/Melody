// components/StarknetProvider.jsx
'use client'

import { StarknetConfig, publicProvider, voyager } from '@starknet-react/core'
import { InjectedConnector } from 'starknetkit/injected'
import { WebWalletConnector } from 'starknetkit/webwallet'
import { sepolia } from '@starknet-react/chains'
import { RpcProvider } from 'starknet'

const connectors = [
  new InjectedConnector({
    options: { id: 'argentX', name: 'Argent X' },
  }),
  new InjectedConnector({
    options: { id: 'braavos', name: 'Braavos' },
  }),
  new WebWalletConnector({ url: 'https://web.argent.xyz' }),
]

// Create a custom provider with a working RPC URL
export const customProvider = () => {
  return new RpcProvider({
    // nodeUrl: 'https://starknet-sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Default Infura URL
    // You can also try these alternatives:
    nodeUrl: 'https://starknet-sepolia.public.blastapi.io',
    // nodeUrl: 'https://sepolia-rpc.starknet.quietnode.com',
  })
}

export default function StarknetProvider({ children }) {
  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={customProvider}
      connectors={connectors}
      explorer={voyager}>
      {children}
    </StarknetConfig>
  )
}
