use super::errors::SongErrors;
use super::model::{Comment, SongStats, SongBasicInfo};
use starknet::ContractAddress;

#[starknet::interface]
trait ISongContract<TContractState> {
    fn like_song(
        ref self: TContractState, song_id: felt252, user_address: starknet::ContractAddress,
    );
    fn comment_on_song(
        ref self: TContractState,
        song_id: felt252,
        user_address: starknet::ContractAddress,
        comment_text: ByteArray,
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
    fn set_artist_contract(ref self: TContractState, new_artist_contract: ContractAddress);
    fn set_user_contract(ref self: TContractState, new_user_contract: ContractAddress);
    
    // New getter functions
    fn get_total_songs_count(self: @TContractState) -> u32;
    fn get_songs_list(self: @TContractState, start_index: u32, limit: u32) -> Array<felt252>;
    fn get_comments_paginated(self: @TContractState, song_id: felt252, start: u32, limit: u32) -> Array<Comment>;
    fn get_comments_count(self: @TContractState, song_id: felt252) -> u32;
    fn get_song_batch_info(self: @TContractState, song_id: felt252) -> (u32, u32, u64);  // (likes, comments, last_activity)
    fn get_contract_addresses(self: @TContractState) -> (ContractAddress, ContractAddress);  // (artist_contract, user_contract)
    fn get_user_liked_songs(self: @TContractState, user_address: ContractAddress) -> Array<felt252>;
    fn get_songs_by_popularity(self: @TContractState, limit: u32) -> Array<(felt252, u32)>;  // (song_id, likes_count)
    fn get_recent_activities(self: @TContractState, limit: u32) -> Array<(felt252, u64)>;  // (song_id, timestamp)
    fn get_songs_basic_info(self: @TContractState, song_ids: Array<felt252>) -> Array<SongBasicInfo>;
}

#[starknet::contract]
mod SongContract {
    use core::array::ArrayTrait;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp};
    use super::{Comment, ISongContract, SongErrors, SongStats, SongBasicInfo};

    // Interface for Artist contract (to verify songs)
    #[starknet::interface]
    trait IArtistContract<TContractState> {
        fn get_song_details(self: @TContractState, song_id: felt252) -> SongDetails;
        fn get_all_songs(self: @TContractState) -> Array<felt252>;
        fn get_total_songs_count(self: @TContractState) -> u32;
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
        // Tracking for users and their liked songs
        user_liked_songs_count: Map<ContractAddress, u32>,
        user_liked_songs: Map<(ContractAddress, u32), felt252>, // (user, index) -> song_id
        // Song tracking
        all_songs_count: u32,
        all_songs: Map<u32, felt252>, // index -> song_id
        // Popularity tracking (helper maps for efficient queries)
        song_popularity_index: Map<felt252, u32>, // song_id -> popularity_index
        songs_by_popularity: Map<u32, felt252>, // popularity_index -> song_id
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SongLiked: SongLiked,
        CommentAdded: CommentAdded,
        SongAdded: SongAdded,
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
        comment_text: ByteArray,
        timestamp: u64,
    }
    
    #[derive(Drop, starknet::Event)]
    struct SongAdded {
        song_id: felt252,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, artist_contract: ContractAddress, user_contract: ContractAddress,
    ) {
        self.artist_contract.write(artist_contract);
        self.user_contract.write(user_contract);
        self.all_songs_count.write(0_u32);
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

            // Add to user's liked songs list
            let user_liked_count = self.user_liked_songs_count.read(user_address);
            self.user_liked_songs.write((user_address, user_liked_count), song_id);
            self.user_liked_songs_count.write(user_address, user_liked_count + 1_u32);

            // Update last activity
            let timestamp = get_block_timestamp();
            self.song_last_activity.write(song_id, timestamp);

            // Update song popularity tracking
            self._update_song_popularity(song_id, likes_count + 1_u32);

            // Emit event
            self.emit(SongLiked { song_id, user_address, timestamp });
        }

