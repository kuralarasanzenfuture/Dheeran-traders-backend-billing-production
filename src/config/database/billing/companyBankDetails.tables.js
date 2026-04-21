export const createCompanyBankDetailsTables = async (db) => {
//   await db.query(`
//       CREATE TABLE IF NOT EXISTS company_bank_details (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   bank_name VARCHAR(150) NOT NULL,
//   account_name VARCHAR(150) NOT NULL,
//   account_number VARCHAR(50) NOT NULL,
//   ifsc_code VARCHAR(20) NOT NULL,
//   branch VARCHAR(150) NOT NULL,

//   qr_code_image VARCHAR(255) NOT NULL,

//   status ENUM('active','inactive') DEFAULT 'active',

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     ON UPDATE CURRENT_TIMESTAMP
// ) ENGINE=InnoDB;
//       `);

await db.query(`
      CREATE TABLE IF NOT EXISTS company_bank_details (
  id INT AUTO_INCREMENT PRIMARY KEY,

  bank_name VARCHAR(150) NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  branch VARCHAR(150) NOT NULL,

  qr_code_image VARCHAR(255) NOT NULL,

  status ENUM('active','inactive') DEFAULT 'active',

  is_primary BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    primary_flag TINYINT 
      GENERATED ALWAYS AS (CASE WHEN is_primary = 1 THEN 1 ELSE NULL END) STORED,

  UNIQUE KEY uniq_account (account_number, ifsc_code),
  UNIQUE KEY uniq_primary (primary_flag),
  INDEX idx_status (status),
  INDEX idx_primary (is_primary)
) ENGINE=InnoDB;
      `);


      // await db.query(`
      // alter table company_bank_details
      // add column is_primary BOOLEAN DEFAULT FALSE AFTER status,
      // add column primary_flag TINYINT
      // GENERATED ALWAYS AS (
      //   CASE WHEN is_primary = 1 THEN 1 ELSE NULL END
      // ) STORED,
      // add UNIQUE KEY uniq_primary (primary_flag),
      // add UNIQUE KEY uniq_account (account_number, ifsc_code),
      // add INDEX idx_status (status),
      // add INDEX idx_primary (is_primary)
      // `);


};
