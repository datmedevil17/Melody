"use client";
import React, { useEffect, useContext } from "react";
import BottomBarMusicPlayer from "@/components/MusicPlayer/MusicPlayer";
import { UserContext } from "../../context/userContextProvider";
import Navbar from "../../components/Navbar";
import AiBot from "../../components/AiBot";

const Layout = ({ children }) => {
    const { music } = useContext(UserContext);

    console.log("Music in Layout:", music);

    return (
        <div className="flex flex-col min-h-screen bg-gray-900">
            {/* Main content area */}
            <AiBot />
            <Navbar />
            <main className="flex-1 overflow-y-auto">{children}</main>

            {/* Bottom music bar */}
            {music && (<BottomBarMusicPlayer />)}

        </div>
    );
};

export default Layout;
