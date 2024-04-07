// models/Loan.js
const pool = require('../config/database');

class Loan {
    constructor({ loan_id, customer_id, loan_amount, tenure, interest_rate, monthly_repayment, emis_paid_on_time, start_date, end_date }) {
        this.loan_id = loan_id;
        this.customer_id = customer_id;
        this.loan_amount = loan_amount;
        this.tenure = tenure;
        this.interest_rate = interest_rate;
        this.monthly_repayment = monthly_repayment;
        this.emis_paid_on_time = emis_paid_on_time;
        this.start_date = start_date;
        this.end_date = end_date;
    }

    static async findByCustomerId(customerId) {
        try {
            // Fetch historical loan data for the given customer ID from the database
            const query = 'SELECT * FROM loan_data WHERE customer_id = ?';
            const [rows] = await pool.query(query, [customerId]);
            return rows.map(row => new Loan(row));
        } catch (error) {
            throw error;
        }
    }

    static async findById(loanId) {
        try {
            const query = 'SELECT * FROM loan_data WHERE loan_id = ?';
            const [rows] = await pool.query(query, [loanId]);

            if (rows.length === 0) {
                return null; // Loan not found
            }

            // Extract loan details from the query result
            const loanData = rows[0];
            const { customer_id, loan_amount, interest_rate, monthly_repayment, tenure } = loanData;

            // Create and return a Loan object
            return new Loan(loanId, customer_id, loan_amount, interest_rate, monthly_repayment, tenure);
        } catch (error) {
            throw error;
        }
    }




    async makePayment(paymentAmount) {
        try {
            // Perform calculations to determine the new loan details after payment
            // For simplicity, let's assume a fixed monthly installment and calculate the remaining balance
            const monthlyInstallment = this.calculateMonthlyInstallment();
            const remainingBalance = this.loanAmount - paymentAmount;

            // Update the loan amount and return the updated loan details
            this.loanAmount = remainingBalance;
            
            // Save the updated loan details to the database (if needed)
            await this.save();

            // Return the updated loan object
            return this;
        } catch (error) {
            throw error;
        }
    }

    calculateMonthlyInstallment() {
        // Convert annual interest rate to monthly interest rate
        const monthlyInterestRate = this.interestRate / (12 * 100);
        
        // Calculate the number of monthly payments (tenure in months)
        const numberOfPayments = this.tenure;
        
        // Calculate the EMI using the formula
        const emi = (this.loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
        
        // Return the calculated monthly installment
        return emi;
    }
    
    async save() {
        try {
            const query = `
                UPDATE loan_table
                SET 
                    loan_amount = ?,
                    interest_rate = ?,
                    tenure = ?,
                    monthly_installment = ?
                WHERE
                    loan_id = ?`;
            
            const values = [
                this.loanAmount,
                this.interestRate,
                this.tenure,
                this.monthlyInstallment,
                this.loanId
            ];
            
            // Execute the SQL query
            await pool.query(query, values);
            
            // Return the updated loan object
            return this;
        } catch (error) {
            throw error;
        }
    }
    



    static async create(customerId, loanAmount, interestRate, tenure) {
        try {
            const query = 'INSERT INTO loans (customer_id, loan_amount, interest_rate, tenure) VALUES (?, ?, ?, ?)';
            const values = [customerId, loanAmount, interestRate, tenure];
            const result = await pool.query(query, values);
            const newLoanId = result.insertId;
            return new Loan(newLoanId, customerId, loanAmount, interestRate, tenure);
        } catch (error) {
            throw error;
        }
    }



    static async findById(customerId, loanId) {
        try {
            const query = 'SELECT * FROM loans WHERE customer_id = ? AND loan_id = ?';
            const [rows, fields] = await pool.query(query, [customerId, loanId]);
            if (rows.length === 0) {
                return null; // Loan not found
            }

            // Extract loan details from the first row
            const loanData = rows[0];
            const loan = new Loan(
                loanData.loan_id,
                loanData.customer_id,
                loanData.principal,
                loanData.interest_rate,
                loanData.amount_paid,
                loanData.monthly_installment,
                loanData.repayments_left
            );
            return loan;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Loan;
