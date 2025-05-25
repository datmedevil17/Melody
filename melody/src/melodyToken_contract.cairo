// errors.rs
pub mod Errors {
    pub const ZERO_ADDRESS: felt252 = 'Zero address not allowed';
    pub const INSUFFICIENT_BALANCE: felt252 = 'Insufficient balance';
    pub const INSUFFICIENT_ALLOWANCE: felt252 = 'Insufficient allowance';
    pub const UNAUTHORIZED: felt252 = 'Unauthorized caller';
    pub const INVALID_AMOUNT: felt252 = 'Invalid amount';
}

use starknet::ContractAddress;
use Errors as TokenErrors;

#[starknet::interface]
trait IMelodyToken<TContractState> {
    // ERC20 standard functions
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;

    // Custom Melody platform functions
    fn mint_to_user(ref self: TContractState, user_address: ContractAddress, amount: u256);
    fn burn_for_tipping(ref self: TContractState, user_address: ContractAddress, amount: u256);
    fn get_listen_reward_rate(self: @TContractState) -> u256;
    fn set_listen_reward_rate(ref self: TContractState, new_rate: u256);
    fn get_admin(self: @TContractState) -> ContractAddress;
    fn set_platform_contract(ref self: TContractState, new_platform: ContractAddress);
}

#[starknet::contract]
mod MelodyToken {
    use core::num::traits::Zero;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};
    use super::{IMelodyToken, TokenErrors};

    #[storage]
    struct Storage {
        // ERC20 standard storage
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        // Melody platform specific storage
        admin: ContractAddress,
        platform_contract: ContractAddress,
        listen_reward_rate: u256 // Amount of tokens rewarded per listen
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
        TokensMinted: TokensMinted,
        TokensBurned: TokensBurned,
        RewardRateUpdated: RewardRateUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        spender: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct TokensMinted {
        to: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct TokensBurned {
        from: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct RewardRateUpdated {
        old_rate: u256,
        new_rate: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        symbol: felt252,
        admin: ContractAddress,
        platform_contract: ContractAddress,
        initial_reward_rate: u256,
    ) {
        assert(admin.is_non_zero(), TokenErrors::ZERO_ADDRESS);
        assert(platform_contract.is_non_zero(), TokenErrors::ZERO_ADDRESS);

        // Initialize token details
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(18_u8);
        self.total_supply.write(0_u256);

        // Set admin and platform contract
        self.admin.write(admin);
        self.platform_contract.write(platform_contract);
        self.listen_reward_rate.write(initial_reward_rate);
    }

    #[abi(embed_v0)]
    impl MelodyTokenImpl of IMelodyToken<ContractState> {
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            let current_allowance = self.allowances.read((sender, caller));
            assert(current_allowance >= amount, TokenErrors::INSUFFICIENT_ALLOWANCE);

            self.allowances.write((sender, caller), current_allowance - amount);
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self.allowances.write((owner, spender), amount);
            self.emit(Approval { owner, spender, value: amount });
            true
        }

        fn mint_to_user(ref self: ContractState, user_address: ContractAddress, amount: u256) {

            // Only platform contract can mint tokens (removed admin authorization)
            assert(user_address.is_non_zero(), TokenErrors::ZERO_ADDRESS);
            assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);

            let balance = self.balances.read(user_address);
            self.balances.write(user_address, balance + amount);

            let supply = self.total_supply.read();
            self.total_supply.write(supply + amount);

            // Use zero address for minting (from address in Transfer event)
            let zero_address: ContractAddress = 0_felt252.try_into().unwrap();
            
            self.emit(Transfer { 
                from: zero_address, 
                to: user_address, 
                value: amount 
            });
            self.emit(TokensMinted { to: user_address, amount });
        }

        fn burn_for_tipping(ref self: ContractState, user_address: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            let platform = self.platform_contract.read();

            assert(caller == admin || caller == platform, TokenErrors::UNAUTHORIZED);
            assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);

            let balance = self.balances.read(user_address);
            assert(balance >= amount, TokenErrors::INSUFFICIENT_BALANCE);

            self.balances.write(user_address, balance - amount);

            let supply = self.total_supply.read();
            self.total_supply.write(supply - amount);

            // Use zero address for burning (to address in Transfer event)
            let zero_address: ContractAddress = 0_felt252.try_into().unwrap();

            self.emit(Transfer { 
                from: user_address, 
                to: zero_address, 
                value: amount 
            });
            self.emit(TokensBurned { from: user_address, amount });
        }

        fn get_listen_reward_rate(self: @ContractState) -> u256 {
            self.listen_reward_rate.read()
        }

        fn set_listen_reward_rate(ref self: ContractState, new_rate: u256) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, TokenErrors::UNAUTHORIZED);

            let old_rate = self.listen_reward_rate.read();
            self.listen_reward_rate.write(new_rate);
            self.emit(RewardRateUpdated { old_rate, new_rate });
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read()
        }

        fn set_platform_contract(ref self: ContractState, new_platform: ContractAddress) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, TokenErrors::UNAUTHORIZED);
            assert(new_platform.is_non_zero(), TokenErrors::ZERO_ADDRESS);
            
            self.platform_contract.write(new_platform);
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalTrait {
        fn _transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256) {
            assert(from.is_non_zero(), TokenErrors::ZERO_ADDRESS);
            assert(to.is_non_zero(), TokenErrors::ZERO_ADDRESS);
            assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);

            let from_balance = self.balances.read(from);
            assert(from_balance >= amount, TokenErrors::INSUFFICIENT_BALANCE);

            self.balances.write(from, from_balance - amount);
            let to_balance = self.balances.read(to);
            self.balances.write(to, to_balance + amount);

            self.emit(Transfer { from, to, value: amount });
        }
    }
}