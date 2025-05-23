export const artistContractAddress = '0x07e7d7a83258c1345b76aef0e7d78bcb570214602a18e2470525d5f65f5959ed'
export const tokenContractAddress = '0x04bcc2528cc6a9acec235c28882f7b8cd1c57e775ff8a9c16fb023130158da71'
export const songContractAddress = '0x027c7aa55d9c9330f2c3f34f7a9a9a9063fbf00509e309a5f90692ba72758c6e'
export const userContractAddress = '0x0489564bdcec3671525865c712b207625f17fc48455a548bfa1daf686fff1bd4'
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