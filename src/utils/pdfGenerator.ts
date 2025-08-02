import html2pdf from 'html2pdf.js';

export const generatePDF = () => {
  const element = document.getElementById('quotation-content');
  if (!element) {
    alert('Element not found');
    return;
  }

  const options = {
    margin: 0.5, // margins in inches
    filename: `PC_Build_Quotation_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf()
    .set(options)
    .from(element)
    .save()
    .catch((err) => {
      console.error('PDF generation error:', err);
      alert('Error generating PDF. Please try again.');
    });
};

// Print function remains unchanged
export const printQuotation = () => {
  const element = document.getElementById('quotation-content');
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>PC Build Quotation</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-blue-600 { color: #2563eb; }
          .border-t { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
};

// Share function remains unchanged
export const shareQuotation = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'PC Build Quotation',
        text: 'Check out this PC build quotation from IT SERVICE WORLD',
        url: window.location.href
      });
    } catch (error) {
      console.error('Error sharing:', error);
      fallbackShare();
    }
  } else {
    fallbackShare();
  }
};

const fallbackShare = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert('Link copied to clipboard!');
  }).catch(() => {
    alert('Unable to share. Please copy the URL manually.');
  });
};