        fn comment_on_song(
            ref self: ContractState,
            song_id: felt252,
            user_address: ContractAddress,
            comment_text: ByteArray,
        ) {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
        
            // Verify user is registered
            assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);
        
            // Verify comment is not empty
            assert(comment_text.len()>0, SongErrors::EMPTY_COMMENT);
        
            // Get current timestamp
            let timestamp = get_block_timestamp();
        
            // Clone the comment_text for later use in the event
            let comment_text_for_event = comment_text.clone();
        
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
            self.emit(CommentAdded { song_id, user_address, comment_text: comment_text_for_event, timestamp });
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

        fn set_artist_contract(ref self: ContractState, new_artist_contract: ContractAddress) {
            // TODO: Add access control if needed
            self.artist_contract.write(new_artist_contract);
        }

        fn set_user_contract(ref self: ContractState, new_user_contract: ContractAddress) {
            // TODO: Add access control if needed
            self.user_contract.write(new_user_contract);
        }

        // New getter function implementations
        
        fn get_total_songs_count(self: @ContractState) -> u32 {
            // Get total songs count from artist contract to ensure up-to-date info
            let artist_contract = self._get_artist_contract_dispatcher();
            artist_contract.get_total_songs_count()
        }
        
        fn get_songs_list(self: @ContractState, start_index: u32, limit: u32) -> Array<felt252> {
            // Get songs list from artist contract
            let artist_contract = self._get_artist_contract_dispatcher();
            let all_songs = artist_contract.get_all_songs();
            
            let mut result = ArrayTrait::new();
            let songs_count = all_songs.len();
            
            // Early return if start index is beyond the array
            if start_index >= songs_count {
                return result;
            }
            
            let mut current_index = start_index;
            let end_index = if start_index + limit < songs_count { start_index + limit } else { songs_count };
            
            while current_index != end_index {
                result.append(*all_songs.at(current_index));
                current_index += 1_u32;
            }
            
            result
        }
        
        fn get_comments_paginated(self: @ContractState, song_id: felt252, start: u32, limit: u32) -> Array<Comment> {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
            let comments_count = self.song_comments_count.read(song_id);
            let mut comments = ArrayTrait::new();
            
            // Early return if start index is beyond the array
            if start >= comments_count {
                return comments;
            }
            
            let mut current_index = start;
            let end_index = if start + limit < comments_count { start + limit } else { comments_count };
            
            while current_index != end_index {
                let comment = self.song_comments.read((song_id, current_index));
                comments.append(comment);
                current_index += 1_u32;
            }
            
            comments
        }
        
        fn get_comments_count(self: @ContractState, song_id: felt252) -> u32 {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
            self.song_comments_count.read(song_id)
        }
        
        fn get_song_batch_info(self: @ContractState, song_id: felt252) -> (u32, u32, u64) {
            // Verify song exists
            assert(self._verify_song(song_id), SongErrors::INVALID_SONG);
            
            let likes_count = self.song_likes_count.read(song_id);
            let comments_count = self.song_comments_count.read(song_id);
            let last_activity = self.song_last_activity.read(song_id);
            
            (likes_count, comments_count, last_activity)
        }
        
        fn get_contract_addresses(self: @ContractState) -> (ContractAddress, ContractAddress) {
            (self.artist_contract.read(), self.user_contract.read())
        }
        
        fn get_user_liked_songs(self: @ContractState, user_address: ContractAddress) -> Array<felt252> {
            // Verify user is registered
            assert(self._verify_user(user_address), SongErrors::USER_NOT_REGISTERED);
            
            let liked_count = self.user_liked_songs_count.read(user_address);
            let mut liked_songs = ArrayTrait::new();
            
            let mut i: u32 = 0;
            let target = liked_count;
            while i != target {
                let song_id = self.user_liked_songs.read((user_address, i));
                liked_songs.append(song_id);
                i += 1_u32;
            }
            
            liked_songs
        }
        
