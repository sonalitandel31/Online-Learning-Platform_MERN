const Company = require('../models/CompanyModel');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

exports.registerCompany = async (req, res) => {
    try {
        // Frontend se Company aur uske HR ki details aayengi
        const { 
            companyName, 
            domain, 
            purchasedLicenses, 
            hrName, 
            hrEmail, 
            hrPassword 
        } = req.body;

        // Step 1: Check agar company domain ya HR email already exist karta hai
        const existingCompany = await Company.findOne({ domain });
        const existingUser = await userModel.findOne({ email: hrEmail });

        if (existingCompany || existingUser) {
            // Standard JSON response, frontend can show this as inline text
            return res.status(400).json({ 
                success: false, 
                message: "Company domain or HR email is already registered." 
            });
        }

        // Step 2: Nayi Company Create karo (Naya Room ban gaya)
        const newCompany = await Company.create({
            companyName: companyName,
            domain: domain,
            subscription: {
                activeLicenses: purchasedLicenses
            }
        });

        // Step 3: HR ka account banao aur usko nayi company ki ID de do (Pehli Chabi)
        const hashedPassword = await bcrypt.hash(hrPassword, 10);
        
        const newHrManager = await userModel.create({
            name: hrName,
            email: hrEmail,
            password: hashedPassword,
            role: 'hr_manager',       // Dhyan dein: Isko HR ka role mila
            companyId: newCompany._id // Isey apni company se link kar diya gaya
        });

        res.status(201).json({
            success: true,
            message: "Company registered successfully!",
            companyDetails: newCompany,
            hrAccount: { name: newHrManager.name, email: newHrManager.email }
        });

    } catch (error) {
        console.error("Company Registration Error:", error);
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
};

// Fetch all companies for the Super Admin Dashboard
exports.getAllCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: companies });
    } catch (error) {
        console.error("Get All Companies Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch companies." });
    }
};

exports.getCompanySettings = async (req, res) => {
    try {
        const companyId = req.user.companyId; // HR kis company ka hai
        const company = await Company.findById(companyId).lean();

        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        const usedSeats = await userModel.countDocuments({ 
            companyId: companyId, 
            role: 'student' // Sirf employees ko count karein
        });

        company.subscription.usedLicenses = usedSeats; 

        res.status(200).json({ success: true, data: company });
    } catch (error) {
        console.error("Error fetching company settings:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Update White-labeling / Branding
exports.updateBranding = async (req, res) => {
    try {
        const { logoUrl, themeColor } = req.body;
        
        const updatedCompany = await Company.findByIdAndUpdate(
            req.companyId,
            { 
                'branding.logoUrl': logoUrl, 
                'branding.themeColor': themeColor 
            },
            { new: true } // Returns the updated document
        );

        res.status(200).json({ 
            success: true, 
            message: "Branding updated successfully.", 
            branding: updatedCompany.branding 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating branding." });
    }
};