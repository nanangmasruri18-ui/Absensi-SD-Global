export const printElementById = (elementId: string, title?: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found, falling back to window.print`);
    try {
      window.print();
    } catch (e) {
      console.error(e);
    }
    return;
  }

  // Create temporary iframe for scoped printing (ideal for sandboxed iframes)
  const iframe = document.createElement('iframe');
  iframe.name = 'print_frame';
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.left = '-1000px';
  iframe.style.top = '-1000px';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    
    // Clone all document styles so Tailwind and font rules translate perfectly
    let styles = '';
    const styleSheets = document.styleSheets;
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const sheet = styleSheets[i];
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            styles += rules[j].cssText + '\n';
          }
        }
      } catch (e) {
        // Safe wrapper for cross-origin security errors
      }
    }

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Cetak Laporan'}</title>
          <style>
            ${styles}
            @page {
              size: landscape;
              margin: 10mm;
            }
            body {
              background-color: white !important;
              color: black !important;
              font-family: ui-sans-serif, system-ui, sans-serif;
              padding: 0;
              margin: 0;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              table-layout: auto !important;
            }
            th, td {
              border: 1px solid #4a5568 !important;
              padding: 6px 8px !important;
              font-size: 10pt !important;
              color: #000000 !important;
              word-wrap: break-word !important;
              vertical-align: middle !important;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: 700 !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .hidden.print\\:block {
              display: block !important;
            }
            .hidden.print\\:flex {
              display: flex !important;
            }
            .hidden.print\\:flex.print\\:justify-end {
              display: flex !important;
              justify-content: flex-end !important;
            }
          </style>
        </head>
        <body>
          <div style="padding: 10px;">
            ${element.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger printing
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr) {
        console.error('Scoped printing failed, falling back to window.print', printErr);
        window.print();
      }
      
      // Cleanup after print setup completes
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }, 500);
  } else {
    window.print();
  }
};

export const downloadElementAsPDF = async (elementId: string, filename: string) => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    console.error(`Element with ID ${elementId} not found`);
    return;
  }

  // Double import dynamically to avoid any SSR issues
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  // Clone element off-screen to configure exact print rules
  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0px';
  clone.style.width = '1280px'; // clean landscape scale width
  clone.style.backgroundColor = '#ffffff';
  clone.style.padding = '40px';
  clone.style.boxSizing = 'border-box';

  // Process all print layouts on our clone
  const printHidden = clone.querySelectorAll('.print\\:hidden');
  printHidden.forEach(el => {
    (el as HTMLElement).style.setProperty('display', 'none', 'important');
  });

  const printBlock = clone.querySelectorAll('.print\\:block');
  printBlock.forEach(el => {
    (el as HTMLElement).classList.remove('hidden');
    (el as HTMLElement).style.setProperty('display', 'block', 'important');
  });

  const printFlex = clone.querySelectorAll('.print\\:flex');
  printFlex.forEach(el => {
    (el as HTMLElement).classList.remove('hidden');
    (el as HTMLElement).style.setProperty('display', 'flex', 'important');
  });

  const printJustifyEnd = clone.querySelectorAll('.print\\:justify-end');
  printJustifyEnd.forEach(el => {
    (el as HTMLElement).style.setProperty('justify-content', 'flex-end', 'important');
  });

  // Expand all scroll areas so full rows are captured
  const scrolls = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto');
  scrolls.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.overflow = 'visible';
    htmlEl.style.maxHeight = 'none';
    htmlEl.style.display = 'block';
    htmlEl.style.width = '100%';
  });

  // Stylize table elements inside clone
  const tables = clone.querySelectorAll('table');
  tables.forEach(el => {
    const tbl = el as HTMLElement;
    tbl.style.width = '100%';
    tbl.style.borderCollapse = 'collapse';
    tbl.style.tableLayout = 'auto';
  });

  const trs = clone.querySelectorAll('tr');
  trs.forEach(el => {
    const row = el as HTMLElement;
    row.style.setProperty('display', 'table-row', 'important');
    row.style.setProperty('vertical-align', 'middle', 'important');
  });

  const ths = clone.querySelectorAll('th');
  ths.forEach(el => {
    const cell = el as HTMLElement;
    cell.style.setProperty('border', '1px solid #4a5568', 'important');
    cell.style.setProperty('padding', '6px 8px', 'important');
    cell.style.setProperty('font-size', '12px', 'important');
    cell.style.setProperty('color', '#000000', 'important');
    cell.style.setProperty('background-color', '#edf2f7', 'important');
    cell.style.setProperty('font-weight', 'bold', 'important');
    cell.style.setProperty('vertical-align', 'middle', 'important');
    cell.style.setProperty('display', 'table-cell', 'important');
    cell.style.setProperty('line-height', '1.25', 'important');
  });

  const tds = clone.querySelectorAll('td');
  tds.forEach(el => {
    const cell = el as HTMLElement;
    cell.style.setProperty('border', '1px solid #718096', 'important');
    cell.style.setProperty('padding', '6px 8px', 'important');
    cell.style.setProperty('font-size', '11px', 'important');
    cell.style.setProperty('color', '#000000', 'important');
    cell.style.setProperty('background-color', 'transparent', 'important');
    cell.style.setProperty('vertical-align', 'middle', 'important');
    cell.style.setProperty('display', 'table-cell', 'important');
    cell.style.setProperty('line-height', '1.25', 'important');
  });

  document.body.appendChild(clone);

  // Capture all stylesheets and disable them temporarily, then supply oklch-free fallback style block to prevent parsing crash
  const originalStylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')) as (HTMLStyleElement | HTMLLinkElement)[];
  let combinedCss = '';

  originalStylesheets.forEach((sheetEl) => {
    try {
      if (sheetEl instanceof HTMLStyleElement) {
        combinedCss += sheetEl.innerHTML + '\n';
      } else if (sheetEl instanceof HTMLLinkElement && sheetEl.href) {
        const sheet = sheetEl.sheet as CSSStyleSheet;
        if (sheet) {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (let j = 0; j < rules.length; j++) {
              combinedCss += rules[j].cssText + '\n';
            }
          }
        }
      }
    } catch (e) {
      // CORS or secure sheets
    }
  });

  // Fallback to direct reading from document.styleSheets
  if (!combinedCss.trim()) {
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            combinedCss += rules[j].cssText + '\n';
          }
        }
      } catch (e) {
        // Safe access
      }
    }
  }

  // Replace oklch(...) occurrences with safe hex / rgb fallbacks computed using Lightness parameter to preserve high-contrast
  const sanitizedCss = combinedCss.replace(/oklch\(([^)]+)\)/gi, (match, p1) => {
    try {
      const parts = p1.trim().split(/\s+/);
      const lightness = parseFloat(parts[0]);
      if (!isNaN(lightness)) {
        if (lightness > 0.9) return '#f8fafc'; // white/light slate background
        if (lightness > 0.8) return '#e2e8f0'; // light gray borders/inputs
        if (lightness > 0.6) return '#94a3b8'; // gray indicators
        if (lightness > 0.4) return '#475569'; // default accessible text slate
        return '#1e293b'; // headings/dark text
      }
    } catch (e) {
      // safe bypass
    }
    return '#64748b'; // standard fallback
  });

  // Mount clean sanitized stylesheet block
  const tempStyle = document.createElement('style');
  tempStyle.id = 'html2canvas-safari-chrome-temp-styles';
  tempStyle.innerHTML = sanitizedCss;
  document.head.appendChild(tempStyle);

  // Disable all original stylesheets containing oklch structures
  originalStylesheets.forEach((sheetEl) => {
    sheetEl.disabled = true;
  });

  try {
    const canvas = await html2canvas(clone, {
      scale: 2, // High DPI rendering
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = 297;
    const pdfHeight = 210;

    const imgWidth = pdfWidth - 20; // 10mm margins on both sides
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10; // y padding
    const contentAreaHeight = pdfHeight - 20;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= contentAreaHeight;

    while (heightLeft > 0) {
      position -= contentAreaHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= contentAreaHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (err) {
    console.error('Unduh PDF error:', err);
  } finally {
    // Restore all developer/production styling sheets
    originalStylesheets.forEach((sheetEl) => {
      sheetEl.disabled = false;
    });

    // Remove parsing workaround temporary style block
    const tempStyleTag = document.getElementById('html2canvas-safari-chrome-temp-styles');
    if (tempStyleTag && tempStyleTag.parentNode) {
      tempStyleTag.parentNode.removeChild(tempStyleTag);
    }

    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
};
