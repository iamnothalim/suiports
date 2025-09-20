/// Sports Betting System (Sui Move)
/// - USDC: USD Coin on Sui Network
/// - Multiple concurrent matches, map indexing for fast lookup
module suiports::suiports;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::table::{Self, Table};
use usdc::usdc::USDC;

/// Match status
const STATUS_REGISTERED: u8 = 0; // Registered (betting allowed)
const STATUS_STARTED: u8 = 1; // Started (betting disabled)
const STATUS_ENDED: u8 = 2; // Ended (settlement allowed)

/// Result pending indicator (option index based)
const RESULT_NONE: u16 = 0xFFFF; // Pending

/// Error codes
const E_NOT_ADMIN: u64 = 1;
const E_INVALID_STATUS: u64 = 3;
const E_DEADLINE_PASSED: u64 = 4;
const E_BET_AFTER_START: u64 = 5;
const E_INVALID_SIDE: u64 = 6;
const E_NOTHING_TO_CLAIM: u64 = 7;

/// Betting side classification (deprecated) - replaced by option index

/// Match information
public struct Match has drop, store {
    id: u64,
    /// Match creator address
    creator: address,
    status: u8,
    /// Option labels (e.g., ["YES", "NO"]) or ["HOME", "AWAY", "DRAW"]
    option_labels: vector<vector<u8>>,
    /// Result option index (set when match ends). Pending is RESULT_NONE
    result_idx: u16,
    /// Betting deadline (Unix ms)
    close_time_ms: u64,
    /// Settlement fee (bps). e.g., 200 = 2%
    fee_bps: u16,
}

/// Query: Match summary
public struct MatchSummary has copy, drop, store {
    status: u8,
    result_idx: u16,
    close_time_ms: u64,
    fee_bps: u16,
    num_options: u16,
}

/// Match pool (token storage and betting records)
public struct Pool has key, store {
    id: sui::object::UID,
    match_id: u64,
    /// Admin address (fee recipient)
    admin: address,
    /// Match creator address (fee recipient)
    creator: address,
    /// Match status (includes Match information)
    status: u8,
    /// Option labels
    option_labels: vector<vector<u8>>,
    /// Result option index
    result_idx: u16,
    /// Betting deadline (Unix ms)
    close_time_ms: u64,
    /// Settlement fee (bps)
    fee_bps: u16,
    /// Combined pool balance from all bets (using Balance)
    pot: Balance<USDC>,
    /// Total betting amount per option
    totals: vector<u64>,
    /// User betting amount table per option
    bets: vector<Table<address, u64>>,
    /// Claim status table per option
    claimed: vector<Table<address, bool>>,
    /// Fee pre-deduction status (prevents duplicate deduction)
    fee_taken: bool,
}

/// Query: Pool totals
public struct PoolTotals has copy, drop, store {
    totals: vector<u64>,
}

/// Query: Pool detailed information
public struct PoolInfo has copy, drop, store {
    match_id: u64,
    admin: address,
    creator: address,
    status: u8,
    option_labels: vector<vector<u8>>,
    result_idx: u16,
    close_time_ms: u64,
    fee_bps: u16,
    pot_value: u64,
    totals: vector<u64>,
    fee_taken: bool,
}

/// Query: User betting information
public struct UserBetInfo has copy, drop, store {
    user_bets: vector<u64>,
    total_bet: u64,
    can_claim: bool,
    claimed: bool,
}

/// Registry (admin, match index)
public struct Registry has key, store {
    id: sui::object::UID,
    admin: address,
    next_match_id: u64,
    matches: Table<u64, Match>,
}

/// Deploy: Registry creation (admin-only private ownership)
public fun deploy(ctx: &mut sui::tx_context::TxContext): Registry {
    let admin = sui::tx_context::sender(ctx);

    let matches: Table<u64, Match> = table::new<u64, Match>(ctx);

    let registry = Registry {
        id: sui::object::new(ctx),
        admin,
        next_match_id: 1,
        matches,
    };

    registry
}

