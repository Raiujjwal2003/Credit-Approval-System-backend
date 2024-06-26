const Joi = require('joi');
const { ApiResponse } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler.js');
const User = require('../moduls/User.model.js'); 
const Loan = require('../moduls/loandata.model.js'); 
const CreditScore = require('../moduls/credit_score.model.js'); 
const pool = require('../config/database');
const { log } = require('console');


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




const eligibilitySchema = Joi.object({
    customer_id: Joi.number().required(),
    loan_amount: Joi.number().required(),
    interest_rate: Joi.number().required(),
    tenure: Joi.number().required(),
});



// Controller to check loan eligibility
// Controller to check loan eligibility
const checkEligibility = asyncHandler(async (req, res) => {
    try {
      // Validate request body against the eligibility schema
      const { error, value } = eligibilitySchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      // Destructure validated values
      const { customer_id, loan_amount, interest_rate, tenure } = value;

      console.log(customer_id);
  
      // Retrieve historical loans for the customer
      const historicalLoans = await Loan.findByCustomerId(customer_id);

      console.log(historicalLoans);
  
       const customer_data = await User.findById(customer_id)
       console.log(customer_data.approved_limit);
      // Calculate credit score based on historical loans
      const creditScore = calculateCreditScore(historicalLoans , customer_data.approved_limit);
    //   console.log();
      console.log(creditScore);
  
      // Create an instance of CreditScore with the customer ID and credit score
    const newCreditScore = new CreditScore(customer_id, creditScore);

// Save the calculated credit score
    await newCreditScore.save();
  
      // Determine loan eligibility and corrected interest rate
      const { approval, correctedInterestRate } = determineLoanEligibility(
        creditScore,
        interest_rate,
        loan_amount,
        customer_data.monthly_salary,
        Loan.emis_paid_on_time
      );

      console.log(approval , correctedInterestRate);
  
      // Calculate monthly installment if the loan is approved
      const monthly_installment = approval
        ? calculateMonthlyInstallment(loan_amount, correctedInterestRate, tenure)
        : null;
  
      // Respond with eligibility results
      return res.status(200).json({
        customer_id,
        approval,
        interest_rate: correctedInterestRate ,
        tenure,
        monthly_installment
      });
    } catch (error) {
      // Log and respond with error
      console.error('Error checking loan eligibility:', error);
      return res.status(500).json({ error: 'Error checking loan eligibility' });
    }
  });


// // // Function to calculate credit score based on historical loan data
// function calculateCreditScore(historicalLoans) {
   
//     let loansPaidOnTime = 0;
//     let totalLoansTaken = 0;
//     let loansCurrentYear = 0;
//     let totalLoanVolume = 0;

//     // Calculate components based on historical loan data
//     historicalLoans.forEach(loan => {
//         // Check if the loan was paid on time
//         if (loan.emis_paid_on_time) {
//             loansPaidOnTime++;
//         }
        
//         // Increment total loans taken
//         totalLoansTaken++;

//         // Check loan activity in the current year
//         const currentYear = new Date().getFullYear();
//         const loanYear = new Date(loan.start_date).getFullYear();
//         if (loanYear === currentYear) {
//             loansCurrentYear++;
//         }

//         // Add loan amount to total loan volume
//         totalLoanVolume += loan.loan_amount;
//     });


    
//     // Calculate credit score based on components
//     let creditScore = 0;
//     if (totalLoanVolume > historicalLoans[0].approved_limit) {
//         creditScore = 0;
//     } else {
//         // Calculate credit score based on the weighted average of components
//         // Adjust weights based on the importance of each component
//         const weightPaidOnTime = 0.3;
//         const weightLoansTaken = 0.2;
//         const weightCurrentYear = 0.2;
//         const weightLoanVolume = 0.3;

//         const weightedScorePaidOnTime = loansPaidOnTime / totalLoansTaken * 100 * weightPaidOnTime;
//         const weightedScoreLoansTaken = totalLoansTaken / 10 * weightLoansTaken;
//         const weightedScoreCurrentYear = loansCurrentYear / 2 * weightCurrentYear;
//         const weightedScoreLoanVolume = (totalLoanVolume / historicalLoans[0].approved_limit) * 100 * weightLoanVolume;

//         creditScore = Math.round(weightedScorePaidOnTime + weightedScoreLoansTaken + weightedScoreCurrentYear + weightedScoreLoanVolume);
//     }

