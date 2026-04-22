export const createCustomerBillingTables = async (db) => {
//   await db.query(`
//   CREATE TABLE IF NOT EXISTS customerBilling (
//   id INT AUTO_INCREMENT PRIMARY KEY,

//   /* 📄 INVOICE */
//   invoice_number VARCHAR(30) UNIQUE NOT NULL,
//   invoice_date DATE NOT NULL,
//   company_gst_number VARCHAR(30),

//   /* 👤 CUSTOMER */
//   customer_id INT NOT NULL,
//   customer_name VARCHAR(150) NOT NULL,
//   phone_number VARCHAR(20),
//   customer_gst_number VARCHAR(30),

//   /* 🚚 TRANSPORT */
//   vehicle_number VARCHAR(20),
//   eway_bill_number VARCHAR(50),

//   /* 👤 STAFF */
//   staff_name VARCHAR(150) NOT NULL,
//   staff_phone VARCHAR(20),

//   /* 🏦 BANK */
//   bank_id INT NOT NULL,

//   /* 💰 BILL AMOUNTS */
//   subtotal DECIMAL(10,2) NOT NULL,

//   grand_total DECIMAL(10,2) NOT NULL,
//   advance_paid DECIMAL(10,2) DEFAULT 0,
//   balance_due DECIMAL(10,2) NOT NULL,

//   /* 💳 PAYMENT SPLIT */
//   cash_amount DECIMAL(10,2) DEFAULT 0,
//   upi_amount DECIMAL(10,2) DEFAULT 0,
//   cheque_amount DECIMAL(10,2) DEFAULT 0,
//   upi_reference VARCHAR(100) UNIQUE,

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//   /* 🔗 FOREIGN KEYS */
//   CONSTRAINT fk_billing_customer
//     FOREIGN KEY (customer_id)
//     REFERENCES customers(id)
//     ON DELETE RESTRICT,

//   CONSTRAINT fk_billing_bank
//     FOREIGN KEY (bank_id)
//     REFERENCES company_bank_details(id)
//     ON DELETE RESTRICT

// ) ENGINE=InnoDB;
//   `);

// await db.query(`
//     ALTER TABLE customerBilling

// /* 🔁 MODIFY DECIMALS */
// MODIFY subtotal DECIMAL(12,2) NOT NULL,
// MODIFY grand_total DECIMAL(12,2) NOT NULL,
// MODIFY advance_paid DECIMAL(12,2) DEFAULT 0,
// MODIFY balance_due DECIMAL(12,2) NOT NULL,
// MODIFY cash_amount DECIMAL(12,2) DEFAULT 0,
// MODIFY upi_amount DECIMAL(12,2) DEFAULT 0,
// MODIFY cheque_amount DECIMAL(12,2) DEFAULT 0,

// /* 🔁 REMOVE UNIQUE FROM UPI (if exists) */
// DROP INDEX upi_reference,

// /* 🔁 ADD NEW COLUMNS */
// ADD COLUMN return_status ENUM('NONE','PARTIAL','FULL') DEFAULT 'NONE',
// ADD COLUMN payment_status ENUM('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',
// ADD COLUMN status ENUM('ACTIVE','CANCELLED') DEFAULT 'ACTIVE',

// ADD COLUMN remarks TEXT,

// ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

// /* 🔐 ADD UNIQUE */
// ADD UNIQUE KEY uq_invoice_number (invoice_number),

// /* ⚡ ADD INDEXES */
// ADD INDEX idx_customer (customer_id),
// ADD INDEX idx_invoice_date (invoice_date),
// ADD INDEX idx_customer_date (customer_id, invoice_date),
// ADD INDEX idx_payment_status (payment_status),
// ADD INDEX idx_return_status (return_status),
// ADD INDEX idx_status (status),
// ADD INDEX idx_bank (bank_id);
//   `)

await db.query(`
  CREATE TABLE IF NOT EXISTS customerBilling (
  id INT AUTO_INCREMENT PRIMARY KEY,

  /* 📄 INVOICE */
  invoice_number VARCHAR(30) NOT NULL,
  invoice_date DATE NOT NULL,
  company_gst_number VARCHAR(30),

  /* 👤 CUSTOMER */
  customer_id INT NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  customer_gst_number VARCHAR(30),

  /* 🚚 TRANSPORT */
  vehicle_number VARCHAR(20),
  eway_bill_number VARCHAR(50),

  /* 👤 STAFF */
  staff_name VARCHAR(150) NOT NULL,
  staff_phone VARCHAR(20),

  /* 🏦 BANK */
  bank_id INT NOT NULL,

  /* 💰 BILL AMOUNTS */
  subtotal DECIMAL(12,2) NOT NULL,
  grand_total DECIMAL(12,2) NOT NULL,
  advance_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL,

  /* 💳 PAYMENT SPLIT */
  cash_amount DECIMAL(12,2) DEFAULT 0,
  upi_amount DECIMAL(12,2) DEFAULT 0,
  cheque_amount DECIMAL(12,2) DEFAULT 0,
  upi_reference VARCHAR(100),

  /* 🔁 RETURNS */
  return_status ENUM('NONE', 'PARTIAL', 'FULL') DEFAULT 'NONE',

  /* 💵 PAYMENT STATUS */
  payment_status ENUM('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',

  /* 🔄 BILL STATUS */
  status ENUM('ACTIVE','CANCELLED') DEFAULT 'ACTIVE',

  /* 📝 REMARKS */
  remarks TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  /* 🔐 CONSTRAINTS */
  UNIQUE KEY uq_invoice_number (invoice_number),

  /* ⚡ INDEXES (CRITICAL) */
  INDEX idx_customer (customer_id),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_customer_date (customer_id, invoice_date),
  INDEX idx_payment_status (payment_status),
  INDEX idx_return_status (return_status),
  INDEX idx_status (status),
  INDEX idx_bank (bank_id),

  /* 🔗 FOREIGN KEYS */
  CONSTRAINT fk_billing_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,

  CONSTRAINT fk_billing_bank
    FOREIGN KEY (bank_id) REFERENCES company_bank_details(id) ON DELETE RESTRICT

) ENGINE=InnoDB;
  `);

//   await db.query(`
//   CREATE TABLE IF NOT EXISTS customerBillingProducts (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   billing_id INT NOT NULL,

//   product_id INT NOT NULL,
//   product_name VARCHAR(150) NOT NULL,
//   product_brand VARCHAR(100),
//   product_category VARCHAR(100),
//   product_quantity VARCHAR(50),

//   hsn_code VARCHAR(20),
//   cgst_rate DECIMAL(5,2) NULL,
//   sgst_rate DECIMAL(5,2) NULL,
//   gst_total_rate DECIMAL(5,2) NULL,

//   cgst_amount DECIMAL(10,2) DEFAULT 0,
//   sgst_amount DECIMAL(10,2) DEFAULT 0,
//   gst_total_amount DECIMAL(10,2) DEFAULT 0,

//   discount_percent DECIMAL(5,2) DEFAULT 0,
//   discount_amount DECIMAL(10,2) DEFAULT 0,

//   quantity INT NOT NULL,
//   rate DECIMAL(10,2) NOT NULL,
//   final_rate DECIMAL(10,2),
//   total DECIMAL(10,2) NOT NULL,

//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

//   FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE,
//   FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
// );
//   `);

//   await db.query(`
//     ALTER TABLE customerBillingProducts

// /* 🔁 MODIFY DECIMALS */
// MODIFY cgst_amount DECIMAL(12,2) DEFAULT 0,
// MODIFY sgst_amount DECIMAL(12,2) DEFAULT 0,
// MODIFY gst_total_amount DECIMAL(12,2) DEFAULT 0,
// MODIFY discount_amount DECIMAL(12,2) DEFAULT 0,
// MODIFY rate DECIMAL(12,2) NOT NULL,
// MODIFY final_rate DECIMAL(12,2),
// MODIFY total DECIMAL(12,2) NOT NULL,

// /* 🔁 ADD RETURN TRACKING */
// ADD COLUMN returned_quantity INT DEFAULT 0,

// /* ⚡ ADD INDEXES */
// ADD INDEX idx_billing (billing_id),
// ADD INDEX idx_product (product_id),
// ADD INDEX idx_billing_product (billing_id, product_id),
// ADD INDEX idx_returned_quantity (returned_quantity);
//     `)

await db.query(`
  CREATE TABLE IF NOT EXISTS customerBillingProducts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  billing_id INT NOT NULL,
  product_id INT NOT NULL,

  product_name VARCHAR(150) NOT NULL,
  product_brand VARCHAR(100),
  product_category VARCHAR(100),
  product_quantity VARCHAR(50),

  hsn_code VARCHAR(20),

  cgst_rate DECIMAL(5,2),
  sgst_rate DECIMAL(5,2),
  gst_total_rate DECIMAL(5,2),

  cgst_amount DECIMAL(12,2) DEFAULT 0,
  sgst_amount DECIMAL(12,2) DEFAULT 0,
  gst_total_amount DECIMAL(12,2) DEFAULT 0,

  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,

  quantity INT NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  final_rate DECIMAL(12,2),
  total DECIMAL(12,2) NOT NULL,

  returned_quantity INT DEFAULT 0,
  

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  /* ⚡ INDEXES */
  INDEX idx_billing (billing_id),
  INDEX idx_product (product_id),
  INDEX idx_billing_product (billing_id, product_id),

  INDEX idx_returned_quantity (returned_quantity),

  CHECK (returned_quantity <= quantity),

  /* 🔗 FOREIGN KEYS */
  FOREIGN KEY (billing_id) REFERENCES customerBilling(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT

) ENGINE=InnoDB;
  `);

  await db.query(`
CREATE TABLE IF NOT EXISTS customerBillingPayment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id INT NOT NULL,

    payment_date DATE NOT NULL,

    cash_amount DECIMAL(10,2) DEFAULT 0,
    upi_amount DECIMAL(10,2) DEFAULT 0,
    cheque_amount DECIMAL(10,2) DEFAULT 0,

    -- ✅ Auto calculated (NEVER manual)
    total_amount DECIMAL(10,2)
    GENERATED ALWAYS AS (
        cash_amount + upi_amount + cheque_amount
    ) STORED,

    reference_no VARCHAR(100),
    remarks VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- ✅ Critical indexes
    INDEX idx_payment_date (payment_date),
    INDEX idx_billing_id (billing_id),

    FOREIGN KEY (billing_id) 
    REFERENCES customerBilling(id) 
    ON DELETE CASCADE
);
`);
};
