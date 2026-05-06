import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data, filename = 'export', columns = []) => {
  const formattedData = data.map(item => {
    const row = {};
    columns.forEach(col => {
      row[col.header] = item[col.key] || '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (data, filename = 'export', columns = [], title = 'Reporte') => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 14, 22);
  
  const headers = columns.map(c => c.header);
  const rows = data.map(item => columns.map(c => String(item[c.key] || '')));

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [229, 0, 125] },
  });

  doc.save(`${filename}.pdf`);
};
