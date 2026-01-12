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
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rishon_billing',
  user: process.env.DB_USER || 'rishon_admin',
  password: process.env.DB_PASSWORD || 'SecurePass123'
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/output', express.static(path.join(__dirname, '../output')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Initialize database
async function initializeDatabase() {
  try {
    // Test connection
    const client = await pool.connect();
    console.log('Database connected successfully');
    
    // Create default admin user if not exists
    const userCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (userCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (username, password, email, full_name, role) VALUES ($1, $2, $3, $4, $5)',
        ['admin', hashedPassword, 'admin@rishon.il', 'Administrator', 'admin']
      );
      console.log('Default admin user created');
    }
    
    client.release();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT id, username, password, email, full_name, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
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
    res.status(500).json({
      success: false,
      message: 'שגיאת שרת'
    });
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

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Upload file - accept any field name for flexibility
app.post('/api/upload', authenticate, upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Get the first uploaded file (we only expect one CSV)
    const file = req.files[0];
    
    // Validate it's a CSV file
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    if (fileExtension !== 'csv') {
      // Delete the uploaded file if it's not CSV
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.log('Could not delete invalid file');
      }
      return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    // Extract billing period from filename
    let billingMonth = null, billingYear = null, billingPeriod = null;
    
    // Pattern 1: "1.25" = January 2025
    const monthYearMatch = file.originalname.match(/(\d+)\.(\d{2})/);
    if (monthYearMatch) {
      billingMonth = parseInt(monthYearMatch[1]);
      billingYear = 2000 + parseInt(monthYearMatch[2]);
      billingPeriod = `${billingYear}-${String(billingMonth).padStart(2, '0')}`;
    }
    
    // Pattern 2: Hebrew month names
    const hebrewMonths = {
      'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'אפריל': 4,
      'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8,
      'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12
    };
    
    for (const [monthName, monthNum] of Object.entries(hebrewMonths)) {
      if (file.originalname.includes(monthName)) {
        billingMonth = monthNum;
        // Try to extract year
        const yearMatch = file.originalname.match(/20\d{2}/);
        billingYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
        billingPeriod = `${billingYear}-${String(billingMonth).padStart(2, '0')}`;
        break;
      }
    }

    const result = await pool.query(
      `INSERT INTO file_uploads (original_filename, file_path, file_size, user_id, billing_month, billing_year, billing_period) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, original_filename, file_size, upload_time`,
      [file.originalname, `uploads/${file.filename}`, file.size, req.user.id, billingMonth, billingYear, billingPeriod]
    );

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Get files
app.get('/api/files', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM file_uploads WHERE user_id = $1 ORDER BY upload_time DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ success: false, message: 'Failed to get files' });
  }
});

// Process file - with both patterns
app.post('/api/process/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const fileResult = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = fileResult.rows[0];
    
    // Update status to processing
    await pool.query(
      'UPDATE file_uploads SET processing_status = $1 WHERE id = $2',
      ['processing', fileId]
    );

    // Process with Python script
    const scriptPath = path.join(__dirname, 'scripts/transform_final_corrected.py');
    const inputPath = path.join(__dirname, '..', file.file_path);
    const outputDir = path.join(__dirname, '../output');
    const outputFilename = `processed_${Date.now()}.xlsx`;
    const outputPath = path.join(outputDir, outputFilename);

    await fs.mkdir(outputDir, { recursive: true });

    const pythonProcess = spawn('python3', [scriptPath, inputPath, outputPath]);
    
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
        // Update database with success
        await pool.query(
          `UPDATE file_uploads 
           SET processing_status = $1, processed_filename = $2, excel_path = $3, processed_time = CURRENT_TIMESTAMP 
           WHERE id = $4`,
          ['completed', outputFilename, `output/${outputFilename}`, fileId]
        );

        res.json({
          success: true,
          message: 'File processed successfully',
          data: {
            fileId,
            excelFilename: outputFilename,
            downloadUrl: `/api/files/download/${fileId}`
          }
        });
      } else {
        // Update with error
        await pool.query(
          'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
          ['error', errorData || 'Processing failed', fileId]
        );

        res.status(500).json({
          success: false,
          message: 'Processing failed',
          error: errorData
        });
      }
    });

    pythonProcess.on('error', async (error) => {
      console.error('Python process error:', error);
      await pool.query(
        'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
        ['error', error.message, fileId]
      );
      
      res.status(500).json({
        success: false,
        message: 'Failed to start processing',
        error: error.message
      });
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ success: false, message: 'Processing failed' });
  }
});

