'use client';

import dynamic from 'next/dynamic';

// Dynamically import HomePage2 with SSR disabled
const HomePage2 = dynamic(() => import('@/components/HomePage2'), {
  ssr: false,
});

export default function Home() {
  return (
    <div>
      <HomePage2 />
    </div>
  );
}
