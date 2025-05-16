"use client"
import { useContract, useReadContract } from '@starknet-react/core';
import { useEffect, useState } from 'react';
import { artistABI, artistContractAddress } from '../../contract/contract';
import { Contract } from 'starknet';
const decimalToAscii = (decimal) => {
  if (!decimal) return 'N/A';
  try {
    // Convert decimal to hex
    const hex = decimal.toString(16);
    // Add padding if necessary
    const paddedHex = hex.padStart(2, '0');
    // Convert hex pairs to ASCII
    const ascii = paddedHex.match(/.{2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))) || [];
    return ascii.join('');
  } catch (error) {
    console.error('Error converting decimal to ASCII:', error);
    return decimal.toString();
  }
};
const Songs = () => {
    const [songDetails, setSongDetails] = useState([]);
    useEffect(()=>{
        const contract = new Contract(artistABI, artistContractAddress);
        console.log(contract);
        const getAllSongs = async (total) => {
            const songs = [];
            for(let i=1; i<=total; i++){
                const song = await contract.call('get_song_details',[i]);
                songs.push(song);
            }
            songs.forEach((song) => {
                song.metadata.title = decimalToAscii(song.metadata.title);
                song.metadata.genre = decimalToAscii(song.metadata.genre);
                song.metadata.release_date = new Date(Number(song.metadata.release_date.toString()) * 1000).toLocaleDateString();
            })
            console.log(songs);
            setSongDetails(songs);
        }
        const getSongCount = async () => {
            const data = await contract.get_song_count();
            console.log(data);
            await getAllSongs(Number(data));
        }
        getSongCount();
    },[])
    return (
        <div>
            Hi there
        </div>
    );
}

export default Songs;
