-- PowerBank MySQL 8 schema. Import once into a NEW empty database (utf8mb4).
SET NAMES utf8mb4;
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(8) NOT NULL UNIQUE,
  full_name VARCHAR(80) NOT NULL,
  country_code VARCHAR(5) NOT NULL DEFAULT '+91',
  mobile CHAR(10) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','inactive','blocked') NOT NULL DEFAULT 'active',
  mobile_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_users_mobile (country_code, mobile),
  KEY ix_users_status (status), KEY ix_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE user_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  display_name VARCHAR(80) NULL, city VARCHAR(80) NULL, avatar_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','viewer') NOT NULL DEFAULT 'viewer',
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_type ENUM('user','admin') NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  family_id CHAR(32) NOT NULL,
  refresh_hash CHAR(64) NOT NULL UNIQUE,
  remember TINYINT(1) NOT NULL DEFAULT 0,
  user_agent VARCHAR(255) NULL, ip VARBINARY(16) NULL,
  expires_at DATETIME NOT NULL, rotated_at DATETIME NULL, revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_sessions_subject (subject_type, subject_id), KEY ix_sessions_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE otp_verifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mobile CHAR(10) NOT NULL,
  purpose ENUM('register','reset') NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL, verified_at DATETIME NULL, consumed_at DATETIME NULL,
  verify_token_hash CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_otp_lookup (mobile, purpose, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE invitation_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  owner_user_id BIGINT UNSIGNED NULL,
  max_uses INT UNSIGNED NULL, uses INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_inv_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_inv_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE referrals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  referred_user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  referrer_user_id BIGINT UNSIGNED NULL,
  invitation_code_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_ref_referrer (referrer_user_id),
  CONSTRAINT fk_ref_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ref_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ref_code FOREIGN KEY (invitation_code_id) REFERENCES invitation_codes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  icon ENUM('zap','star','crown','gem') NOT NULL DEFAULT 'zap',
  display_price INT UNSIGNED NOT NULL COMMENT 'Illustrative only, never sold',
  display_daily INT UNSIGNED NOT NULL COMMENT 'Illustrative only, never paid',
  duration_days SMALLINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY ix_plans_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL, body VARCHAR(1000) NOT NULL,
  audience ENUM('all','user') NOT NULL DEFAULT 'all',
  user_id BIGINT UNSIGNED NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY ix_notif_target (audience, user_id, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE notification_reads (
  notification_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT fk_nr_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_nr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE user_settings (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  notify_push TINYINT(1) NOT NULL DEFAULT 1, notify_sms TINYINT(1) NOT NULL DEFAULT 0,
  language VARCHAR(8) NOT NULL DEFAULT 'en',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_us_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE platform_settings (
  setting_key VARCHAR(64) PRIMARY KEY, setting_value VARCHAR(1000) NOT NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ps_admin FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE admin_activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(64) NOT NULL, target_type VARCHAR(32) NULL, target_id VARCHAR(32) NULL,
  details JSON NULL, ip VARBINARY(16) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_aal_admin (admin_id, created_at), KEY ix_aal_created (created_at),
  CONSTRAINT fk_aal_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE policy_acceptances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  policy ENUM('terms','privacy') NOT NULL, version VARCHAR(16) NOT NULL,
  ip VARBINARY(16) NULL,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pa (user_id, policy, version),
  CONSTRAINT fk_pa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Support table for rate limiting on shared hosting (no Redis needed).
CREATE TABLE rate_limits (
  bucket CHAR(64) PRIMARY KEY, hits INT UNSIGNED NOT NULL, window_start DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
