import express from "express";
import {
  createGST,
  getAllGST,
  updateGST,
  deleteGST,
  setDefaultGST
} from "../../controllers/billing/companygstNumber.controller.js";

const router = express.Router();

router.post("/", createGST);
router.get("/", getAllGST);

router.put("/:id", updateGST);
router.delete("/:id", deleteGST);

router.patch("/set-default/:id", setDefaultGST);

export default router;