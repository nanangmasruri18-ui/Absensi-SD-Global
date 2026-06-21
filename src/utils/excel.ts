/**
 * Excel Import and Export helper functions using CSV/XML format.
 * CSV with BOM (Byte Order Mark) is used to ensure compatibility with Microsoft Excel in all locales.
 */

// Add BOM to make Excel read Indonesian characters (like spaces, accents, formatting) correctly
const BOM = '\uFEFF';

export const downloadCsvTemplateSiswa = () => {
  const headers = ['NISN/NIS', 'Nama Siswa', 'Jenis Kelamin (L/P)', 'Tempat Lahir', 'Tanggal Lahir (TTTT-BB-HH)', 'Kelas'];
  const sampleRows = [
    ['0151234567', 'Budi Pratama', 'L', 'Jakarta', '2019-01-15', 'Kelas 1A'],
    ['0157654321', 'Siti Aminah', 'P', 'Bandung', '2019-08-22', 'Kelas 1A']
  ];
  
  const csvContent = BOM + [
    headers.join(';'),
    ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_siswa.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface ParsedSiswa {
  nisn: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  kelasNama: string;
  isValid: boolean;
  notes: string[];
}

export const parseSiswaCsv = (text: string, existingClasses: { id: string; nama: string }[]): ParsedSiswa[] => {
  // Let's divide by lines
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const list: ParsedSiswa[] = [];
  
  // Try to determine separator (either comma or semicolon)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';

  // Process rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse CSV row while handling quotes
    const regex = new RegExp(`\\s*("(?:""|[^"])*"|[^"${separator}]+|)\\s*`, 'g');
    const cells: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex++; // Avoid infinite loops
      }
      cells.push(match[1]);
    }
    // Remove extra empty cell at the end if regex matches empty end-of-line
    if (cells.length > 0 && line.endsWith(separator) === false && cells[cells.length - 1] === '') {
      cells.pop();
    }

    // Clean quotes
    const cleanCells = cells.slice(0, 6).map(c => {
      let val = c.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      return val.replace(/""/g, '"').trim();
    });

    if (cleanCells.length === 0 || cleanCells.every(c => c === '')) continue;

    const [nisn, nama, jkInput, tempat, tanggal, kelasInput] = cleanCells;
    const notes: string[] = [];
    let isValid = true;

    if (!nisn) {
      notes.push('NISN/NIS wajib diisi');
      isValid = false;
    }
    if (!nama) {
      notes.push('Nama Siswa wajib diisi');
      isValid = false;
    }

    const jk = (jkInput || '').toUpperCase();
    if (jk !== 'L' && jk !== 'P') {
      notes.push('Jenis Kelamin harus L atau P');
      isValid = false;
    }

    if (!tempat) {
      notes.push('Tempat Lahir wajib diisi');
      isValid = false;
    }

    // Basic date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!tanggal || !dateRegex.test(tanggal)) {
      notes.push('Tanggal Lahir harus berformat TTTT-BB-HH (e.g. 2019-01-15)');
      isValid = false;
    }

    if (!kelasInput) {
      notes.push('Kelas wajib diisi');
      isValid = false;
    } else {
      const clsMatch = existingClasses.find(c => c.nama.toLowerCase() === kelasInput.toLowerCase());
      if (!clsMatch) {
         notes.push(`Kelas "${kelasInput}" tidak ditemukan di database. Pastikan kelas sudah dibuat di Menu Data Kelas.`);
         isValid = false;
      }
    }

    list.push({
      nisn: nisn || '',
      nama: nama || '',
      jenisKelamin: jk === 'L' || jk === 'P' ? jk : 'L',
      tempatLahir: tempat || '',
      tanggalLahir: tanggal || '',
      kelasNama: kelasInput || '',
      isValid,
      notes,
    });
  }

  return list;
};

// Export Monthly Recapitulation to CSV in Excel-friendly layout
export interface MonthlyExportRow {
  no: number;
  nama: string;
  kehadiranLog: (string | number)[]; // 1 to 31 states (or empty space)
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
}

export const exportMonthlyToExcel = (
  schoolName: string,
  className: string,
  monthName: string,
  year: number,
  daysInMonth: number,
  rows: MonthlyExportRow[]
) => {
  const fileTitle = `REKAP_BULANAN_${className.replace(/\s+/g, '_')}_${monthName}_${year}`;
  
  // Set up meta headers
  const metaLines = [
    [`REKAPITULASI ABSENSI BULANAN`],
    [`Sekolah`, schoolName],
    [`Kelas`, className],
    [`Bulan`, `${monthName} ${year}`],
    [],
  ];

  // Daily headers: No, Nama Siswa, 1, 2, ..., [daysInMonth], H, S, I, A
  const tableHeaders = ['No', 'Nama Siswa'];
  for (let d = 1; d <= daysInMonth; d++) {
    tableHeaders.push(String(d));
  }
  tableHeaders.push('H', 'S', 'I', 'A');

  const contentRows = rows.map(r => {
    return [
      r.no,
      r.nama,
      ...r.kehadiranLog,
      r.hadir,
      r.sakit,
      r.izin,
      r.alfa
    ];
  });

  const csvContent = BOM + [
    ...metaLines.map(line => line.join(';')),
    tableHeaders.join(';'),
    ...contentRows.map(row => row.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(';'))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileTitle}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export Semester Recapitulation to Excel
export interface SemesterExportRow {
  no: number;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  persentase: string;
}

export const exportSemesterToExcel = (
  schoolName: string,
  className: string,
  semesterName: string,
  tahunAjaran: string,
  rows: SemesterExportRow[]
) => {
  const fileTitle = `REKAP_SEMESTER_${className.replace(/\s+/g, '_')}_${semesterName.replace(/\s+/g, '_')}`;

  const metaLines = [
    [`REKAPITULASI KEHADIRAN SEMESTER`],
    [`Sekolah`, schoolName],
    [`Kelas`, className],
    [`Semester / TA`, `${semesterName} (${tahunAjaran})`],
    [],
  ];

  const tableHeaders = ['No', 'NISN/NIS', 'Nama Siswa', 'JK', 'Total Hadir', 'Total Sakit', 'Total Izin', 'Total Alfa', 'Persentase Kehadiran'];

  const contentRows = rows.map(r => [
    r.no,
    r.nisn,
    r.nama,
    r.jenisKelamin,
    r.hadir,
    r.sakit,
    r.izin,
    r.alfa,
    r.persentase
  ]);

  const csvContent = BOM + [
    ...metaLines.map(line => line.join(';')),
    tableHeaders.join(';'),
    ...contentRows.map(row => row.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(';'))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileTitle}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
