"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IAudioMetadata } from "music-metadata";
import * as musicMetadata from "music-metadata";
import { Buffer } from "buffer";
import Image from "next/image";

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="black" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="black" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const BackwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="black" viewBox="0 0 24 24">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
  </svg>
);

const ForwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="black" viewBox="0 0 24 24">
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
  </svg>
);

const formatTime = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}`;

const BottomBarMusicPlayer = ({ audioSrc }: { audioSrc: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<IAudioMetadata | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const audioRef = useRef(new Audio(audioSrc));
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const audio = audioRef.current;
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));

    const timer = () => {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setProgress(audio.currentTime);
      }, 1000);
    };

    if (isPlaying) {
      audio.play();
      timer();
    } else {
      audio.pause();
      clearInterval(intervalRef.current);
    }

    return () => {
      clearInterval(intervalRef.current);
      audio.pause();
    };
  }, [isPlaying]);

  useEffect(() => {
    const fetchMetadata = async () => {
      const res = await fetch(audioSrc);
      const blob = await res.blob();
      const data = await musicMetadata.parseBlob(blob);
      setMetadata(data);
    };
    fetchMetadata();
  }, [audioSrc]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const width = (e.target as HTMLDivElement).clientWidth;
    const x = e.nativeEvent.offsetX;
    const newTime = (x / width) * duration;
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const handleSkip = (dir: "forward" | "backward") => {
    const change = dir === "forward" ? 10 : -10;
    const newTime = Math.min(Math.max(audioRef.current.currentTime + change, 0), duration);
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const picture = metadata?.common.picture?.[0];
  const imageSrc =
    picture && picture.data
      ? `data:${picture.format};base64,${Buffer.from(picture.data).toString("base64")}`
      : "/slowmotion.jpg";

  return (
    <motion.div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[70%] rounded-3xl shadow-xl bg-white/90 backdrop-blur-md border border-gray-200 p-3 flex items-center gap-4 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
    >
      <Image
        src={imageSrc}
        alt="Album Art"
        width={64}
        height={64}
        className="rounded-2xl object-cover"
      />
      <div className="flex flex-col flex-grow">
        <div className="text-black font-semibold text-sm truncate">{metadata?.common.title || "Track Title"}</div>
        <div className="text-gray-500 text-xs truncate">{metadata?.common.artist || "Unknown Artist"}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{formatTime(progress)}</span>
          <div className="w-full h-1 bg-gray-300 rounded-full cursor-pointer" onClick={handleSeek}>
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(progress / duration) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-500">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSkip("backward")}>
          <BackwardIcon />
        </motion.button>
        <motion.button
          onClick={() => setIsPlaying(!isPlaying)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSkip("forward")}>
          <ForwardIcon />
        </motion.button>
      </div>
      {isHovered && (
        <motion.button
          className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-transform transform hover:scale-105"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ❤️ Like
        </motion.button>
      )}
    </motion.div>
  );
};

export default BottomBarMusicPlayer;
