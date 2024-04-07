const Joi = require('joi');
const { ApiResponse } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler.js');
const User = require('../moduls/User.model.js'); 
const pool = require('../config/database');


const userSchema = Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    age: Joi.number().required(),
    phone_number: Joi.string().pattern(/^[0-9]{10}$/).required(), 
    monthly_salary: Joi.number().positive().required(),
});

// Controller to register a new customer
const registerUser = asyncHandler(async (req, res) => {
   
    const validationResult = userSchema.validate(req.body);
    if (validationResult.error) {
        throw new Error(validationResult.error.message);
    }

    try {
       
        const { first_name, last_name, phone_number, age, monthly_salary } = req.body;

        
        const approved_limit = Math.round(36 * monthly_salary / 100000) * 100000;

        const newUser = new User({
            first_name,
            last_name,
            phone_number,
            age,
            monthly_salary,
            approved_limit,
        });

       
        const savedUser = await newUser.save();

        return res.status(201).json(new ApiResponse(200, savedUser, "User registered successfully"));
    } catch (error) {
        // Handle errors
        console.error('Error registering user:', error);
        return res.status(500).json(new ApiResponse(500, null, "Error registering user"));
    }
});

const getAllCustomers = asyncHandler(async (req, res) => {
    try {
       
        const query = 'SELECT * FROM customer_data';
        const [rows] = await pool.query(query);

        return res.status(200).json(new ApiResponse(200, rows, "Customers fetched successfully"));
    } catch (error) {
       
        console.error('Error fetching customers:', error);
        return res.status(500).json(new ApiResponse(500, null, "Error fetching customers"));
    }
});

module.exports = {
    registerUser,
    getAllCustomers

};