// Download file
app.get('/api/files/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { format = 'excel' } = req.query;
    
    const result = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = result.rows[0];
    let filePath, filename;
    
    if (format === 'excel' && file.excel_path) {
      filePath = path.join(__dirname, '..', file.excel_path);
      filename = file.processed_filename || 'processed.xlsx';
    } else {
      return res.status(404).json({ success: false, message: 'Processed file not found' });
    }

    res.download(filePath, filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, message: 'Download failed' });
  }
});

// Process file - alternative endpoint that frontend uses
app.post('/api/process', authenticate, async (req, res) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'File ID required' });
    }
    
    const fileResult = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = fileResult.rows[0];
    
    // Update status to processing
    await pool.query(
      'UPDATE file_uploads SET processing_status = $1 WHERE id = $2',
      ['processing', fileId]
    );

    // Process with Python script
    const scriptPath = path.join(__dirname, 'scripts/transform_final_corrected.py');
    const inputPath = path.join(__dirname, '..', file.file_path);
    const outputDir = path.join(__dirname, '../output');
    const outputFilename = `processed_${Date.now()}.xlsx`;
    const outputPath = path.join(outputDir, outputFilename);

    await fs.mkdir(outputDir, { recursive: true });

    const pythonProcess = spawn('python3', [scriptPath, inputPath, outputPath]);
    
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
          // Parse results if JSON
          let results = {};
          try {
            results = JSON.parse(outputData);
          } catch (e) {
            results = { csv_total: 0, excel_total: 0, gap_amount: 0 };
          }
          
          // Update database with success
          await pool.query(
            `UPDATE file_uploads 
             SET processing_status = $1, processed_filename = $2, excel_path = $3, 
                 csv_total = $4, excel_total = $5, gap_amount = $6, processed_time = CURRENT_TIMESTAMP 
             WHERE id = $7`,
            ['completed', outputFilename, `output/${outputFilename}`, 
             results.csv_total || 0, results.excel_total || 0, results.gap_amount || 0, fileId]
          );

          // Generate TSV with proper naming convention
          const now = new Date();
          const yearMonth = now.toISOString().slice(0, 7).replace('-', '');
          const timestamp = now.toISOString().replace(/[-:T]/g, '_').slice(0, 15);
          const tsvFilename = `invoice_lines - ${yearMonth}_${timestamp}.txt`;
          const tsvPath = path.join(outputDir, tsvFilename);
          const tsvScript = path.join(__dirname, 'scripts/convert_to_tsv_simple.py');
          
          const tsvProcess = spawn('python3', [tsvScript, outputPath, tsvPath]);
          
          tsvProcess.on('close', async (tsvCode) => {
            if (tsvCode === 0) {
              await pool.query(
                'UPDATE file_uploads SET tsv_filename = $1, tsv_path = $2 WHERE id = $3',
                [tsvFilename, `output/${tsvFilename}`, fileId]
              );
            }
          });

          res.json({
            success: true,
            message: 'File processed successfully',
            data: {
              fileId,
              excelFilename: outputFilename,
              csvTotal: results.csv_total || 0,
              excelTotal: results.excel_total || 0,
              gapAmount: results.gap_amount || 0,
              downloadUrl: `/api/files/download/${fileId}`
            }
          });
        } catch (dbError) {
          console.error('Database update error:', dbError);
          res.status(500).json({ success: false, message: 'Failed to update results' });
        }
      } else {
        // Update with error
        await pool.query(
          'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
          ['error', errorData || 'Processing failed', fileId]
        );

        res.status(500).json({
          success: false,
          message: 'Processing failed',
          error: errorData
        });
      }
    });

    pythonProcess.on('error', async (error) => {
      console.error('Python process error:', error);
      await pool.query(
        'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
        ['error', error.message, fileId]
      );
      
      res.status(500).json({
        success: false,
        message: 'Failed to start processing',
        error: error.message
      });
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ success: false, message: 'Processing failed' });
  }
});

// Delete file
app.delete('/api/files/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Get file info first
    const fileResult = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Delete physical files
    const filesToDelete = [
      file.file_path,
      file.excel_path,
      file.tsv_path
    ].filter(Boolean);

    for (const filePath of filesToDelete) {
      try {
        const fullPath = path.join(__dirname, '..', filePath);
        await fs.unlink(fullPath);
      } catch (err) {
        console.log(`Could not delete file: ${filePath}`);
      }
    }

    // Delete from database
    await pool.query('DELETE FROM file_uploads WHERE id = $1', [fileId]);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// Download Excel file
app.get('/api/download/excel', authenticate, async (req, res) => {
  try {
    const { fileId } = req.query;
    
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'File ID required' });
    }
    
    const result = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = result.rows[0];
    
    if (!file.excel_path) {
      return res.status(404).json({ success: false, message: 'Excel file not found' });
    }

    const filePath = path.join(__dirname, '..', file.excel_path);
    const filename = file.processed_filename || 'processed.xlsx';
    
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download Excel error:', error);
    res.status(500).json({ success: false, message: 'Download failed' });
  }
});