//     return creditScore;
// }

// Function to calculate credit score based on historical loan data
function calculateCreditScore(historicalLoans , approved_limit) {
    // Check if historicalLoans is an array and not empty
    if (!Array.isArray(historicalLoans) || historicalLoans.length === 0) {
        throw new Error('historicalLoans must be a non-empty array');
    }

    let loansPaidOnTime = 0;
    let totalLoansTaken = historicalLoans.length;
    let loansCurrentYear = 0;
    let totalLoanVolume = 0;
    const currentYear = new Date().getFullYear();
    console.log(currentYear);
    let approvedLimitExceeded = false;

    // Process each loan
    historicalLoans.forEach(loan => {
        if (loan.emis_paid_on_time === loan.tenure) {
            loansPaidOnTime++;
        }
        if (new Date(loan.start_date).getFullYear() === currentYear) {
            loansCurrentYear++;
        }
        totalLoanVolume += loan.loan_amount;

        // Check if any loan exceeds the approved limit
        if (loan.loan_amount > approved_limit) {
            approvedLimitExceeded = true;
        }
    });

    console.log(approvedLimitExceeded);
    // If any loan exceeds the approved limit, credit score is 0
    if (approvedLimitExceeded) {
        return 0;
    }

    // Calculate credit score components
    let creditScore = 100; // Start with a max score of 100

    // Deduct points for loans not paid on time
    creditScore -= (totalLoansTaken - loansPaidOnTime) * 10;

    // Deduct points based on the number of loans taken
    creditScore -= totalLoansTaken * 5;

    // Deduct points for loan activity in the current year
    creditScore -= loansCurrentYear * 20;

    // Adjust score based on loan volume
    // Assuming the approved limit is a sum of all individual loan approved limits
    let sumApprovedLimits = historicalLoans.reduce((sum, loan) => sum + approved_limit, 0);
    creditScore -= (totalLoanVolume / sumApprovedLimits) * 50;

    console.log(sumApprovedLimits);
    // Ensure credit score is within the range of 0 to 100
    creditScore = Math.max(0, Math.min(creditScore, 100));

    return creditScore;
}




// function determineLoanEligibility(creditScore, interestRate, loanAmount, monthlySalary, currentEMIs) {


//     let approval = false;
//     let corrected_interest_rate = null;

//     // Check if sum of all current EMIs > 50% of monthly salary
//     const totalEMIs = currentEMIs.reduce((acc, curr) => acc + curr, 0);
//     const maxEMIs = monthlySalary * 0.5;
//     if (totalEMIs > maxEMIs) {
//         return { approval, corrected_interest_rate };
//     }

//     // Apply loan approval criteria based on credit score
//     if (creditScore > 50) {
//         approval = true;
//     } else if (creditScore > 30) {
//         if (interestRate <= 12) {
//             approval = true;
//         } else {
//             corrected_interest_rate = 12;
//         }
//     } else if (creditScore > 10) {
//         if (interestRate <= 16) {
//             approval = true;
//         } else {
//             corrected_interest_rate = 16;
//         }
//     }

//     return { approval, corrected_interest_rate };
// }

// Function to calculate monthly installment for the loan

function determineLoanEligibility(creditScore, interestRate, loanAmount, monthlySalary, emisPaidOnTime) {
    let approval = false;
    let correctedInterestRate = parseFloat(interestRate);
  
    // Logic to determine loan eligibility and corrected interest rate
    if (creditScore > 50) {
      approval = true;
    } else if (creditScore > 30 && creditScore <= 50) {
      correctedInterestRate = Math.max(correctedInterestRate, 12);
      approval = true;
    } else if (creditScore > 10 && creditScore <= 30) {
      correctedInterestRate = Math.max(correctedInterestRate, 16);
      approval = true;
    } else {
      approval = false; // Not eligible for a loan
    }
  
    // Additional check for monthly repayment capacity
    if (monthlySalary / 2 < loanAmount / emisPaidOnTime) {
      approval = false; // Monthly repayment exceeds 50% of monthly salary
    }
  
    return { approval, correctedInterestRate };
  }
  

function calculateMonthlyInstallment(loanAmount, interestRate, tenure) {
    // Convert interest rate from percentage to decimal
    const monthlyInterestRate = interestRate / 12 / 100;

    // Calculate the total number of payments (tenure in months)
    const totalPayments = tenure;

    // Calculate the monthly installment using the formula for EMI
    const monthlyInstallment = loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalPayments) / (Math.pow(1 + monthlyInterestRate, totalPayments) - 1);

    return parseFloat(monthlyInstallment.toFixed(2));
}



