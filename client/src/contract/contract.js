export const artistContractAddress = '0x05a7bc4dc7c95a913ba88c8d27f280227608409241cff180ddc32e0dcf93e987'
export const tokenContractAddress = '0x04bcc2528cc6a9acec235c28882f7b8cd1c57e775ff8a9c16fb023130158da71'
export const songContractAddress = '0x053ffef5a925a5250688cfc3ff67dfca254a7fd14f7ce8b90b14aa2f1e78cb30'
export const userContractAddress = '0x00d92039340bca87d78e879074b83fbd53b7bc5130e181616e73518fc70bf2c8'
export const tippingContractAddress = '0x049c673d3cae8c7562f3b7ae8ac82eeff9ea19f4e64ed515f5884ad779749a99'


import tokenAbi from './Token.json';
import artistAbi from './Artist.json';
import songAbi from './Song.json';
import userAbi from './User.json';
import tippingAbi from './Tipping.json';

export const tokenABI = tokenAbi.abi
export const artistABI = artistAbi.abi
export const songABI = songAbi.abi
export const userABI = userAbi.abi
export const tippingABI = tippingAbi.abi


export {uploadToIpfs, uploadToIpfsJson,getJsonFromIpfs} from "./pinata"