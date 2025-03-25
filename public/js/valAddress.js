const addressTypeError = document.getElementById("addressType-error")
const nameError = document.getElementById("name-error");
const apartmentError = document.getElementById("apartment-error");
const buildingError = document.getElementById("building-error");
const streetError = document.getElementById("street-error");
const cityError = document.getElementById("city-error");
const landmarkError = document.getElementById("landmark-error");
const stateError = document.getElementById("state-error");
const countryError = document.getElementById("country-error");
const zipError = document.getElementById("zip-error");  
const phoneError = document.getElementById("phone-error");
const altPhoneError = document.getElementById("altphone-error");


//Regular Expressions
const nameRegex = /^[A-za-z\s]{3,20}$/;
const phoneRegex = /^[6-9][\d]{9}$/;
const apartmentRegex = /^(Apt|Unit|Suite)?\s?\d+[A-Za-z]?$/;
const buildingRegex = /^(Building|Tower|Block)?\s?[A-Za-z0-9]+$/;
const streetRegex = /^[a-zA-Z0-9\s,.#-]{3,20}$/
const cityRegex = /^[a-zA-Z\s-]{3,20}$/
const zipRegex = /^\d{4,6}(-\d{4})?$/; 


function validateAddressType(){
    const addressType = document.getElementById("addressType").value;

    if(addressType.length === 0){
        addressTypeError.textContent = "This field is required";
        return false;
    }

    if(!nameRegex.test(addressType)){
        addressTypeError.textContent =  "Enter a valid addressType";
        return false;
    }
    addressTypeError.textContent ="";
    return true;
}

function validateName() {
    const name = document.getElementById("name").value;

    if (name.length == 0) {
        nameError.textContent = "This field is required";
        return false;
    }

    if (!nameRegex.test(name)) {
        nameError.textContent = "Name should only contain alphabets";
        return false;
    }

    nameError.textContent = '';
    return true;
}
function validateApartment() {
    const apartment = document.getElementById("apartment").value;

    if (apartment.length == 0) {
        apartmentError.textContent = "This field is required";
        return false;
    }

    if (!apartmentRegex.test(apartment)) {
        apartmentError.textContent = "Invalid apartment format";
        return false;
    }

    apartmentError.textContent = '';
    return true;
}
function validateBuilding(){
    const building = document.getElementById("building").value;

    if (building.length == 0) {
        buildingError.textContent = "This field is required";
        return false;
    }

    if (!buildingRegex.test(building)) {
        buildingError.textContent = "Invalid building format";
        return false;
    }

    buildingError.textContent = '';
    return true;
}
function validateStreet(){
    const street = document.getElementById("street").value;

    if (street.length == 0) {
        streetError.textContent = "This field is required";
        return false;
    }

    if (!streetRegex.test(street)) {
        streetError.textContent = "Invalid street format";
        return false;
    }

    streetError.textContent = '';
    return true;
}
function validateCity() {
    const city = document.getElementById("city").value;

    if (city.length == 0) {
        cityError.textContent = "This field is required";
        return false;
    }

    if (!cityRegex.test(city)) {
        cityError.textContent = "Enter a valid city";
        return false;
    }

     cityError.textContent = '';
    return true;
}
function validateLandmark() {
    const landmark = document.getElementById("landmark").value;

    if (landmark.length == 0) {
        landmarkError.textContent = "This field is required";
        return false;
    }

    if (!cityRegex.test(landmark)) {
        landmarkError.textContent = "Enter a valid landmark";
        return false;
    }

     landmarkError.textContent = '';
    return true;
}
function validateState() {
    const state = document.getElementById("state").value;

    if (state.length == 0) {
        stateError.textContent = "This field is required";
        return false;
    }

    if (!cityRegex.test(state)) {
        stateError.textContent = "State should be valid";
        return false;
    }

     stateError.textContent = '';
    return true;
}
function validateCountry() {
    const country = document.getElementById("country").value;

    if (country.length == 0) {
        countryError.textContent = "This field is required";
        return false;
    }

    if (!cityRegex.test(country)) {
        countryError.textContent = "Country should be valid";
        return false;
    }

     countryError.textContent = '';
    return true;
}

function validateZip() {
    const zip = document.getElementById('zip').value;

    if (zip.length == 0) {
        zipError.textContent = "This field is required";
        return false;
    }

    if (!zipRegex.test(zip)) {
        zipError.textContent = "Only digits please ! Should be atleast 6 digits"
        return false;
    }
    zipError.textContent = '';
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
function validateAlternativePhone() {
    const altPhone = document.getElementById('alternativePhone').value;

    if (altPhone.length == 0) {
        altPhoneError.textContent = "This field is required";
        return false;
    }

    if (!phoneRegex.test(altPhone)) {
        altPhoneError.textContent = "Only digits please ! Should be atleast 10 digits"
        return false;
    }
    altPhoneError.textContent = '';
    return true;
}


function validateForm() {
    const isValid = validateAddressType() &&
                    validateName() &&
                    validateApartment() &&
                    validateBuilding() &&
                    validateStreet() &&
                    validateCity() &&
                    validateLandmark() &&
                    validateState() &&
                    validateCountry() &&
                    validateZip() &&
                    validatePhone() &&
                    validateAlternativePhone();

    if (!isValid) {
        submitError.style.display = "block";
        submitError.textContent = "Please fill all fields correctly before submitting";
        setTimeout(() => submitError.style.display = "none", 3000);
        return false;
    }
    return true;
}