// Donation functionality with Stripe
import { on, qs } from '/js/ui.js';

// Stripe configuration
// Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_...'; // Replace with your Stripe publishable key
const STRIPE_API_URL = '/api/create-checkout-session'; // Backend endpoint to create checkout session

let stripe = null;
let selectedAmount = null;

// Initialize Stripe
function initStripe() {
  if (STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY !== 'pk_test_...') {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  } else {
    console.warn('Stripe publishable key not configured. Please set STRIPE_PUBLISHABLE_KEY in js/donate.js');
  }
}

// Get modal elements
const donateBtn = qs('#donate-btn');
const donateModal = qs('#donate-modal');
const donateModalClose = qs('#donate-modal-close');
const donationAmountBtns = document.querySelectorAll('.donation-amount-btn');
const customAmountInput = qs('#custom-amount-input');
const proceedDonateBtn = qs('#proceed-donate-btn');

// Open donation modal
function openDonateModal() {
  if (!stripe) {
    alert('Stripe is not configured. Please set your Stripe publishable key in js/donate.js');
    return;
  }
  donateModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  selectedAmount = null;
  updateProceedButton();
}

// Close donation modal
function closeDonateModal() {
  donateModal.style.display = 'none';
  document.body.style.overflow = '';
  selectedAmount = null;
  customAmountInput.value = '';
  donationAmountBtns.forEach(btn => btn.classList.remove('selected'));
  updateProceedButton();
}

// Select donation amount
function selectAmount(amount) {
  selectedAmount = amount;
  customAmountInput.value = '';
  donationAmountBtns.forEach(btn => {
    btn.classList.remove('selected');
    if (parseFloat(btn.dataset.amount) === amount) {
      btn.classList.add('selected');
    }
  });
  updateProceedButton();
}

// Handle custom amount input
function handleCustomAmount() {
  const amount = parseFloat(customAmountInput.value);
  if (amount && amount > 0) {
    selectedAmount = amount;
    donationAmountBtns.forEach(btn => btn.classList.remove('selected'));
    updateProceedButton();
  } else {
    selectedAmount = null;
    updateProceedButton();
  }
}

// Update proceed button state
function updateProceedButton() {
  if (selectedAmount && selectedAmount > 0) {
    proceedDonateBtn.disabled = false;
    proceedDonateBtn.textContent = `Donate $${selectedAmount.toFixed(2)}`;
  } else {
    proceedDonateBtn.disabled = true;
    proceedDonateBtn.textContent = 'Proceed to Payment';
  }
}

// Create checkout session and redirect to Stripe
async function proceedToPayment() {
  if (!selectedAmount || selectedAmount <= 0) {
    return;
  }

  if (!stripe) {
    alert('Stripe is not configured. Please set your Stripe publishable key.');
    return;
  }

  proceedDonateBtn.disabled = true;
  proceedDonateBtn.textContent = 'Processing...';

  try {
    // Create checkout session via backend
    const response = await fetch(STRIPE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(selectedAmount * 100), // Convert to cents
        currency: 'usd',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const session = await response.json();

    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId: session.id,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    alert('Failed to process donation. Please try again later.');
    proceedDonateBtn.disabled = false;
    proceedDonateBtn.textContent = `Donate $${selectedAmount.toFixed(2)}`;
  }
}

// Event listeners
on(donateBtn, 'click', openDonateModal);
on(donateModalClose, 'click', closeDonateModal);

// Close modal when clicking outside
on(donateModal, 'click', (e) => {
  if (e.target === donateModal) {
    closeDonateModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && donateModal.style.display === 'flex') {
    closeDonateModal();
  }
});

// Donation amount buttons
donationAmountBtns.forEach(btn => {
  on(btn, 'click', () => {
    selectAmount(parseFloat(btn.dataset.amount));
  });
});

// Custom amount input
on(customAmountInput, 'input', handleCustomAmount);
on(customAmountInput, 'keydown', (e) => {
  if (e.key === 'Enter' && selectedAmount && selectedAmount > 0) {
    proceedToPayment();
  }
});

// Proceed button
on(proceedDonateBtn, 'click', proceedToPayment);

// Initialize Stripe on load
initStripe();

