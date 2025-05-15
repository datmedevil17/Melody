"use client";
import React, { useEffect, useRef, useState } from "react";
import MusicControls from "./MusicControls";

const MusicPlayertemp = () => {
  var audioSrc =
    "https://d290w4aumy7t5u.cloudfront.net/beats/undefined/0.5089498111076518/Attack on Titan Eye water Instrumental.mp3";
  const [trackProgress, setTrackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const audioRef = useRef(new Audio(audioSrc));
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const isReady = useRef(false);

  const { duration } = audioRef.current;
  const currentPercentage = duration
    ? `${(trackProgress / duration) * 100}%`
    : "0%";


  const startTimer = () => {
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTrackProgress(audioRef.current.currentTime);
    }, 1000);
  };

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play();
      startTimer();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <div className="h-full w-[20%] ">
      <div
        className="rounded-3xl bg-white h-full w-full
            flex flex-col items-center
            shadow-[0px_20px_125px_10px_rgba(39,_70,_132,_1)]
            pt-8
            px-4
            gap-4
            "
      >
        <div
          id="image"
          className="rounded-3xl bg-black h-[40%] w-full
                shadow-[0px_20px_125px_10px_rgba(39,_70,_132,_0.7)]
                "
        >
          <img
            src="/slowmotion.jpg"
            alt="hello"
            className="h-full w-full rounded-3xl"
          />

          {/* <img src= `data:${picture.format};base64,${uint8ArrayToBase64(metadata?.common.picture.)}` alt="/slowmotion.jpg" className='h-full w-full rounded-3xl' /> */}
          {/* <Image src="/slowmotion.jpg" alt="hello" width={100%} height={100}/> */}
        </div>

        <div id="info flex flex-col items-center gap-2">
          <div id="name" className="text-black text-xl font-semibold ">
            Hola Amigo
          </div>

          <div id="artist" className="flex justify-center text-[#7EA3DB]">
            Kr$na
          </div>
        </div>

        <div id="controls" className="w-full flex flex-col justify-center ">
          <div className="flex justify-center items-center">
            <progress
              className="progress progress-primary w-56"
              value={trackProgress}
              max="100"
            ></progress>
          </div>

          <MusicControls
            isPlaying={isPlaying}
            onPlayPauseClick={setIsPlaying}
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayertemp;
