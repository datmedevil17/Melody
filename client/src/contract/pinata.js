import axios from 'axios';

const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

export const uploadToIpfs = async (file) => {
  try {
    console.log(pinataApiKey,pinataSecretKey)
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey,
          'Content-Type': 'multipart/form-data'
        },
        maxBodyLength: Infinity
      }
    );

    if (response.status !== 200) {
      throw new Error(`Pinata upload failed with status ${response.status}`);
    }
    console.log(`ipfs://${response.data.IpfsHash}`)

    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading file:', error.response?.data || error.message);
    throw new Error('Error uploading file to IPFS');
  }
};

export const uploadToIpfsJson = async (jsonData) => {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      jsonData,
      {
        headers: {
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status !== 200) {
      throw new Error(`Pinata JSON upload failed with status ${response.status}`);
    }

    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading JSON:', error.response?.data || error.message);
    throw new Error('Error uploading metadata to IPFS');
  }
};

export const getJsonFromIpfs = async (ipfsHash) => {
  if(ipfsHash){
    try{
      const res = await axios.get(ipfsHash);
      const jsonData = res.data;
      console.log(jsonData)
      return jsonData;
    }
    catch(e){
      console.log("Error fetching JSON:", e)
      throw new Error("Error fetching JSON from IPFS")
    }
  }
}