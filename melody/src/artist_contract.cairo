use super::errors::ArtistErrors;
use super::model::{ArtistProfile, SongDetails, SongMetadata};

#[starknet::interface]
trait IArtistContract<TContractState> {
    fn register_artist(
        ref self: TContractState, artist_address: starknet::ContractAddress, name: felt252,
    );
    fn upload_song(
        ref self: TContractState,
        artist_address: starknet::ContractAddress,
        song_uri: ByteArray,
        metadata: SongMetadata,
    );
    fn get_artist_songs(
        self: @TContractState, artist_address: starknet::ContractAddress,
    ) -> Array<felt252>;
    fn collab_song(
        ref self: TContractState,
        artist1: starknet::ContractAddress,
        artist2: starknet::ContractAddress,
        song_uri: ByteArray,
        metadata: SongMetadata,
    );
    fn get_artist_profile(
        self: @TContractState, artist_address: starknet::ContractAddress,
    ) -> ArtistProfile;
    fn is_registered_artist(
        self: @TContractState, artist_address: starknet::ContractAddress,
    ) -> bool;
    fn get_song_details(self: @TContractState, song_id: felt252) -> SongDetails;
    fn get_song_creators(
        self: @TContractState, song_id: felt252,
    ) -> Array<starknet::ContractAddress>;
    fn get_artist_collaborations(
        self: @TContractState, artist_address: starknet::ContractAddress,
    ) -> Array<felt252>;
    fn set_song_contract(ref self: TContractState, new_song_contract: starknet::ContractAddress);
}


#[starknet::contract]
mod ArtistContract {
    use core::array::ArrayTrait;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use super::{ArtistErrors, ArtistProfile, IArtistContract, SongDetails, SongMetadata};
    use core::byte_array::ByteArray;

    #[storage]
    struct Storage {
        // Artist management
        registered_artists: Map<ContractAddress, bool>,
        artist_names: Map<ContractAddress, felt252>,
        artist_song_count: Map<ContractAddress, u32>,
        artist_collab_count: Map<ContractAddress, u32>,
        artist_registration_dates: Map<ContractAddress, u64>,
        // Song management
        song_counter: felt252,
        song_exists: Map<felt252, bool>,
        song_uris: Map<felt252, ByteArray>,  // Changed from felt252 to ByteArray
        song_metadatas: Map<felt252, SongMetadata>,
        song_creation_dates: Map<felt252, u64>,
        song_is_collab: Map<felt252, bool>,
        // Artist's songs storage
        artist_songs: Map<(ContractAddress, u32), felt252>, // (artist, index) -> song_id
        artist_collaborations: Map<(ContractAddress, u32), felt252>, // (artist, index) ->
        // Song creators (for collaborations)
        song_creators_count: Map<felt252, u32>,
        song_creators: Map<(felt252, u32), ContractAddress>, // (song_id, index) ->
        // Contract address for song contract
        song_contract: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ArtistRegistered: ArtistRegistered,
        SongUploaded: SongUploaded,
        CollabSongCreated: CollabSongCreated,
    }

    #[derive(Drop, starknet::Event)]
    struct ArtistRegistered {
        artist_address: ContractAddress,
        name: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SongUploaded {
        song_id: felt252,
        artist_address: ContractAddress,
        song_uri: ByteArray,
        title: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct CollabSongCreated {
        song_id: felt252,
        artist1: ContractAddress,
        artist2: ContractAddress,
        song_uri: ByteArray,
        title: felt252,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, song_contract: ContractAddress) {
        self.song_counter.write(1); // Start song IDs from 1
        self.song_contract.write(song_contract);
    }

    #[abi(embed_v0)]
    impl ArtistContractImpl of IArtistContract<ContractState> {
        fn register_artist(
            ref self: ContractState, artist_address: ContractAddress, name: felt252,
        ) {
            // Check if artist is already registered
            let is_registered = self.registered_artists.read(artist_address);
            assert(!is_registered, ArtistErrors::ARTIST_ALREADY_REGISTERED);

            // Register the artist
            self.registered_artists.write(artist_address, true);
            self.artist_names.write(artist_address, name);
            self.artist_song_count.write(artist_address, 0_u32);
            self.artist_collab_count.write(artist_address, 0_u32);

            // Get current timestamp
            let timestamp = get_block_timestamp();
            self.artist_registration_dates.write(artist_address, timestamp);

            // Emit event
            self.emit(ArtistRegistered { artist_address, name, timestamp });
        }

        fn upload_song(
            ref self: ContractState,
            artist_address: ContractAddress,
            song_uri: ByteArray,  // Fixed typo: ByeArray -> ByteArray
            metadata: SongMetadata,
        ) {
            // Verify caller is the artist or authorized
            let caller = get_caller_address();
            if caller != artist_address {
                // In a real contract, you'd check for admin or delegated rights
                assert(false, ArtistErrors::UNAUTHORIZED);
            }

            // Check if artist is registered
            let is_registered = self.registered_artists.read(artist_address);
            assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);

            // Create a song ID (real implementation might use hash)
            let song_id = self.song_counter.read();
            self.song_counter.write(song_id + 1);

            // Extract metadata fields before using them
            let title = metadata.title;
            
            // Clone the ByteArray for later use in event
            let song_uri_clone = song_uri.clone();
            
            // Store song details
            self.song_exists.write(song_id, true);
            self.song_uris.write(song_id, song_uri);
            
            // Write metadata to storage
            self.song_metadatas.write(song_id, metadata);
            
            let timestamp = get_block_timestamp();
            self.song_creation_dates.write(song_id, timestamp);
            self.song_is_collab.write(song_id, false);

            // Add song to artist's songs
            let song_count = self.artist_song_count.read(artist_address);
            self.artist_songs.write((artist_address, song_count), song_id);
            self.artist_song_count.write(artist_address, song_count + 1_u32);

            // Store creator info
            self.song_creators_count.write(song_id, 1_u32);
            self.song_creators.write((song_id, 0_u32), artist_address);

            // Emit event
            self
                .emit(
                    SongUploaded {
                        song_id, artist_address, song_uri: song_uri_clone, title, timestamp,
                    },
                );
        }

        fn get_artist_songs(
            self: @ContractState, artist_address: ContractAddress,
        ) -> Array<felt252> {
            // Check if artist is registered
            let is_registered = self.registered_artists.read(artist_address);
            assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);

            let song_count = self.artist_song_count.read(artist_address);
            let mut songs = ArrayTrait::new();

            let mut i: u32 = 0;
            let target = song_count;
            while i != target {
                let song_id = self.artist_songs.read((artist_address, i));
                songs.append(song_id);
                i += 1_u32;
            }

            songs
        }