/// Admin-only check
fun assert_admin(registry: &Registry, addr: address) {
    if (registry.admin != addr) { abort E_NOT_ADMIN }
}

/// Create match (admin)
/// - Creates Pool as shared object for all users to access
public fun create_match(
    registry: &mut Registry,
    creator: address,
    option_labels: vector<vector<u8>>,
    close_time_ms: u64,
    fee_bps: u16,
    ctx: &mut sui::tx_context::TxContext,
) {
    let sender = sui::tx_context::sender(ctx);
    assert_admin(registry, sender);

    let match_id = registry.next_match_id;
    registry.next_match_id = match_id + 1;

    let m = Match {
        id: match_id,
        creator,
        status: STATUS_REGISTERED,
        option_labels: option_labels,
        result_idx: RESULT_NONE,
        close_time_ms,
        fee_bps,
    };
    table::add(&mut registry.matches, match_id, m);

    // Initialize option vectors
    let pot = balance::zero<USDC>();
    let mut totals: vector<u64> = vector::empty<u64>();
    let mut bets: vector<Table<address, u64>> = vector::empty<Table<address, u64>>();
    let mut claimed: vector<Table<address, bool>> = vector::empty<Table<address, bool>>();
    let n = vector::length<vector<u8>>(&option_labels);
    let mut i = 0u64;
    while (i < n) {
        vector::push_back<u64>(&mut totals, 0);
        vector::push_back<Table<address, u64>>(&mut bets, table::new<address, u64>(ctx));
        vector::push_back<Table<address, bool>>(&mut claimed, table::new<address, bool>(ctx));
        i = i + 1;
    };

    let pool = Pool {
        id: sui::object::new(ctx),
        match_id,
        admin: sender,
        creator,
        status: STATUS_REGISTERED,
        option_labels,
        result_idx: RESULT_NONE,
        close_time_ms,
        fee_bps,
        pot,
        totals,
        bets,
        claimed,
        fee_taken: false,
    };

    // Make Pool a shared object
    sui::transfer::share_object(pool);
}

/// Start match (admin) - betting deadline
public fun start_match(
    registry: &mut Registry,
    pool: &mut Pool,
    match_id: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    assert_admin(registry, sui::tx_context::sender(ctx));
    let m_ref = table::borrow_mut(&mut registry.matches, match_id);
    if (m_ref.status != STATUS_REGISTERED) { abort E_INVALID_STATUS };
    m_ref.status = STATUS_STARTED;

    // Synchronize Pool status
    pool.status = STATUS_STARTED;
}

/// Set result (admin)
public fun set_result(
    registry: &mut Registry,
    pool: &mut Pool,
    match_id: u64,
    result_idx: u16,
    ctx: &mut sui::tx_context::TxContext,
) {
    assert_admin(registry, sui::tx_context::sender(ctx));
    let m_ref = table::borrow_mut(&mut registry.matches, match_id);
    if (m_ref.status != STATUS_STARTED) { abort E_INVALID_STATUS };
    let n = vector::length<vector<u8>>(&m_ref.option_labels);
    if (!((result_idx as u64) < n)) { abort E_INVALID_SIDE };
    m_ref.result_idx = result_idx;
    m_ref.status = STATUS_ENDED;

    // Synchronize Pool status
    pool.result_idx = result_idx;
    pool.status = STATUS_ENDED;
}

/// Place bet (user) - Transfer USDC coins to pool, accumulate option amounts and user records
public fun place_bet(
    pool: &mut Pool,
    option_idx: u16,
    stake: Coin<USDC>,
    now_ms: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    let sender = sui::tx_context::sender(ctx);

    // Check information directly from Pool
    if (pool.status != STATUS_REGISTERED) { abort E_BET_AFTER_START };
    if (now_ms > pool.close_time_ms) { abort E_DEADLINE_PASSED };
    let n = vector::length<vector<u8>>(&pool.option_labels);
    if (!((option_idx as u64) < n)) { abort E_INVALID_SIDE };

    let amount = coin::value(&stake);
    let bal = coin::into_balance(stake);
    balance::join(&mut pool.pot, bal);

    let idx64 = option_idx as u64;
    let bets_tab_ref = vector::borrow_mut<Table<address, u64>>(&mut pool.bets, idx64);
    update_user_bet(bets_tab_ref, sender, amount, ctx);
    let total_ref = vector::borrow_mut<u64>(&mut pool.totals, idx64);
    *total_ref = *total_ref + amount;
}

