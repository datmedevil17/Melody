pub mod UserErrors {
    pub const USER_ALREADY_REGISTERED: felt252 = 'user_already_registered';
    pub const USER_NOT_REGISTERED: felt252 = 'user_not_registered';
    pub const ARTIST_NOT_REGISTERED: felt252 = 'artist_not_registered';
    pub const INVALID_SONG: felt252 = 'invalid_song';
    pub const ALREADY_FAVORITED: felt252 = 'already_favorited';
}
pub mod ArtistErrors {
    pub const ARTIST_ALREADY_REGISTERED: felt252 = 'artist_already_registered';
    pub const ARTIST_NOT_REGISTERED: felt252 = 'artist_not_registered';
    pub const UNAUTHORIZED: felt252 = 'unauthorized';
    pub const SONG_ALREADY_EXISTS: felt252 = 'song_already_exists';
    pub const INVALID_SONG: felt252 = 'invalid_song';
}
pub mod SongErrors {
    pub const INVALID_SONG: felt252 = 'invalid_song';
    pub const USER_NOT_REGISTERED: felt252 = 'user_not_registered';
    pub const ALREADY_LIKED: felt252 = 'already_liked';
    pub const EMPTY_COMMENT: felt252 = 'empty_comment';
}
pub mod TippingErrors {
    pub const USER_NOT_REGISTERED: felt252 = 'user_not_registered';
    pub const ARTIST_NOT_REGISTERED: felt252 = 'artist_not_registered';
    pub const INSUFFICIENT_TOKENS: felt252 = 'insufficient_tokens';
    pub const INVALID_AMOUNT: felt252 = 'invalid_amount';
}
pub mod TokenErrors {
    pub const INSUFFICIENT_BALANCE: felt252 = 'insufficient_balance';
    pub const INSUFFICIENT_ALLOWANCE: felt252 = 'insufficient_allowance';
    pub const UNAUTHORIZED: felt252 = 'unauthorized';
    pub const ZERO_ADDRESS: felt252 = 'zero_address';
    pub const INVALID_AMOUNT: felt252 = 'invalid_amount';
}
