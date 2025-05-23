use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
// Import from your existing artist contract
use super::artist_contract::{IArtistContractDispatcher, IArtistContractDispatcherTrait};

// MelodyToken Interface for handling payments
#[starknet::interface]
trait IMelodyToken<TContractState> {
    // ERC20 standard functions needed for auction
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
    // Custom functions (not used in auction but available)
    fn mint_to_user(ref self: TContractState, user_address: ContractAddress, amount: u256);
    fn burn_for_tipping(ref self: TContractState, user_address: ContractAddress, amount: u256);
}

#[derive(Drop, Serde, starknet::Store)]
struct Auction {
    id: felt252,
    song_id: felt252,
    artist: ContractAddress,
    start_time: u64,
    end_time: u64,
    starting_price: u256,
    current_bid: u256,
    highest_bidder: ContractAddress,
    is_active: bool,
    reserve_price: u256,
    minimum_increment: u256,
}

#[derive(Drop, Serde, starknet::Store)]
struct Bid {
    bidder: ContractAddress,
    amount: u256,
    timestamp: u64,
}

mod AuctionErrors {
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

#[starknet::interface]
trait IMusicAuction<TContractState> {
    // Auction Creation
    fn create_auction(
        ref self: TContractState,
        song_id: felt252,
        duration_hours: u64,
        starting_price: u256,
        reserve_price: u256,
        minimum_increment: u256,
    ) -> felt252;

    // Bidding with explicit amount parameter
    fn place_bid(ref self: TContractState, auction_id: felt252, bid_amount: u256);

    // Auction Management
    fn end_auction(ref self: TContractState, auction_id: felt252);
    fn cancel_auction(ref self: TContractState, auction_id: felt252);

    // View Functions
    fn get_auction(self: @TContractState, auction_id: felt252) -> Auction;
    fn get_auction_bids(self: @TContractState, auction_id: felt252) -> Array<Bid>;
    fn get_active_auctions(self: @TContractState) -> Array<felt252>;
    fn get_artist_auctions(self: @TContractState, artist: ContractAddress) -> Array<felt252>;
    fn is_auction_ended(self: @TContractState, auction_id: felt252) -> bool;
    fn get_winning_bid(self: @TContractState, auction_id: felt252) -> (ContractAddress, u256);

    // Admin Functions
    fn set_artist_contract(ref self: TContractState, contract_address: ContractAddress);
    fn set_melody_token(ref self: TContractState, token_address: ContractAddress);
    fn withdraw_fees(ref self: TContractState);
    
    // Emergency Functions
    fn emergency_withdraw_bid(ref self: TContractState, auction_id: felt252);
}

#[starknet::contract]
mod MusicAuctionContract {
    use core::array::ArrayTrait;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use super::{
        Auction, Bid, AuctionErrors, IMusicAuction,
        IArtistContractDispatcher, IArtistContractDispatcherTrait,
        IMelodyTokenDispatcher, IMelodyTokenDispatcherTrait
    };

    #[storage]
    struct Storage {
        // Core auction data
        auctions: Map<felt252, Auction>,
        auction_exists: Map<felt252, bool>,
        auction_counter: felt252,

        // Bidding data
        auction_bids: Map<(felt252, u32), Bid>, // (auction_id, bid_index) -> Bid
        auction_bid_counts: Map<felt252, u32>,
        
        // Previous bidder tracking for refunds
        previous_bidders: Map<felt252, ContractAddress>,
        previous_bid_amounts: Map<felt252, u256>,

        // Contract integrations
        artist_contract: ContractAddress,
        melody_token: ContractAddress, // MelodyToken contract for payments

        // Auction tracking
        active_auction_count: u32,
        active_auctions: Map<u32, felt252>, // index -> auction_id
        artist_auction_counts: Map<ContractAddress, u32>,
        artist_auctions: Map<(ContractAddress, u32), felt252>, // (artist, index) -> auction_id

