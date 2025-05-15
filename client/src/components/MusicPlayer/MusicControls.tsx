import React from "react";

interface MusicControlsProps {
    isPlaying: boolean;
    onPlayPauseClick: (isPlaying: boolean) => void;
}

const MusicControls: React.FC<MusicControlsProps> = ({ isPlaying, onPlayPauseClick }) => (
    <div className="audio-controls w-full flex justify-center gap-4 ">
        <button
            type="button"
            className="prev"
            aria-label="Previous"
        >
            <img src="/backwardFill.png" className="w-8  hover:scale-110 " alt="prev"/>

            
        </button>
        {isPlaying ? (
            <button
                type="button"
                className="pause"
                onClick={() => onPlayPauseClick(false)}
                aria-label="Pause"
            >
                <img src="/pauseFill.png" alt="prev" className="w-12"/>

            </button>
        ) : (
            <button
                type="button"
                className="play rounded-full"
                onClick={() => onPlayPauseClick(true)}
                aria-label="Play"
            >
                <img src="/playFill.png" className="w-12  " alt="prev"/>

            </button>
        )}
        <button
            type="button"
            className="next"
            aria-label="Next"
        >
            <img src="/forwardFill.png" className="w-8" alt="prev"/>

        </button>
    </div>
);

export default MusicControls;
