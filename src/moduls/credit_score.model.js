const pool = require('../config/database');

class CreditScore {
    constructor(customerId, creditScore) {
        this.customerId = customerId;
        this.creditScore = creditScore;
    }

    async save() {
        try {
            const query = `
                INSERT INTO credit_score 
                (customer_id, credit_score) 
                VALUES (?, ?)`;
            const values = [this.customerId, this.creditScore];
            await pool.query(query, values);
            return this;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = CreditScore;
