export const artistContractAddress = '0x00556f451b54cc385a81bbb5368bef095b5a4d4560196599e9270d27da46b315'
export const tokenContractAddress = '0x04bcc2528cc6a9acec235c28882f7b8cd1c57e775ff8a9c16fb023130158da71'
export const songContractAddress = '0x0440ce52be00e0f5bb9dcc05435735f70fda4ad9eb3405efcf89bcf57d0335ee'
export const userContractAddress = '0x0258370d95258645d5404fb1f871df60f1ea9e04c426aa7c5667eba4b80b4a60'
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