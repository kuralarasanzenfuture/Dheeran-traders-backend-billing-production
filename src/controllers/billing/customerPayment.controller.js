import db from "../../config/db.js";

/* ➕ ADD PAYMENT */

// export const addCustomerPayment = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     const {
//       billing_id,
//       payment_date,
//       cash_amount,
//       upi_amount,
//       cheque_amount,
//       reference_no,
//       remarks,
//     } = req.body;

//     if (!billing_id || !payment_date) {
//       return res
//         .status(400)
//         .json({ message: "billing_id and payment_date required" });
//     }

//     const cash = Number(cash_amount) || 0;
//     const upi = Number(upi_amount) || 0;
//     const cheque = Number(cheque_amount) || 0;

//     const totalPaid = cash + upi + cheque;

//     if (totalPaid <= 0) {
//       return res
//         .status(400)
//         .json({ message: "Payment amount must be greater than 0" });
//     }

//     await conn.beginTransaction();

//     // 🔐 Lock invoice row (prevents double payments)
//     const [bill] = await conn.query(
//       "SELECT balance_due FROM customerBilling WHERE id = ? FOR UPDATE",
//       [billing_id]
//     );

//     if (!bill.length) {
//       await conn.rollback();
//       return res.status(404).json({ message: "Invoice not found" });
//     }

//     if (totalPaid > bill[0].balance_due) {
//       await conn.rollback();
//       return res.status(400).json({ message: "Payment exceeds balance" });
//     }

//     // ✅ Insert payment (NO total_amount needed)
//     await conn.query(
//       `INSERT INTO customerBillingPayment
//        (billing_id, payment_date, cash_amount, upi_amount, cheque_amount, reference_no, remarks)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [billing_id, payment_date, cash, upi, cheque, reference_no, remarks]
//     );

//     // ✅ Update balance
//     await conn.query(
//       `UPDATE customerBilling
//        SET balance_due = balance_due - ?
//        WHERE id = ?`,
//       [totalPaid, billing_id]
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Payment added successfully",
//     });

//   } catch (err) {
//     await conn.rollback();
//     console.error("Payment error:", err);
//     res.status(500).json({ message: "Server error" });
//   } finally {
//     conn.release();
//   }
// };

