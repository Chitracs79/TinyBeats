function validateForm() {
    let isValid = true;
    let errorMessage = "";

    // Get form values
    let productName = document.getElementById("productName").value.trim();
    let productDescription = document.getElementById("productDescription").value.trim();
    let productColor = document.getElementById("productColor").value.trim();
    let productBrand = document.querySelector("select[name='brand']").value;
    let productCategory = document.querySelector("select[name='category']").value;
    let basePrice = document.getElementById("basePrice").value.trim();
    let salesPrice = document.getElementById("salesPricing").value.trim();
    let stock = document.getElementById("productStock").value.trim();
    let discount = document.getElementById("productDiscount").value.trim();
    
    // Validate required fields
    if (productName === "") {
        errorMessage += "Product name is required.\n";
        isValid = false;
    }
    if (productDescription === "") {
        errorMessage += "Product description is required.\n";
        isValid = false;
    }
    if (productColor === "") {
        errorMessage += "Product color is required.\n";
        isValid = false;
    }
    if (productBrand === "Select") {
        errorMessage += "Please select a product brand.\n";
        isValid = false;
    }
    if (productCategory === "Select") {
        errorMessage += "Please select a product category.\n";
        isValid = false;
    }
    
    // Validate numerical inputs
    if (basePrice === "" || isNaN(basePrice) || Number(basePrice) <= 0) {
        errorMessage += "Enter a valid base price.\n";
        isValid = false;
    }
    if (salesPrice === "" || isNaN(salesPrice) || Number(salesPrice) <= 0) {
        errorMessage += "Enter a valid sales price.\n";
        isValid = false;
    }
    if (stock === "" || isNaN(stock) || Number(stock) < 0) {
        errorMessage += "Enter a valid stock quantity.\n";
        isValid = false;
    }
    if (discount !== "" && (isNaN(discount) || Number(discount) < 0)) {
        errorMessage += "Enter a valid discount value.\n";
        isValid = false;
    }
    
    // Validate at least one image is uploaded
    let imageInputs = document.querySelectorAll("input[type='file']");
    let hasImage = Array.from(imageInputs).some(input => input.files.length > 0);
    if (!hasImage) {
        errorMessage += "Please upload at least one product image.\n";
        isValid = false;
    }
    
    // Show error messages if validation fails
    if (!isValid) {
        alert(errorMessage);
    }
    
    return isValid;
}