        // Platform fees (5% platform fee)
        platform_fee_percentage: u256,
        collected_fees: u256,
        platform_admin: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AuctionCreated: AuctionCreated,
        BidPlaced: BidPlaced,
        BidRefunded: BidRefunded,
        AuctionEnded: AuctionEnded,
        AuctionCancelled: AuctionCancelled,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionCreated {
        auction_id: felt252,
        song_id: felt252,
        artist: ContractAddress,
        starting_price: u256,
        reserve_price: u256,
        end_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BidPlaced {
        auction_id: felt252,
        bidder: ContractAddress,
        amount: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BidRefunded {
        auction_id: felt252,
        bidder: ContractAddress,
        amount: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionEnded {
        auction_id: felt252,
        winner: ContractAddress,
        final_price: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionCancelled {
        auction_id: felt252,
        artist: ContractAddress,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        artist_contract: ContractAddress,
        melody_token: ContractAddress,
        platform_admin: ContractAddress
    ) {
        self.auction_counter.write(1);
        self.artist_contract.write(artist_contract);
        self.melody_token.write(melody_token);
        self.platform_fee_percentage.write(500); // 5% = 500 basis points
        self.platform_admin.write(platform_admin);
        self.active_auction_count.write(0);
        self.collected_fees.write(0);
    }

    #[abi(embed_v0)]
    impl MusicAuctionImpl of IMusicAuction<ContractState> {
        fn create_auction(
            ref self: ContractState,
            song_id: felt252,
            duration_hours: u64,
            starting_price: u256,
            reserve_price: u256,
            minimum_increment: u256,
        ) -> felt252 {
            let caller = get_caller_address();
            let artist_contract = IArtistContractDispatcher {
                contract_address: self.artist_contract.read()
            };

            // Verify artist is registered
            assert(artist_contract.is_registered_artist(caller), AuctionErrors::ARTIST_NOT_REGISTERED);

            // Verify song exists and get creators
            let song_creators = artist_contract.get_song_creators(song_id);
            assert(song_creators.len() > 0, AuctionErrors::SONG_NOT_FOUND);

            // Verify caller is one of the song creators
            let mut is_creator = false;
            let mut i = 0;
            while i < song_creators.len() {
                if *song_creators.at(i) == caller {
                    is_creator = true;
                    break;
                }
                i += 1;
            };
            assert(is_creator, AuctionErrors::UNAUTHORIZED);

            // Validate auction parameters
            assert(duration_hours > 0 && duration_hours <= 168, AuctionErrors::INVALID_DURATION); // Max 7 days
            assert(starting_price > 0, AuctionErrors::INVALID_PRICE);
            assert(reserve_price >= starting_price, AuctionErrors::INVALID_PRICE);
            assert(minimum_increment > 0, AuctionErrors::INVALID_PRICE);

            // Create auction
            let auction_id = self.auction_counter.read();
            let current_time = get_block_timestamp();
            let end_time = current_time + (duration_hours * 3600); // Convert hours to seconds

            let auction = Auction {
                id: auction_id,
                song_id,
                artist: caller,
                start_time: current_time,
                end_time,
                starting_price,
                current_bid: 0,
                highest_bidder: starknet::contract_address_const::<0>(),
                is_active: true,
                reserve_price,
                minimum_increment,
            };

            // Store auction
            self.auctions.write(auction_id, auction);
            self.auction_exists.write(auction_id, true);
            self.auction_counter.write(auction_id + 1);

            // Add to active auctions tracking
            let active_count = self.active_auction_count.read();
            self.active_auctions.write(active_count, auction_id);
            self.active_auction_count.write(active_count + 1);

            // Add to artist's auctions
            let artist_auction_count = self.artist_auction_counts.read(caller);
            self.artist_auctions.write((caller, artist_auction_count), auction_id);
            self.artist_auction_counts.write(caller, artist_auction_count + 1);

            // Initialize bid count
            self.auction_bid_counts.write(auction_id, 0);

            // Emit event
            self.emit(AuctionCreated {
                auction_id,
                song_id,
                artist: caller,
                starting_price,
                reserve_price,
                end_time,
            });

            auction_id
        }

        fn place_bid(ref self: ContractState, auction_id: felt252, bid_amount: u256) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Input validation
            assert(bid_amount > 0, AuctionErrors::INVALID_BID_AMOUNT);

            // Verify auction exists
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            let mut auction = self.auctions.read(auction_id);

            // Verify auction is active and within time bounds
            assert(auction.is_active, AuctionErrors::AUCTION_NOT_ACTIVE);
            assert(current_time >= auction.start_time, AuctionErrors::AUCTION_NOT_STARTED);
            assert(current_time < auction.end_time, AuctionErrors::AUCTION_ENDED);

            // Validate bid amount
            let minimum_bid = if auction.current_bid == 0 {
                auction.starting_price
            } else {
                auction.current_bid + auction.minimum_increment
            };
            assert(bid_amount >= minimum_bid, AuctionErrors::BID_TOO_LOW);

            // Verify bidder is not the current highest bidder
            assert(caller != auction.highest_bidder, AuctionErrors::SAME_BIDDER);

            // Get MelodyToken contract
            let melody_token = IMelodyTokenDispatcher {
                contract_address: self.melody_token.read()
            };

            // Check bidder's balance and allowance
            let bidder_balance = melody_token.balance_of(caller);
            assert(bidder_balance >= bid_amount, AuctionErrors::INSUFFICIENT_FUNDS);

            let allowance = melody_token.allowance(caller, starknet::get_contract_address());
            assert(allowance >= bid_amount, AuctionErrors::INSUFFICIENT_ALLOWANCE);

            // Store previous bidder info for refund
            let previous_bidder = auction.highest_bidder;
            let previous_amount = auction.current_bid;

            // Transfer bid amount from bidder to contract
            let transfer_success = melody_token.transfer_from(
                caller, 
                starknet::get_contract_address(), 
                bid_amount
            );
            assert(transfer_success, AuctionErrors::TRANSFER_FAILED);

            // Refund previous highest bidder if exists
            if previous_bidder != starknet::contract_address_const::<0>() && previous_amount > 0 {
                let refund_success = melody_token.transfer(previous_bidder, previous_amount);
                assert(refund_success, AuctionErrors::REFUND_FAILED);

                // Emit refund event
                self.emit(BidRefunded {
                    auction_id,
                    bidder: previous_bidder,
                    amount: previous_amount,
                    timestamp: current_time,
                });
            }

            // Update auction with new highest bid
            auction.current_bid = bid_amount;
            auction.highest_bidder = caller;
            self.auctions.write(auction_id, auction);

            // Store bid history
            let bid_count = self.auction_bid_counts.read(auction_id);
            let bid = Bid {
                bidder: caller,
                amount: bid_amount,
                timestamp: current_time,
            };
            self.auction_bids.write((auction_id, bid_count), bid);
            self.auction_bid_counts.write(auction_id, bid_count + 1);

            // Store for potential refund tracking
            self.previous_bidders.write(auction_id, previous_bidder);
            self.previous_bid_amounts.write(auction_id, previous_amount);

            // Emit event
            self.emit(BidPlaced {
                auction_id,
                bidder: caller,
                amount: bid_amount,
                timestamp: current_time,
            });
        }

        fn end_auction(ref self: ContractState, auction_id: felt252) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Verify auction exists
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            let mut auction = self.auctions.read(auction_id);

            // Verify auction can be ended
            assert(auction.is_active, AuctionErrors::AUCTION_NOT_ACTIVE);
            assert(current_time >= auction.end_time, AuctionErrors::AUCTION_STILL_ACTIVE);

            // Mark auction as ended
            auction.is_active = false;
            self.auctions.write(auction_id, auction);

            // Handle payments if there was a winning bid that meets reserve
            if auction.current_bid >= auction.reserve_price && auction.current_bid > 0 {
                let melody_token = IMelodyTokenDispatcher {
                    contract_address: self.melody_token.read()
                };

                let platform_fee = (auction.current_bid * self.platform_fee_percentage.read()) / 10000;
                let artist_payment = auction.current_bid - platform_fee;

                // Transfer payment to artist
                let artist_transfer_success = melody_token.transfer(auction.artist, artist_payment);
                assert(artist_transfer_success, AuctionErrors::TRANSFER_FAILED);

                // Add platform fee to collected fees
                let current_fees = self.collected_fees.read();
                self.collected_fees.write(current_fees + platform_fee);

                // Emit successful auction end
                self.emit(AuctionEnded {
                    auction_id,
                    winner: auction.highest_bidder,
                    final_price: auction.current_bid,
                    timestamp: current_time,
                });
            } else {
                // Refund the highest bidder if reserve not met
                if auction.current_bid > 0 {
                    let melody_token = IMelodyTokenDispatcher {
                        contract_address: self.melody_token.read()
                    };
                    let refund_success = melody_token.transfer(auction.highest_bidder, auction.current_bid);
                    assert(refund_success, AuctionErrors::REFUND_FAILED);
                }

                // Auction ended without meeting reserve price
                self.emit(AuctionEnded {
                    auction_id,
                    winner: starknet::contract_address_const::<0>(),
                    final_price: 0,
                    timestamp: current_time,
                });
            }
        }

        fn cancel_auction(ref self: ContractState, auction_id: felt252) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Verify auction exists
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            let mut auction = self.auctions.read(auction_id);

            // Verify caller is the auction creator
            assert(caller == auction.artist, AuctionErrors::UNAUTHORIZED);
            assert(auction.is_active, AuctionErrors::AUCTION_NOT_ACTIVE);

            // Can only cancel if no bids have been placed
            assert(auction.current_bid == 0, AuctionErrors::UNAUTHORIZED);

            // Mark auction as cancelled
            auction.is_active = false;
            self.auctions.write(auction_id, auction);

            // Emit event
            self.emit(AuctionCancelled {
                auction_id,
                artist: auction.artist,
                timestamp: current_time,
            });
        }

        fn emergency_withdraw_bid(ref self: ContractState, auction_id: felt252) {
            let caller = get_caller_address();
            
            // Verify auction exists
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            let auction = self.auctions.read(auction_id);
            
            // Only allow emergency withdraw if caller is current highest bidder
            assert(caller == auction.highest_bidder, AuctionErrors::UNAUTHORIZED);
            assert(auction.current_bid > 0, AuctionErrors::INVALID_BID_AMOUNT);
            
            // Get MelodyToken contract
            let melody_token = IMelodyTokenDispatcher {
                contract_address: self.melody_token.read()
            };
            
            // Refund the bidder
            let refund_success = melody_token.transfer(caller, auction.current_bid);
            assert(refund_success, AuctionErrors::REFUND_FAILED);
            
            // Reset auction bid info
            let mut updated_auction = auction;
            updated_auction.current_bid = 0;
            updated_auction.highest_bidder = starknet::contract_address_const::<0>();
            self.auctions.write(auction_id, updated_auction);
        }

        // View Functions (keeping the original implementations)
        fn get_auction(self: @ContractState, auction_id: felt252) -> Auction {
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            self.auctions.read(auction_id)
        }

        fn get_auction_bids(self: @ContractState, auction_id: felt252) -> Array<Bid> {
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            let bid_count = self.auction_bid_counts.read(auction_id);
            let mut bids = ArrayTrait::new();
            let mut i: u32 = 0;
            while i < bid_count {
                let bid = self.auction_bids.read((auction_id, i));
                bids.append(bid);
                i += 1;
            }
            bids
        }

        fn get_active_auctions(self: @ContractState) -> Array<felt252> {
            let active_count = self.active_auction_count.read();
            let mut active_auctions = ArrayTrait::new();
            let current_time = get_block_timestamp();
            let mut i: u32 = 0;
            while i < active_count {
                let auction_id = self.active_auctions.read(i);
                let auction = self.auctions.read(auction_id);
                if auction.is_active && current_time < auction.end_time {
                    active_auctions.append(auction_id);
                }
                i += 1;
            }
            active_auctions
        }

        fn get_artist_auctions(self: @ContractState, artist: ContractAddress) -> Array<felt252> {
            let auction_count = self.artist_auction_counts.read(artist);
            let mut auctions = ArrayTrait::new();
            let mut i: u32 = 0;
            while i < auction_count {
                let auction_id = self.artist_auctions.read((artist, i));
                auctions.append(auction_id);
                i += 1;
            }
            auctions
        }

        fn is_auction_ended(self: @ContractState, auction_id: felt252) -> bool {
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            let auction = self.auctions.read(auction_id);
            let current_time = get_block_timestamp();
            !auction.is_active || current_time >= auction.end_time
        }

        fn get_winning_bid(self: @ContractState, auction_id: felt252) -> (ContractAddress, u256) {
            assert(self.auction_exists.read(auction_id), AuctionErrors::AUCTION_NOT_FOUND);
            let auction = self.auctions.read(auction_id);
            (auction.highest_bidder, auction.current_bid)
        }

        fn set_artist_contract(ref self: ContractState, contract_address: ContractAddress) {
            // Add proper access control in production
            self.artist_contract.write(contract_address);
        }

        fn set_melody_token(ref self: ContractState, token_address: ContractAddress) {
            // Add proper access control in production
            self.melody_token.write(token_address);
        }

        fn withdraw_fees(ref self: ContractState) {
            let caller = get_caller_address();
            let admin = self.platform_admin.read();
            assert(caller == admin, AuctionErrors::UNAUTHORIZED);
            
            let fees = self.collected_fees.read();
            if fees > 0 {
                let melody_token = IMelodyTokenDispatcher {
                    contract_address: self.melody_token.read()
                };
                
                let transfer_success = melody_token.transfer(admin, fees);
                assert(transfer_success, AuctionErrors::TRANSFER_FAILED);
                
                self.collected_fees.write(0);
            }
        }
    }
}