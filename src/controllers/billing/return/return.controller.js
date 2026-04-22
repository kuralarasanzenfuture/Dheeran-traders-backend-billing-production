import db from "../../../config/db.js";

const getFinancialYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 4) {
    return `${year.toString().slice(2)}-${(year + 1).toString().slice(2)}`;
  } else {
    return `${(year - 1).toString().slice(2)}-${year.toString().slice(2)}`;
  }
};

const generateReturnNumber = async (conn) => {
  const fy = getFinancialYear();

  const [[row]] = await conn.query(
    `SELECT return_number 
     FROM customerBillingReturns 
     WHERE return_number LIKE ? 
     ORDER BY id DESC 
     LIMIT 1 FOR UPDATE`,
    [`RTN/${fy}/%`],
  );

  let nextNumber = 1;

  if (row) {
    const last = row.return_number.split("/")[2];
    nextNumber = parseInt(last, 10) + 1;
  }

  const padded = String(nextNumber).padStart(4, "0");

  return `RTN/${fy}/${padded}`;
};

export const createCustomerReturn = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { billing_id, products, remarks } = req.body;

    if (!billing_id || !Array.isArray(products) || products.length === 0) {
      throw new Error("Invalid return data");
    }

    const return_date = new Date().toISOString().slice(0, 10);

    /* 🔒 LOCK BILL */
    const [[bill]] = await conn.query(
      `SELECT id, balance_due FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id],
    );

    if (!bill) throw new Error("Invoice not found");

    let totalReturnAmount = 0;

    const return_number = await generateReturnNumber(conn);

    /* CREATE RETURN */
    const [result] = await conn.query(
      `INSERT INTO customerBillingReturns
       (billing_id, return_number, return_date, total_return_amount, remarks)
       VALUES (?, ?, ?, 0, ?)`,
      [billing_id, return_number, return_date, remarks || null],
    );

    const return_id = result.insertId;

    /* PROCESS PRODUCTS */
    for (const item of products) {
      const { billing_product_id, return_quantity } = item;

      const qty = Number(return_quantity);
      if (!billing_product_id || qty <= 0) {
        throw new Error("Invalid return quantity");
      }

      const [[bp]] = await conn.query(
        `SELECT * FROM customerBillingProducts WHERE id=? FOR UPDATE`,
        [billing_product_id],
      );

      if (!bp) throw new Error("Product not found");

      const allowed = bp.quantity - (bp.returned_quantity || 0);

      if (qty > allowed) {
        throw new Error(`Allowed only ${allowed} for ${bp.product_name}`);
      }

      const rate = Number(bp.final_rate || bp.rate);
      const amount = Number((qty * rate).toFixed(2));

      totalReturnAmount += amount;

      await conn.query(
        `INSERT INTO customerBillingReturnsProducts
        (return_id, billing_product_id, product_id, return_quantity, return_rate, return_amount)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [return_id, billing_product_id, bp.product_id, qty, rate, amount],
      );

      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = returned_quantity + ?
         WHERE id=?`,
        [qty, billing_product_id],
      );

      await conn.query(`UPDATE products SET stock = stock + ? WHERE id=?`, [
        qty,
        bp.product_id,
      ]);
    }

    /* UPDATE RETURN TOTAL */
    await conn.query(
      `UPDATE customerBillingReturns SET total_return_amount=? WHERE id=?`,
      [totalReturnAmount, return_id],
    );

    /* UPDATE BILL BALANCE */
    const newBalance = Number(
      (Number(bill.balance_due) - totalReturnAmount).toFixed(2),
    );

    if (newBalance < 0) {
      throw new Error("Return exceeds balance");
    }

    /* RETURN STATUS */
    const [rows] = await conn.query(
      `SELECT quantity, returned_quantity
       FROM customerBillingProducts WHERE billing_id=?`,
      [billing_id],
    );

    let allReturned = true;
    let anyReturned = false;

    for (const r of rows) {
      if (r.returned_quantity > 0) anyReturned = true;
      if (r.returned_quantity < r.quantity) allReturned = false;
    }

    let returnStatus = "NONE";
    if (!anyReturned) returnStatus = "NONE";
    else if (!allReturned) returnStatus = "PARTIAL";
    else returnStatus = "FULL";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, return_status=?
       WHERE id=?`,
      [newBalance, returnStatus, billing_id],
    );

    await conn.commit();

    res.status(201).json({
      message: "Return created successfully",
      return_id,
      return_number,
      total_return_amount: totalReturnAmount,
      balance_after: newBalance,
      return_status: returnStatus,
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const updateCustomerReturn = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { products, remarks } = req.body;

    if (!id || !Array.isArray(products) || products.length === 0) {
      throw new Error("Invalid data");
    }

    const [[ret]] = await conn.query(
      `SELECT * FROM customerBillingReturns WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!ret) throw new Error("Return not found");

    const billing_id = ret.billing_id;

    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id],
    );

    const [oldProducts] = await conn.query(
      `SELECT * FROM customerBillingReturnsProducts WHERE return_id=?`,
      [id],
    );

    let oldTotal = 0;

    /* REVERT OLD */
    for (const item of oldProducts) {
      oldTotal += Number(item.return_amount);

      // revert returned quantity
      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = GREATEST(returned_quantity - ?, 0)
         WHERE id=?`,
        [item.return_quantity, item.billing_product_id],
      );
      // ✅ revert stock (IMPORTANT FIX)
      await conn.query(`UPDATE products SET stock = stock - ? WHERE id=?`, [
        item.return_quantity,
        item.product_id,
      ]);
    }

    await conn.query(
      `DELETE FROM customerBillingReturnsProducts WHERE return_id=?`,
      [id],
    );

    let newTotal = 0;

    /* APPLY NEW */
    for (const item of products) {
      const qty = Number(item.return_quantity);

      const [[bp]] = await conn.query(
        `SELECT * FROM customerBillingProducts WHERE id=? FOR UPDATE`,
        [item.billing_product_id],
      );

      const allowed = bp.quantity - (bp.returned_quantity || 0);

      if (qty > allowed) {
        throw new Error(`Allowed only ${allowed} for ${bp.product_name}`);
      }

      const amount = Number((qty * (bp.final_rate || bp.rate)).toFixed(2));
      newTotal += amount;

      await conn.query(
        `INSERT INTO customerBillingReturnsProducts
        (return_id, billing_product_id, product_id, return_quantity, return_rate, return_amount)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.billing_product_id,
          bp.product_id,
          qty,
          bp.final_rate || bp.rate,
          amount,
        ],
      );

      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = returned_quantity + ?
         WHERE id=?`,
        [qty, item.billing_product_id],
      );

      await conn.query(`UPDATE products SET stock = stock + ? WHERE id=?`, [
        qty,
        bp.product_id,
      ]);
    }

    await conn.query(
      `UPDATE customerBillingReturns
       SET total_return_amount=?, remarks=?
       WHERE id=?`,
      [newTotal, remarks || null, id],
    );

    const newBalance = Number(
      (Number(bill.balance_due) + oldTotal - newTotal).toFixed(2),
    );

    /* RETURN STATUS */
    const [rows] = await conn.query(
      `SELECT quantity, returned_quantity FROM customerBillingProducts WHERE billing_id=?`,
      [billing_id],
    );

    let allReturned = true;
    let anyReturned = false;

    for (const r of rows) {
      if (r.returned_quantity > 0) anyReturned = true;
      if (r.returned_quantity < r.quantity) allReturned = false;
    }

    let returnStatus = !anyReturned ? "NONE" : allReturned ? "FULL" : "PARTIAL";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, return_status=?
       WHERE id=?`,
      [newBalance, returnStatus, billing_id],
    );

    await conn.commit();

    res.json({
      message: "Return updated successfully",
      total_return_amount: newTotal,
      balance_after: newBalance,
      return_status: returnStatus,
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

export const deleteCustomerReturn = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[ret]] = await conn.query(
      `SELECT * FROM customerBillingReturns WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!ret) throw new Error("Return not found");

    const billing_id = ret.billing_id;

    const [[bill]] = await conn.query(
      `SELECT * FROM customerBilling WHERE id=? FOR UPDATE`,
      [billing_id],
    );

    const [products] = await conn.query(
      `SELECT * FROM customerBillingReturnsProducts WHERE return_id=?`,
      [id],
    );

    let totalReturnAmount = 0;

    for (const item of products) {
      totalReturnAmount += Number(item.return_amount);

      await conn.query(
        `UPDATE customerBillingProducts
         SET returned_quantity = GREATEST(returned_quantity - ?, 0)
         WHERE id=?`,
        [item.return_quantity, item.billing_product_id],
      );

      await conn.query(`UPDATE products SET stock = stock - ? WHERE id=?`, [
        item.return_quantity,
        item.product_id,
      ]);
    }

    await conn.query(`DELETE FROM customerBillingReturns WHERE id=?`, [id]);

    const newBalance = Number(
      (Number(bill.balance_due) + totalReturnAmount).toFixed(2),
    );

    const [rows] = await conn.query(
      `SELECT quantity, returned_quantity FROM customerBillingProducts WHERE billing_id=?`,
      [billing_id],
    );

    let allReturned = true;
    let anyReturned = false;

    for (const r of rows) {
      if (r.returned_quantity > 0) anyReturned = true;
      if (r.returned_quantity < r.quantity) allReturned = false;
    }

    let returnStatus = !anyReturned ? "NONE" : allReturned ? "FULL" : "PARTIAL";

    await conn.query(
      `UPDATE customerBilling
       SET balance_due=?, return_status=?
       WHERE id=?`,
      [newBalance, returnStatus, billing_id],
    );

    await conn.commit();

    res.json({
      message: "Return deleted successfully",
      balance_after: newBalance,
      return_status: returnStatus,
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
