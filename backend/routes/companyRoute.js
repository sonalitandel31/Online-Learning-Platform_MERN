const express = require('express');
const router = express.Router();
const companyController = require('../controller/companyController');

const tenantAuth = require('../middleware/tenantAuth');
const authMiddleware = require('../middleware/authMiddleware');

// Registration 
router.post('/register', companyController.registerCompany);
router.get('/all', companyController.getAllCompanies);

// Corporate Admin Routes (Protected by token & tenantAuth)
router.get('/settings', authMiddleware, tenantAuth, companyController.getCompanySettings);
router.put('/branding', authMiddleware, tenantAuth, companyController.updateBranding);

module.exports = router;