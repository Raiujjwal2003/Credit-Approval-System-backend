// models/User.js
const pool = require('../config/database');

class User {
    constructor({ first_name, last_name, phone_number, age, monthly_salary, approved_limit }) {
        this.first_name = first_name;
        this.last_name = last_name;
        this.phone_number = phone_number;
        this.age = age;
        this.monthly_salary = monthly_salary;
        this.approved_limit = approved_limit; // Corrected assignment
    }

    async save() {
        try {
           
            const query = 'INSERT INTO customer_data (first_name, last_name, phone_number, age, monthly_salary, approved_limit) VALUES (?, ?, ?, ?, ?, ?)';
            const values = [this.first_name, this.last_name, this.phone_number, this.age, this.monthly_salary, this.approved_limit];
            await pool.query(query, values);

            return this;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;
