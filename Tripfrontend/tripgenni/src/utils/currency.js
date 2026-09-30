// Currency formatter for Indian Rupees (INR)
export const formatINR = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatINRWithSymbol = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
};

// Convert USD to INR (approximate rate)
export const usdToInr = (usdAmount) => {
    const rate = 83; // 1 USD = ₹83
    return usdAmount * rate;
};

// Format large numbers in Indian style (lakhs, crores)
export const formatIndianNumber = (number) => {
    if (!number && number !== 0) return '0';
    return number.toLocaleString('en-IN');
};