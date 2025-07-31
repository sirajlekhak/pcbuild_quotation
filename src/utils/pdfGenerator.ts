import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async () => {
  const element = document.getElementById('quotation-content');
  if (!element) return;

  try {
    // Create canvas from the quotation content
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    
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