        fn get_songs_by_popularity(self: @ContractState, limit: u32) -> Array<(felt252, u32)> {
            let mut result = ArrayTrait::new();
            let total_songs = self.all_songs_count.read();
            
            // No songs yet
            if total_songs == 0 {
                return result;
            }
            
            let mut i: u32 = 0;
            let target = if limit < total_songs { limit } else { total_songs };
            
            while i != target {
                let song_id = self.songs_by_popularity.read(i);
                let likes = self.song_likes_count.read(song_id);
                result.append((song_id, likes));
                i += 1_u32;
            }
            
            result
        }
        
        fn get_recent_activities(self: @ContractState, limit: u32) -> Array<(felt252, u64)> {
            // Implementation limited by Cairo's constraints
            // In a real implementation, we would likely track a list of recent activities
            // For now, we'll just return some recently active songs from the songs we track
            
            let mut result = ArrayTrait::new();
            let total_songs = self.all_songs_count.read();
            
            // No songs yet
            if total_songs == 0 {
                return result;
            }
            
            // This is inefficient but works for demonstration
            // In a real implementation, we'd maintain a sorted list of songs by activity timestamp
            
            let mut i: u32 = 0;
            let target = if limit < total_songs { limit } else { total_songs };
            
            while i != target {
                let song_id = self.all_songs.read(i);
                let timestamp = self.song_last_activity.read(song_id);
                
                // Only add songs with activity
                if timestamp > 0 {
                    result.append((song_id, timestamp));
                }
                
                i += 1_u32;
            }
            
            // Note: In Cairo, we can't easily sort this result by timestamp
            // In a production system, we'd maintain a sorted data structure
            
            result
        }
        
        fn get_songs_basic_info(self: @ContractState, song_ids: Array<felt252>) -> Array<SongBasicInfo> {
            let mut result = ArrayTrait::new();
            let song_ids_len = song_ids.len();
            
            let mut i: u32 = 0;
            while i != song_ids_len {
                let song_id = *song_ids.at(i);
                
                // Skip invalid songs
                if !self._verify_song(song_id) {
                    i += 1_u32;
                    continue;
                }
                
                let likes_count = self.song_likes_count.read(song_id);
                let comments_count = self.song_comments_count.read(song_id);
                let last_activity = self.song_last_activity.read(song_id);
                
                let song_info = SongBasicInfo {
                    id: song_id,
                    likes_count,
                    comments_count,
                    last_activity,
                };
                
                result.append(song_info);
                i += 1_u32;
            }
            
            result
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
            
            // Add to all songs list if not already added
            let songs_count = self.all_songs_count.read();
            
            // Check if we already have this song
            let mut i: u32 = 0;
            let mut found = false;
            while i != songs_count {
                if self.all_songs.read(i) == song_id {
                    found = true;
                    break;
                }
                i += 1_u32;
            }
            
            if !found {
                self.all_songs.write(songs_count, song_id);
                self.all_songs_count.write(songs_count + 1_u32);
                
                // Initialize popularity tracking
                let timestamp = get_block_timestamp();
                self.song_last_activity.write(song_id, timestamp);
                
                // Emit song added event
                self.emit(SongAdded { song_id, timestamp });
            }
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
        
        fn _update_song_popularity(ref self: ContractState, song_id: felt252, new_likes_count: u32) {
            // This is a simplified implementation for updating popularity
            // In a real-world system, this would be more sophisticated
            // and would likely include more factors than just likes
            
            // For simplicity, we're not implementing the full sorting mechanism
            // which would be complex in Cairo
            
            // Just update the song's popularity index
            self.song_popularity_index.write(song_id, new_likes_count);
            
            // In a proper implementation, we would reorder the songs_by_popularity mapping
            // based on the updated count
            // This is left as a simplified implementation
        }
    }
}