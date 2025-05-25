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

pub mod AuctionErrors {
    const AUCTION_NOT_FOUND: felt252 = 'Auction not found';
    const AUCTION_NOT_ACTIVE: felt252 = 'Auction not active';
    const AUCTION_ENDED: felt252 = 'Auction has ended';
    const AUCTION_NOT_STARTED: felt252 = 'Auction not started yet';
    const BID_TOO_LOW: felt252 = 'Bid amount too low';
    const SAME_BIDDER: felt252 = 'Cannot outbid yourself';
    const UNAUTHORIZED: felt252 = 'Unauthorized caller';
    const ARTIST_NOT_REGISTERED: felt252 = 'Artist not registered';
    const SONG_NOT_FOUND: felt252 = 'Song does not exist';
    const AUCTION_STILL_ACTIVE: felt252 = 'Auction still active';
    const INSUFFICIENT_FUNDS: felt252 = 'Insufficient funds';
    const INSUFFICIENT_ALLOWANCE: felt252 = 'Insufficient allowance';
    const TRANSFER_FAILED: felt252 = 'Transfer failed';
    const INVALID_DURATION: felt252 = 'Invalid auction duration';
    const INVALID_PRICE: felt252 = 'Invalid price parameters';
    const INVALID_BID_AMOUNT: felt252 = 'Invalid bid amount';
    const REFUND_FAILED: felt252 = 'Refund failed';
}
