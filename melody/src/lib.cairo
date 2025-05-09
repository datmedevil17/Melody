#[starknet::interface]
trait IUserContract<TContractState> {
    fn register_user(ref self: TContractState, user_address: starknet::ContractAddress, name: felt252);
    fn favorite_artist(ref self: TContractState, user_address: starknet::ContractAddress, artist_address: starknet::ContractAddress);
    fn get_favorites(self: @TContractState, user_address: starknet::ContractAddress) -> Array<starknet::ContractAddress>;
    fn reward_user_for_listening(ref self: TContractState, user_address: starknet::ContractAddress, song_id: felt252);
    fn get_user_tokens(self: @TContractState, user_address: starknet::ContractAddress) -> u256;
    fn get_user_profile(self: @TContractState, user_address: starknet::ContractAddress) -> UserProfile;
    fn is_registered(self: @TContractState, user_address: starknet::ContractAddress) -> bool;
}

// Error codes
mod UserErrors {
    pub const USER_ALREADY_REGISTERED: felt252 = 'user_already_registered';
    pub const USER_NOT_REGISTERED: felt252 = 'user_not_registered';
    pub const ARTIST_NOT_REGISTERED: felt252 = 'artist_not_registered';
    pub const INVALID_SONG: felt252 = 'invalid_song';
    pub const ALREADY_FAVORITED: felt252 = 'already_favorited';
}

#[derive(Drop, Serde)]
struct UserProfile {
    name: felt252,
    tokens: u256,
    registration_date: u64,
}

