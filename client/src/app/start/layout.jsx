"use client";
import React, { useEffect } from "react";
import { useContext } from "react";
import MusicPlayer from "@/components/MusicPlayer/MusicPlayer";
import {UserContext} from "../../context/userContextProvider";

const Layout = ({ children }) => {

    const { music, setMusic } = useContext(UserContext);

    const currentSong = {
        title: "",
        artist: "",
        albumArt:
            "https://i.scdn.co/image/ab67616d0000b2736b8b09ed4b52dbfdf9ed5d13",
    };
    console.log(`https://${music}`)
    useEffect(() => {
        if (!music) {
            setMusic(currentSong);
        }
    }, [music, setMusic]);

    return (
        <div className="flex h-[90vh] bg-gray-900">
            {/* Sidebar */}
            {/* Main content stays unchanged */}
            <aside className="max-h-screen overflow-y-auto w-full">{children}</aside>
        </div>
    );
};

export default Layout;