// Download TSV file
app.get('/api/download/tsv', authenticate, async (req, res) => {
  try {
    const { fileId } = req.query;
    
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'File ID required' });
    }
    
    const result = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = result.rows[0];
    
    if (!file.tsv_path) {
      // Try to generate TSV if not exists
      if (file.excel_path) {
        const outputDir = path.join(__dirname, '../output');
        const now = new Date();
        const yearMonth = now.toISOString().slice(0, 7).replace('-', '');
        const timestamp = now.toISOString().replace(/[-:T]/g, '_').slice(0, 15);
        const tsvFilename = `invoice_lines - ${yearMonth}_${timestamp}.txt`;
        const tsvPath = path.join(outputDir, tsvFilename);
        const excelPath = path.join(__dirname, '..', file.excel_path);
        const tsvScript = path.join(__dirname, 'scripts/convert_to_tsv_simple.py');
        
        const tsvProcess = spawn('python3', [tsvScript, excelPath, tsvPath]);
        
        return new Promise((resolve) => {
          tsvProcess.on('close', async (code) => {
            if (code === 0) {
              await pool.query(
                'UPDATE file_uploads SET tsv_filename = $1, tsv_path = $2 WHERE id = $3',
                [tsvFilename, `output/${tsvFilename}`, fileId]
              );
              res.download(tsvPath, tsvFilename);
            } else {
              res.status(500).json({ success: false, message: 'Failed to generate TSV' });
            }
          });
        });
      } else {
        return res.status(404).json({ success: false, message: 'TSV file not found' });
      }
    }

    const filePath = path.join(__dirname, '..', file.tsv_path);
    const filename = file.tsv_filename || 'invoice_lines.txt';
    
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download TSV error:', error);
    res.status(500).json({ success: false, message: 'Download failed' });
  }
});

// Analytics endpoint for consumption data
app.get('/api/analytics/consumption', authenticate, async (req, res) => {
  try {
    const { year = 2025 } = req.query;
    
    // Get monthly aggregated data grouped by billing period
    const monthlyData = await pool.query(`
      SELECT 
        billing_period,
        billing_month,
        billing_year,
        COUNT(DISTINCT id) as file_count,
        SUM(csv_total) as total_csv,
        SUM(excel_total) as total_excel,
        SUM(gap_amount) as total_gap,
        AVG(gap_amount) as avg_gap,
        MAX(csv_total) as max_csv,
        MIN(csv_total) as min_csv
      FROM file_uploads
      WHERE processing_status = 'completed' 
        AND billing_year = $1
        AND billing_period IS NOT NULL
      GROUP BY billing_period, billing_month, billing_year
      ORDER BY billing_period
    `, [year]);

    // Get overall statistics
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_files,
        SUM(csv_total) as total_cost,
        SUM(excel_total) as verified_cost,
        SUM(gap_amount) as total_gap,
        AVG(CASE WHEN csv_total > 0 THEN (gap_amount / csv_total * 100) ELSE 0 END) as avg_gap_percentage
      FROM file_uploads
      WHERE processing_status = 'completed'
    `);

    // Get top files by gap amount
    const topGaps = await pool.query(`
      SELECT 
        original_filename,
        csv_total,
        excel_total,
        gap_amount,
        upload_time
      FROM file_uploads
      WHERE processing_status = 'completed' AND gap_amount IS NOT NULL
      ORDER BY gap_amount DESC
      LIMIT 5
    `);

    // Get available years
    const availableYears = await pool.query(`
      SELECT DISTINCT billing_year 
      FROM file_uploads 
      WHERE billing_year IS NOT NULL 
      ORDER BY billing_year DESC
    `);

    res.json({
      success: true,
      data: {
        monthly: monthlyData.rows,
        overall: overallStats.rows[0],
        topGaps: topGaps.rows,
        availableYears: availableYears.rows.map(r => r.billing_year),
        currentYear: parseInt(year),
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get analytics' });
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
        COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending_files
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
        files: stats.rows[0],
        recentFiles: recentFiles.rows
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    // Create required directories
    const dirs = ['../uploads', '../output', '../logs'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(__dirname, dir), { recursive: true });
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();