#[starknet::contract]
mod UserContract {
    use core::array::ArrayTrait;
    use super::{UserErrors, UserProfile, IUserContract};
    use starknet::{ContractAddress, get_block_timestamp};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};

    // Interface for Artist contract (used to verify artist addresses)
    #[starknet::interface]
    trait IArtistContract<TContractState> {
        fn is_registered_artist(self: @TContractState, artist_address: ContractAddress) -> bool;
    }

    // Interface for Song contract (used to verify song IDs)
    #[starknet::interface]
    trait ISongContract<TContractState> {
        fn is_valid_song(self: @TContractState, song_id: felt252) -> bool;
    }

    #[storage]
    struct Storage {
        // Core storage
        registered_users: Map<ContractAddress, bool>,
        user_names: Map<ContractAddress, felt252>,
        user_tokens: Map<ContractAddress, u256>,
        user_registration_dates: Map<ContractAddress, u64>,
        
        // Favorites storage
        user_favorites: Map<(ContractAddress, ContractAddress), bool>, // (user, artist) -> is_favorited
        user_favorites_count: Map<ContractAddress, u32>,
        user_favorites_list: Map<(ContractAddress, u32), ContractAddress>, // (user, index) -> artist
        
        // Contract addresses
        artist_contract: ContractAddress,
        song_contract: ContractAddress,
        
        // Constants
        listening_reward: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        UserRegistered: UserRegistered,
        ArtistFavorited: ArtistFavorited,
        UserRewarded: UserRewarded,
    }

    #[derive(Drop, starknet::Event)]
    struct UserRegistered {
        user_address: ContractAddress,
        name: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ArtistFavorited {
        user_address: ContractAddress,
        artist_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct UserRewarded {
        user_address: ContractAddress,
        song_id: felt252,
        amount: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        artist_contract: ContractAddress,
        song_contract: ContractAddress,
        initial_listening_reward: u256
    ) {
        self.artist_contract.write(artist_contract);
        self.song_contract.write(song_contract);
        self.listening_reward.write(initial_listening_reward);
    }

    #[abi(embed_v0)]
    impl UserContractImpl of IUserContract<ContractState> {
        fn register_user(ref self: ContractState, user_address: ContractAddress, name: felt252) {
            // Check if user is already registered
            let is_registered = self.registered_users.read(user_address);
            assert(!is_registered, UserErrors::USER_ALREADY_REGISTERED);
            
            // Register the user
            self.registered_users.write(user_address, true);
            self.user_names.write(user_address, name);
            self.user_tokens.write(user_address, 0_u256);
            
            // Get current timestamp
            let timestamp = get_block_timestamp();
            self.user_registration_dates.write(user_address, timestamp);
            
            // Initialize favorites count
            self.user_favorites_count.write(user_address, 0_u32);
            
            // Emit event
            self.emit(UserRegistered {
                user_address,
                name,
                timestamp,
            });
        }

        fn favorite_artist(ref self: ContractState, user_address: ContractAddress, artist_address: ContractAddress) {
            // Check if user exists
            let is_user_registered = self.registered_users.read(user_address);
            assert(is_user_registered, UserErrors::USER_NOT_REGISTERED);
            
            // Check if already favorited
            let is_favorited = self.user_favorites.read((user_address, artist_address));
            assert(!is_favorited, UserErrors::ALREADY_FAVORITED);
            
            // Check if artist exists by calling artist contract
            let artist_contract = self._get_artist_contract_dispatcher();
            let is_artist = artist_contract.is_registered_artist(artist_address);
            assert(is_artist, UserErrors::ARTIST_NOT_REGISTERED);
            
            // Add to favorites
            self.user_favorites.write((user_address, artist_address), true);
            
            // Add to favorites list
            let mut count = self.user_favorites_count.read(user_address);
            self.user_favorites_list.write((user_address, count), artist_address);
            count += 1_u32;
            self.user_favorites_count.write(user_address, count);
            
            // Emit event
            self.emit(ArtistFavorited { user_address, artist_address });
        }

        fn get_favorites(self: @ContractState, user_address: ContractAddress) -> Array<ContractAddress> {
            let is_registered = self.registered_users.read(user_address);
            assert(is_registered, UserErrors::USER_NOT_REGISTERED);
            
            let count = self.user_favorites_count.read(user_address);
            let mut favorites = ArrayTrait::new();
            
            let mut i: u32 = 0;
            let target = count;
            while i != target {
                let artist = self.user_favorites_list.read((user_address, i));
                favorites.append(artist);
                i += 1_u32;
            };
            
            favorites
        }

        fn reward_user_for_listening(ref self: ContractState, user_address: ContractAddress, song_id: felt252) {
            // Check if user exists
            let is_registered = self.registered_users.read(user_address);
            assert(is_registered, UserErrors::USER_NOT_REGISTERED);
            
            // Check if song is valid by calling song contract
            let song_contract = self._get_song_contract_dispatcher();
            let is_valid = song_contract.is_valid_song(song_id);
            assert(is_valid, UserErrors::INVALID_SONG);
            
            // Get reward amount
            let reward = self.listening_reward.read();
            
            // Update user tokens
            let current_tokens = self.user_tokens.read(user_address);
            self.user_tokens.write(user_address, current_tokens + reward);
            
            // Emit event
            self.emit(UserRewarded {
                user_address,
                song_id,
                amount: reward,
            });
        }

        fn get_user_tokens(self: @ContractState, user_address: ContractAddress) -> u256 {
            let is_registered = self.registered_users.read(user_address);
            assert(is_registered, UserErrors::USER_NOT_REGISTERED);
            
            self.user_tokens.read(user_address)
        }

        fn get_user_profile(self: @ContractState, user_address: ContractAddress) -> UserProfile {
            let is_registered = self.registered_users.read(user_address);
            assert(is_registered, UserErrors::USER_NOT_REGISTERED);
            
            UserProfile {
                name: self.user_names.read(user_address),
                tokens: self.user_tokens.read(user_address),
                registration_date: self.user_registration_dates.read(user_address),
            }
        }

        fn is_registered(self: @ContractState, user_address: ContractAddress) -> bool {
            self.registered_users.read(user_address)
        }
    }

    #[generate_trait]
    impl PrivateFunctions of PrivateTrait {
        fn _get_artist_contract_dispatcher(self: @ContractState) -> IArtistContractDispatcher {
            IArtistContractDispatcher { contract_address: self.artist_contract.read() }
        }

        fn _get_song_contract_dispatcher(self: @ContractState) -> ISongContractDispatcher {
            ISongContractDispatcher { contract_address: self.song_contract.read() }
        }
    }
}



//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// #[starknet::interface]
// trait IArtistContract<TContractState> {
//     fn register_artist(ref self: TContractState, artist_address: starknet::ContractAddress, name: felt252);
//     fn upload_song(ref self: TContractState, artist_address: starknet::ContractAddress, song_uri: felt252, metadata: SongMetadata);
//     fn get_artist_songs(self: @TContractState, artist_address: starknet::ContractAddress) -> Array<felt252>;
//     fn collab_song(
//         ref self: TContractState, 
//         artist1: starknet::ContractAddress, 
//         artist2: starknet::ContractAddress, 
//         song_uri: felt252, 
//         metadata: SongMetadata
//     );
//     fn get_artist_profile(self: @TContractState, artist_address: starknet::ContractAddress) -> ArtistProfile;
//     fn is_registered_artist(self: @TContractState, artist_address: starknet::ContractAddress) -> bool;
//     fn get_song_details(self: @TContractState, song_id: felt252) -> SongDetails;
//     fn get_song_creators(self: @TContractState, song_id: felt252) -> Array<starknet::ContractAddress>;
//     fn get_artist_collaborations(self: @TContractState, artist_address: starknet::ContractAddress) -> Array<felt252>;
// }

// // Error codes
// mod ArtistErrors {
//     pub const ARTIST_ALREADY_REGISTERED: felt252 = 'artist_already_registered';
//     pub const ARTIST_NOT_REGISTERED: felt252 = 'artist_not_registered';
//     pub const UNAUTHORIZED: felt252 = 'unauthorized';
//     pub const SONG_ALREADY_EXISTS: felt252 = 'song_already_exists';
//     pub const INVALID_SONG: felt252 = 'invalid_song';
// }

// #[derive(Drop, Serde)]
// struct ArtistProfile {
//     name: felt252,
//     song_count: u32,
//     collab_count: u32,
//     registration_date: u64,
// }

// #[derive(Drop, Copy, Clone, Serde, starknet::Store)]
// struct SongMetadata {
//     title: felt252,
//     genre: felt252,
//     release_date: u64,
//     description: felt252,
// }

// #[derive(Drop, Serde)]
// struct SongDetails {
//     id: felt252,
//     uri: felt252,
//     metadata: SongMetadata,
//     creation_date: u64,
//     is_collab: bool,
// }

// #[starknet::contract]
// mod ArtistContract {
//     use core::array::ArrayTrait;
//     use super::{ArtistErrors, ArtistProfile, SongMetadata, SongDetails, IArtistContract};
//     use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
//     use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};

//     #[storage]
//     struct Storage {
//         // Artist management
//         registered_artists: Map<ContractAddress, bool>,
//         artist_names: Map<ContractAddress, felt252>,
//         artist_song_count: Map<ContractAddress, u32>,
//         artist_collab_count: Map<ContractAddress, u32>,
//         artist_registration_dates: Map<ContractAddress, u64>,
        
//         // Song management
//         song_counter: felt252,
//         song_exists: Map<felt252, bool>,
//         song_uris: Map<felt252, felt252>,
//         song_metadatas: Map<felt252, SongMetadata>,
//         song_creation_dates: Map<felt252, u64>,
//         song_is_collab: Map<felt252, bool>,
        
//         // Artist's songs storage
//         artist_songs: Map<(ContractAddress, u32), felt252>, // (artist, index) -> song_id
//         artist_collaborations: Map<(ContractAddress, u32), felt252>, // (artist, index) -> song_id
        
//         // Song creators (for collaborations)
//         song_creators_count: Map<felt252, u32>,
//         song_creators: Map<(felt252, u32), ContractAddress>, // (song_id, index) -> artist_address
        
//         // Contract address for song contract
//         song_contract: ContractAddress,
//     }

//     #[event]
//     #[derive(Drop, starknet::Event)]
//     enum Event {
//         ArtistRegistered: ArtistRegistered,
//         SongUploaded: SongUploaded,
//         CollabSongCreated: CollabSongCreated,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct ArtistRegistered {
//         artist_address: ContractAddress,
//         name: felt252,
//         timestamp: u64,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct SongUploaded {
//         song_id: felt252,
//         artist_address: ContractAddress,
//         song_uri: felt252,
//         title: felt252,
//         timestamp: u64,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct CollabSongCreated {
//         song_id: felt252,
//         artist1: ContractAddress,
//         artist2: ContractAddress,
//         song_uri: felt252,
//         title: felt252,
//         timestamp: u64,
//     }

//     #[constructor]
//     fn constructor(
//         ref self: ContractState,
//         song_contract: ContractAddress,
//     ) {
//         self.song_counter.write(1); // Start song IDs from 1
//         self.song_contract.write(song_contract);
//     }

//     #[abi(embed_v0)]
//     impl ArtistContractImpl of IArtistContract<ContractState> {
//         fn register_artist(ref self: ContractState, artist_address: ContractAddress, name: felt252) {
//             // Check if artist is already registered
//             let is_registered = self.registered_artists.read(artist_address);
//             assert(!is_registered, ArtistErrors::ARTIST_ALREADY_REGISTERED);
            
//             // Register the artist
//             self.registered_artists.write(artist_address, true);
//             self.artist_names.write(artist_address, name);
//             self.artist_song_count.write(artist_address, 0_u32);
//             self.artist_collab_count.write(artist_address, 0_u32);
            
//             // Get current timestamp
//             let timestamp = get_block_timestamp();
//             self.artist_registration_dates.write(artist_address, timestamp);
            
//             // Emit event
//             self.emit(ArtistRegistered {
//                 artist_address,
//                 name,
//                 timestamp,
//             });
//         }

//         fn upload_song(
//             ref self: ContractState, 
//             artist_address: ContractAddress, 
//             song_uri: felt252, 
//             metadata: SongMetadata
//         ) {
//             // Verify caller is the artist or authorized
//             let caller = get_caller_address();
//             if caller != artist_address {
//                 // In a real contract, you'd check for admin or delegated rights
//                 assert(false, ArtistErrors::UNAUTHORIZED);
//             }
            
//             // Check if artist is registered
//             let is_registered = self.registered_artists.read(artist_address);
//             assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);
            
//             // Create a song ID (real implementation might use hash)
//             let song_id = self.song_counter.read();
//             self.song_counter.write(song_id + 1);
            
//             // Store song details
//             self.song_exists.write(song_id, true);
//             self.song_uris.write(song_id, song_uri);
//             self.song_metadatas.write(song_id, metadata);
//             let timestamp = get_block_timestamp();
//             self.song_creation_dates.write(song_id, timestamp);
//             self.song_is_collab.write(song_id, false);
            
//             // Add song to artist's songs
//             let song_count = self.artist_song_count.read(artist_address);
//             self.artist_songs.write((artist_address, song_count), song_id);
//             self.artist_song_count.write(artist_address, song_count + 1_u32);
            
//             // Store creator info
//             self.song_creators_count.write(song_id, 1_u32);
//             self.song_creators.write((song_id, 0_u32), artist_address);
            
//             // Emit event
//             self.emit(SongUploaded {
//                 song_id,
//                 artist_address,
//                 song_uri,
//                 title: metadata.title,
//                 timestamp,
//             });
//         }

//         fn get_artist_songs(self: @ContractState, artist_address: ContractAddress) -> Array<felt252> {
//             // Check if artist is registered
//             let is_registered = self.registered_artists.read(artist_address);
//             assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);
            
//             let song_count = self.artist_song_count.read(artist_address);
//             let mut songs = ArrayTrait::new();
            
//             let mut i: u32 = 0;
//             let target = song_count;
//             while i != target {
//                 let song_id = self.artist_songs.read((artist_address, i));
//                 songs.append(song_id);
//                 i += 1_u32;
//             };
            
//             songs
//         }

//         fn collab_song(
//             ref self: ContractState, 
//             artist1: ContractAddress, 
//             artist2: ContractAddress, 
//             song_uri: felt252, 
//             metadata: SongMetadata
//         ) {
//             // Verify caller is one of the artists or authorized
//             let caller = get_caller_address();
//             if caller != artist1 && caller != artist2 {
//                 // In a real contract, you'd check for admin or delegated rights
//                 assert(false, ArtistErrors::UNAUTHORIZED);
//             }
            
//             // Check if both artists are registered
//             let is_artist1 = self.registered_artists.read(artist1);
//             let is_artist2 = self.registered_artists.read(artist2);
//             assert(is_artist1, ArtistErrors::ARTIST_NOT_REGISTERED);
//             assert(is_artist2, ArtistErrors::ARTIST_NOT_REGISTERED);
            
//             // Create a song ID
//             let song_id = self.song_counter.read();
//             self.song_counter.write(song_id + 1);
            
//             // Store song details
//             self.song_exists.write(song_id, true);
//             self.song_uris.write(song_id, song_uri);
//             self.song_metadatas.write(song_id, metadata);
//             let timestamp = get_block_timestamp();
//             self.song_creation_dates.write(song_id, timestamp);
//             self.song_is_collab.write(song_id, true);
            
//             // Add song to both artists' collaborations
//             let collab_count1 = self.artist_collab_count.read(artist1);
//             let collab_count2 = self.artist_collab_count.read(artist2);
            
//             self.artist_collaborations.write((artist1, collab_count1), song_id);
//             self.artist_collaborations.write((artist2, collab_count2), song_id);
            
//             self.artist_collab_count.write(artist1, collab_count1 + 1_u32);
//             self.artist_collab_count.write(artist2, collab_count2 + 1_u32);
            
//             // Store creators info
//             self.song_creators_count.write(song_id, 2_u32);
//             self.song_creators.write((song_id, 0_u32), artist1);
//             self.song_creators.write((song_id, 1_u32), artist2);
            
//             // Emit event
//             self.emit(CollabSongCreated {
//                 song_id,
//                 artist1,
//                 artist2,
//                 song_uri,
//                 title: metadata.title,
//                 timestamp,
//             });
//         }

//         fn get_artist_profile(self: @ContractState, artist_address: ContractAddress) -> ArtistProfile {
//             // Check if artist is registered
//             let is_registered = self.registered_artists.read(artist_address);
//             assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);
            
//             ArtistProfile {
//                 name: self.artist_names.read(artist_address),
//                 song_count: self.artist_song_count.read(artist_address),
//                 collab_count: self.artist_collab_count.read(artist_address),
//                 registration_date: self.artist_registration_dates.read(artist_address),
//             }
//         }

//         fn is_registered_artist(self: @ContractState, artist_address: ContractAddress) -> bool {
//             self.registered_artists.read(artist_address)
//         }

//         fn get_song_details(self: @ContractState, song_id: felt252) -> SongDetails {
//             // Check if song exists
//             let exists = self.song_exists.read(song_id);
//             assert(exists, ArtistErrors::INVALID_SONG);
            
//             SongDetails {
//                 id: song_id,
//                 uri: self.song_uris.read(song_id),
//                 metadata: self.song_metadatas.read(song_id),
//                 creation_date: self.song_creation_dates.read(song_id),
//                 is_collab: self.song_is_collab.read(song_id),
//             }
//         }

//         fn get_song_creators(self: @ContractState, song_id: felt252) -> Array<ContractAddress> {
//             // Check if song exists
//             let exists = self.song_exists.read(song_id);
//             assert(exists, ArtistErrors::INVALID_SONG);
            
//             let creators_count = self.song_creators_count.read(song_id);
//             let mut creators = ArrayTrait::new();
            
//             let mut i: u32 = 0;
//             let target = creators_count;
//             while i != target {
//                 let creator = self.song_creators.read((song_id, i));
//                 creators.append(creator);
//                 i += 1_u32;
//             };
            
//             creators
//         }

//         fn get_artist_collaborations(self: @ContractState, artist_address: ContractAddress) -> Array<felt252> {
//             // Check if artist is registered
//             let is_registered = self.registered_artists.read(artist_address);
//             assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);
            
//             let collab_count = self.artist_collab_count.read(artist_address);
//             let mut collabs = ArrayTrait::new();
            
//             let mut i: u32 = 0;
//             let target = collab_count;
//             while i != target {
//                 let song_id = self.artist_collaborations.read((artist_address, i));
//                 collabs.append(song_id);
//                 i += 1_u32;
//             };
            
//             collabs
//         }
//     }
// }

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



// #[starknet::interface]
// trait ISongContract<TContractState> {
//     fn like_song(ref self: TContractState, song_id: felt252, user_address: starknet::ContractAddress);
//     fn comment_on_song(ref self: TContractState, song_id: felt252, user_address: starknet::ContractAddress, comment_text: felt252);
//     fn get_comments(self: @TContractState, song_id: felt252) -> Array<Comment>;
//     fn get_likes_count(self: @TContractState, song_id: felt252) -> u32;
//     fn has_user_liked(self: @TContractState, song_id: felt252, user_address: starknet::ContractAddress) -> bool;
//     fn is_valid_song(self: @TContractState, song_id: felt252) -> bool;
//     fn get_song_stats(self: @TContractState, song_id: felt252) -> SongStats;
//     fn get_user_comments(self: @TContractState, user_address: starknet::ContractAddress) -> Array<(felt252, Comment)>;
// }

// // Error codes
// mod SongErrors {
//     pub const INVALID_SONG: felt252 = 'invalid_song';
//     pub const USER_NOT_REGISTERED: felt252 = 'user_not_registered';
//     pub const ALREADY_LIKED: felt252 = 'already_liked';
//     pub const EMPTY_COMMENT: felt252 = 'empty_comment';
// }

// #[derive(Drop, Serde, starknet::Store)]
// struct Comment {
//     user_address: starknet::ContractAddress,
//     text: felt252,
//     timestamp: u64,
// }

// #[derive(Drop, Serde)]
// struct SongStats {
//     likes_count: u32,
//     comments_count: u32,
//     last_activity_timestamp: u64,
// }

// #[starknet::contract]
// mod SongContract {
//     use core::array::ArrayTrait;
//     use super::{SongErrors, Comment, SongStats, ISongContract};
//     use starknet::{ContractAddress, get_block_timestamp};
//     use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};

//     // Interface for Artist contract (to verify songs)
//     #[starknet::interface]
//     trait IArtistContract<TContractState> {
//         fn get_song_details(self: @TContractState, song_id: felt252) -> SongDetails;
//     }

//     // Interface for User contract (to verify users)
//     #[starknet::interface]
//     trait IUserContract<TContractState> {
//         fn is_registered(self: @TContractState, user_address: ContractAddress) -> bool;
//     }

//     // SongDetails struct (from ArtistContract)
//     #[derive(Drop, Serde)]
//     struct SongDetails {
//         id: felt252,
//         uri: felt252,
//         metadata: SongMetadata,
//         creation_date: u64,
//         is_collab: bool,
//     }

//     #[derive(Drop, Serde)]
//     struct SongMetadata {
//         title: felt252,
//         genre: felt252,
//         release_date: u64,
//         description: felt252,
//     }

//     #[storage]
//     struct Storage {
//         // Contract addresses
//         artist_contract: ContractAddress,
//         user_contract: ContractAddress,
        
//         // Song likes
//         song_valid: Map<felt252, bool>,  // Cached validity from artist contract
//         song_likes_count: Map<felt252, u32>,
//         user_liked_song: Map<(felt252, ContractAddress), bool>, // (song_id, user) -> has_liked
        
//         // Song comments
//         song_comments_count: Map<felt252, u32>,
//         song_comments: Map<(felt252, u32), Comment>, // (song_id, index) -> comment
        
//         // User comments (for profile page)
//         user_comments_count: Map<ContractAddress, u32>,
//         user_comments: Map<(ContractAddress, u32), (felt252, u32)>, // (user, index) -> (song_id, comment_index)
        
//         // Song statistics
//         song_last_activity: Map<felt252, u64>,
//     }

//     #[event]
//     #[derive(Drop, starknet::Event)]
//     enum Event {
//         SongLiked: SongLiked,
//         CommentAdded: CommentAdded,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct SongLiked {
//         song_id: felt252,
//         user_address: ContractAddress,
//         timestamp: u64,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct CommentAdded {
//         song_id: felt252,
//         user_address: ContractAddress,
//         comment_text: felt252,
//         timestamp: u64,
//     }

//     #[constructor]
//     fn constructor(
//         ref self: ContractState,
//         artist_contract: ContractAddress,
//         user_contract: ContractAddress,
//     ) {
//         self.artist_contract.write(artist_contract);
//         self.user_contract.write(user_contract);
//     }

//     #[abi(embed_v0)]
//     impl SongContractImpl of ISongContract<ContractState> {
//         fn like_song(ref self: ContractState, song_id: felt252, user_address: ContractAddress) {
//             // Verify song exists
//             assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
//             // Verify user is registered
//             assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);
            
//             // Check if user already liked this song
//             let already_liked = self.user_liked_song.read((song_id, user_address));
//             assert(!already_liked, SongErrors::ALREADY_LIKED);
            
//             // Record the like
//             self.user_liked_song.write((song_id, user_address), true);
            
//             // Increment likes count
//             let likes_count = self.song_likes_count.read(song_id);
//             self.song_likes_count.write(song_id, likes_count + 1_u32);
            
//             // Update last activity
//             let timestamp = get_block_timestamp();
//             self.song_last_activity.write(song_id, timestamp);
            
//             // Emit event
//             self.emit(SongLiked {
//                 song_id,
//                 user_address,
//                 timestamp,
//             });
//         }

//         fn comment_on_song(
//             ref self: ContractState, 
//             song_id: felt252, 
//             user_address: ContractAddress, 
//             comment_text: felt252
//         ) {
//             // Verify song exists
//             assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
//             // Verify user is registered
//             assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);
            
//             // Verify comment is not empty
//             assert(comment_text != 0, SongErrors::EMPTY_COMMENT);
            
//             // Get current timestamp
//             let timestamp = get_block_timestamp();
            
//             // Create comment object
//             let comment = Comment {
//                 user_address,
//                 text: comment_text,
//                 timestamp,
//             };
            
//             // Store comment for the song
//             let comment_index = self.song_comments_count.read(song_id);
//             self.song_comments.write((song_id, comment_index), comment);
//             self.song_comments_count.write(song_id, comment_index + 1_u32);
            
//             // Store reference to comment for the user
//             let user_comment_index = self.user_comments_count.read(user_address);
//             self.user_comments.write((user_address, user_comment_index), (song_id, comment_index));
//             self.user_comments_count.write(user_address, user_comment_index + 1_u32);
            
//             // Update last activity
//             self.song_last_activity.write(song_id, timestamp);
            
//             // Emit event
//             self.emit(CommentAdded {
//                 song_id,
//                 user_address,
//                 comment_text,
//                 timestamp,
//             });
//         }

//         fn get_comments(self: @ContractState, song_id: felt252) -> Array<Comment> {
//             // Verify song exists
//             assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
//             let comments_count = self.song_comments_count.read(song_id);
//             let mut comments = ArrayTrait::new();
            
//             let mut i: u32 = 0;
//             let target = comments_count;
//             while i != target {
//                 let comment = self.song_comments.read((song_id, i));
//                 comments.append(comment);
//                 i += 1_u32;
//             };
            
//             comments
//         }

//         fn get_likes_count(self: @ContractState, song_id: felt252) -> u32 {
//             // Verify song exists
//             assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
//             self.song_likes_count.read(song_id)
//         }

//         fn has_user_liked(self: @ContractState, song_id: felt252, user_address: ContractAddress) -> bool {
//             // Check if song and user exist
//             if !self._verify_song(song_id) || !self._verify_user(user_address) {
//                 return false;
//             }
            
//             self.user_liked_song.read((song_id, user_address))
//         }

//         fn is_valid_song(self: @ContractState, song_id: felt252) -> bool {
//             self._verify_song(song_id)
//         }

//         fn get_song_stats(self: @ContractState, song_id: felt252) -> SongStats {
//             // Verify song exists
//             assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
//             SongStats {
//                 likes_count: self.song_likes_count.read(song_id),
//                 comments_count: self.song_comments_count.read(song_id),
//                 last_activity_timestamp: self.song_last_activity.read(song_id),
//             }
//         }

//         fn get_user_comments(self: @ContractState, user_address: ContractAddress) -> Array<(felt252, Comment)> {
//             // Verify user is registered
//             assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);
            
//             let comments_count = self.user_comments_count.read(user_address);
//             let mut user_comments = ArrayTrait::new();
            
//             let mut i: u32 = 0;
//             let target = comments_count;
//             while i != target {
//                 let (song_id, comment_index) = self.user_comments.read((user_address, i));
//                 let comment = self.song_comments.read((song_id, comment_index));
//                 user_comments.append((song_id, comment));
//                 i += 1_u32;
//             };
            
//             user_comments
//         }
//     }

//     #[generate_trait]
//     impl PrivateFunctions of PrivateTrait {
//         fn _verify_song(self: @ContractState, song_id: felt252) -> bool {
//             // First check cache
//             let cached_valid = self.song_valid.read(song_id);
//             if cached_valid {
//                 return true;
//             }
            
//             // If not in cache, check with artist contract
//             let artist_contract = IArtistContractDispatcher { 
//                 contract_address: self.artist_contract.read() 
//             };
            
//             // Try to get the song details
//             // If the call succeeds (doesn't panic), the song exists
//             let _ = artist_contract.get_song_details(song_id);
//             true
//         }

//         fn _cache_song(ref self: ContractState, song_id: felt252) {
//             self.song_valid.write(song_id, true);
//         }

//         fn _verify_user(self: @ContractState, user_address: ContractAddress) -> bool {
//             let user_contract = IUserContractDispatcher { 
//                 contract_address: self.user_contract.read() 
//             };
            
//             user_contract.is_registered(user_address)
//         }

//         fn _get_artist_contract_dispatcher(self: @ContractState) -> IArtistContractDispatcher {
//             IArtistContractDispatcher { contract_address: self.artist_contract.read() }
//         }

//         fn _get_user_contract_dispatcher(self: @ContractState) -> IUserContractDispatcher {
//             IUserContractDispatcher { contract_address: self.user_contract.read() }
//         }
//     }
// }

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


// #[starknet::interface]
// trait ITippingContract<TContractState> {
//     fn tip_artist(ref self: TContractState, user_address: starknet::ContractAddress, artist_address: starknet::ContractAddress, amount: u256);
//     fn get_tips_received(self: @TContractState, artist_address: starknet::ContractAddress) -> u256;
//     fn get_tips_by_user(self: @TContractState, user_address: starknet::ContractAddress) -> u256;
//     fn get_user_tipping_history(self: @TContractState, user_address: starknet::ContractAddress) -> Array<TipRecord>;
//     fn get_artist_tip_history(self: @TContractState, artist_address: starknet::ContractAddress) -> Array<TipRecord>;
// }

// // Error codes
// mod TippingErrors {
//     pub const USER_NOT_REGISTERED: felt252 = 'user_not_registered';
//     pub const ARTIST_NOT_REGISTERED: felt252 = 'artist_not_registered';
//     pub const INSUFFICIENT_TOKENS: felt252 = 'insufficient_tokens';
//     pub const INVALID_AMOUNT: felt252 = 'invalid_amount';
// }

// #[derive(Drop, Copy, Clone, Serde, starknet::Store)]
// struct TipRecord {
//     from_user: starknet::ContractAddress,
//     to_artist: starknet::ContractAddress,
//     amount: u256,
//     timestamp: u64,
// }

// #[starknet::contract]
// mod TippingContract {
//     use core::array::ArrayTrait;
//     use super::{TippingErrors, TipRecord, ITippingContract};
//     use starknet::{ContractAddress, get_block_timestamp};
//     use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};

//     // Interface for User contract (to verify users and manage tokens)
//     #[starknet::interface]
//     trait IUserContract<TContractState> {
//         fn is_registered(self: @TContractState, user_address: ContractAddress) -> bool;
//         fn get_user_tokens(self: @TContractState, user_address: ContractAddress) -> u256;
//     }

//     // Interface for Artist contract (to verify artists)
//     #[starknet::interface]
//     trait IArtistContract<TContractState> {
//         fn is_registered_artist(self: @TContractState, artist_address: ContractAddress) -> bool;
//     }

//     #[storage]
//     struct Storage {
//         // Contract addresses
//         user_contract: ContractAddress,
//         artist_contract: ContractAddress,
        
//         // Tipping storage
//         artist_tips_received: Map<ContractAddress, u256>,
//         user_tips_given: Map<ContractAddress, u256>,
        
//         // History tracking
//         user_tip_count: Map<ContractAddress, u32>,
//         artist_tip_count: Map<ContractAddress, u32>,
        
//         // Tip records
//         user_tip_history: Map<(ContractAddress, u32), TipRecord>,
//         artist_tip_history: Map<(ContractAddress, u32), TipRecord>,
//     }

//     #[event]
//     #[derive(Drop, starknet::Event)]
//     enum Event {
//         ArtistTipped: ArtistTipped,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct ArtistTipped {
//         user_address: ContractAddress,
//         artist_address: ContractAddress,
//         amount: u256,
//         timestamp: u64,
//     }

//     #[constructor]
//     fn constructor(
//         ref self: ContractState,
//         user_contract: ContractAddress,
//         artist_contract: ContractAddress,
//     ) {
//         self.user_contract.write(user_contract);
//         self.artist_contract.write(artist_contract);
//     }

//     #[abi(embed_v0)]
//     impl TippingContractImpl of ITippingContract<ContractState> {
//         fn tip_artist(
//             ref self: ContractState, 
//             user_address: ContractAddress, 
//             artist_address: ContractAddress, 
//             amount: u256
//         ) {
//             // Verify non-zero amount
//             assert(amount > 0_u256, TippingErrors::INVALID_AMOUNT);
            
//             // Verify user is registered
//             let user_contract = self._get_user_contract_dispatcher();
//             let is_user_registered = user_contract.is_registered(user_address);
//             assert(is_user_registered, TippingErrors::USER_NOT_REGISTERED);
            
//             // Verify artist is registered
//             let artist_contract = self._get_artist_contract_dispatcher();
//             let is_artist_registered = artist_contract.is_registered_artist(artist_address);
//             assert(is_artist_registered, TippingErrors::ARTIST_NOT_REGISTERED);
            
//             // Check if user has enough tokens
//             let user_tokens = user_contract.get_user_tokens(user_address);
//             assert(user_tokens >= amount, TippingErrors::INSUFFICIENT_TOKENS);
            
//             // In a real implementation, we would transfer tokens here
//             // For now, we'll just update our tracking
            
//             // Update artist's received tips
//             let artist_tips = self.artist_tips_received.read(artist_address);
//             self.artist_tips_received.write(artist_address, artist_tips + amount);
            
//             // Update user's given tips
//             let user_tips = self.user_tips_given.read(user_address);
//             self.user_tips_given.write(user_address, user_tips + amount);
            
//             // Record the tip for history
//             let timestamp = get_block_timestamp();
//             let tip_record = TipRecord {
//                 from_user: user_address,
//                 to_artist: artist_address,
//                 amount,
//                 timestamp,
//             };
            
//             // Add to user's tip history
//             let user_tip_idx = self.user_tip_count.read(user_address);
//             self.user_tip_history.write((user_address, user_tip_idx), tip_record);
//             self.user_tip_count.write(user_address, user_tip_idx + 1_u32);
            
//             // Add to artist's tip history
//             let artist_tip_idx = self.artist_tip_count.read(artist_address);
//             self.artist_tip_history.write((artist_address, artist_tip_idx), tip_record);
//             self.artist_tip_count.write(artist_address, artist_tip_idx + 1_u32);
            
//             // Emit event
//             self.emit(ArtistTipped {
//                 user_address,
//                 artist_address,
//                 amount,
//                 timestamp,
//             });
//         }

//         fn get_tips_received(self: @ContractState, artist_address: ContractAddress) -> u256 {
//             // Verify artist is registered
//             let artist_contract = self._get_artist_contract_dispatcher();
//             let is_artist_registered = artist_contract.is_registered_artist(artist_address);
//             assert(is_artist_registered, TippingErrors::ARTIST_NOT_REGISTERED);
            
//             self.artist_tips_received.read(artist_address)
//         }

//         fn get_tips_by_user(self: @ContractState, user_address: ContractAddress) -> u256 {
//             // Verify user is registered
//             let user_contract = self._get_user_contract_dispatcher();
//             let is_user_registered = user_contract.is_registered(user_address);
//             assert(is_user_registered, TippingErrors::USER_NOT_REGISTERED);
            
//             self.user_tips_given.read(user_address)
//         }

//         fn get_user_tipping_history(self: @ContractState, user_address: ContractAddress) -> Array<TipRecord> {
//             // Verify user is registered
//             let user_contract = self._get_user_contract_dispatcher();
//             let is_user_registered = user_contract.is_registered(user_address);
//             assert(is_user_registered, TippingErrors::USER_NOT_REGISTERED);
            
//             let tip_count = self.user_tip_count.read(user_address);
//             let mut tip_history = ArrayTrait::new();
            
//             let mut i: u32 = 0;
//             let target = tip_count;
//             while i != target {
//                 let tip = self.user_tip_history.read((user_address, i));
//                 tip_history.append(tip);
//                 i += 1_u32;
//             };
            
//             tip_history
//         }

//         fn get_artist_tip_history(self: @ContractState, artist_address: ContractAddress) -> Array<TipRecord> {
//             // Verify artist is registered
//             let artist_contract = self._get_artist_contract_dispatcher();
//             let is_artist_registered = artist_contract.is_registered_artist(artist_address);
//             assert(is_artist_registered, TippingErrors::ARTIST_NOT_REGISTERED);
            
//             let tip_count = self.artist_tip_count.read(artist_address);
//             let mut tip_history = ArrayTrait::new();
            
//             let mut i: u32 = 0;
//             let target = tip_count;
//             while i != target {
//                 let tip = self.artist_tip_history.read((artist_address, i));
//                 tip_history.append(tip);
//                 i += 1_u32;
//             };
            
//             tip_history
//         }
//     }

//     #[generate_trait]
//     impl PrivateFunctions of PrivateTrait {
//         fn _get_user_contract_dispatcher(self: @ContractState) -> IUserContractDispatcher {
//             IUserContractDispatcher { contract_address: self.user_contract.read() }
//         }

//         fn _get_artist_contract_dispatcher(self: @ContractState) -> IArtistContractDispatcher {
//             IArtistContractDispatcher { contract_address: self.artist_contract.read() }
//         }
//     }
// }

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// #[starknet::interface]
// trait IMelodyToken<TContractState> {
//     // ERC20 standard functions
//     fn name(self: @TContractState) -> felt252;
//     fn symbol(self: @TContractState) -> felt252;
//     fn decimals(self: @TContractState) -> u8;
//     fn total_supply(self: @TContractState) -> u256;
//     fn balance_of(self: @TContractState, account: starknet::ContractAddress) -> u256;
//     fn allowance(self: @TContractState, owner: starknet::ContractAddress, spender: starknet::ContractAddress) -> u256;
//     fn transfer(ref self: TContractState, recipient: starknet::ContractAddress, amount: u256) -> bool;
//     fn transfer_from(ref self: TContractState, sender: starknet::ContractAddress, recipient: starknet::ContractAddress, amount: u256) -> bool;
//     fn approve(ref self: TContractState, spender: starknet::ContractAddress, amount: u256) -> bool;
    
//     // Custom Melody platform functions
//     fn mint_to_user(ref self: TContractState, user_address: starknet::ContractAddress, amount: u256);
//     fn burn_for_tipping(ref self: TContractState, user_address: starknet::ContractAddress, amount: u256);
//     fn get_listen_reward_rate(self: @TContractState) -> u256;
//     fn set_listen_reward_rate(ref self: TContractState, new_rate: u256);
//     fn get_admin(self: @TContractState) -> starknet::ContractAddress;
// }

// // Error codes
// mod TokenErrors {
//     pub const INSUFFICIENT_BALANCE: felt252 = 'insufficient_balance';
//     pub const INSUFFICIENT_ALLOWANCE: felt252 = 'insufficient_allowance';
//     pub const UNAUTHORIZED: felt252 = 'unauthorized';
//     pub const ZERO_ADDRESS: felt252 = 'zero_address';
//     pub const INVALID_AMOUNT: felt252 = 'invalid_amount';
// }

// #[starknet::contract]
// mod MelodyToken {
//     use super::{IMelodyToken, TokenErrors};
//     use starknet::{ContractAddress, get_caller_address};
//     use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};
//     use core::num::traits::Zero;

//     #[storage]
//     struct Storage {
//         // ERC20 standard storage
//         name: felt252,
//         symbol: felt252,
//         decimals: u8,
//         total_supply: u256,
//         balances: Map<ContractAddress, u256>,
//         allowances: Map<(ContractAddress, ContractAddress), u256>,
        
//         // Melody platform specific storage
//         admin: ContractAddress,
//         platform_contract: ContractAddress,
//         listen_reward_rate: u256, // Amount of tokens rewarded per listen
//     }

//     #[event]
//     #[derive(Drop, starknet::Event)]
//     enum Event {
//         Transfer: Transfer,
//         Approval: Approval,
//         TokensMinted: TokensMinted,
//         TokensBurned: TokensBurned,
//         RewardRateUpdated: RewardRateUpdated,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct Transfer {
//         from: ContractAddress,
//         to: ContractAddress,
//         value: u256,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct Approval {
//         owner: ContractAddress,
//         spender: ContractAddress,
//         value: u256,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct TokensMinted {
//         to: ContractAddress,
//         amount: u256,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct TokensBurned {
//         from: ContractAddress,
//         amount: u256,
//     }

//     #[derive(Drop, starknet::Event)]
//     struct RewardRateUpdated {
//         old_rate: u256,
//         new_rate: u256,
//     }

//     #[constructor]
//     fn constructor(
//         ref self: ContractState,
//         name: felt252,
//         symbol: felt252,
//         admin: ContractAddress,
//         platform_contract: ContractAddress,
//         initial_reward_rate: u256,
//     ) {
//         assert(!admin.is_zero(), TokenErrors::ZERO_ADDRESS);
//         assert(admin.is_non_zero(), TokenErrors::ZERO_ADDRESS);
//         assert(platform_contract.is_non_zero(), TokenErrors::ZERO_ADDRESS);
        
//         // Initialize token details
//         self.name.write(name);
//         self.symbol.write(symbol);
//         self.decimals.write(18_u8); // Standard for most tokens
//         self.total_supply.write(0_u256); // Start with zero supply
        
//         // Set admin and platform contract
//         self.admin.write(admin);
//         self.platform_contract.write(platform_contract);
//         self.listen_reward_rate.write(initial_reward_rate);
//     }

//     #[abi(embed_v0)]
//     impl MelodyTokenImpl of IMelodyToken<ContractState> {
//         // ERC20 standard functions
//         fn name(self: @ContractState) -> felt252 {
//             self.name.read()
//         }

//         fn symbol(self: @ContractState) -> felt252 {
//             self.symbol.read()
//         }

//         fn decimals(self: @ContractState) -> u8 {
//             self.decimals.read()
//         }

//         fn total_supply(self: @ContractState) -> u256 {
//             self.total_supply.read()
//         }

//         fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
//             self.balances.read(account)
//         }

//         fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
//             self.allowances.read((owner, spender))
//         }

//         fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
//             let sender = get_caller_address();
//             self._transfer(sender, recipient, amount);
//             true
//         }

//         fn transfer_from(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
//             let caller = get_caller_address();
            
//             // Check allowance
//             let current_allowance = self.allowances.read((sender, caller));
//             assert(current_allowance >= amount, TokenErrors::INSUFFICIENT_ALLOWANCE);
            
//             // Update allowance
//             self.allowances.write((sender, caller), current_allowance - amount);
            
//             // Transfer tokens
//             self._transfer(sender, recipient, amount);
//             true
//         }

//         fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
//             let owner = get_caller_address();
            
//             // Update allowance
//             self.allowances.write((owner, spender), amount);
            
//             // Emit approval event
//             self.emit(Approval { owner, spender, value: amount });
//             true
//         }
        
//         // Custom Melody platform functions
//         fn mint_to_user(ref self: ContractState, user_address: ContractAddress, amount: u256) {
//             // Only platform contract or admin can mint tokens
//             let caller = get_caller_address();
//             let admin = self.admin.read();
//             let platform = self.platform_contract.read();
            
//             assert(caller == admin || caller == platform, TokenErrors::UNAUTHORIZED);
//             assert(user_address.is_non_zero(), TokenErrors::ZERO_ADDRESS);
//             assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);
            
//             // Mint tokens
//             let balance = self.balances.read(user_address);
//             self.balances.write(user_address, balance + amount);
            
//             // Update total supply
//             let supply = self.total_supply.read();
//             self.total_supply.write(supply + amount);
            
//             // Emit transfer event (from zero address for minting)
//             self.emit(Transfer { 
//                 from: 0.try_into().unwrap(),
//                 to: user_address, 
//                 value: amount 
//             });
            
//             // Emit custom minting event
//             self.emit(TokensMinted { to: user_address, amount });
//         }

//         fn burn_for_tipping(ref self: ContractState, user_address: ContractAddress, amount: u256) {
//             // Only platform contract or admin can burn tokens
//             let caller = get_caller_address();
//             let admin = self.admin.read();
//             let platform = self.platform_contract.read();
            
//             assert(caller == admin || caller == platform, TokenErrors::UNAUTHORIZED);
//             assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);
            
//             // Check if user has enough tokens
//             let balance = self.balances.read(user_address);
//             assert(balance >= amount, TokenErrors::INSUFFICIENT_BALANCE);
            
//             // Burn tokens
//             self.balances.write(user_address, balance - amount);
            
//             // Update total supply
//             let supply = self.total_supply.read();
//             self.total_supply.write(supply - amount);
            
//             // Emit transfer event (to zero address for burning)
//             self.emit(Transfer {
//                 from: user_address,
//                 to: 0.try_into().unwrap(),
//                 value: amount 
//             });
            
//             // Emit custom burning event
//             self.emit(TokensBurned { from: user_address, amount });
//         }

//         fn get_listen_reward_rate(self: @ContractState) -> u256 {
//             self.listen_reward_rate.read()
//         }

//         fn set_listen_reward_rate(ref self: ContractState, new_rate: u256) {
//             // Only admin can change reward rate
//             let caller = get_caller_address();
//             let admin = self.admin.read();
            
//             assert(caller == admin, TokenErrors::UNAUTHORIZED);
            
//             let old_rate = self.listen_reward_rate.read();
//             self.listen_reward_rate.write(new_rate);
            
//             // Emit event
//             self.emit(RewardRateUpdated { old_rate, new_rate });
//         }

//         fn get_admin(self: @ContractState) -> ContractAddress {
//             self.admin.read()
//         }
//     }

//     // Internal functions
//     #[generate_trait]
//     impl InternalFunctions of InternalTrait {
//         fn _transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256) {
//             // Validate addresses
//             assert(from.is_non_zero(), TokenErrors::ZERO_ADDRESS);
//             assert(to.is_non_zero(), TokenErrors::ZERO_ADDRESS);
//             assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);
            
//             // Check balance
//             let from_balance = self.balances.read(from);
//             assert(from_balance >= amount, TokenErrors::INSUFFICIENT_BALANCE);
            
//             // Update balances
//             self.balances.write(from, from_balance - amount);
//             let to_balance = self.balances.read(to);
//             self.balances.write(to, to_balance + amount);
            
//             // Emit transfer event
//             self.emit(Transfer { from, to, value: amount });
//         }
//     }
// }