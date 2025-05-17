'use client'
import { useState, useRef } from "react";
import { useSendTransaction,useAccount } from "@starknet-react/core";
import { uploadToIpfs } from "../contract/pinata";
import { num } from "starknet";
import { artistContract } from "../contract/contract";

const CollabSongForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    artist2: "",
    title: "",
    genre: "",
    releaseDate: "",
    description: "",
  });
  const [songFile, setSongFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
  const { sendAsync, error: txError } = useSendTransaction({
    calls: undefined,
  });
    const { address } = useAccount();


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSongFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSongFile(e.target.files[0]);
    }
  };

  const handleCoverImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  const submitCollaboration = async (e) => {
    e.preventDefault();
    
    if (!artistContract) {
      setErrorMessage("Contract not initialized");
      return;
    }
    
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);
    
    try {
      // Check if required fields are filled
      if ( !formData.artist2 || !formData.title || !songFile) {
        throw new Error("Please fill all required fields and upload a song file");
      }
      
      // Upload song to IPFS
      const songUri = await uploadToIpfs(songFile);
      
      // Upload cover image to IPFS if provided
      let coverImageUri = "";
      if (coverImage) {
        coverImageUri = await uploadToIpfs(coverImage);
        console.log(coverImageUri)
      }
      
      // Convert release date to timestamp
      const releaseTimestamp = formData.releaseDate 
        ? new Date(formData.releaseDate).getTime() / 1000 
        : Math.floor(Date.now() / 1000);
      
      // Prepare metadata structure
      const songMetadataStruct = {
        title: formData.title,
        genre: formData.genre || "",
        release_date: num.toBigInt(releaseTimestamp),
        description: formData.description || "",
        cover_image: coverImageUri,
      };
      

      
      // Prepare and send transaction
      const call = artistContract.populate("collab_song", [
        address,
        formData.artist2,
        songUri,
        songMetadataStruct,
      ]);
      
      const res = await sendAsync([call]);
      setSuccessMessage("Collaboration submitted successfully! Transaction: " + res.transaction_hash);
      
      // Reset form after successful submission
      setFormData({
        artist2: "",
        title: "",
        genre: "",
        releaseDate: "",
        description: "",
      });
      setSongFile(null);
      setCoverImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      
    } catch (error) {
      console.error("Error submitting collaboration:", error);
      setErrorMessage(error.message || "Failed to submit collaboration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">Register Collaborative Song</h1>
        <p className="text-gray-600 mb-6">Use this form to register a new collaborative song between two artists on the blockchain.</p>
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {errorMessage}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}
        
        {txError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            Transaction Error: {txError.message}
          </div>
        )}
        
        <form onSubmit={submitCollaboration} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       
          
            <div>
              <label htmlFor="artist2" className="block text-sm font-medium text-gray-700 mb-1">
                Artist 2 Address: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="artist2"
                name="artist2"
                value={formData.artist2}
                onChange={handleChange}
                placeholder="0x..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Enter the contract address of the second artist</p>
            </div>
          </div>
          
          <div>
            <label htmlFor="songFile" className="block text-sm font-medium text-gray-700 mb-1">
              Song File: <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              id="songFile"
              ref={fileInputRef}
              accept="audio/*"
              onChange={handleSongFileChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Upload your song file (mp3, wav, etc.)</p>
          </div>
          
          {songFile && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">Selected File: {songFile.name}</p>
              <p className="text-xs text-gray-500">Size: {(songFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h2 className="text-lg font-medium text-indigo-600 mb-3">Song Metadata</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">
                    Genre:
                  </label>
                  <select
                    id="genre"
                    name="genre"
                    value={formData.genre}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a genre</option>
                    <option value="pop">Pop</option>
                    <option value="rock">Rock</option>
                    <option value="hip-hop">Hip-Hop</option>
                    <option value="r&b">R&B</option>
                    <option value="electronic">Electronic</option>
                    <option value="jazz">Jazz</option>
                    <option value="classical">Classical</option>
                    <option value="country">Country</option>
                    <option value="folk">Folk</option>
                    <option value="metal">Metal</option>
                    <option value="indie">Indie</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
         
              </div>
              
              <div>
                <label htmlFor="releaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Release Date:
                </label>
                <input
                  type="date"
                  id="releaseDate"
                  name="releaseDate"
                  value={formData.releaseDate}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image:
                </label>
                <input
                  type="file"
                  id="coverImage"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">Upload cover art for your song (optional)</p>
              </div>
              
              {coverImage && (
                <div className="p-3 bg-gray-50 rounded-md flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden">
                    <img 
                      src={URL.createObjectURL(coverImage)} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{coverImage.name}</p>
                    <p className="text-xs text-gray-500">Size: {(coverImage.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
              )}
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description:
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Describe the song and collaboration..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-md">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Current Wallet Address:</span>
              <code className="bg-gray-100 p-1 rounded text-sm">{address || "Not connected"}</code>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Note: The transaction must be sent from one of the artist addresses or by an authorized address
            </p>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Submitting..." : "Submit Collaboration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollabSongForm;