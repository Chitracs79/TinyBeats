

const nameError = document.getElementById("name-error");      // const is the constiable declaration where the name of the constiable is nameError 
const emailError = document.getElementById("signupEmail-error");    // 
const phoneError = document.getElementById("phone-error");
const passwordError = document.getElementById("signupPassword-error");
const cpasswordError = document.getElementById("confirmPassword-error");
const submitError = document.getElementById("submit-error");

//Regular Expressions
const nameRegex = /^[A-za-z0-9\s]{3,20}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^[6-9][\d]{9}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&])[A-Za-z\d@.#$!%*?&]{8,15}$/;

function validateName() {
    const name = document.getElementById("name").value;

    if (name.length == 0) {
        nameError.textContent = "This field is required";
        return false;
    }

    if (!nameRegex.test(name)) {
        nameError.textContent = "Enter your fullname";
        return false;
    }

    nameError.textContent = '';
    return true;
}

function validateEmail() {
    const email = document.getElementById("signupEmail").value;

    if (email.length == 0) {
        emailError.textContent = "This field is required";
        return false;
    }
    if (!emailRegex.test(email)) {
        emailError.textContent = "Enter a valid mail-id";
        return false;
    }
    emailError.textContent = '';
    return true;

}

function validatePhone() {
    const phone = document.getElementById('phone').value;

    if (phone.length == 0) {
        phoneError.textContent = "This field is required";
        return false;
    }

    if (!phoneRegex.test(phone)) {
        phoneError.textContent = "Only digits please ! Should be atleast 10 digits"
        return false;
    }
    phoneError.textContent = '';
    return true;
}


function validatePassword() {
    const password = document.getElementById('signupPassword').value;

    if (password.length == 0) {
        passwordError.textContent = "This field is required";
        return false;
    }

    if (!passwordRegex.test(password)) {
        passwordError.textContent = "Should contain one uppercase,one lowercase ,one digit and one special character";
        return false;
    }

    passwordError.textContent = '';
    return true;

}
function validateConfirmPassword() 
{
    const password = document.getElementById('signupPassword').value;
    const cpassword = document.getElementById('confirmPassword').value;

    if (cpassword.length == 0) {
        cpasswordError.textContent = "This field is required";
        return false;
    }
    if (password !== cpassword) {
        cpasswordError.textContent = "Password must match"
        return false;
    }

    cpasswordError.textContent = '';
    return true;
}

function validateSignupForm() {
    if (!validateName() || !validateEmail() || !validatePhone() || !validatePassword()||!validateConfirmPassword() ) {
        submitError.style.display = "block";
        submitError.textContent = "Please fill all fields and then submit";
        setTimeout(function () { submitError.style.display = "none"; }, 3000)
        return false;
    }
}

