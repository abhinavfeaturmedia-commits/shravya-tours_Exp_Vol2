import * as XLSX from 'xlsx';

export interface ExportColumn<T> {
  header: string;
  key: keyof T | ((item: T) => any);
  width?: number; // Approximate width in characters
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  title?: string; // e.g., "Bookings Report"
  subtitle?: string; // e.g., "Generated on 25-Oct-2026"
}

export const exportToExcel = <T,>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
) => {
  // 1. Resolve row data based on columns
  const rows: any[][] = data.map((item) =>
    columns.map((col) => {
      let value = typeof col.key === 'function' ? col.key(item) : item[col.key];
      // Prevent undefined or null from printing "undefined"
      if (value === undefined || value === null) value = '';
      return value;
    })
  );

  // 2. Prepare the full block of data
  const sheetData: any[][] = [];
  
  // Add metadata padding if title/subtitle specified
  if (options.title) {
    sheetData.push([options.title]);
  }
  if (options.subtitle) {
    sheetData.push([options.subtitle]);
    sheetData.push([]); // Empty row for spacing
  }

  // Header row
  sheetData.push(columns.map(c => c.header));

  // Add the actual rows
  sheetData.push(...rows);

  // 3. Create Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // 4. Calculate proper column widths
  // Minimum width is length of the header or 10
  const colsConfig = columns.map(col => {
    if (col.width) return { wch: col.width };
    const maxContentWidth = rows.reduce((max, row, idx) => {
      const cellVal = String(row[columns.indexOf(col)] || '');
      return Math.max(max, cellVal.length);
    }, col.header.length);
    // Cap at 50 chars so overly long text doesn't make enormous columns
    return { wch: Math.min(Math.max(maxContentWidth, 10), 50) + 2 }; 
  });

  worksheet['!cols'] = colsConfig;

  // Enhance numeric, boolean, date types if possible mapping cleanly, but aoa_to_sheet already guesses well
  // Optionally freeze panes: freeze everything above and including the header row
  const headerRowIndex = options.title ? (options.subtitle ? 3 : 2) : 0;
  worksheet['!freeze'] = {
    xSplit: 0, 
    ySplit: headerRowIndex + 1, 
    topLeftCell: XLSX.utils.encode_cell({c: 0, r: headerRowIndex + 1}),
    activePane: 'bottomLeft',
    state: 'frozen'
  };

  // 5. Create Workbook & Export
  const workbook = XLSX.utils.book_new();
  const sheetName = options.sheetName ? options.sheetName.substring(0, 31) : 'Data'; // Excel max name length is 31
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Save the file
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
};