        fn collab_song(
            ref self: ContractState,
            artist1: ContractAddress,
            artist2: ContractAddress,
            song_uri: ByteArray,
            metadata: SongMetadata,
        ) {
            // Verify caller is one of the artists or authorized
            let caller = get_caller_address();
            if caller != artist1 && caller != artist2 {
                // In a real contract, you'd check for admin or delegated rights
                assert(false, ArtistErrors::UNAUTHORIZED);
            }

            // Check if both artists are registered
            let is_artist1 = self.registered_artists.read(artist1);
            let is_artist2 = self.registered_artists.read(artist2);
            assert(is_artist1, ArtistErrors::ARTIST_NOT_REGISTERED);
            assert(is_artist2, ArtistErrors::ARTIST_NOT_REGISTERED);

            // Create a song ID
            let song_id = self.song_counter.read();
            self.song_counter.write(song_id + 1);

            // Extract metadata fields before using them
            let title = metadata.title;
            
            // Clone the ByteArray for later use in event
            let song_uri_clone = song_uri.clone();
            
            // Store song details
            self.song_exists.write(song_id, true);
            self.song_uris.write(song_id, song_uri);
            self.song_metadatas.write(song_id, metadata);
            let timestamp = get_block_timestamp();
            self.song_creation_dates.write(song_id, timestamp);
            self.song_is_collab.write(song_id, true);

            // Add song to both artists' collaborations
            let collab_count1 = self.artist_collab_count.read(artist1);
            let collab_count2 = self.artist_collab_count.read(artist2);

            self.artist_collaborations.write((artist1, collab_count1), song_id);
            self.artist_collaborations.write((artist2, collab_count2), song_id);

            self.artist_collab_count.write(artist1, collab_count1 + 1_u32);
            self.artist_collab_count.write(artist2, collab_count2 + 1_u32);

            // Store creators info
            self.song_creators_count.write(song_id, 2_u32);
            self.song_creators.write((song_id, 0_u32), artist1);
            self.song_creators.write((song_id, 1_u32), artist2);

            // Emit event
            self
                .emit(
                    CollabSongCreated {
                        song_id, artist1, artist2, song_uri: song_uri_clone, title, timestamp,
                    },
                );
        }

        fn get_artist_profile(
            self: @ContractState, artist_address: ContractAddress,
        ) -> ArtistProfile {
            // Check if artist is registered
            let is_registered = self.registered_artists.read(artist_address);
            assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);

            ArtistProfile {
                name: self.artist_names.read(artist_address),
                song_count: self.artist_song_count.read(artist_address),
                collab_count: self.artist_collab_count.read(artist_address),
                registration_date: self.artist_registration_dates.read(artist_address),
            }
        }

        fn is_registered_artist(self: @ContractState, artist_address: ContractAddress) -> bool {
            self.registered_artists.read(artist_address)
        }

        fn get_song_details(self: @ContractState, song_id: felt252) -> SongDetails {
            // Check if song exists
            let exists = self.song_exists.read(song_id);
            assert(exists, ArtistErrors::INVALID_SONG);

            SongDetails {
                id: song_id,
                uri: self.song_uris.read(song_id),
                metadata: self.song_metadatas.read(song_id),
                creation_date: self.song_creation_dates.read(song_id),
                is_collab: self.song_is_collab.read(song_id),
            }
        }

        fn get_song_creators(self: @ContractState, song_id: felt252) -> Array<ContractAddress> {
            // Check if song exists
            let exists = self.song_exists.read(song_id);
            assert(exists, ArtistErrors::INVALID_SONG);

            let creators_count = self.song_creators_count.read(song_id);
            let mut creators = ArrayTrait::new();

            let mut i: u32 = 0;
            let target = creators_count;
            while i != target {
                let creator = self.song_creators.read((song_id, i));
                creators.append(creator);
                i += 1_u32;
            }

            creators
        }

        fn get_artist_collaborations(
            self: @ContractState, artist_address: ContractAddress,
        ) -> Array<felt252> {
            // Check if artist is registered
            let is_registered = self.registered_artists.read(artist_address);
            assert(is_registered, ArtistErrors::ARTIST_NOT_REGISTERED);

            let collab_count = self.artist_collab_count.read(artist_address);
            let mut collabs = ArrayTrait::new();

            let mut i: u32 = 0;
            let target = collab_count;
            while i != target {
                let song_id = self.artist_collaborations.read((artist_address, i));
                collabs.append(song_id);
                i += 1_u32;
            }

            collabs
        }

        fn set_song_contract(ref self: ContractState, new_song_contract: ContractAddress) {
            // TODO: Add access control if needed
            self.song_contract.write(new_song_contract);
        }
    }
}