import db from "../../config/db.js";
import fs from "fs";
import path from "path";

/* 🟢 CREATE COMPANY BANK */
// export const createCompanyBank = async (req, res) => {
//   try {
//     /* 1️⃣ Extract fields from request body */
//     const {
//       bank_name,
//       account_name,
//       account_number,
//       ifsc_code,
//       branch,
//       status,
//     } = req.body;

//     /* 2️⃣ Required field validation */
//     if (!bank_name || !account_name || !account_number || !ifsc_code) {
//       return res.status(400).json({
//         message: "Required fields missing",
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({
//         message: "QR code image is required",
//       });
//     }

//     /* 3️⃣ CHECK: Account already exists or not */
//     const [existingAccount] = await db.query(
//       `SELECT id FROM company_bank_details 
//        WHERE bank_name = ? AND account_number = ?`,
//       [bank_name, account_number]
//     );

//     /* 4️⃣ If account exists → stop */
//     if (existingAccount.length > 0) {
//       return res.status(409).json({
//         message: "This bank account already exists",
//       });
//     }

//     /* 5️⃣ Handle QR image upload */
//     const qr_code_image = req.file
//       ? `/uploads/bank-qr/${req.file.filename}`
//       : null;

//     /* 6️⃣ Insert new bank record */
//     const [result] = await db.query(
//       `INSERT INTO company_bank_details
//        (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status)
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [
//         bank_name,
//         account_name,
//         account_number,
//         ifsc_code,
//         branch || null,
//         qr_code_image,
//         status || "active",
//       ]
//     );

//     /* 7️⃣ Fetch newly inserted record */
//     const [rows] = await db.query(
//       "SELECT * FROM company_bank_details WHERE id = ?",
//       [result.insertId]
//     );

//     /* 8️⃣ Success response */
//     res.status(201).json({
//       message: "Company bank created successfully",
//       data: rows[0],
//     });
//   } catch (err) {
//     console.error("Create bank error:", err);
//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// };


/* 📄 GET ALL */
export const getCompanyBanks = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* 🔍 GET BY ID */
export const getCompanyBankById = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM company_bank_details WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Bank not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ✏️ UPDATE COMPANY BANK */
// export const updateCompanyBank = async (req, res) => {
//   try {
//     const [existing] = await db.query(
//       "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
//       [req.params.id]
//     );

//     if (!existing.length) {
//       return res.status(404).json({ message: "Bank not found" });
//     }

//     const fields = {
//       bank_name: req.body.bank_name,
//       account_name: req.body.account_name,
//       account_number: req.body.account_number,
//       ifsc_code: req.body.ifsc_code,
//       branch: req.body.branch,
//       status: req.body.status,
//     };

//     /* If new QR uploaded */
//     if (req.file) {
//       fields.qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

//       // delete old image
//       if (existing[0].qr_code_image) {
//         const oldPath = path.join(process.cwd(), existing[0].qr_code_image);
//         if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//       }
//     }

//     await db.query("UPDATE company_bank_details SET ? WHERE id = ?", [
//       fields,
//       req.params.id,
//     ]);

//     res.json({ message: "Company bank updated successfully" });
//   } catch (err) {
//     console.error("Update bank error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };



// export const deleteCompanyBank = async (req, res) => {
// try {
// const [rows] = await db.query(
// "SELECT qr_code_image FROM company_bank_details WHERE id = ?",
// [req.params.id]
// );


// if (!rows.length) {
// return res.status(404).json({ message: "Bank not found" });
// }

// if (rows[0].qr_code_image) {
// const imgPath = path.resolve(
// process.cwd(),
// rows[0].qr_code_image.replace(/^\/+/, "")
// );


// try {
// await fs.unlink(imgPath);
// } catch (err) {
// console.warn("Image not found or already deleted:", err.message);
// }
// }


// await db.query("DELETE FROM company_bank_details WHERE id = ?", [
// req.params.id,
// ]);


// res.json({ message: "Company bank deleted successfully" });
// } catch (err) {
// console.error("Delete bank error:", err);
// res.status(500).json({ message: "Server error" });
// }
// };

/*----------------------------------------------------------------------*/


/* ================= CREATE ================= */
// export const createCompanyBank = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     let {
//       bank_name,
//       account_name,
//       account_number,
//       ifsc_code,
//       branch,
//       status = "active",
//     } = req.body;

//     /* ========= VALIDATION ========= */

//     if (!bank_name || !account_name || !account_number || !ifsc_code) {
//       throw new Error("All required fields must be provided");
//     }

//     if (!req.file) {
//       throw new Error("QR code image required");
//     }

//     if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
//       throw new Error("Invalid IFSC code");
//     }

//     if (!["active", "inactive"].includes(status)) {
//       throw new Error("Invalid status");
//     }

//     /* ========= DUPLICATE ========= */

//     const [exists] = await conn.query(
//       `SELECT id FROM company_bank_details 
//        WHERE account_number=? AND ifsc_code=?`,
//       [account_number, ifsc_code]
//     );

//     if (exists.length) throw new Error("Bank already exists");

//     const qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

//     /* ========= PRIMARY LOGIC ========= */

//     const [[row]] = await conn.query(
//       `SELECT COUNT(*) as count 
//        FROM company_bank_details 
//        WHERE is_primary=1 FOR UPDATE`
//     );

//     const is_primary = row.count === 0 ? 1 : 0;

//     /* ========= INSERT ========= */

//     const [result] = await conn.query(
//       `INSERT INTO company_bank_details
//        (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status, is_primary)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         bank_name,
//         account_name,
//         account_number,
//         ifsc_code,
//         branch || null,
//         qr_code_image,
//         status,
//         is_primary,
//       ]
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "Bank created successfully",
//       id: result.insertId,
//       is_primary: !!is_primary,
//     });

//   } catch (err) {
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const createCompanyBank = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    let {
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      branch,
      status = "active",
      is_primary,
    } = req.body;

    /* ========= VALIDATION ========= */

    if (!bank_name || !account_name || !account_number || !ifsc_code) {
      throw new Error("All required fields must be provided");
    }

    if (!req.file) {
      throw new Error("QR code image required");
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
      throw new Error("Invalid IFSC code");
    }

    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status");
    }

    /* normalize */
    is_primary = is_primary === true || is_primary === "true";

    /* ❗ optional rule */
    if (status === "inactive" && is_primary) {
      throw new Error("Inactive bank cannot be primary");
    }

    /* ========= DUPLICATE ========= */

    const [exists] = await conn.query(
      `SELECT id FROM company_bank_details 
       WHERE account_number=? AND ifsc_code=?`,
      [account_number, ifsc_code]
    );

    if (exists.length) throw new Error("Bank already exists");

    const qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

    /* ========= PRIMARY LOGIC ========= */

    const [[row]] = await conn.query(
      `SELECT COUNT(*) as count 
       FROM company_bank_details 
       WHERE is_primary=1 FOR UPDATE`
    );

    let final_is_primary = 0;

    // 👉 If user sets primary
    if (is_primary) {
      await conn.query(`UPDATE company_bank_details SET is_primary=0`);
      final_is_primary = 1;
    }
    // 👉 If no primary exists
    else if (row.count === 0) {
      final_is_primary = 1;
    }

    /* ========= INSERT ========= */

    const [result] = await conn.query(
      `INSERT INTO company_bank_details
       (bank_name, account_name, account_number, ifsc_code, branch, qr_code_image, status, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bank_name,
        account_name,
        account_number,
        ifsc_code,
        branch || null,
        qr_code_image,
        status,
        final_is_primary,
      ]
    );

    await conn.commit();

    res.status(201).json({
      message: "Bank created successfully",
      id: result.insertId,
      is_primary: !!final_is_primary,
    });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* ================= UPDATE ================= */
export const updateCompanyBank = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[oldData]] = await conn.query(
      `SELECT * FROM company_bank_details WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!oldData) throw new Error("Bank not found");

    let {
      bank_name,
      account_name,
      account_number,
      ifsc_code,
      branch,
      status,
      is_primary,
    } = req.body;

    /* normalize */
    if (is_primary !== undefined) {
      is_primary = is_primary === true || is_primary === "true";
    }

    /* ========= DUPLICATE ========= */

    if (account_number || ifsc_code) {
      const [exists] = await conn.query(
        `SELECT id FROM company_bank_details 
         WHERE account_number=? AND ifsc_code=? AND id!=?`,
        [
          account_number || oldData.account_number,
          ifsc_code || oldData.ifsc_code,
          id,
        ]
      );

      if (exists.length) throw new Error("Duplicate bank account");
    }

    /* ========= PRIMARY LOGIC ========= */

    if (is_primary === true && !oldData.is_primary) {
      await conn.query(`UPDATE company_bank_details SET is_primary=0`);
    }

    if (is_primary === false && oldData.is_primary) {
      const [[count]] = await conn.query(
        `SELECT COUNT(*) as count FROM company_bank_details WHERE is_primary=1`
      );

      if (count.count === 1) {
        throw new Error("At least one primary account required");
      }
    }

    /* ========= IMAGE ========= */

    let qr_code_image = oldData.qr_code_image;

    if (req.file) {
      qr_code_image = `/uploads/bank-qr/${req.file.filename}`;

      if (oldData.qr_code_image) {
        const oldPath = path.join(process.cwd(), oldData.qr_code_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    /* ========= UPDATE ========= */

    await conn.query(
      `UPDATE company_bank_details
       SET bank_name=?,
           account_name=?,
           account_number=?,
           ifsc_code=?,
           branch=?,
           status=?,
           is_primary=?,
           qr_code_image=?
       WHERE id=?`,
      [
        bank_name ?? oldData.bank_name,
        account_name ?? oldData.account_name,
        account_number ?? oldData.account_number,
        ifsc_code ?? oldData.ifsc_code,
        branch ?? oldData.branch,
        status ?? oldData.status,
        is_primary !== undefined
          ? is_primary ? 1 : 0
          : oldData.is_primary,
        qr_code_image,
        id,
      ]
    );

    await conn.commit();

    res.json({ message: "Bank updated successfully" });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* ================= DELETE ================= */
export const deleteCompanyBank = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[bank]] = await conn.query(
      `SELECT * FROM company_bank_details WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!bank) throw new Error("Bank not found");

    if (bank.is_primary) {
      throw new Error("Cannot delete primary account");
    }

    const [[count]] = await conn.query(
      `SELECT COUNT(*) as count FROM company_bank_details`
    );

    if (count.count === 1) {
      throw new Error("Cannot delete last bank account");
    }

    /* delete image */
    if (bank.qr_code_image) {
      const imgPath = path.resolve(
        process.cwd(),
        bank.qr_code_image.replace(/^\/+/, "")
      );

      if (fs.existsSync(imgPath)) {
        await fs.promises.unlink(imgPath);
      }
    }

    await conn.query(`DELETE FROM company_bank_details WHERE id=?`, [id]);

    await conn.commit();

    res.json({ message: "Bank deleted successfully" });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* ================= SET PRIMARY ================= */
export const setPrimaryBank = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[bank]] = await conn.query(
      `SELECT * FROM company_bank_details WHERE id=? FOR UPDATE`,
      [id]
    );

    if (!bank) throw new Error("Bank not found");

    if (bank.status !== "active") {
      throw new Error("Only active bank can be primary");
    }

    if (bank.is_primary) {
      return res.json({ message: "Already primary" });
    }

    await conn.query(`UPDATE company_bank_details SET is_primary=0`);

    await conn.query(
      `UPDATE company_bank_details SET is_primary=1 WHERE id=?`,
      [id]
    );

    await conn.commit();

    res.json({ message: "Primary bank updated successfully" });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
