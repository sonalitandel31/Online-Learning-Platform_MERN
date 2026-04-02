const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temp folder for CSV

const hrController = require('../controller/hrController');
const bulkUploadController = require('../controller/bulkUploadController');
const lpController = require('../controller/learningPathController');
const tenantAuth = require('../middleware/tenantAuth');
const authMiddleware = require('../middleware/authMiddleware');

// Route middlewares: 1. Login check -> 2. HR/Company check -> 3. Controller
router.get('/dashboard', authMiddleware ,tenantAuth, hrController.getDashboardStats);
router.get('/employees', authMiddleware, tenantAuth, hrController.getEmployeeList);
router.post('/add-employee', authMiddleware, hrController.addSingleEmployee);
router.post('/bulk-enroll', authMiddleware, tenantAuth, upload.single('csvFile'), bulkUploadController.bulkEnrollEmployees);
router.post('/request-course', authMiddleware, tenantAuth, hrController.createCourseRequest);
router.get('/my-requests', authMiddleware, tenantAuth, hrController.getMyCourseRequests);

router.post('/learning-paths', authMiddleware, tenantAuth, lpController.createPath);
router.get('/learning-paths', authMiddleware, tenantAuth, lpController.getCompanyPaths);
router.post('/learning-paths/assign', authMiddleware, tenantAuth, lpController.assignPath);

router.get('/my-learning-paths', authMiddleware, lpController.getStudentPaths);

router.get('/analytics', authMiddleware, tenantAuth, hrController.getHRAnalytics);

module.exports = router;