export const addCustomerPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      billing_id,
      payment_date,
      cash_amount,
      upi_amount,
      cheque_amount,
      reference_no,
      remarks,
    } = req.body;

    if (!billing_id || !payment_date) {
      return res
        .status(400)
        .json({ message: "billing_id and payment_date required" });
    }

    const cash = Number(cash_amount) || 0;
    const upi = Number(upi_amount) || 0;
    const cheque = Number(cheque_amount) || 0;

    const totalPaid = cash + upi + cheque;

    if (totalPaid <= 0) {
      return res
        .status(400)
        .json({ message: "Payment amount must be greater than 0" });
    }

    await conn.beginTransaction();

    /* 🔒 LOCK BILL */
    const [[bill]] = await conn.query(
      `SELECT balance_due, grand_total FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    if (!bill) {
      await conn.rollback();
      return res.status(404).json({ message: "Invoice not found" });
    }

    const currentBalance = Number(bill.balance_due);

    if (totalPaid > currentBalance) {
      await conn.rollback();
      return res.status(400).json({ message: "Payment exceeds balance" });
    }

    /* 🧾 INSERT PAYMENT */
    await conn.query(
      `INSERT INTO customerBillingPayment
       (billing_id, payment_date, cash_amount, upi_amount, cheque_amount, reference_no, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [billing_id, payment_date, cash, upi, cheque, reference_no || null, remarks || null]
    );

    /* 💰 CALCULATE NEW BALANCE */
    const newBalance = Number((currentBalance - totalPaid).toFixed(2));

    /* 💳 DETERMINE PAYMENT STATUS */
    let paymentStatus = "UNPAID";

    if (newBalance === 0) {
      paymentStatus = "PAID";
    } else if (newBalance < bill.grand_total) {
      paymentStatus = "PARTIAL";
    }

    /* 🔄 UPDATE BILL */
    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, payment_status=?
       WHERE id=?`,
      [newBalance, paymentStatus, billing_id]
    );

    await conn.commit();

    res.status(201).json({
      message: "Payment added successfully",
      payment: {
        paid_amount: totalPaid,
        balance_after: newBalance,
        payment_status: paymentStatus,
      },
    });

  } catch (err) {
    await conn.rollback();
    console.error("Payment error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};


/* 📜 GET PAYMENT HISTORY BY BILL */
export const getPaymentsByBillingId = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const [rows] = await db.query(
      `SELECT id, payment_date, cash_amount, upi_amount, cheque_amount, total_amount, reference_no, remarks, created_at
       FROM customerBillingPayment
       WHERE billing_id = ?
       ORDER BY payment_date`,
      [billing_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* 📊 GET INVOICE WITH PAYMENT SUMMARY */
export const getInvoiceWithPayments = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        cb.invoice_number,
        cb.customer_name,
        cb.phone_number,
        cb.grand_total,
        cb.balance_due,
        IFNULL(SUM(cp.cash_amount + cp.upi_amount + cp.cheque_amount),0) AS total_paid
      FROM customerBilling cb
      LEFT JOIN customerBillingPayment cp ON cb.id = cp.billing_id
      WHERE cb.id = ?
      GROUP BY cb.id`,
      [billing_id],
    );

    if (!rows.length)
      return res.status(404).json({ message: "Invoice not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 📊 GET ALL PAYMENTS (For Daily Sales Report)
export const getAllPayments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM customerBillingPayment
       ORDER BY payment_date`,
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateCustomerPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const {
      payment_date,
      cash_amount,
      upi_amount,
      cheque_amount,
      reference_no,
      remarks,
    } = req.body;

    const [[payment]] = await conn.query(
      `SELECT * FROM customerBillingPayment WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!payment) throw new Error("Payment not found");

    const billing_id = payment.billing_id;

    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    const oldTotal =
      Number(payment.cash_amount || 0) +
      Number(payment.upi_amount || 0) +
      Number(payment.cheque_amount || 0);

    const newCash = Number(cash_amount) || 0;
    const newUpi = Number(upi_amount) || 0;
    const newCheque = Number(cheque_amount) || 0;

    const newTotal = newCash + newUpi + newCheque;

    if (newTotal <= 0) {
      throw new Error("Payment must be greater than 0");
    }

    /* 🧮 CALCULATE NEW BALANCE */
    const newBalance = Number(
      (Number(bill.balance_due) + oldTotal - newTotal).toFixed(2)
    );

    if (newBalance < 0) {
      throw new Error("Payment exceeds total bill");
    }

    /* 🧾 UPDATE PAYMENT */
    await conn.query(
      `UPDATE customerBillingPayment
       SET payment_date=?, cash_amount=?, upi_amount=?, cheque_amount=?, reference_no=?, remarks=?
       WHERE id=?`,
      [
        payment_date,
        newCash,
        newUpi,
        newCheque,
        reference_no || null,
        remarks || null,
        id,
      ]
    );

    /* 💳 PAYMENT STATUS */
    let paymentStatus = "UNPAID";

    if (newBalance === 0) paymentStatus = "PAID";
    else if (newBalance < bill.grand_total) paymentStatus = "PARTIAL";

    /* 🔄 UPDATE BILL */
    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, payment_status=?
       WHERE id=?`,
      [newBalance, paymentStatus, billing_id]
    );

    await conn.commit();

    res.json({
      message: "Payment updated successfully",
      balance_after: newBalance,
      payment_status: paymentStatus,
    });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deleteCustomerPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[payment]] = await conn.query(
      `SELECT * FROM customerBillingPayment WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!payment) throw new Error("Payment not found");

    const billing_id = payment.billing_id;

    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id]
    );

    const totalPaid =
      Number(payment.cash_amount || 0) +
      Number(payment.upi_amount || 0) +
      Number(payment.cheque_amount || 0);

    /* 🧮 NEW BALANCE */
    const newBalance = Number(
      (Number(bill.balance_due) + totalPaid).toFixed(2)
    );

    /* 🗑 DELETE PAYMENT */
    await conn.query(
      `DELETE FROM customerBillingPayment WHERE id=?`,
      [id]
    );

    /* 💳 PAYMENT STATUS */
    let paymentStatus = "UNPAID";

    if (newBalance === 0) paymentStatus = "PAID";
    else if (newBalance < bill.grand_total) paymentStatus = "PARTIAL";

    /* 🔄 UPDATE BILL */
    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, payment_status=?
       WHERE id=?`,
      [newBalance, paymentStatus, billing_id]
    );

    await conn.commit();

    res.json({
      message: "Payment deleted successfully",
      balance_after: newBalance,
      payment_status: paymentStatus,
    });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
