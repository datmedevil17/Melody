"use client"
import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion';
import { IAudioMetadata } from 'music-metadata';
import * as musicMetadata from 'music-metadata';
import { Buffer } from 'buffer';
import Image from 'next/image';

// SVG Icons as Components
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="black">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="black">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

const ForwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="black">
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
  </svg>
);

const BackwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="black">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
  </svg>
);

// Time formatting utility
const formatTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const MusicPlayer = ({ 
    audioSrc, 
    onSelect 
}: {
    audioSrc: string,
    onSelect: () => void,
}) => {
    const [metadata, setMetadata] = useState<IAudioMetadata | null>(null);
    const [trackProgress, setTrackProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [duration, setDuration] = useState(0);

    // Refs
    const audioRef = useRef(new Audio(audioSrc));
    const intervalRef = useRef<NodeJS.Timeout>();

    // Fetch and parse metadata
    useEffect(() => {
        const fetchAndParseMetadata = async () => {
            try {
                const response = await fetch(audioSrc);
                const blob = await response.blob();

                const parsedMetadata = await musicMetadata.parseBlob(blob);
                setMetadata(parsedMetadata);
            } catch (error) {
                console.error('Error fetching, converting, or parsing metadata:', error);
            }
        };
        fetchAndParseMetadata();
    }, [audioSrc]);

    // Audio playback effect
    useEffect(() => {
        const audio = audioRef.current;

        const setAudioData = () => {
            setDuration(audio.duration);
        };

        const startTimer = () => {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setTrackProgress(audio.currentTime);
            }, 1000);
        };

        audio.addEventListener('loadedmetadata', setAudioData);

        if (isPlaying) {
            audio.play();
            startTimer();
        } else {
            audio.pause();
            clearInterval(intervalRef.current);
        }

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            clearInterval(intervalRef.current);
        };
    }, [isPlaying]);

    // Render album art
    const renderImage = () => {
        if (metadata && metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0];
            
            try {
                const base64String = Buffer.from(picture.data).toString('base64');
                
                if (base64String) {
                    return (
                        <Image
                        src={`data:${picture.format};base64,${base64String}`}
                        width={200}
                        height={200}
                        className="rounded-3xl h-full object-cover"
                        alt="Picture of the author"
                      />
                    );
                }
            } catch (error) {
                console.error('Error converting image:', error);
            }
        }
        
        return (
            <img
                src="/slowmotion.jpg"
                alt="Default Artwork"
                className='h-full w-full rounded-3xl object-cover' 
            />
        );
    };

    // Seek functionality
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current) return;
        const seekTime = (e.nativeEvent.offsetX / (e.target as HTMLDivElement).offsetWidth) * duration;
        audioRef.current.currentTime = seekTime;
        setTrackProgress(seekTime);
    };

    // Skip functionality
    const handleSkip = (direction: 'forward' | 'backward') => {
        if (!audioRef.current) return;
        const currentTime = audioRef.current.currentTime;
        const skipAmount = direction === 'forward' ? 10 : -10;
        audioRef.current.currentTime = Math.max(0, Math.min(currentTime + skipAmount, duration));
        setTrackProgress(audioRef.current.currentTime);
    };

    // Handle selection
    const handleSelect = () => {
        // Stop any currently playing audio
        audioRef.current.pause();
        
        // Call the onSelect prop
        onSelect();
    };

    // Calculate progress percentage
    const currentPercentage = duration 
        ? `${(trackProgress / duration) * 100}%` 
        : "0%";

    return (
        <div 
            className='relative h-[95%] top-2 w-full cursor-pointer' 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className='rounded-3xl bg-white h-full w-full flex flex-col items-center shadow-[0px_20px_125px_10px_rgba(39,_70,_132,_1)] pt-8 px-4 gap-4'>
                <div id="image" className='rounded-3xl bg-black h-[40%] w-full shadow-[0px_20px_125px_10px_rgba(39,_70,_132,_0.7)]'>
                    {renderImage()}
                </div>

                <div id="info" className='flex flex-col items-center'>
                    <div className='text-black text-xl font-semibold'>
                        {metadata?.common.title || "Kurisu"}
                    </div>

                    <div className='flex justify-center text-[#7EA3DB]'>
                        {metadata?.common.artist || "Kr$na"}
                    </div>
                </div>

                <div id="controls" className='w-full flex flex-col relative top-[-5%] justify-center'>
                    <div className="w-full flex gap-2 items-center mb-1">
                        <span className="text-sm text-gray-600">
                            {formatTime(trackProgress)} 
                        </span>
                        <motion.div 
                            className="flex-grow h-2 bg-gray-200 rounded-full cursor-pointer"
                            onClick={handleSeek}
                        >
                            <motion.div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: currentPercentage }}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.2 }}
                            />
                        </motion.div>
                        <span className="text-sm text-gray-600">
                            {formatTime(duration)}
                        </span>
                    </div>

                    <div className="audio-controls w-full flex justify-center gap-4">
                        <motion.button 
                            type="button" 
                            className="prev"
                            aria-label="Previous"
                            onClick={() => handleSkip('backward')}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <BackwardIcon />
                        </motion.button>

                        {isPlaying ? (
                            <motion.button
                                type="button"
                                className="pause"
                                onClick={() => setIsPlaying(false)}
                                aria-label="Pause"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <PauseIcon />
                            </motion.button>
                        ) : (
                            <motion.button
                                type="button"
                                className="play rounded-full"
                                onClick={() => setIsPlaying(true)}
                                aria-label="Play"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <PlayIcon />
                            </motion.button>
                        )}

                        <motion.button 
                            type="button" 
                            className="next"
                            aria-label="Next"
                            onClick={() => handleSkip('forward')}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <ForwardIcon />
                        </motion.button>
                    </div>
                </div>

                <div 
                    className={`absolute bottom-0 left-0 right-0 flex justify-center 
                    transition-all duration-300 ease-in-out 
                    ${isHovered ? 'opacity-100' : 'translate-y-[100%] opacity-0'}
                    pb-1 z-10`}
                >
                    <motion.button 
                        className='
                        bg-purple-600 
                        hover:bg-purple-700 
                        text-white 
                        font-bold 
                        py-2 
                        px-4 
                        rounded-full 
                        flex 
                        items-center 
                        gap-2 
                        shadow-lg 
                        transition-all 
                        duration-300 
                        transform 
                        hover:scale-105
                        '
                        onClick={handleSelect}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <span className='text-xl'>❤️</span>
                        Like
                    </motion.button>
                </div>
            </div>
        </div>
    )
}

export default MusicPlayer;