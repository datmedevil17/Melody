"use client";
import React from "react";
import Link from "next/link";
import MusicPlayer from "@/components/MusicPlayer/MusicPlayer";

const Layout = ({ children }) => {
    const currentSong = {
        title: "Shape of You",
        artist: "Ed Sheeran",
        albumArt:
            "https://i.scdn.co/image/ab67616d0000b2736b8b09ed4b52dbfdf9ed5d13",
    };

    return (
        <div className="flex h-[90vh] bg-gray-900">
            {/* Sidebar */}
            <div className="w-1/4 h-full  justify-center p-6 flex flex-col bg-black border-r border-gray-800">
            <div className=" h-3/4">
            <MusicPlayer />

            </div>
                {/* <MusicPlayer /> */}
            </div>
            {/* Main content stays unchanged */}
            <aside className="max-h-screen overflow-y-auto w-full">{children}</aside>
        </div>
    );
};

export default Layout;