/// Add cumulative betting amount to user table (add as 0 if doesn't exist)
fun update_user_bet(
    map: &mut Table<address, u64>,
    user: address,
    add_amount: u64,
    _ctx: &mut sui::tx_context::TxContext,
) {
    if (table::contains<address, u64>(map, user)) {
        let cur = table::borrow_mut<address, u64>(map, user);
        *cur = *cur + add_amount;
    } else {
        table::add<address, u64>(map, user, add_amount);
    }
}

/// Settlement/Claim: User claims their winnings
/// - Can be called after result is determined
/// - Winning side gets proportional distribution from total pool after fee deduction
public fun claim(pool: &mut Pool, ctx: &mut sui::tx_context::TxContext): Coin<USDC> {
    let sender = sui::tx_context::sender(ctx);

    // Check information directly from Pool
    if (pool.status != STATUS_ENDED) { abort E_INVALID_STATUS };

    if (pool.result_idx == RESULT_NONE) { abort E_NOTHING_TO_CLAIM };
    let win_idx64 = pool.result_idx as u64;

    let claimed_tab_ref = vector::borrow_mut<Table<address, bool>>(
        &mut pool.claimed,
        win_idx64,
    );
    if (table::contains<address, bool>(claimed_tab_ref, sender)) { abort E_NOTHING_TO_CLAIM };

    let bets_tab_ref = vector::borrow_mut<Table<address, u64>>(&mut pool.bets, win_idx64);
    let user_bet = get_user_bet_or_zero(bets_tab_ref, sender);
    if (user_bet == 0) { abort E_NOTHING_TO_CLAIM };

    if (!pool.fee_taken && pool.fee_bps > 0) {
        let pot_value = balance::value(&pool.pot);
        let fee_amount = (pot_value * (pool.fee_bps as u64)) / 10000;
        if (fee_amount > 0) {
            // Split fee in half
            let admin_fee = fee_amount / 2;
            let creator_fee = fee_amount - admin_fee; // Remainder goes to creator (gets 1 more if odd)

            // Send fee to admin
            if (admin_fee > 0) {
                let b_admin = balance::split(&mut pool.pot, admin_fee);
                let admin_fee_coin = coin::from_balance(b_admin, ctx);
                sui::transfer::public_transfer(admin_fee_coin, pool.admin);
            };

            // Send fee to creator
            if (creator_fee > 0) {
                let b_creator = balance::split(&mut pool.pot, creator_fee);
                let creator_fee_coin = coin::from_balance(b_creator, ctx);
                sui::transfer::public_transfer(creator_fee_coin, pool.creator);
            };
        };
        pool.fee_taken = true;
    };

    let total_win = *vector::borrow<u64>(&pool.totals, win_idx64);
    if (total_win == 0) { abort E_NOTHING_TO_CLAIM };

    let pot_value2 = balance::value(&pool.pot);
    let payout_amount = (pot_value2 * user_bet) / total_win;
    if (payout_amount == 0) { abort E_NOTHING_TO_CLAIM };

    let b2 = balance::split(&mut pool.pot, payout_amount);
    let payout = coin::from_balance(b2, ctx);

    table::add<address, bool>(claimed_tab_ref, sender, true);
    payout
}

/// Return user betting amount from table as Option<u64>
fun get_user_bet_or_zero(map: &Table<address, u64>, user: address): u64 {
    if (table::contains<address, u64>(map, user)) {
        let r = table::borrow<address, u64>(map, user);
        *r
    } else { 0 }
}

