// INSERT INTO company_bank_details
// (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status, is_primary)
// VALUES

// ('State Bank of India', 'DHEERAN TRADERS', '1234567890123456', 'SBIN0001234',
//  'Dharmapuri Branch', 'uploads/qr/sbi_qr.png', 'active', TRUE),

// ('Indian Bank', 'DHEERAN TRADERS', '2345678901234567', 'IDIB000D001',
//  'Dharmapuri Main Branch', 'uploads/qr/indian_qr.png', 'active', FALSE);

export const seedCompanyBank = async (db) => {
  const data = [
    ['State Bank of India','DHEERAN TRADERS','1234567890123456','SBIN0001234','Dharmapuri Branch','uploads/qr/sbi_qr.png','active',true],

    ['Indian Bank','DHEERAN TRADERS','2345678901234567','IDIB000D001','Dharmapuri Main Branch','uploads/qr/indian_qr.png','active',false],
  ];

  for (const bank of data) {
    await db.query(
      `INSERT INTO company_bank_details
      (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        bank_name = VALUES(bank_name),
        branch = VALUES(branch),
        qr_code_image = VALUES(qr_code_image),
        status = VALUES(status),
        is_primary = VALUES(is_primary)`,
      bank
    );
  }
};
