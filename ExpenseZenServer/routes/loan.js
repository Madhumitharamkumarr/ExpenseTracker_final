// src/routes/loan.js
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const {
  addLoan,
  getLoans,
  getLoanById,
  updateLoanStatus,
  deleteLoan,
  getLoanStats,
} = require("../controllers/loanController");
const auth = require("../middleware/auth");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

router.post(
  "/",
  auth,
  [
    body("type").isIn(["lending", "borrowing"]),
    body("amount").isFloat({ min: 1 }),
    body("startDate").isISO8601(),
    body("dueDate").isISO8601(),
    body("interestRate").optional().isFloat({ min: 0 }),
    validate,
  ],
  addLoan
);

router.get("/", auth, getLoans);
router.get("/stats", auth, getLoanStats);
router.get("/:id", auth, getLoanById);
router.patch(
  "/:id/status",
  auth,
  [body("status").isIn(["pending", "paid"]), validate],
  updateLoanStatus
);
router.delete("/:id", auth, deleteLoan);

module.exports = router;