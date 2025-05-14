export const artistContractAddress = '0x034c5bf38b21b85a935021f64a8cf4917a9f1921b27bb09d31894adff291f6ef'
export const tokenContractAddress = '0x04bcc2528cc6a9acec235c28882f7b8cd1c57e775ff8a9c16fb023130158da71'
export const songContractAddress = '0x036593ea7101f9736d31a9aad53b5dacafbe5578c43405ef7d88e436bfffbf3c'
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