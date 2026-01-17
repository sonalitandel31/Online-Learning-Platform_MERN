export async function registerValidation(formData, role) {
    let errors = {};

    if (!formData.name.trim()) errors.name = "Name is required..";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) errors.email = "Email is required..";
    else if (!emailRegex.test(formData.email)) errors.email = "Enter a valid email..";

    if (!formData.password) errors.password = "Password is required..";
    else if (formData.password.length < 6 || formData.password.length > 10) errors.password = "Password must be between 6 to 10 characters";

    if(!formData.con_password) errors.con_password="Confirm your password";
    else if(formData.password !== formData.con_password) errors.con_password="Passwords do not match";

    if (role === "Student") {
        if (!formData.education) errors.education = "Education is required..";
        if (!formData.interests) errors.interests = "Interests are required..";
    }

    if (role === "Instructor") {
        if (!formData.profilePic) errors.profilePic = "Profile picture is required..";
        else{
            const allowedTypes = ["image/jpeg", "image/png","image/jpg"];
            const maxSize = 2*1024*1024;
            if (!allowedTypes.includes(formData.profilePic.type)) errors.profilePic = "Only JPG and PNG images are allowed";
            else if (formData.profilePic.size > maxSize) errors.profilePic = "File size must be less than 2MB";
        }

        if (!formData.bio) errors.bio = "Bio is required..";
        if (!formData.expertise) errors.expertise = "Expertise is required..";
        if (!formData.qualifications) errors.qualifications = "Qualifications are required..";
        if (!formData.experience) errors.experience = "Experience is required..";
    }

    return errors;
}

export async function loginValidation(formData) {
    let errors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) errors.email = "Email is required..";
    else if (!emailRegex.test(formData.email))
        errors.email = "Enter a valid email..";

    if (!formData.password) errors.password = "Password is required..";

    return errors;
}