const loanSchema = Joi.object({
    customer_id: Joi.number().required(),
    loan_amount: Joi.number().required(),
    interest_rate: Joi.number().required(),
    tenure: Joi.number().required(),
});

// Controller to process a new loan
const createLoan = asyncHandler(async (req, res) => {
    try {
        // Validate the request body against the loan schema
        const { error, value } = loanSchema.validate(req.body);
        if (error) {
            throw new Error(error.details[0].message);
        }

        // Destructure the validated request body
        const { customer_id, loan_amount, interest_rate, tenure } = value;

        // Fetch customer data from the database based on the customer_id
        const customer = await User.findById(customer_id);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Check loan eligibility based on customer's credit score and other criteria
        const eligibility = await checkLoanEligibility(customer, loan_amount, interest_rate, tenure);

        // If loan is not approved, return appropriate message
        if (!eligibility.approval) {
            return res.status(200).json(new ApiResponse(200, {
                loan_id: null,
                customer_id,
                loan_approved: false,
                message: eligibility.message,
                monthly_installment: null
            }));
        }


        const newLoan = await Loan.create(customer_id, loan_amount, interest_rate, tenure);

        // Return the response with loan details
        return res.status(201).json(new ApiResponse(201, {
            loan_id: newLoan.loan_id,
            customer_id,
            loan_approved: true,
            message: 'Loan approved',
            monthly_installment: newLoan.monthly_installment
        }));
    } catch (error) {
        console.error('Error processing loan:', error);
        return res.status(500).json(new ApiResponse(500, null, 'Error processing loan'));
    }
});

const viewLoanDetails = asyncHandler(async (req, res) => {
    const loanId = req.params.loan_id;

    // Fetch loan details based on loanId
    const loan = await Loan.findById(loanId);

    if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
    }

    // Fetch customer details based on customerId associated with the loan
    const customer = await Customer.findById(loan.customerId);

    // Construct the response body
    const responseBody = {
        loan_id: loan.loanId,
        customer: {
            id: customer.customerId,
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone_number: customer.phoneNumber,
            age: customer.age
        },
        loan_amount: loan.loanAmount,
        interest_rate: loan.interestRate,
        monthly_installment: loan.monthlyInstallment,
        tenure: loan.tenure
    };

    return res.status(200).json(responseBody);
});





const makePayment = asyncHandler(async (req, res) => {
    try {
        // Extract customer_id and loan_id from the request parameters
        const { customer_id, loan_id } = req.params;

        // Fetch the loan details from the database
        const loan = await Loan.findById(loan_id);

        // Check if the loan exists
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        // Validate if the loan belongs to the specified customer
        if (loan.customerId !== parseInt(customer_id)) {
            return res.status(403).json({ error: 'Loan does not belong to the specified customer' });
        }

        // Extract the payment amount from the request body
        const { payment_amount } = req.body;

        // Make the payment towards the EMI
        const updatedLoan = await loan.makePayment(payment_amount);

        // Return success response with the updated loan details
        return res.status(200).json(updatedLoan);
    } catch (error) {
        console.error('Error making payment:', error);
        return res.status(500).json({ error: 'Error making payment' });
    }
});




const viewLoanStatement = asyncHandler(async (req, res) => {
    try {
        const { customer_id, loan_id } = req.params;

        // Fetch the loan details from the database based on customer_id and loan_id
        const loan = await Loan.findById(customer_id, loan_id);
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        // Construct the loan statement response
        const loanStatement = {
            customer_id: loan.customerId,
            loan_id: loan.loanId,
            principal: loan.principal,
            interest_rate: loan.interestRate,
            amount_paid: loan.amountPaid,
            monthly_installment: loan.monthlyInstallment,
            repayments_left: loan.repaymentsLeft
        };

        // Send the loan statement as the response
        return res.status(200).json(loanStatement);
    } catch (error) {
        console.error('Error viewing loan statement:', error);
        return res.status(500).json({ error: 'Error viewing loan statement' });
    }
});




module.exports = {
    registerUser,
    getAllCustomers,
    createLoan,
    checkEligibility,
    viewLoanDetails,
    makePayment,
    viewLoanStatement

};
