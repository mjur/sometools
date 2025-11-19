// Google Analytics integration
// Set your GA4 Measurement ID in this file

// Configuration - Replace with your Google Analytics Measurement ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your actual GA4 Measurement ID

// Only initialize if Measurement ID is set and not the placeholder
if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    // Privacy-friendly settings
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  // Make gtag available globally
  window.gtag = gtag;

  // Track page views
  gtag('event', 'page_view', {
    page_path: window.location.pathname + window.location.search,
    page_title: document.title
  });
}

