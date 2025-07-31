import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async () => {
  const element = document.getElementById('quotation-content');
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pageHeight = 297; // A4 height in mm
    let position = 0;

    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Add pages based on height
    while (position < imgHeight) {
      pdf.addImage(
        imgData,
        'JPEG',
        0,
        -position,
        imgWidth,
        imgHeight
      );
      position += pageHeight;

      if (position < imgHeight) pdf.addPage();
    }

    const quotationId = `QUO-${Date.now().toString().slice(-6)}`;
    pdf.save(`PC_Build_Quotation_${quotationId}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please try again.');
  }
};



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