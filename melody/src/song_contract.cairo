use super::errors::SongErrors;
use super::model::{Comment, SongStats};

#[starknet::interface]
trait ISongContract<TContractState> {
    fn like_song(
        ref self: TContractState, song_id: felt252, user_address: starknet::ContractAddress,
    );
    fn comment_on_song(
        ref self: TContractState,
        song_id: felt252,
        user_address: starknet::ContractAddress,
        comment_text: felt252,
    );
    fn get_comments(self: @TContractState, song_id: felt252) -> Array<Comment>;
    fn get_likes_count(self: @TContractState, song_id: felt252) -> u32;
    fn has_user_liked(
        self: @TContractState, song_id: felt252, user_address: starknet::ContractAddress,
    ) -> bool;
    fn is_valid_song(self: @TContractState, song_id: felt252) -> bool;
    fn get_song_stats(self: @TContractState, song_id: felt252) -> SongStats;
    fn get_user_comments(
        self: @TContractState, user_address: starknet::ContractAddress,
    ) -> Array<(felt252, Comment)>;
}

#[starknet::contract]
mod SongContract {
    use core::array::ArrayTrait;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp};
    use super::{Comment, ISongContract, SongErrors, SongStats};

    // Interface for Artist contract (to verify songs)
    #[starknet::interface]
    trait IArtistContract<TContractState> {
        fn get_song_details(self: @TContractState, song_id: felt252) -> SongDetails;
    }

    // Interface for User contract (to verify users)
    #[starknet::interface]
    trait IUserContract<TContractState> {
        fn is_registered(self: @TContractState, user_address: ContractAddress) -> bool;
    }

    // SongDetails struct (from ArtistContract)
    #[derive(Drop, Serde)]
    struct SongDetails {
        id: felt252,
        uri: felt252,
        metadata: SongMetadata,
        creation_date: u64,
        is_collab: bool,
    }

    #[derive(Drop, Serde)]
    struct SongMetadata {
        title: felt252,
        genre: felt252,
        release_date: u64,
        description: felt252,
    }

    #[storage]
    struct Storage {
        // Contract addresses
        artist_contract: ContractAddress,
        user_contract: ContractAddress,
        // Song likes
        song_valid: Map<felt252, bool>, // Cached validity from artist contract
        song_likes_count: Map<felt252, u32>,
        user_liked_song: Map<(felt252, ContractAddress), bool>, // (song_id, user) -> has_liked
        // Song comments
        song_comments_count: Map<felt252, u32>,
        song_comments: Map<(felt252, u32), Comment>, // (song_id, index) -> comment
        // User comments (for profile page)
        user_comments_count: Map<ContractAddress, u32>,
        user_comments: Map<
            (ContractAddress, u32), (felt252, u32),
        >, // (user, index) -> (song_id,comment_index)
        // Song statistics
        song_last_activity: Map<felt252, u64>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SongLiked: SongLiked,
        CommentAdded: CommentAdded,
    }

    #[derive(Drop, starknet::Event)]
    struct SongLiked {
        song_id: felt252,
        user_address: ContractAddress,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct CommentAdded {
        song_id: felt252,
        user_address: ContractAddress,
        comment_text: felt252,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, artist_contract: ContractAddress, user_contract: ContractAddress,
    ) {
        self.artist_contract.write(artist_contract);
        self.user_contract.write(user_contract);
    }

    #[abi(embed_v0)]
    impl SongContractImpl of ISongContract<ContractState> {
        fn like_song(ref self: ContractState, song_id: felt252, user_address: ContractAddress) {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);

            // Verify user is registered
            assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);

            // Check if user already liked this song
            let already_liked = self.user_liked_song.read((song_id, user_address));
            assert(!already_liked, SongErrors::ALREADY_LIKED);

            // Record the like
            self.user_liked_song.write((song_id, user_address), true);

            // Increment likes count
            let likes_count = self.song_likes_count.read(song_id);
            self.song_likes_count.write(song_id, likes_count + 1_u32);

            // Update last activity
            let timestamp = get_block_timestamp();
            self.song_last_activity.write(song_id, timestamp);

            // Emit event
            self.emit(SongLiked { song_id, user_address, timestamp });
        }

        fn comment_on_song(
            ref self: ContractState,
            song_id: felt252,
            user_address: ContractAddress,
            comment_text: felt252,
        ) {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);

            // Verify user is registered
            assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);

            // Verify comment is not empty
            assert(comment_text != 0, SongErrors::EMPTY_COMMENT);

            // Get current timestamp
            let timestamp = get_block_timestamp();

            // Create comment object
            let comment = Comment { user_address, text: comment_text, timestamp };

            // Store comment for the song
            let comment_index = self.song_comments_count.read(song_id);
            self.song_comments.write((song_id, comment_index), comment);
            self.song_comments_count.write(song_id, comment_index + 1_u32);

            // Store reference to comment for the user
            let user_comment_index = self.user_comments_count.read(user_address);
            self.user_comments.write((user_address, user_comment_index), (song_id, comment_index));
            self.user_comments_count.write(user_address, user_comment_index + 1_u32);

            // Update last activity
            self.song_last_activity.write(song_id, timestamp);

            // Emit event
            self.emit(CommentAdded { song_id, user_address, comment_text, timestamp });
        }

        fn get_comments(self: @ContractState, song_id: felt252) -> Array<Comment> {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);

            let comments_count = self.song_comments_count.read(song_id);
            let mut comments = ArrayTrait::new();

            let mut i: u32 = 0;
            let target = comments_count;
            while i != target {
                let comment = self.song_comments.read((song_id, i));
                comments.append(comment);
                i += 1_u32;
            }

            comments
        }

        fn get_likes_count(self: @ContractState, song_id: felt252) -> u32 {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);

            self.song_likes_count.read(song_id)
        }

        fn has_user_liked(
            self: @ContractState, song_id: felt252, user_address: ContractAddress,
        ) -> bool {
            // Check if song and user exist
            if !self._verify_song(song_id) || !self._verify_user(user_address) {
                return false;
            }

            self.user_liked_song.read((song_id, user_address))
        }

        fn is_valid_song(self: @ContractState, song_id: felt252) -> bool {
            self._verify_song(song_id)
        }

        fn get_song_stats(self: @ContractState, song_id: felt252) -> SongStats {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);

            SongStats {
                likes_count: self.song_likes_count.read(song_id),
                comments_count: self.song_comments_count.read(song_id),
                last_activity_timestamp: self.song_last_activity.read(song_id),
            }
        }

        fn get_user_comments(
            self: @ContractState, user_address: ContractAddress,
        ) -> Array<(felt252, Comment)> {
            // Verify user is registered
            assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);

            let comments_count = self.user_comments_count.read(user_address);
            let mut user_comments = ArrayTrait::new();

            let mut i: u32 = 0;
            let target = comments_count;
            while i != target {
                let (song_id, comment_index) = self.user_comments.read((user_address, i));
                let comment = self.song_comments.read((song_id, comment_index));
                user_comments.append((song_id, comment));
                i += 1_u32;
            }

            user_comments
        }
    }

    #[generate_trait]
    impl PrivateFunctions of PrivateTrait {
        fn _verify_song(self: @ContractState, song_id: felt252) -> bool {
            // First check cache
            let cached_valid = self.song_valid.read(song_id);
            if cached_valid {
                return true;
            }

            // If not in cache, check with artist contract
            let artist_contract = IArtistContractDispatcher {
                contract_address: self.artist_contract.read(),
            };

            // Try to get the song details
            // If the call succeeds (doesn't panic), the song exists
            let _ = artist_contract.get_song_details(song_id);
            true
        }

        fn _cache_song(ref self: ContractState, song_id: felt252) {
            self.song_valid.write(song_id, true);
        }

        fn _verify_user(self: @ContractState, user_address: ContractAddress) -> bool {
            let user_contract = IUserContractDispatcher {
                contract_address: self.user_contract.read(),
            };

            user_contract.is_registered(user_address)
        }

        fn _get_artist_contract_dispatcher(self: @ContractState) -> IArtistContractDispatcher {
            IArtistContractDispatcher { contract_address: self.artist_contract.read() }
        }

        fn _get_user_contract_dispatcher(self: @ContractState) -> IUserContractDispatcher {
            IUserContractDispatcher { contract_address: self.user_contract.read() }
        }
    }
}
