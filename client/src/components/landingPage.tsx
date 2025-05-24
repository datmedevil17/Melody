"use client";
import React, { useEffect } from "react";
import { FaSpotify, FaApple, FaAmazon, FaEllipsisH } from "react-icons/fa";
import { FaYoutube, FaItunesNote } from "react-icons/fa6";
import WalletConnectorModal from "./WalletConnectorModal";

import { useRouter } from "next/navigation";

import { useAccount } from '@starknet-react/core';


const LandingHero = () => {
    const { address } = useAccount();
    const router = useRouter();

    useEffect(() => {
        if (address) {
            router.push("/start/user/profile");
        }
    }, [address, router]);


    return (
        <section className="relative h-screen flex items-center justify-center text-white overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center -z-10"
                style={{
                    backgroundImage:
                        "url('https://res.cloudinary.com/dyflwb7am/image/upload/v1747305349/bg_kqdbkm.png')",
                }}
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-gray-900/70 -z-10" />

            {/* Content */}
            <div className="text-center max-w-xl px-4">
                <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
                    Distribute <br /> Your <br /> Music.
                </h1>

                <p className="text-base sm:text-lg mb-8">
                    Melody is the easiest way to get your music to iTunes, Apple Music,
                    Spotify, Google Play, and more while keeping 100% control of your rights
                    and royalties.
                </p>

                <WalletConnectorModal />

                {/* Social Icons */}
                <div className="mt-10 flex justify-center gap-6 text-2xl">
                    <FaSpotify />
                    <FaApple />
                    <FaItunesNote />
                    <FaYoutube />
                    <FaAmazon />
                    <FaEllipsisH />
                </div>
            </div>

            {/* Menu Button (top-right) */}
            

            {/* Logo (top-left) */}
            <div className="absolute top-6 left-6 text-xl font-semibold flex items-center gap-2">
                {/* Uncomment the image below if you have a logo */}
                {/* <img
                    src="/logo.svg"
                    alt="Melody"
                    className="h-6 w-6"
                /> */}
                <span>Melody</span>
            </div>
        </section>
    );
};

export default LandingHero;
