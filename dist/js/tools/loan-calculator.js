// Loan Calculator Tool
// Calculates loan payments and generates amortization schedule

let amortizationSchedule = [];

// Set default start date to today
document.addEventListener('DOMContentLoaded', () => {
  const startDateInput = document.getElementById('start-date');
  if (startDateInput && !startDateInput.value) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    startDateInput.value = `${year}-${month}-${day}`;
  }
});

// Calculate loan payment
function calculatePayment(principal, annualRate, termYears, paymentsPerYear) {
  if (annualRate === 0) {
    return principal / (termYears * paymentsPerYear);
  }
  
  const monthlyRate = annualRate / 100 / paymentsPerYear;
  const numPayments = termYears * paymentsPerYear;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                  (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return payment;
}

// Generate amortization schedule
function generateAmortizationSchedule() {
  const loanAmount = parseFloat(document.getElementById('loan-amount').value) || 0;
  const annualRate = parseFloat(document.getElementById('interest-rate').value) || 0;
  const termValue = parseFloat(document.getElementById('loan-term').value) || 0;
  const termUnit = document.getElementById('term-unit').value;
  const paymentFreq = document.getElementById('payment-frequency').value;
  const startDate = new Date(document.getElementById('start-date').value);
  const extraPayment = parseFloat(document.getElementById('extra-payment').value) || 0;
  const extraPaymentStart = parseInt(document.getElementById('extra-payment-start').value) || 1;
  const extraPaymentEnd = document.getElementById('extra-payment-end').value ? 
    parseInt(document.getElementById('extra-payment-end').value) : null;
  
  if (loanAmount <= 0 || annualRate < 0 || termValue <= 0) {
    alert('Please enter valid loan amount, interest rate, and term.');
    return;
  }
  
  // Convert term to years
  let termYears = termUnit === 'years' ? termValue : termValue / 12;
  
  // Payments per year based on frequency
  const paymentsPerYear = {
    'monthly': 12,
    'biweekly': 26,
    'weekly': 52,
    'quarterly': 4,
    'annually': 1
  }[paymentFreq] || 12;
  
  // Calculate base payment
  const basePayment = calculatePayment(loanAmount, annualRate, termYears, paymentsPerYear);
  const monthlyRate = annualRate / 100 / paymentsPerYear;
  const numPayments = Math.ceil(termYears * paymentsPerYear);
  
  // Generate schedule
  let balance = loanAmount;
  const schedule = [];
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtra = 0;
  
  // Date increment function based on frequency
  const getNextDate = (date, period) => {
    const next = new Date(date);
    switch (paymentFreq) {
      case 'monthly':
        next.setMonth(next.getMonth() + period);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + (period * 14));
        break;
      case 'weekly':
        next.setDate(next.getDate() + (period * 7));
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + (period * 3));
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + period);
        break;
    }
    return next;
  };
  
  for (let period = 1; period <= numPayments && balance > 0.01; period++) {
    const interestPayment = balance * monthlyRate;
    let principalPayment = basePayment - interestPayment;
    
    // Apply extra payment if applicable
    let extra = 0;
    if (extraPayment > 0 && period >= extraPaymentStart && 
        (extraPaymentEnd === null || period <= extraPaymentEnd)) {
      extra = extraPayment;
    }
    
    // Adjust principal payment if extra payment would exceed balance
    if (principalPayment + extra > balance) {
      extra = Math.max(0, balance - principalPayment);
    }
    
    principalPayment += extra;
    
    // Final payment adjustment
    if (balance - principalPayment < 0.01) {
      principalPayment = balance;
    }
    
    balance -= principalPayment;
    if (balance < 0.01) balance = 0;
    
    totalInterest += interestPayment;
    totalPrincipal += principalPayment - extra;
    totalExtra += extra;
    
    const paymentDate = getNextDate(startDate, period - 1);
    
    schedule.push({
      period,
      date: new Date(paymentDate),
      payment: basePayment + extra,
      principal: principalPayment - extra,
      interest: interestPayment,
      extra: extra,
      balance: balance
    });
  }
  
  amortizationSchedule = schedule;
  
  // Update summary
  const totalPayments = schedule.reduce((sum, row) => sum + row.payment, 0);
  document.getElementById('monthly-payment').textContent = 
    formatCurrency(schedule[0]?.payment || 0);
  document.getElementById('total-interest').textContent = 
    formatCurrency(totalInterest);
  document.getElementById('total-amount').textContent = 
    formatCurrency(totalPayments);
  document.getElementById('num-payments').textContent = schedule.length;
  
  // Show results
  document.getElementById('results-summary').style.display = 'block';
  
  // Display schedule
  displayAmortizationSchedule();
}

