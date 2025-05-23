"use client";
import React from "react";

export const UserContext = React.createContext();

const UserContextProvider =  ({children}) => {
    const [music, setMusic] = React.useState(null)

    return(
        <UserContext.Provider value={{music, setMusic}}>
        {children}
        </UserContext.Provider>
    )
}

export default UserContextProvider
