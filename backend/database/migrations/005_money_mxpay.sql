-- PowerBank real-money tables + MXPay gateway support (all amounts stored in integer paise: 100 = ₹1.00).
CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  deposit_paise BIGINT UNSIGNED NOT NULL DEFAULT 0,
  withdrawable_paise BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_deposited_paise BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_earned_paise BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_withdrawn_paise BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  account_number VARCHAR(34) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  ifsc CHAR(11) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY ix_ba_user (user_id, deleted_at),
  CONSTRAINT fk_ba_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deposits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  gateway VARCHAR(24) NOT NULL DEFAULT 'mxpay',
  gateway_order_no VARCHAR(64) NULL,
  platform_id VARCHAR(64) NULL,
  payment_link VARCHAR(500) NULL,
  status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
  raw_callback JSON NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_dep_user (user_id, created_at),
  KEY ix_dep_status (status, created_at),
  CONSTRAINT fk_dep_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  bank_account_id BIGINT UNSIGNED NULL,
  bank_name VARCHAR(120) NOT NULL,
  account_number VARCHAR(34) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  ifsc CHAR(11) NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','processing','success','rejected','failed') NOT NULL DEFAULT 'pending',
  gateway_message VARCHAR(255) NULL,
  raw_callback JSON NULL,
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_wdr_user (user_id, created_at),
  KEY ix_wdr_status (status, created_at),
  CONSTRAINT fk_wdr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wdr_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_wdr_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS investments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id VARCHAR(24) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  daily_paise BIGINT UNSIGNED NOT NULL,
  duration_days SMALLINT UNSIGNED NOT NULL,
  days_credited SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_credited_at DATETIME NULL,
  status ENUM('active','completed') NOT NULL DEFAULT 'active',
  KEY ix_inv_user (user_id, status, started_at),
  KEY ix_inv_plan (plan_id),
  CONSTRAINT fk_inv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  category ENUM('Daily','Social','Special') NOT NULL DEFAULT 'Daily',
  reward_paise BIGINT UNSIGNED NOT NULL,
  status ENUM('active','paused') NOT NULL DEFAULT 'active',
  assigned_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY ix_tasks_active (status, deleted_at),
  CONSTRAINT fk_tasks_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_completions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  completed_date DATE NOT NULL,
  reward_paise BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tc (task_id, user_id, completed_date),
  KEY ix_tc_user (user_id, created_at),
  CONSTRAINT fk_tc_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_tc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tx_ref VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('deposit','withdrawal','investment','earning','task','referral','refund','admin_adjust') NOT NULL,
  bucket ENUM('deposit','withdrawable') NOT NULL,
  direction ENUM('credit','debit') NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  balance_after_paise BIGINT UNSIGNED NOT NULL,
  ref_id VARCHAR(32) NULL,
  status ENUM('success','pending','failed') NOT NULL DEFAULT 'success',
  note VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_wt_user (user_id, created_at),
  KEY ix_wt_type (type, status),
  CONSTRAINT fk_wt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE referrals
  ADD COLUMN reward_paise INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN reward_credited_at DATETIME NULL;

