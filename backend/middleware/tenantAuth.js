// middleware/tenantAuth.js
const userModel = require('../models/userModel'); // Apna path verify kar lena
const Company = require('../models/CompanyModel');

const tenantAuth = async (req, res, next) => {
    try {
        // ASSUMPTION: Ye middleware aapke standard `verifyToken` ya `isAuth` middleware ke BAAD chalega.
        // Matlab `req.user` mein logged-in user ki details (ID, role) already honi chahiye.

        if (!req.user || !req.user.id) {
             // Returning standard JSON error, frontend can handle this gracefully with inline text
            return res.status(401).json({ 
                success: false, 
                message: "Authentication failed. User not found." 
            });
        }

        // 1. Fetch user from DB to get the latest companyId and role
        const currentUser = await userModel.findById(req.user.id);

        // 2. Check if user actually belongs to a company (B2B verification)
        if (!currentUser.companyId) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: You are not associated with any corporate account."
            });
        }

        // 3. Verify if the company itself is still active (Subscription check)
        const companyDetails = await Company.findById(currentUser.companyId);
        
        if (!companyDetails || !companyDetails.isActive) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Your corporate account is currently inactive or suspended."
            });
        }

        // 4. THE MOST IMPORTANT STEP: Attach companyId to the request object
        req.companyId = currentUser.companyId;
        req.userRole = currentUser.role; // Optional: useful for specific HR checks later

        // 5. Move to the next function (the Controller)
        next();

    } catch (error) {
        console.error("Tenant Auth Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error during corporate authentication." 
        });
    }
};

module.exports = tenantAuth;