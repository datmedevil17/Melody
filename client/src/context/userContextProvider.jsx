'use client'
import React from 'react'

export const UserContext = React.createContext()

const UserContextProvider = ({ children }) => {
  const [music, setMusic] = React.useState(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [metaData, setMetaData] = React.useState({
    title: '',
    genre: '',
    artist: '',
    image: '',
  })
  const [currentlyPlaying, setCurrentlyPlaying] = React.useState(null)
  const handleReset = () => {
    setMusic(null)
    setIsPlaying(false)
    setMetaData({
      title: '',
      genre: '',
      artist: '',
      image: '',
    })
    setCurrentlyPlaying(null)
  }
  const togglePlayPause = (uri, songId, data) => {
    console.log(currentlyPlaying, songId, isPlaying)
    if (currentlyPlaying === songId) {
      setIsPlaying(!isPlaying)
    } else {
        console.log('Setting new song:', uri, songId, data)
      setMetaData({
        title: data.title,
        genre: data.genre,
        artist: data.artist,
        image: data.image,
      })
      setMusic(uri)
      setCurrentlyPlaying(songId)
      setIsPlaying(true)
    }
  }
  return (
    <UserContext.Provider
      value={{
        music,
        setMusic,
        isPlaying,
        setIsPlaying,
        metaData,
        setMetaData,
        currentlyPlaying,
        setCurrentlyPlaying,
        handleReset,
        togglePlayPause,
      }}>
      {children}
    </UserContext.Provider>
  )
}

export default UserContextProvider
