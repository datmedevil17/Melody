// components/StarknetProvider.jsx
'use client';

import { StarknetConfig , publicProvider,voyager} from '@starknet-react/core';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import { sepolia } from '@starknet-react/chains'; // adjust this if needed

const connectors = [
  new InjectedConnector({
    options: { id: 'argentX', name: 'Argent X' },
  }),
  new InjectedConnector({
    options: { id: 'braavos', name: 'Braavos' },
  }),
  new WebWalletConnector({ url: 'https://web.argent.xyz' }),
];

export default function StarknetProvider({ children }) {
  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={connectors}
      explorer={voyager}
    >
      {children}
    </StarknetConfig>
  );
}
