use super::errors::TippingErrors;
use super::model::TipRecord;

#[starknet::interface]
trait ITippingContract<TContractState> {
    fn tip_artist(
        ref self: TContractState,
        user_address: starknet::ContractAddress,
        artist_address: starknet::ContractAddress,
        amount: u256,
    );
    fn get_tips_received(self: @TContractState, artist_address: starknet::ContractAddress) -> u256;
    fn get_tips_by_user(self: @TContractState, user_address: starknet::ContractAddress) -> u256;
    fn get_user_tipping_history(
        self: @TContractState, user_address: starknet::ContractAddress,
    ) -> Array<TipRecord>;
    fn get_artist_tip_history(
        self: @TContractState, artist_address: starknet::ContractAddress,
    ) -> Array<TipRecord>;
    fn set_user_contract(ref self: TContractState, new_user_contract: starknet::ContractAddress);
    fn set_artist_contract(ref self: TContractState, new_artist_contract: starknet::ContractAddress);
}


#[starknet::contract]
mod TippingContract {
    use core::array::ArrayTrait;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp};
    use super::{ITippingContract, TipRecord, TippingErrors};

    // Interface for User contract (to verify users and manage tokens)
    #[starknet::interface]
    trait IUserContract<TContractState> {
        fn is_registered(self: @TContractState, user_address: ContractAddress) -> bool;
        fn get_user_tokens(self: @TContractState, user_address: ContractAddress) -> u256;
    }

    // Interface for Artist contract (to verify artists)
    #[starknet::interface]
    trait IArtistContract<TContractState> {
        fn is_registered_artist(self: @TContractState, artist_address: ContractAddress) -> bool;
    }

    #[storage]
    struct Storage {
        // Contract addresses
        user_contract: ContractAddress,
        artist_contract: ContractAddress,
        // Tipping storage
        artist_tips_received: Map<ContractAddress, u256>,
        user_tips_given: Map<ContractAddress, u256>,
        // History tracking
        user_tip_count: Map<ContractAddress, u32>,
        artist_tip_count: Map<ContractAddress, u32>,
        // Tip records
        user_tip_history: Map<(ContractAddress, u32), TipRecord>,
        artist_tip_history: Map<(ContractAddress, u32), TipRecord>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ArtistTipped: ArtistTipped,
    }

    #[derive(Drop, starknet::Event)]
    struct ArtistTipped {
        user_address: ContractAddress,
        artist_address: ContractAddress,
        amount: u256,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, user_contract: ContractAddress, artist_contract: ContractAddress,
    ) {
        self.user_contract.write(user_contract);
        self.artist_contract.write(artist_contract);
    }

    #[abi(embed_v0)]
    impl TippingContractImpl of ITippingContract<ContractState> {
        fn tip_artist(
            ref self: ContractState,
            user_address: ContractAddress,
            artist_address: ContractAddress,
            amount: u256,
        ) {
            // Verify non-zero amount
            assert(amount > 0_u256, TippingErrors::INVALID_AMOUNT);

            // Verify user is registered
            let user_contract = self._get_user_contract_dispatcher();
            let is_user_registered = user_contract.is_registered(user_address);
            assert(is_user_registered, TippingErrors::USER_NOT_REGISTERED);

            // Verify artist is registered
            let artist_contract = self._get_artist_contract_dispatcher();
            let is_artist_registered = artist_contract.is_registered_artist(artist_address);
            assert(is_artist_registered, TippingErrors::ARTIST_NOT_REGISTERED);

            // Check if user has enough tokens
            let user_tokens = user_contract.get_user_tokens(user_address);
            assert(user_tokens >= amount, TippingErrors::INSUFFICIENT_TOKENS);

            // In a real implementation, we would transfer tokens here
            // For now, we'll just update our tracking

            // Update artist's received tips
            let artist_tips = self.artist_tips_received.read(artist_address);
            self.artist_tips_received.write(artist_address, artist_tips + amount);

            // Update user's given tips
            let user_tips = self.user_tips_given.read(user_address);
            self.user_tips_given.write(user_address, user_tips + amount);

            // Record the tip for history
            let timestamp = get_block_timestamp();
            let tip_record = TipRecord {
                from_user: user_address, to_artist: artist_address, amount, timestamp,
            };

            // Add to user's tip history
            let user_tip_idx = self.user_tip_count.read(user_address);
            self.user_tip_history.write((user_address, user_tip_idx), tip_record);
            self.user_tip_count.write(user_address, user_tip_idx + 1_u32);

            // Add to artist's tip history
            let artist_tip_idx = self.artist_tip_count.read(artist_address);
            self.artist_tip_history.write((artist_address, artist_tip_idx), tip_record);
            self.artist_tip_count.write(artist_address, artist_tip_idx + 1_u32);

            // Emit event
            self.emit(ArtistTipped { user_address, artist_address, amount, timestamp });
        }

        fn get_tips_received(self: @ContractState, artist_address: ContractAddress) -> u256 {
            // Verify artist is registered
            let artist_contract = self._get_artist_contract_dispatcher();
            let is_artist_registered = artist_contract.is_registered_artist(artist_address);
            assert(is_artist_registered, TippingErrors::ARTIST_NOT_REGISTERED);

            self.artist_tips_received.read(artist_address)
        }

        fn get_tips_by_user(self: @ContractState, user_address: ContractAddress) -> u256 {
            // Verify user is registered
            let user_contract = self._get_user_contract_dispatcher();
            let is_user_registered = user_contract.is_registered(user_address);
            assert(is_user_registered, TippingErrors::USER_NOT_REGISTERED);

            self.user_tips_given.read(user_address)
        }

        fn get_user_tipping_history(
            self: @ContractState, user_address: ContractAddress,
        ) -> Array<TipRecord> {
            // Verify user is registered
            let user_contract = self._get_user_contract_dispatcher();
            let is_user_registered = user_contract.is_registered(user_address);
            assert(is_user_registered, TippingErrors::USER_NOT_REGISTERED);

            let tip_count = self.user_tip_count.read(user_address);
            let mut tip_history = ArrayTrait::new();

            let mut i: u32 = 0;
            let target = tip_count;
            while i != target {
                let tip = self.user_tip_history.read((user_address, i));
                tip_history.append(tip);
                i += 1_u32;
            }

            tip_history
        }

        fn get_artist_tip_history(
            self: @ContractState, artist_address: ContractAddress,
        ) -> Array<TipRecord> {
            // Verify artist is registered
            let artist_contract = self._get_artist_contract_dispatcher();
            let is_artist_registered = artist_contract.is_registered_artist(artist_address);
            assert(is_artist_registered, TippingErrors::ARTIST_NOT_REGISTERED);

            let tip_count = self.artist_tip_count.read(artist_address);
            let mut tip_history = ArrayTrait::new();

            let mut i: u32 = 0;
            let target = tip_count;
            while i != target {
                let tip = self.artist_tip_history.read((artist_address, i));
                tip_history.append(tip);
                i += 1_u32;
            }

            tip_history
        }

        fn set_user_contract(ref self: ContractState, new_user_contract: ContractAddress) {
            // TODO: Add access control if needed
            self.user_contract.write(new_user_contract);
        }

        fn set_artist_contract(ref self: ContractState, new_artist_contract: ContractAddress) {
            // TODO: Add access control if needed
            self.artist_contract.write(new_artist_contract);
        }
    }

    #[generate_trait]
    impl PrivateFunctions of PrivateTrait {
        fn _get_user_contract_dispatcher(self: @ContractState) -> IUserContractDispatcher {
            IUserContractDispatcher { contract_address: self.user_contract.read() }
        }

        fn _get_artist_contract_dispatcher(self: @ContractState) -> IArtistContractDispatcher {
            IArtistContractDispatcher { contract_address: self.artist_contract.read() }
        }
    }
}
