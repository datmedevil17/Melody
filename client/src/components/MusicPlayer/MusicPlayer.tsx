"use client";
import React, { useEffect, useRef, useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { UserContext } from "../../context/userContextProvider";

const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="36"
    height="36"
    fill="black"
    viewBox="0 0 24 24"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="36"
    height="36"
    fill="black"
    viewBox="0 0 24 24"
  >
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const BackwardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    fill="black"
    viewBox="0 0 24 24"
  >
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
  </svg>
);

const ForwardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    fill="black"
    viewBox="0 0 24 24"
  >
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
  </svg>
);

const formatTime = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}`;

const BottomBarMusicPlayer = () => {
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    isPlaying,
    setIsPlaying,
    music: audioSrc,
    metaData,
  } = useContext(UserContext);

  const audioRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout>(setInterval(() => {}, 1000));
  const collapseTimeout = useRef<NodeJS.Timeout | null>(null);

  const imageSrc = "/slowmotion.jpg";

  useEffect(() => {
    if (progress >= duration && duration) setIsPlaying(false);
  }, [progress, duration, setIsPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      clearInterval(intervalRef.current);
      setProgress(0);
      setDuration(0);
      audioRef.current.pause();
    }

    if (!audioSrc) return;

    setIsAudioLoading(true);
    audioRef.current = new Audio(audioSrc);
    const audio = audioRef.current;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("canplay", () => setIsAudioLoading(false));
    audio.addEventListener("error", (e: any) => {
      console.error("Audio error:", e);
      setIsAudioLoading(false);
      setIsPlaying(false);
    });

    return () => {
      clearInterval(intervalRef.current);
      audio.pause();
    };
  }, [audioSrc]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying && !isAudioLoading) {
      playAudio();
    } else {
      clearInterval(intervalRef.current);
      audio.pause();
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, isAudioLoading]);

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        startProgressTimer();
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  const startProgressTimer = () => {
    const audio = audioRef.current;
    if (!audio) return;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress(audio.currentTime);
    }, 1000);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const width = (e.target as HTMLDivElement).clientWidth;
    const x = e.nativeEvent.offsetX;
    const newTime = (x / width) * duration;

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleSkip = (dir: "forward" | "backward") => {
    if (!audioRef.current) return;
    const change = dir === "forward" ? 10 : -10;
    const newTime = Math.min(
      Math.max(audioRef.current.currentTime + change, 0),
      duration
    );
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const toggleExpand = () => {
    setIsExpanded(true);

    if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
    collapseTimeout.current = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
  };

  return (
    <AnimatePresence>
      {isExpanded ? (
        <motion.div
          key="expanded"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed z-50 bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[70%] rounded-3xl shadow-xl bg-white/90 backdrop-blur-md border border-gray-200 p-3 flex items-center gap-4"
        >
          <Image
            src={metaData.image || imageSrc}
            alt="Album Art"
            width={64}
            height={64}
            className="rounded-2xl object-cover"
          />
          <div className="flex flex-col flex-grow">
            <div className="text-black font-semibold text-sm truncate">
              {metaData.title || "Track Title"}
            </div>
            <div className="text-gray-500 text-xs truncate">
              {metaData.artist || "Unknown Artist"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                {formatTime(progress)}
              </span>
              <div
                className="w-full h-1 bg-gray-300 rounded-full cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(progress / duration) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {formatTime(duration)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSkip("backward")}
            >
              <BackwardIcon />
            </motion.button>
            <motion.button
              onClick={() => setIsPlaying(!isPlaying)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={isAudioLoading}
            >
              {isAudioLoading ? (
                <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
              ) : isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayIcon />
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSkip("forward")}
            >
              <ForwardIcon />
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.div
  key="collapsed"
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  exit={{ scale: 0 }}
  transition={{ type: 'spring', stiffness: 300 }}
  className="fixed bottom-6 right-6 z-50 w-28 h-28 cursor-pointer"
  onClick={toggleExpand}
>
  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-white to-gray-100 shadow-lg border border-gray-300">
    {/* Circular Progress */}
    <svg
      className="absolute inset-0 w-full h-full rotate-[-90deg]"
      viewBox="0 0 100 100"
    >
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="#e2e8f0"
        strokeWidth="6"
        fill="none"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="#3b82f6"
        strokeWidth="6"
        fill="none"
        strokeDasharray={2 * Math.PI * 45}
        strokeDashoffset={
          2 * Math.PI * 45 * (1 - (duration ? progress / duration : 0))
        }
        strokeLinecap="round"
        className="transition-all duration-300 ease-out"
      />
    </svg>

    {/* Album Art */}
    <Image
      src={metaData.image || imageSrc}
      alt="Track"
      width={72}
      height={72}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full object-cover ring-4 ring-white"
    />
  </div>
</motion.div>


      )}
    </AnimatePresence>
  );
};

export default BottomBarMusicPlayer;
