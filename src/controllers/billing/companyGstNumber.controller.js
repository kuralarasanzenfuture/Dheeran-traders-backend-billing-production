import db from "../../config/db.js";

const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

/* ================= CREATE GST ================= */
// export const createGST = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     await conn.beginTransaction();

//     let { gst_number  } = req.body;

//     if (!gst_number) throw new Error("GST number required");

//     gst_number = gst_number.toUpperCase().trim();

//     if (!GST_REGEX.test(gst_number)) {
//       throw new Error("Invalid GST format");
//     }

//     /* 🔍 Duplicate check */
//     const [exists] = await conn.query(
//       `SELECT id FROM company_gst_number WHERE gst_number=?`,
//       [gst_number],
//     );

//     if (exists.length) throw new Error("GST already exists");

//     /* 🔒 Lock for default logic */
//     const [[row]] = await conn.query(
//       `SELECT COUNT(*) as count
//        FROM company_gst_number
//        WHERE is_default=1 FOR UPDATE`,
//     );

//     let is_default = row.count === 0 ? 1 : 0;

//     const [result] = await conn.query(
//       `INSERT INTO company_gst_number
//        (gst_number, is_default)
//        VALUES (?, ?)`,
//       [gst_number, is_default],
//     );

//     await conn.commit();

//     res.status(201).json({
//       message: "GST created successfully",
//       id: result.insertId,
//       is_default: !!is_default,
//     });
//   } catch (err) {
//     await conn.rollback();
//     res.status(400).json({ message: err.message });
//   } finally {
//     conn.release();
//   }
// };

export const createGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    let { gst_number, is_default, is_active } = req.body;

    is_active = Number(is_active);

    if (!gst_number) throw new Error("GST number required");

    if (is_active === false) {
      if (is_default === true) {
        throw new Error("Cannot set default to false");
      }
    }

    gst_number = gst_number.toUpperCase().trim();

    if (!GST_REGEX.test(gst_number)) {
      throw new Error("Invalid GST format");
    }

    /* normalize */
    is_default = is_default === true || is_default === "true";
    is_active =
      is_active === undefined
        ? true
        : is_active === true || is_active === "true";

    /* 🔍 Duplicate check */
    const [exists] = await conn.query(
      `SELECT id FROM company_gst_number WHERE gst_number=?`,
      [gst_number],
    );

    if (exists.length) throw new Error("GST already exists");

    /* 🔒 Lock table for default logic */
    const [[row]] = await conn.query(
      `SELECT COUNT(*) as count 
       FROM company_gst_number 
       WHERE is_default=1 FOR UPDATE`,
    );

    /* ================= DEFAULT LOGIC ================= */

    let final_is_default = 0;

    // 👉 If user explicitly sets default
    if (is_default) {
      // remove existing default
      await conn.query(`UPDATE company_gst_number SET is_default=0`);
      final_is_default = 1;
    }
    // 👉 If no default exists → auto assign
    else if (row.count === 0) {
      final_is_default = 1;
    }

    /* ================= INSERT ================= */

    const [result] = await conn.query(
      `INSERT INTO company_gst_number 
       (gst_number, is_default, is_active) 
       VALUES (?, ?, ?)`,
      [gst_number, final_is_default, is_active ? 1 : 0],
    );

    await conn.commit();

    res.status(201).json({
      message: "GST created successfully",
      id: result.insertId,
      is_default: !!final_is_default,
      is_active,
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* ================= UPDATE GST ================= */
export const updateGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;
    let { gst_number, is_default, is_active } = req.body;

    if (!id) throw new Error("ID required");

    const [[gst]] = await conn.query(
      `SELECT * FROM company_gst_number WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!gst) throw new Error("GST not found");

    if (is_active === false) {
      if (is_default === true) {
        throw new Error("Cannot set default to false");
      }
    }

    /* Normalize values */
    is_default = is_default === true || is_default === "true";

    /* GST validation */
    if (gst_number) {
      gst_number = gst_number.toUpperCase().trim();

      if (!GST_REGEX.test(gst_number)) {
        throw new Error("Invalid GST format");
      }

      const [exists] = await conn.query(
        `SELECT id FROM company_gst_number 
         WHERE gst_number=? AND id!=?`,
        [gst_number, id],
      );

      if (exists.length) throw new Error("GST already exists");
    }

    /* 🔒 Handle default safely */
    if (is_default && !gst.is_default) {
      await conn.query(`UPDATE company_gst_number SET is_default=0`);
    }

    await conn.query(
      `UPDATE company_gst_number
       SET gst_number=?, 
           is_default=?, 
           is_active=?
       WHERE id=?`,
      [
        gst_number ?? gst.gst_number,
        is_default ? 1 : gst.is_default,
        is_active ?? gst.is_active,
        id,
      ],
    );

    await conn.commit();

    res.json({ message: "GST updated successfully" });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* ================= DELETE GST ================= */
export const deleteGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[gst]] = await conn.query(
      `SELECT * FROM company_gst_number WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!gst) throw new Error("GST not found");

    /* Delete */
    await conn.query(`DELETE FROM company_gst_number WHERE id=?`, [id]);

    /* 🔁 Reassign default if needed */
    if (gst.is_default) {
      const [[nextGST]] = await conn.query(
        `SELECT id FROM company_gst_number 
         ORDER BY id ASC 
         LIMIT 1 FOR UPDATE`,
      );

      if (nextGST) {
        await conn.query(
          `UPDATE company_gst_number SET is_default=1 WHERE id=?`,
          [nextGST.id],
        );
      }
    }

    await conn.commit();

    res.json({
      message: "GST deleted successfully",
      reassigned_default: !!gst.is_default,
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* ================= SET DEFAULT GST ================= */
export const setDefaultGST = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[gst]] = await conn.query(
      `SELECT * FROM company_gst_number WHERE id=? FOR UPDATE`,
      [id],
    );

    if (!gst) throw new Error("GST not found");

    if (gst.is_default) {
      return res.json({ message: "Already default" });
    }

    if (!gst.is_active) {
      throw new Error("Cannot set inactive GST as default");
    }

    /* Reset all */
    await conn.query(`UPDATE company_gst_number SET is_default=0`);

    /* Set selected */
    await conn.query(`UPDATE company_gst_number SET is_default=1 WHERE id=?`, [
      id,
    ]);

    await conn.commit();

    res.json({ message: "Default GST updated successfully" });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* ================= GET ALL GST ================= */
export const getAllGST = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM company_gst_number ORDER BY is_default DESC, id ASC`,
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET SINGLE GST ================= */
export const getGSTById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[gst]] = await db.query(
      `SELECT * FROM company_gst_number WHERE id=?`,
      [id],
    );

    if (!gst) throw new Error("GST not found");

    res.json(gst);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};
