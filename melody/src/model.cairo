    // User contract
    #[derive(Drop, Serde)]
    pub struct UserProfile {
        pub name: felt252,
        pub tokens: u256,
        pub registration_date: u64,
    }

    // Artist contract
    #[derive(Drop, Serde)]
    pub struct ArtistProfile {
        pub name: felt252,
        pub song_count: u32,
        pub collab_count: u32,
        pub registration_date: u64,
    }
    #[derive(Drop, Clone, Serde, starknet::Store)]
    pub struct SongMetadata {
        pub title: felt252,
        pub genre: felt252,
        pub release_date: u64,
        pub description: ByteArray,
    }

    #[derive(Drop, Serde)]
    pub struct SongDetails {
        pub id: felt252,
        pub uri: ByteArray,
        pub metadata: SongMetadata,
        pub creation_date: u64,
        pub is_collab: bool,
    }

    // Song contracts
    #[derive(Drop, Serde, starknet::Store)]
    pub struct Comment {
        pub user_address: starknet::ContractAddress,
        pub text: ByteArray,
        pub timestamp: u64,
    }

    #[derive(Drop, Serde)]
    pub struct SongStats {
        pub likes_count: u32,
        pub comments_count: u32,
        pub last_activity_timestamp: u64,
    }

    // Tipping contract
    #[derive(Drop, Copy, Clone, Serde, starknet::Store)]
    pub struct TipRecord {
        pub from_user: starknet::ContractAddress,
        pub to_artist: starknet::ContractAddress,
        pub amount: u256,
        pub timestamp: u64,
    }

    // Moelody contract
    pub mod TokenErrors {
        pub const INSUFFICIENT_BALANCE: felt252 = 'insufficient_balance';
        pub const INSUFFICIENT_ALLOWANCE: felt252 = 'insufficient_allowance';
        pub const UNAUTHORIZED: felt252 = 'unauthorized';
        pub const ZERO_ADDRESS: felt252 = 'zero_address';
        pub const INVALID_AMOUNT: felt252 = 'invalid_amount';
    }