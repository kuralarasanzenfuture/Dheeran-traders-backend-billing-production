import express from "express";
import {
  createCustomerReturn,
  deleteCustomerReturn,
  updateCustomerReturn,
} from "../../controllers/billing/return/return.controller.js";
import {
  getAllReturns,
  getReturnById,
  getReturnsByBillingId,
  getReturnSummary,
  getReturnWithInvoice,
} from "../../controllers/billing/return/getReturn.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(protect);

/* CREATE */
router.post("/", createCustomerReturn);

/* GET */
router.get("/", getAllReturns);
router.get("/billing/:billing_id", getReturnsByBillingId);
router.get("/summary/:billing_id", getReturnSummary);
router.get("/invoice/:id", getReturnWithInvoice);
router.get("/:id", getReturnById);

/* UPDATE */
router.put("/:id", updateCustomerReturn);

/* DELETE */
router.delete("/:id", deleteCustomerReturn);

export default router;
