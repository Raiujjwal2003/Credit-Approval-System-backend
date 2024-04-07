// src/app.js

const express = require('express');
const bodyParser = require('body-parser');
const customerRoutes = require('./routes/customerRoutes.js');
// const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/customers', customerRoutes);

// Error handling middleware
// app.use(errorHandler);

module.exports = app;
