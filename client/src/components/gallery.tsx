"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const artists = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Artist ${i + 1}`,
    image: 'https://static.toiimg.com/thumb/imgsize-23456,msid-64218622,width-600,resizemode-4/64218622.jpg',
    description: 'Sample music artist description.'
}));

const ArtistSlider: React.FC = () => {
    const [activeId, setActiveId] = useState<number | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        let scrollInterval: NodeJS.Timeout;
        const startAutoScroll = () => {
            if (!sliderRef.current) return;
            scrollInterval = setInterval(() => {
                if (sliderRef.current) {
                    sliderRef.current.scrollLeft += 1;
                }
            }, 16);
        };

        if (!isHovered) {
            startAutoScroll();
        }

        return () => clearInterval(scrollInterval);
    }, [isHovered]);

    return (
        <div className="relative w-full min-h-screen bg-gradient-to-b from-black to-gray-900 text-white overflow-hidden font-sans">
            <h1 className="text-center text-6xl font-extrabold py-12 tracking-wider uppercase text-white drop-shadow-lg">
                Featured Artists
            </h1>
            <div
                className="flex gap-16 px-20 overflow-x-auto no-scrollbar items-center justify-start pb-32 pt-30"
                ref={sliderRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {artists.map((artist) => (
                    <motion.div
                        key={artist.id}
                        className={`shrink-0 cursor-pointer flex flex-col items-center justify-center transition-all duration-300 ${activeId === artist.id ? 'scale-125 z-30' : 'scale-100'
                            }`}
                        onMouseEnter={() => setActiveId(artist.id)}
                        onMouseLeave={() => setActiveId(null)}
                        style={{
                            width: activeId === artist.id ? 420 : 300,
                            height: activeId === artist.id ? 420 : 300
                        }}
                        layout
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <div className="rounded-full overflow-hidden shadow-2xl border-4 border-white">
                            <Image
                                src={artist.image}
                                alt={artist.name}
                                width={420}
                                height={420}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        {activeId === artist.id && (
                            <div className="text-center mt-8 w-[420px] bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-lg">
                                <p className="font-bold text-3xl text-white mb-3 drop-shadow-lg">{artist.name}</p>
                                <p className="text-lg text-gray-300 italic leading-snug">{artist.description}</p>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
            <div className="absolute bottom-8 w-full text-center text-gray-400 text-sm px-8 italic">
                Those who bring art to life—with open eyes, open ears, and open hearts.
            </div>
        </div>
    );
};

export default ArtistSlider;
