"use client";
import React, { useEffect, useContext } from "react";
import BottomBarMusicPlayer from "@/components/MusicPlayer/MusicPlayer";
import { UserContext } from "../../context/userContextProvider";

const Layout = ({ children }) => {
    const { music, setMusic } = useContext(UserContext);

    const currentSong = {
        title: "No song playing",
        artist: "Unknown Artist",
        albumArt: "https://i.scdn.co/image/ab67616d0000b2736b8b09ed4b52dbfdf9ed5d13",
    };

    useEffect(() => {
        if (!music) {
            setMusic(currentSong);
        }
    }, [music, setMusic]);

    console.log("Music in Layout:", music);

    return (
        <div className="flex flex-col min-h-screen bg-gray-900">
            {/* Main content area */}
            <main className="flex-1 overflow-y-auto">{children}</main>

            {/* Bottom music bar */}
            {music && (<BottomBarMusicPlayer audioSrc={`https://${music}`} />)}

        </div>
    );
};

export default Layout;
