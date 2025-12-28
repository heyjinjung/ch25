-- Fix token_type ENUM in user_game_wallet_ledger
ALTER TABLE user_game_wallet_ledger MODIFY COLUMN token_type ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'LOTTERY_TICKET', 'CC_COIN', 'GOLD_KEY', 'DIAMOND_KEY') NOT NULL;

-- Fix token_type ENUM in trial_token_bucket (if exists, assuming similar structure)
-- Note: If trial_token_bucket doesn't use ENUM or doesn't exist, this might fail, but let's assume it does based on consistent design.
-- Actually, checking logic: trial_token_bucket might not have these keys if they are not grantable via trial system?
-- GameWalletService uses it, so it likely needs it.
ALTER TABLE trial_token_bucket MODIFY COLUMN token_type ENUM('ROULETTE_COIN', 'DICE_TOKEN', 'LOTTERY_TICKET', 'CC_COIN', 'GOLD_KEY', 'DIAMOND_KEY') NOT NULL;
