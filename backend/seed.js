/**
 * BillFlow Seed Script
 * Imports all CSV files from seed-data folder in chronological order
 * Run: node seed.js
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { spawn } = require('child_process');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'billflow_db',
  user: process.env.DB_USER || 'billflow_admin',
  password: process.env.DB_PASSWORD || 'BillFlow2025!'
});

// Hebrew month names mapping
const hebrewMonths = {
  1: 'ינואר', 2: 'פברואר', 3: 'מרץ', 4: 'אפריל',
  5: 'מאי', 6: 'יוני', 7: 'יולי', 8: 'אוגוסט',
  9: 'ספטמבר', 10: 'אוקטובר', 11: 'נובמבר', 12: 'דצמבר'
};

// Extract billing info from CSV content
async function extractBillingInfoFromCSV(filePath) {
  try {
    // Read file as UTF-8 (handles BOM automatically when split by lines)
    let content = await fs.readFile(filePath, 'utf8');

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }

    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
    const fromIndex = headers.findIndex(h => h.toLowerCase() === 'from');
    const toIndex = headers.findIndex(h => h.toLowerCase() === 'to');
    const customerIndex = headers.findIndex(h => h.toLowerCase() === 'customer name');

    if (fromIndex === -1 && toIndex === -1) return null;

    const firstDataRow = lines[1].split(',');
    const dateStr = firstDataRow[fromIndex] || firstDataRow[toIndex];
    const dateMatch = dateStr?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

    if (!dateMatch) return null;

    const month = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);

    let municipalityName = 'עיריית ראשון לציון';
    if (customerIndex !== -1 && firstDataRow[customerIndex]) {
      municipalityName = firstDataRow[customerIndex].replace(/"/g, '').trim();
    }

    return {
      billingMonth: month,
      billingYear: year,
      billingPeriod: `${year}-${String(month).padStart(2, '0')}`,
      municipalityName
    };
  } catch (error) {
    console.error('Error extracting billing info:', error.message);
    return null;
  }
}

// Process file with Python script
function processFileWithPython(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scripts/billflow_converter.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pythonProcess = spawn(pythonCmd, [scriptPath, inputPath, outputDir]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => { outputData += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(outputData));
        } catch (e) {
          reject(new Error(`Failed to parse output: ${outputData}`));
        }
      } else {
        reject(new Error(`Python process exited with code ${code}: ${errorData}`));
      }
    });

    pythonProcess.on('error', reject);
  });
}

async function seed() {
  console.log('='.repeat(60));
  console.log('  BillFlow Seed Script');
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    // Ensure admin user exists
    const userCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    let adminId;

    if (userCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const userResult = await client.query(
        'INSERT INTO users (username, password, email, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['admin', hashedPassword, 'admin@billflow.il', 'מנהל מערכת', 'admin']
      );
      adminId = userResult.rows[0].id;
      console.log('Created admin user');
    } else {
      adminId = userCheck.rows[0].id;
      console.log('Admin user exists');
    }

    // Check if data already seeded
    const existingFiles = await client.query('SELECT COUNT(*) as count FROM file_uploads WHERE user_id = $1', [adminId]);
    if (parseInt(existingFiles.rows[0].count) > 0) {
      console.log(`\nDatabase already has ${existingFiles.rows[0].count} files.`);
      console.log('To reseed, delete existing files first: DELETE FROM file_uploads;');
      return;
    }

    // Get seed data files
    // In Docker container, seed-data is mounted at /app/seed-data
    const seedDir = '/app/seed-data';
    const outputDir = '/app/output';
    const uploadDir = '/app/uploads';

    // Create directories
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(uploadDir, { recursive: true });

    // Read and sort seed files
    const files = await fs.readdir(seedDir);
    const csvFiles = files.filter(f => f.endsWith('.csv')).sort();

    console.log(`\nFound ${csvFiles.length} CSV files to import\n`);

    let totalAmount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const filename of csvFiles) {
      const sourcePath = path.join(seedDir, filename);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const destFilename = `${timestamp}_seed_${filename}`;
      const destPath = path.join(uploadDir, destFilename);

      console.log(`Processing: ${filename}`);

      try {
        // Copy file to uploads
        await fs.copyFile(sourcePath, destPath);

        // Extract billing info
        const csvInfo = await extractBillingInfoFromCSV(destPath);

        if (!csvInfo) {
          console.log(`  - Warning: Could not extract billing info, skipping`);
          errorCount++;
          continue;
        }

        // Generate standardized name
        const hebrewMonth = hebrewMonths[csvInfo.billingMonth];
        const shortYear = String(csvInfo.billingYear).slice(-2);
        const standardizedName = `${csvInfo.municipalityName}-${hebrewMonth}-${shortYear}`;

        // Insert file record
        const insertResult = await client.query(
          `INSERT INTO file_uploads
           (original_filename, standardized_name, file_path, file_size, user_id,
            billing_month, billing_year, billing_period, processing_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
           RETURNING id`,
          [filename, standardizedName, `uploads/${destFilename}`,
           (await fs.stat(destPath)).size, adminId,
           csvInfo.billingMonth, csvInfo.billingYear, csvInfo.billingPeriod]
        );

        const fileId = insertResult.rows[0].id;

        // Process with Python
        console.log(`  - Processing with Python converter...`);
        const results = await processFileWithPython(destPath, outputDir);

        if (results.success) {
          // Update database with results
          await client.query(
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
              processed_time = CURRENT_TIMESTAMP
            WHERE id = $11`,
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
              fileId
            ]
          );

          // Insert site billing records for analytics
          if (results.site_records && results.site_records.length > 0) {
            let siteCount = 0;
            for (const site of results.site_records) {
              try {
                await client.query(
                  `INSERT INTO site_billing_records (
                    file_upload_id, site_name, site_id, meter_number, contract_number,
                    billing_period, billing_month, billing_year, season, period_start, period_end,
                    business_entity, tariff_type, meter_connection, priority,
                    kva, transformer_units,
                    peak_consumption, offpeak_consumption, total_consumption,
                    tou_tariff_peak, tou_tariff_offpeak, gc_tariff_peak, gc_tariff_offpeak,
                    kva_cost, distribution_cost, supply_cost, consumption_cost_peak, consumption_cost_offpeak,
                    total_cost, total_cost_vat, total_cost_without_discount,
                    total_discount, discount_peak, discount_offpeak, discount_from_gc_peak, discount_from_gc_offpeak,
                    availability_current, availability_previous, availability_guaranteed, power_factor_fine,
                    document_number
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)`,
                  [
                    fileId, site.site_name, site.site_id, site.meter_number, site.contract_number,
                    site.billing_period, site.billing_month, site.billing_year, site.season, site.period_start, site.period_end,
                    site.business_entity, site.tariff_type, site.meter_connection, site.priority,
                    site.kva, site.transformer_units,
                    site.peak_consumption, site.offpeak_consumption, site.total_consumption,
                    site.tou_tariff_peak, site.tou_tariff_offpeak, site.gc_tariff_peak, site.gc_tariff_offpeak,
                    site.kva_cost, site.distribution_cost, site.supply_cost, site.consumption_cost_peak, site.consumption_cost_offpeak,
                    site.total_cost, site.total_cost_vat, site.total_cost_without_discount,
                    site.total_discount, site.discount_peak, site.discount_offpeak, site.discount_from_gc_peak, site.discount_from_gc_offpeak,
                    site.availability_current, site.availability_previous, site.availability_guaranteed, site.power_factor_fine,
                    site.document_number
                  ]
                );
                siteCount++;
              } catch (siteError) {
                console.log(`    - Warning: Failed to insert site ${site.site_name}: ${siteError.message}`);
              }
            }
            console.log(`  - Inserted ${siteCount} site records`);
          }

          totalAmount += results.csv_total || 0;
          successCount++;
          console.log(`  - Success: ${standardizedName} | ₪${results.csv_total?.toLocaleString() || 0}`);
        } else {
          await client.query(
            'UPDATE file_uploads SET processing_status = $1, processing_errors = $2 WHERE id = $3',
            ['error', results.error || 'Unknown error', fileId]
          );
          errorCount++;
          console.log(`  - Error: ${results.error}`);
        }

      } catch (error) {
        console.log(`  - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('  Seed Complete');
    console.log('='.repeat(60));
    console.log(`  Total files: ${csvFiles.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Total amount: ₪${totalAmount.toLocaleString()}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed
seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
