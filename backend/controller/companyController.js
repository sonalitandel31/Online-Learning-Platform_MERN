const Company = require('../models/companyModel');
const userModel = require('../models/userModel');
const nodemailer = require('nodemailer');
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
            role: 'student' 
        });

        company.subscription.usedLicenses = usedSeats;

        res.status(200).json({ success: true, data: company });
    } catch (error) {
        console.error("Error fetching company settings:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

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

exports.updateLicenses = async (req, res) => {
    try {
        const { newLicenseCount } = req.body; 
        const companyId = req.params.id;

        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Company not found" });

        company.subscription.activeLicenses = newLicenseCount; 
        
        await company.save();
        res.json({ success: true, message: "Licenses updated successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.requestLicenseUpgrade = async (req, res) => {
    try {
        // req.user mein logged-in HR ki details hongi (via verifyToken middleware)
        const hrEmail = req.user.email;
        const companyId = req.user.companyId;

        // Company ki details DB se nikal lo taaki email mein naam bhej sako
        const company = await Company.findById(companyId);

        // 📧 1. Nodemailer Transporter Setup (Apne SMTP details daalein)
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Ya koi aur SMTP service
            auth: {
                user: process.env.EMAIL_USER, // e.g., 'admin@learnx.com'
                pass: process.env.EMAIL_PASS  // App password
            }
        });

        // 📧 2. Email Body Design
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'tandelsonali13@gmail.com', // 👈 Yahan Super Admin ka email aayega
            subject: `🚨 License Upgrade Request: ${company.companyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #6f42c1;">New License Upgrade Request</h2>
                    <p>Hello Admin,</p>
                    <p>A corporate client has requested additional licenses for their team.</p>
                    <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 500px;">
                        <tr>
                            <td style="background-color: #f8f9fa;"><b>Company Name:</b></td>
                            <td>${company.companyName}</td>
                        </tr>
                        <tr>
                            <td style="background-color: #f8f9fa;"><b>Requested By (HR):</b></td>
                            <td>${hrEmail}</td>
                        </tr>
                        <tr>
                            <td style="background-color: #f8f9fa;"><b>Total Allocated Licenses:</b></td>
                            <td>${company.subscription?.activeLicenses || 0}</td>
                        </tr>
                        <tr>
                            <td style="background-color: #f8f9fa;"><b>Licenses Consumed:</b></td>
                            <td>${company.subscription?.usedLicenses || 0}</td>
                        </tr>
                    </table>
                    <p>Please contact the HR to process the offline invoice. Once paid, allocate the new licenses from the Admin Panel.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: "Upgrade request email sent to Super Admin." });

    } catch (error) {
        console.error("Email sending failed:", error);
        return res.status(500).json({ success: false, message: "Server error while sending email." });
    }
};