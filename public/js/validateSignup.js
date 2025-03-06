document.querySelector(".formSubmit").addEventListener('click',(e)=>{
e.preventDefault();

//Input Values
const name = document.getElementById("name").value
const email = document.getElementById("email").value
const phone = document.getElementById("phone").value
const password = document.getElementById("password").value
const confirmPassword = document.getElementById("confirmPassword").value

//Regular Expressions
const nameRegex = /^[A-za-z0-9]{3,20}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^[6-9][\d]{9}$/;
const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;


//ErrorValues
const nameError = document.getElementById("nameError")
const emailError = document.getElementById("emailError")
const phoneError = document.getElementById("phoneError")
const passwordError = document.getElementById("passwordError")
const confirmPasswordError = document.getElementById("confirmPasswordError")

document.querySelectorAll(".error").forEach((element)=>(element.textContent = ""));

let isValid = true;

//Validate Username
if(!nameRegex.test(name)){
    nameError.textContent = "Username is not valid";
    isValid = false;
}

//Validate Email
if(!emailRegex.test(email)){
    emailError.textContent = "Email is not valid";
    isValid = false;
}

//Validate Phone Number
if(!phoneRegex.test(phone)){
    phoneError.textContent = "Phone number must be 10 digits long and start with  6,7,8 or 9.";
    isValid = false;
}
//Validate Password
if(!passwordRegex.test(password)){
    passwordError.textContent = "Password must be atleast 8 characters , include atlease one uppercase letter, one lowercase letter , one number and one special character. ";
    isValid = false;
}

//Validate Confirm Password
if(confirmPassword !== password){
    confirmPasswordError.textContent = "Password doesnot match";
    isValid = false;
}

let userData = [];

if(isValid){
    alert("Account Created Successfully");
    
}

})

