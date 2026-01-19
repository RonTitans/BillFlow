/**
 * BillFlow Backend Server
 * Electricity Billing System for Rishon LeZion Municipality
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'billflow-secret-key';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'billflow_db',
  user: process.env.DB_USER || 'billflow_admin',
  password: process.env.DB_PASSWORD || 'BillFlow2025!'
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Keep original Hebrew filename but add timestamp
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Initialize database
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('BillFlow: Database connected successfully');

    // Create default admin user
    const userCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (userCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (username, password, email, full_name, role) VALUES ($1, $2, $3, $4, $5)',
        ['admin', hashedPassword, 'admin@billflow.il', 'מנהל מערכת', 'admin']
      );
      console.log('BillFlow: Default admin user created');
    }

    client.release();
  } catch (error) {
    console.error('BillFlow: Database initialization error:', error);
  }
}

// Hebrew month names mapping
const hebrewMonths = {
  1: 'ינואר',
  2: 'פברואר',
  3: 'מרץ',
  4: 'אפריל',
  5: 'מאי',
  6: 'יוני',
  7: 'יולי',
  8: 'אוגוסט',
  9: 'ספטמבר',
  10: 'אוקטובר',
  11: 'נובמבר',
  12: 'דצמבר'
};

// Extract municipality name from filename
function extractMunicipalityName(filename) {
  // Common patterns: "עיריית ראשון מרכז", "עיריית ראשון לציון", etc.
  const muniPatterns = [
    /עיריית\s+[\u0590-\u05FF\s]+/,  // "עיריית X"
    /מועצה\s+[\u0590-\u05FF\s]+/,   // "מועצה X"
  ];

  for (const pattern of muniPatterns) {
    const match = filename.match(pattern);
    if (match) {
      // Clean up the name - remove extra spaces and trailing numbers/dates
      return match[0].replace(/\s+\d.*$/, '').trim();
    }
  }

  // Default to generic name if not found
  return 'עיריית ראשון לציון';
}

// Generate standardized Hebrew filename
function generateStandardizedFilename(originalFilename, billingMonth, billingYear) {
  const muniName = extractMunicipalityName(originalFilename);
  const hebrewMonth = hebrewMonths[billingMonth] || `חודש ${billingMonth}`;
  const shortYear = String(billingYear).slice(-2);

  return `${muniName}-${hebrewMonth}-${shortYear}`;
}

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'נדרשת התחברות' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'טוקן לא תקין' });
  }
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'BillFlow',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, username, password, email, full_name, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'שם משתמש או סיסמה שגויים' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'שם משתמש או סיסמה שגויים' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'שגיאת שרת' });
  }
});

// Verify token
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, email, full_name, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        fullName: result.rows[0].full_name,
        role: result.rows[0].role
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Helper function to extract billing info from CSV content
async function extractBillingInfoFromCSV(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return null;
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, '')); // Remove BOM

    // Find column indices
    const fromIndex = headers.findIndex(h => h.toLowerCase() === 'from');
    const toIndex = headers.findIndex(h => h.toLowerCase() === 'to');
    const customerIndex = headers.findIndex(h => h.toLowerCase() === 'customer name');

    if (fromIndex === -1 && toIndex === -1) {
      return null;
    }

    // Parse first data row
    const firstDataRow = lines[1].split(',');

    // Extract date - use "From" column (format: DD/MM/YYYY)
    const dateStr = firstDataRow[fromIndex] || firstDataRow[toIndex];
    const dateMatch = dateStr?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

    if (!dateMatch) {
      return null;
    }

    const month = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);

    // Extract customer name (municipality)
    let municipalityName = 'עיריית ראשון לציון';
    if (customerIndex !== -1 && firstDataRow[customerIndex]) {
      municipalityName = firstDataRow[customerIndex].replace(/"/g, '').trim();
    }

    return {
      billingMonth: month,
      billingYear: year,
      billingPeriod: `${year}-${String(month).padStart(2, '0')}`,
      municipalityName: municipalityName
    };
  } catch (error) {
    console.error('Error extracting billing info from CSV:', error);
    return null;
  }
}

// Upload file
app.post('/api/upload', authenticate, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'לא נבחר קובץ' });
    }

    const file = req.file;
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uploadedFilePath = path.join(__dirname, 'uploads', file.filename);

    // Extract billing info from CSV content
    const csvInfo = await extractBillingInfoFromCSV(uploadedFilePath);

    let billingMonth = null, billingYear = null, billingPeriod = null, municipalityName = null;

    if (csvInfo) {
      billingMonth = csvInfo.billingMonth;
      billingYear = csvInfo.billingYear;
      billingPeriod = csvInfo.billingPeriod;
      municipalityName = csvInfo.municipalityName;
    } else {
      // Fallback: Try to extract from filename
      // Pattern: "XX-YY" where XX is month, YY is year (e.g., "12-25" = December 2025)
      const monthYearMatch = originalName.match(/(\d{1,2})-(\d{2})/);
      if (monthYearMatch) {
        billingMonth = parseInt(monthYearMatch[1]);
        billingYear = 2000 + parseInt(monthYearMatch[2]);
        billingPeriod = `${billingYear}-${String(billingMonth).padStart(2, '0')}`;
      }
      // Try to extract municipality from filename
      municipalityName = extractMunicipalityName(originalName);
    }

    // Generate standardized Hebrew filename
    let standardizedName = originalName;
    if (billingMonth && billingYear && municipalityName) {
      const hebrewMonth = hebrewMonths[billingMonth] || `חודש ${billingMonth}`;
      const shortYear = String(billingYear).slice(-2);
      standardizedName = `${municipalityName}-${hebrewMonth}-${shortYear}`;
    }

    // Check for duplicate billing period (only completed files)
    if (billingPeriod) {
      const duplicateCheck = await pool.query(
        `SELECT id, original_filename, standardized_name, processing_status
         FROM file_uploads
         WHERE billing_period = $1 AND user_id = $2 AND processing_status = 'completed'`,
        [billingPeriod, req.user.id]
      );

      if (duplicateCheck.rows.length > 0) {
        // Delete the uploaded file since we're rejecting it
        await fs.unlink(uploadedFilePath).catch(() => {});

        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'החשבונית הזו כבר נותחה וקיימת במערכת',
          existingFile: {
            id: duplicateCheck.rows[0].id,
            name: duplicateCheck.rows[0].standardized_name || duplicateCheck.rows[0].original_filename,
            billingPeriod: billingPeriod
          }
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO file_uploads (original_filename, standardized_name, file_path, file_size, user_id, billing_month, billing_year, billing_period)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [originalName, standardizedName, `uploads/${file.filename}`, file.size, req.user.id, billingMonth, billingYear, billingPeriod]
    );

    res.json({
      success: true,
      message: 'הקובץ הועלה בהצלחה',
      data: {
        ...result.rows[0],
        displayName: standardizedName
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בהעלאת הקובץ' });
  }
});

// Get files
app.get('/api/files', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM file_uploads WHERE user_id = $1 ORDER BY upload_time DESC',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת הקבצים' });
  }
});

// Process file
app.post('/api/process', authenticate, async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ success: false, message: 'נדרש מזהה קובץ' });
    }

    const fileResult = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'הקובץ לא נמצא' });
    }

    const file = fileResult.rows[0];

    // Update status to processing
    await pool.query(
      'UPDATE file_uploads SET processing_status = $1 WHERE id = $2',
      ['processing', fileId]
    );

    // Process with Python script
    const scriptPath = path.join(__dirname, 'scripts/billflow_converter.py');
    const inputPath = path.join(__dirname, file.file_path);
    const outputDir = path.join(__dirname, 'output');

    await fs.mkdir(outputDir, { recursive: true });

    // Use python3 on Linux/Docker, python on Windows
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pythonProcess = spawn(pythonCmd, [scriptPath, inputPath, outputDir]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const results = JSON.parse(outputData);

          if (results.success) {
            // Update database with results
            await pool.query(
              `UPDATE file_uploads SET
                processing_status = 'completed',
                processed_filename = $1,
                excel_path = $2,
                tsv_filename = $3,
                tsv_path = $4,
                csv_total = $5,
                tsv_total = $6,
                gap_amount = $7,
                perfect_match = $8,
                total_rows = $9,
                included_rows = $10,
                billing_month = $11,
                billing_year = $12,
                billing_period = $13,
                processed_time = CURRENT_TIMESTAMP
              WHERE id = $14`,
              [
                results.excel_filename,
                `output/${results.excel_filename}`,
                results.tsv_filename,
                `output/${results.tsv_filename}`,
                results.csv_total,
                results.tsv_total,
                results.difference,
                results.perfect_match,
                results.total_rows,
                results.included_rows,
                results.billing_month,
                results.billing_year,
                results.billing_period,
                fileId
              ]
            );

            res.json({
              success: true,
              message: results.perfect_match ? 'העיבוד הושלם - התאמה מושלמת!' : 'העיבוד הושלם',
              data: {
                fileId,
                csvTotal: results.csv_total,
                tsvTotal: results.tsv_total,
                difference: results.difference,
                perfectMatch: results.perfect_match,
                totalRows: results.total_rows,
                excelFilename: results.excel_filename,
                tsvFilename: results.tsv_filename,
                billingPeriod: results.billing_period
              }
            });
          } else {
            throw new Error(results.error || 'Processing failed');
          }
        } catch (parseError) {
          console.error('Parse error:', parseError, 'Output:', outputData);
          await pool.query(
            'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
            ['error', parseError.message, fileId]
          );
          res.status(500).json({ success: false, message: 'שגיאה בעיבוד התוצאות' });
        }
      } else {
        await pool.query(
          'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
          ['error', errorData || 'Processing failed', fileId]
        );
        res.status(500).json({ success: false, message: 'שגיאה בעיבוד הקובץ', error: errorData });
      }
    });

    pythonProcess.on('error', async (error) => {
      console.error('Python process error:', error);
      await pool.query(
        'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
        ['error', error.message, fileId]
      );
      res.status(500).json({ success: false, message: 'שגיאה בהפעלת העיבוד' });
    });

  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בעיבוד' });
  }
});

// Download Excel
app.get('/api/download/excel', authenticate, async (req, res) => {
  try {
    const { fileId } = req.query;

    const result = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].excel_path) {
      return res.status(404).json({ success: false, message: 'הקובץ לא נמצא' });
    }

    const file = result.rows[0];
    const filePath = path.join(__dirname, file.excel_path);

    res.download(filePath, file.processed_filename);
  } catch (error) {
    console.error('Download Excel error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בהורדה' });
  }
});

// Download TSV
app.get('/api/download/tsv', authenticate, async (req, res) => {
  try {
    const { fileId } = req.query;

    const result = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].tsv_path) {
      return res.status(404).json({ success: false, message: 'הקובץ לא נמצא' });
    }

    const file = result.rows[0];
    const filePath = path.join(__dirname, file.tsv_path);

    res.download(filePath, file.tsv_filename);
  } catch (error) {
    console.error('Download TSV error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בהורדה' });
  }
});

// Delete file
app.delete('/api/files/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileResult = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'הקובץ לא נמצא' });
    }

    const file = fileResult.rows[0];

    // Delete physical files
    const filesToDelete = [file.file_path, file.excel_path, file.tsv_path].filter(Boolean);
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(path.join(__dirname, filePath));
      } catch (err) {
        console.log(`Could not delete: ${filePath}`);
      }
    }

    await pool.query('DELETE FROM file_uploads WHERE id = $1', [fileId]);

    res.json({ success: true, message: 'הקובץ נמחק בהצלחה' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'שגיאה במחיקה' });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_files,
        COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_files,
        COUNT(CASE WHEN processing_status = 'error' THEN 1 END) as error_files,
        COUNT(CASE WHEN perfect_match = true THEN 1 END) as perfect_matches,
        SUM(csv_total) as total_amount
      FROM file_uploads
      WHERE user_id = $1
    `, [req.user.id]);

    const recentFiles = await pool.query(`
      SELECT * FROM file_uploads
      WHERE user_id = $1
      ORDER BY upload_time DESC
      LIMIT 10
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        stats: stats.rows[0],
        recentFiles: recentFiles.rows
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת הנתונים' });
  }
});

// Analytics
app.get('/api/analytics/consumption', authenticate, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyData = await pool.query(`
      SELECT
        billing_period,
        billing_month,
        billing_year,
        COUNT(*) as file_count,
        SUM(csv_total) as total_csv,
        SUM(tsv_total) as total_tsv,
        SUM(gap_amount) as total_gap,
        COUNT(CASE WHEN perfect_match = true THEN 1 END) as perfect_matches
      FROM file_uploads
      WHERE processing_status = 'completed'
        AND billing_year = $1
      GROUP BY billing_period, billing_month, billing_year
      ORDER BY billing_period
    `, [year]);

    const overallStats = await pool.query(`
      SELECT
        COUNT(*) as total_files,
        SUM(csv_total) as total_cost,
        COUNT(CASE WHEN perfect_match = true THEN 1 END) as perfect_matches
      FROM file_uploads
      WHERE processing_status = 'completed'
    `);

    res.json({
      success: true,
      data: {
        monthly: monthlyData.rows,
        overall: overallStats.rows[0],
        currentYear: parseInt(year)
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת האנליטיקה' });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    const dirs = ['../uploads', '../output', '../logs'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(__dirname, dir), { recursive: true });
    }

    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('  BillFlow Server Started');
      console.log('='.repeat(50));
      console.log(`  Port: ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('Failed to start BillFlow server:', error);
    process.exit(1);
  }
}

startServer();
