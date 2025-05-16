"use client"
import { useAccount } from '@starknet-react/core';
import ArtistRegistration from '../../components/ArtistRegistration';

const Page = () => {
    const {address} = useAccount();
    return (
        <>{address ? (<ArtistRegistration />):(
            <div>
                <h1>Welcome to the Artist Registration Page</h1>
                <p>Please register as an artist to get started.</p>
            </div>
        )}</>
    );
}

export default Page;
