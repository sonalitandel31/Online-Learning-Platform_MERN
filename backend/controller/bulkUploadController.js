const fs = require('fs');
const csv = require('csv-parser');
const userModel = require('../models/userModel');
const Company = require('../models/CompanyModel');
const bcrypt = require('bcryptjs');

exports.bulkEnrollEmployees = async (req, res) => {
    try {
        const companyId = req.companyId;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a CSV file." });
        }

        // --- 1. License Limit Check ---
        const company = await Company.findById(companyId);
        if (!company) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: "Company not found." });
        }

        const currentEmployeeCount = await userModel.countDocuments({ companyId, role: 'student' });
        const availableLicenses = company.subscription.activeLicenses - currentEmployeeCount;

        if (availableLicenses <= 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: "License limit reached! Please upgrade your plan to add more employees."
            });
        }

        const results = [];
        const errors = [];
        let rowCount = 1; // Header is row 0

        // Read and parse the CSV file
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                rowCount++;

                // --- UPDATE: Validate Name, Email AND Password from CSV ---
                if (!data.name || !data.email || !data.password) {
                    errors.push({
                        row: rowCount,
                        issue: "Missing name, email, or password",
                        data
                    });
                } else {
                    results.push({ ...data, row: rowCount });
                }
            })
            .on('error', (err) => {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(500).json({ success: false, message: "Error parsing the CSV file." });
            })
            .on('end', async () => {
                try {
                    let successCount = 0;

                    // Check if CSV has more users than available licenses
                    if (results.length > availableLicenses) {
                        fs.unlinkSync(req.file.path);
                        return res.status(400).json({
                            success: false,
                            message: `Cannot upload. You are trying to add ${results.length} users, but only have ${availableLicenses} licenses left.`
                        });
                    }

                    // Process valid rows
                    for (const student of results) {
                        const emailLower = student.email.toLowerCase().trim();

                        // Check if email already exists
                        const existingUser = await userModel.findOne({ email: emailLower });
                        if (existingUser) {
                            errors.push({ row: student.row, issue: "Email already exists", email: student.email });
                            continue;
                        }

                        // --- UPDATE: Hash the specific password from the CSV ---
                        const hashedPassword = await bcrypt.hash(student.password.trim(), 10);

                        // Create new user
                        await userModel.create({
                            name: student.name.trim(),
                            email: emailLower,
                            password: hashedPassword, // Using the unique hashed password
                            role: 'student',
                            companyId: companyId,
                            employeeId: student.employeeId ? student.employeeId.trim() : null
                        });

                        successCount++;
                    }
                    if (successCount > 0) {
                        await Company.findByIdAndUpdate(
                            companyId,
                            { $inc: { 'subscription.usedLicenses': successCount } }
                        );
                    }
                    
                    // Successfully processed, delete the temp file
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

                    res.status(200).json({
                        success: true,
                        summary: {
                            totalProcessed: rowCount - 1,
                            successCount,
                            errorCount: errors.length,
                            errors
                        }
                    });

                } catch (innerError) {
                    console.error("Database Error during Bulk Upload:", innerError);
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    res.status(500).json({ success: false, message: "Database error during user creation." });
                }
            });

    } catch (error) {
        console.error("Bulk Upload Outer Error:", error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: "Server error during file processing." });
    }
};