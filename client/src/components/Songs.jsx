"use client"
import { useReadContract } from '@starknet-react/core';
import { useEffect } from 'react';
import { artistABI, artistContractAddress } from '../contract/contract';

const Songs = () => {

    const {data} = useReadContract({
        address: artistContractAddress,
        abi: artistABI,
        functionName: 'get_song_count',
        args: [],
        watch: true
    })
    useEffect(()=>{
        if(data){
            
            console.log(data);
        }
    },[data])
    return (
        <div>
            Hi there
        </div>
    );
}

export default Songs;
