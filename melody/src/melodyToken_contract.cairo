use super::errors::TokenErrors;


#[starknet::interface]
trait IMelodyToken<TContractState> {
    // ERC20 standard functions
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: starknet::ContractAddress) -> u256;
    fn allowance(
        self: @TContractState, owner: starknet::ContractAddress, spender: starknet::ContractAddress,
    ) -> u256;
    fn transfer(
        ref self: TContractState, recipient: starknet::ContractAddress, amount: u256,
    ) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: starknet::ContractAddress,
        recipient: starknet::ContractAddress,
        amount: u256,
    ) -> bool;
    fn approve(ref self: TContractState, spender: starknet::ContractAddress, amount: u256) -> bool;

    // Custom Melody platform functions
    fn mint_to_user(
        ref self: TContractState, user_address: starknet::ContractAddress, amount: u256,
    );
    fn burn_for_tipping(
        ref self: TContractState, user_address: starknet::ContractAddress, amount: u256,
    );
    fn get_listen_reward_rate(self: @TContractState) -> u256;
    fn set_listen_reward_rate(ref self: TContractState, new_rate: u256);
    fn get_admin(self: @TContractState) -> starknet::ContractAddress;
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
        assert(!admin.is_zero(), TokenErrors::ZERO_ADDRESS);
        assert(admin.is_non_zero(), TokenErrors::ZERO_ADDRESS);
        assert(platform_contract.is_non_zero(), TokenErrors::ZERO_ADDRESS);

        // Initialize token details
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(18_u8); // Standard for most tokens
        self.total_supply.write(0_u256); // Start with zero supply

        // Set admin and platform contract
        self.admin.write(admin);
        self.platform_contract.write(platform_contract);
        self.listen_reward_rate.write(initial_reward_rate);
    }

    #[abi(embed_v0)]
    impl MelodyTokenImpl of IMelodyToken<ContractState> {
        // ERC20 standard functions
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

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
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

            // Check allowance
            let current_allowance = self.allowances.read((sender, caller));
            assert(current_allowance >= amount, TokenErrors::INSUFFICIENT_ALLOWANCE);

            // Update allowance
            self.allowances.write((sender, caller), current_allowance - amount);

            // Transfer tokens
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();

            // Update allowance
            self.allowances.write((owner, spender), amount);

            // Emit approval event
            self.emit(Approval { owner, spender, value: amount });
            true
        }

        // Custom Melody platform functions
        fn mint_to_user(ref self: ContractState, user_address: ContractAddress, amount: u256) {
            // Only platform contract or admin can mint tokens
            let caller = get_caller_address();
            let admin = self.admin.read();
            let platform = self.platform_contract.read();

            assert(caller == admin || caller == platform, TokenErrors::UNAUTHORIZED);
            assert(user_address.is_non_zero(), TokenErrors::ZERO_ADDRESS);
            assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);

            // Mint tokens
            let balance = self.balances.read(user_address);
            self.balances.write(user_address, balance + amount);

            // Update total supply
            let supply = self.total_supply.read();
            self.total_supply.write(supply + amount);

            // Emit transfer event (from zero address for minting)
            self.emit(Transfer { from: 0.try_into().unwrap(), to: user_address, value: amount });

            // Emit custom minting event
            self.emit(TokensMinted { to: user_address, amount });
        }

        fn burn_for_tipping(ref self: ContractState, user_address: ContractAddress, amount: u256) {
            // Only platform contract or admin can burn tokens
            let caller = get_caller_address();
            let admin = self.admin.read();
            let platform = self.platform_contract.read();

            assert(caller == admin || caller == platform, TokenErrors::UNAUTHORIZED);
            assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);

            // Check if user has enough tokens
            let balance = self.balances.read(user_address);
            assert(balance >= amount, TokenErrors::INSUFFICIENT_BALANCE);

            // Burn tokens
            self.balances.write(user_address, balance - amount);

            // Update total supply
            let supply = self.total_supply.read();
            self.total_supply.write(supply - amount);

            // Emit transfer event (to zero address for burning)
            self.emit(Transfer { from: user_address, to: 0.try_into().unwrap(), value: amount });

            // Emit custom burning event
            self.emit(TokensBurned { from: user_address, amount });
        }

        fn get_listen_reward_rate(self: @ContractState) -> u256 {
            self.listen_reward_rate.read()
        }

        fn set_listen_reward_rate(ref self: ContractState, new_rate: u256) {
            // Only admin can change reward rate
            let caller = get_caller_address();
            let admin = self.admin.read();

            assert(caller == admin, TokenErrors::UNAUTHORIZED);

            let old_rate = self.listen_reward_rate.read();
            self.listen_reward_rate.write(new_rate);

            // Emit event
            self.emit(RewardRateUpdated { old_rate, new_rate });
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read()
        }
    }

    // Internal functions
    #[generate_trait]
    impl InternalFunctions of InternalTrait {
        fn _transfer(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256,
        ) {
            // Validate addresses
            assert(from.is_non_zero(), TokenErrors::ZERO_ADDRESS);
            assert(to.is_non_zero(), TokenErrors::ZERO_ADDRESS);
            assert(amount > 0_u256, TokenErrors::INVALID_AMOUNT);

            // Check balance
            let from_balance = self.balances.read(from);
            assert(from_balance >= amount, TokenErrors::INSUFFICIENT_BALANCE);

            // Update balances
            self.balances.write(from, from_balance - amount);
            let to_balance = self.balances.read(to);
            self.balances.write(to, to_balance + amount);

            // Emit transfer event
            self.emit(Transfer { from, to, value: amount });
        }
    }
}