/// Query function: Match summary (status, result, deadline, fee)
public fun get_match_summary(registry: &Registry, match_id: u64): MatchSummary {
    let m = table::borrow<u64, Match>(&registry.matches, match_id);
    MatchSummary {
        status: m.status,
        result_idx: m.result_idx,
        close_time_ms: m.close_time_ms,
        fee_bps: m.fee_bps,
        num_options: vector::length<vector<u8>>(&m.option_labels) as u16,
    }
}

/// Query function: Pool statistics (totals)
public fun get_pool_totals(pool: &Pool): PoolTotals {
    PoolTotals { totals: pool.totals }
}

/// Query function: Pool detailed information
public fun get_pool_info(pool: &Pool): PoolInfo {
    PoolInfo {
        match_id: pool.match_id,
        admin: pool.admin,
        creator: pool.creator,
        status: pool.status,
        option_labels: pool.option_labels,
        result_idx: pool.result_idx,
        close_time_ms: pool.close_time_ms,
        fee_bps: pool.fee_bps,
        pot_value: balance::value(&pool.pot),
        totals: pool.totals,
        fee_taken: pool.fee_taken,
    }
}

/// Query function: Pool balance (total pot value)
public fun get_pool_balance(pool: &Pool): u64 {
    balance::value(&pool.pot)
}

/// Query function: User betting information for a specific user
public fun get_user_bet_info(pool: &Pool, user: address): UserBetInfo {
    let mut user_bets: vector<u64> = vector::empty<u64>();
    let mut total_bet: u64 = 0;
    let mut can_claim: bool = false;
    let mut claimed: bool = false;

    let n = vector::length<Table<address, u64>>(&pool.bets);
    let mut i = 0u64;
    while (i < n) {
        let bets_tab = vector::borrow<Table<address, u64>>(&pool.bets, i);
        let user_bet = get_user_bet_or_zero(bets_tab, user);
        vector::push_back<u64>(&mut user_bets, user_bet);
        total_bet = total_bet + user_bet;
        i = i + 1;
    };

    // Check if user can claim (match ended and user has winning bets)
    if (pool.status == STATUS_ENDED && pool.result_idx != RESULT_NONE) {
        let win_idx64 = pool.result_idx as u64;
        let user_win_bet = *vector::borrow<u64>(&user_bets, win_idx64);
        can_claim = user_win_bet > 0;

        // Check if already claimed
        let claimed_tab = vector::borrow<Table<address, bool>>(&pool.claimed, win_idx64);
        claimed = table::contains<address, bool>(claimed_tab, user);
    };

    UserBetInfo {
        user_bets,
        total_bet,
        can_claim,
        claimed,
    }
}

/// Query function: Get total betting amount for a specific option
public fun get_option_total(pool: &Pool, option_idx: u16): u64 {
    let n = vector::length<u64>(&pool.totals);
    if ((option_idx as u64) >= n) { 0 } else {
        *vector::borrow<u64>(&pool.totals, option_idx as u64)
    }
}

/// Query function: Get user's betting amount for a specific option
public fun get_user_option_bet(pool: &Pool, user: address, option_idx: u16): u64 {
    let n = vector::length<Table<address, u64>>(&pool.bets);
    if ((option_idx as u64) >= n) { 0 } else {
        let bets_tab = vector::borrow<Table<address, u64>>(&pool.bets, option_idx as u64);
        get_user_bet_or_zero(bets_tab, user)
    }
}

/// Query function: Check if user has claimed winnings for winning option
public fun has_user_claimed(pool: &Pool, user: address): bool {
    if (pool.status != STATUS_ENDED || pool.result_idx == RESULT_NONE) {
        false
    } else {
        let win_idx64 = pool.result_idx as u64;
        let claimed_tab = vector::borrow<Table<address, bool>>(&pool.claimed, win_idx64);
        table::contains<address, bool>(claimed_tab, user)
    }
}
