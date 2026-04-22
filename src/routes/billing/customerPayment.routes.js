import express from "express";
import {
  addCustomerPayment,
  getPaymentsByBillingId,
  getInvoiceWithPayments,
  getAllPayments,
  deleteCustomerPayment,
  updateCustomerPayment,
} from "../../controllers/billing/customerPayment.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/",protect, addCustomerPayment);

router.put("/:id", updateCustomerPayment);

router.get("/", getAllPayments);
/* Get invoice + paid + balance */
router.get("/invoice/:billing_id", getInvoiceWithPayments);

/* Get payment history */
router.get("/:billing_id", getPaymentsByBillingId);

router.delete("/:id", deleteCustomerPayment);

export default router;