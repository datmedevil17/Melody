use super::model::UserProfile;
use super::errors::UserErrors;
use starknet::ContractAddress;

#[starknet::interface]
trait IUserContract<TContractState> {
    fn register_user(ref self: TContractState, user_address: starknet::ContractAddress, name: felt252);
    fn favorite_artist(ref self: TContractState, user_address: starknet::ContractAddress, artist_address: starknet::ContractAddress);
    fn get_favorites(self: @TContractState, user_address: starknet::ContractAddress) -> Array<starknet::ContractAddress>;
    fn reward_user_for_listening(ref self: TContractState, user_address: starknet::ContractAddress, song_id: felt252);
    fn get_user_tokens(self: @TContractState, user_address: starknet::ContractAddress) -> u256;
    fn get_user_profile(self: @TContractState, user_address: starknet::ContractAddress) -> UserProfile;
    fn is_registered(self: @TContractState, user_address: starknet::ContractAddress) -> bool;
    fn set_artist_contract(ref self: TContractState, new_artist_contract: ContractAddress);
    fn set_song_contract(ref self: TContractState, new_song_contract: ContractAddress);
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

        fn set_artist_contract(ref self: ContractState, new_artist_contract: ContractAddress) {
            // TODO: Add access control if needed
            self.artist_contract.write(new_artist_contract);
        }

        fn set_song_contract(ref self: ContractState, new_song_contract: ContractAddress) {
            // TODO: Add access control if needed
            self.song_contract.write(new_song_contract);
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