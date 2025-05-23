export const artistContractAddress = '0x067dd9e465a7e30413c7e9d9ecc4cb5d1e4d177e1dc6ebe2313b1b077f033781'
export const tokenContractAddress = '0x04bcc2528cc6a9acec235c28882f7b8cd1c57e775ff8a9c16fb023130158da71'
export const songContractAddress = '0x05c1db326d59c86d00bccb1ee80b63d8141534a5cfb99a9a367e97155b3f4d84'
export const userContractAddress = '0x041834b7d9eda1d2e69a894f5504a6d89dc632659c4bbd5cf9835e7f48ed2014'
export const tippingContractAddress = '0x049c673d3cae8c7562f3b7ae8ac82eeff9ea19f4e64ed515f5884ad779749a99'


import tokenAbi from './Token.json';
import artistAbi from './Artist.json';
import songAbi from './Song.json';
import userAbi from './User.json';
import tippingAbi from './Tipping.json';
import { Contract, RpcProvider } from 'starknet'

export const tokenABI = tokenAbi.abi
export const artistABI = artistAbi.abi
export const songABI = songAbi.abi
export const userABI = userAbi.abi
export const tippingABI = tippingAbi.abi
const customProvider = new RpcProvider({
    nodeUrl: 'https://starknet-sepolia.public.blastapi.io',
})
export const songContract = new Contract(songABI, songContractAddress, customProvider)
export const artistContract = new Contract(artistABI, artistContractAddress, customProvider)
export const tokenContract = new Contract(tokenABI, tokenContractAddress, customProvider)
export const userContract = new Contract(userABI, userContractAddress, customProvider)
export const tippingContract = new Contract(tippingABI, tippingContractAddress, customProvider)

export const decimalToAscii = (decimal) => {
  if (!decimal) return 'N/A'
  try {
    // Convert decimal to hex
    const hex = decimal.toString(16)
    // Add padding if necessary
    const paddedHex = hex.padStart(2, '0')
    // Convert hex pairs to ASCII
    const ascii =
      paddedHex
        .match(/.{2}/g)
        ?.map((hex) => String.fromCharCode(parseInt(hex, 16))) || []
    return ascii.join('')
  } catch (error) {
    console.error('Error converting decimal to ASCII:', error)
    return decimal.toString()
  }
}

export {uploadToIpfs, uploadToIpfsJson,getJsonFromIpfs} from "./pinata"