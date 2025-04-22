

  
const emailError = document.getElementById("signinEmail-error");   
const passwordError = document.getElementById("signinPassword-error");
const cpasswordError = document.getElementById("confirmPassword-error");
const submitError = document.getElementById("submit-error");

//Regular Expressions

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&])[A-Za-z\d@.#$!%*?&]{8,15}$/;



function validateEmail() {
    const email = document.getElementById("signinEmail").value;

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


function validatePassword() {
    const password = document.getElementById('signinPassword').value;

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
    const password = document.getElementById('password').value;
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

function validateSigninForm() {
    if ( !validateEmail() ||  !validatePassword()||!validateConfirmPassword() ) {
        submitError.style.display = "block";
        submitError.textContent = "Please fill all fields and then submit";
        setTimeout(function () { submitError.style.display = "none"; }, 3000)
        return false;
    }
}

