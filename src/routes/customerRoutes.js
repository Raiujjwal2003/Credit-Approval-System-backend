
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/user.controller');


router.post('/register-user', customerController.registerUser);
router.get('/users-list', customerController.getAllCustomers);
router.post('/check-eligibility', customerController.checkEligibility);
router.post('/create-loan', customerController.createLoan);
router.get('/view-loan/loan_id', customerController.viewLoanDetails);
router.get('/make-payment/customer_id/loan_id', customerController.makePayment);
router.get('/view-statement/customer_id/loan_id', customerController.viewLoanStatement);

module.exports = router;