// Display amortization schedule table
function displayAmortizationSchedule() {
  const tbody = document.getElementById('amortization-body');
  tbody.innerHTML = '';
  
  amortizationSchedule.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.period}</td>
      <td>${formatDate(row.date)}</td>
      <td>${formatCurrency(row.payment)}</td>
      <td>${formatCurrency(row.principal)}</td>
      <td>${formatCurrency(row.interest)}</td>
      <td>${formatCurrency(row.extra)}</td>
      <td>${formatCurrency(row.balance)}</td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById('amortization-container').style.display = 'block';
}

// Export to Excel
function exportToExcel() {
  if (amortizationSchedule.length === 0) {
    alert('Please calculate the loan first.');
    return;
  }
  
  const loanType = document.getElementById('loan-type').value;
  const loanAmount = document.getElementById('loan-amount').value;
  const interestRate = document.getElementById('interest-rate').value;
  const currency = getSelectedCurrency();
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Loan Calculator - Amortization Schedule'],
    [],
    ['Currency', currency],
    ['Loan Type', loanType.charAt(0).toUpperCase() + loanType.slice(1)],
    ['Loan Amount', parseFloat(loanAmount)],
    ['Annual Interest Rate', `${interestRate}%`],
    ['Number of Payments', amortizationSchedule.length],
    ['Total Interest', amortizationSchedule.reduce((sum, r) => sum + r.interest, 0)],
    ['Total Amount Paid', amortizationSchedule.reduce((sum, r) => sum + r.payment, 0)],
    [],
    ['Payment Details']
  ];
  
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
  
  // Amortization schedule sheet
  const scheduleData = [
    ['Period', 'Payment Date', 'Payment', 'Principal', 'Interest', 'Extra Payment', 'Remaining Balance']
  ];
  
  amortizationSchedule.forEach(row => {
    scheduleData.push([
      row.period,
      formatDate(row.date),
      row.payment,
      row.principal,
      row.interest,
      row.extra,
      row.balance
    ]);
  });
  
  const scheduleWS = XLSX.utils.aoa_to_sheet(scheduleData);
  
  // Set column widths
  scheduleWS['!cols'] = [
    { wch: 8 },  // Period
    { wch: 12 }, // Date
    { wch: 12 }, // Payment
    { wch: 12 }, // Principal
    { wch: 12 }, // Interest
    { wch: 12 }, // Extra Payment
    { wch: 15 }  // Balance
  ];
  
  XLSX.utils.book_append_sheet(wb, scheduleWS, 'Amortization Schedule');
  
  // Generate filename
  const loanTypeName = loanType.charAt(0).toUpperCase() + loanType.slice(1);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Loan_Calculator_${loanTypeName}_${currency}_${dateStr}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, filename);
}

// Get selected currency
function getSelectedCurrency() {
  return document.getElementById('currency').value || 'USD';
}

// Format currency
function formatCurrency(amount) {
  const currency = getSelectedCurrency();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format date
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Event listeners
document.getElementById('calculate-btn').addEventListener('click', generateAmortizationSchedule);
document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('loan-amount').value = '250000';
  document.getElementById('interest-rate').value = '6.5';
  document.getElementById('loan-term').value = '30';
  document.getElementById('term-unit').value = 'years';
  document.getElementById('payment-frequency').value = 'monthly';
  document.getElementById('extra-payment').value = '0';
  document.getElementById('extra-payment-start').value = '1';
  document.getElementById('extra-payment-end').value = '';
  document.getElementById('results-summary').style.display = 'none';
  document.getElementById('amortization-container').style.display = 'none';
  amortizationSchedule = [];
  
  // Reset date to today
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  document.getElementById('start-date').value = `${year}-${month}-${day}`;
});

document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);

// Auto-calculate on input change (debounced)
let calculateTimeout;
const inputs = ['currency', 'loan-amount', 'interest-rate', 'loan-term', 'term-unit', 
                'payment-frequency', 'start-date', 'extra-payment', 
                'extra-payment-start', 'extra-payment-end'];

inputs.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', () => {
      clearTimeout(calculateTimeout);
      calculateTimeout = setTimeout(() => {
        if (amortizationSchedule.length > 0) {
          generateAmortizationSchedule();
        }
      }, 500);
    });
  }
});

