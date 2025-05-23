"use client";
import React from "react";

export const UserContext = React.createContext();

const UserContextProvider =  ({children}) => {
    const [music, setMusic] = React.useState(null)
    const [isPlaying, setIsPlaying] = React.useState(false)

    return(
        <UserContext.Provider value={{music, setMusic, isPlaying, setIsPlaying}}>
        {children}
        </UserContext.Provider>
    )
}

export default UserContextProvider
