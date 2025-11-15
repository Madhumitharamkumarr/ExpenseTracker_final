// routes/loan.js
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

// POST /api/loans
router.post(
  "/",
  auth,
  [
    body("type").isIn(["lending", "borrowing"]).withMessage("Type must be 'lending' or 'borrowing'"),
    body("amount").isFloat({ min: 1 }).withMessage("Amount must be greater than 0"),
    body("startDate").isISO8601().withMessage("Invalid start date"),
    body("dueDate").isISO8601().withMessage("Invalid due date"),
    body("interestRate").optional().isFloat({ min: 0 }).withMessage("Interest rate must be >= 0"),
    validate,
  ],
  addLoan
);

// GET /api/loans
router.get("/", auth, getLoans);

// GET /api/loans/stats
router.get("/stats", auth, getLoanStats);

// GET /api/loans/:id
router.get("/:id", auth, getLoanById);

// PATCH /api/loans/:id/status
router.patch(
  "/:id/status",
  auth,
  [
    body("status").isIn(["pending", "paid"]).withMessage("Status must be 'pending' or 'paid'"),
    validate,
  ],
  updateLoanStatus
);

// DELETE /api/loans/:id
router.delete("/:id", auth, deleteLoan);

module.exports = router;