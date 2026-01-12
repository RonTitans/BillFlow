# RonGuide - Rishon LeZion Municipal Billing System
## Complete AWS Deployment Documentation

---

## 🚀 **DEPLOYMENT SUCCESS DETAILS**
**Live URL:** https://rishon.titans.global  
**Server IP:** 18.192.238.102  
**AWS Instance:** EC2 Ubuntu 22.04 (ip-172-31-37-122)  
**Deployment Date:** August 21, 2025  

---

## 📦 **DOCKER CONTAINERS**

### Container Names & Services:
1. **rishon-postgres** - PostgreSQL 15 Database
2. **rishon-backend** - Node.js Backend API (port 5000)
3. **rishon-frontend** - React Frontend (port 80 internal)
4. **rishon-nginx** - Nginx Reverse Proxy (ports 80, 443)

### Docker Compose Files:
- **docker-compose.aws.yml** - Main production file (USE THIS ON AWS)
- **docker-compose.yml** - Local development
- **docker-compose.prod.yml** - Old production (don't use - has SSL issues)

---

## 🗄️ **DATABASE INFORMATION**

### Database Credentials:
```
Database Name: rishon_billing
Database User: rishon_admin
Database Password: [Set in .env file]
Database Port: 5432
Database Host: postgres (internal) / localhost:5432 (external)
```

### Database Tables:
```sql
1. users                - User accounts and authentication
2. file_uploads         - Uploaded CSV file records
3. billing_data         - Processed billing information (MAIN DATA TABLE)
4. processed_data       - Processing results and summaries
5. processing_logs      - Processing history and errors
6. user_sessions        - Active user sessions
7. audit_logs          - System audit trail
```

### Important Table Structures:

#### billing_data (Main table for dashboard):
```sql
- id                    SERIAL PRIMARY KEY
- customer_name         VARCHAR(255)
- customer_id           VARCHAR(100)
- meter_number          VARCHAR(100)
- billing_period        VARCHAR(20)
- amount                DECIMAL(10,2)
- consumption_kwh       DECIMAL(10,2)
- peak_consumption      DECIMAL(10,2)
- off_peak_consumption  DECIMAL(10,2)
- status                VARCHAR(50)
- created_at            TIMESTAMP
- updated_at            TIMESTAMP
```

#### file_uploads:
```sql
- id                    SERIAL PRIMARY KEY
- original_filename     VARCHAR(255)
- processed_filename    VARCHAR(255)
- file_path            VARCHAR(500)
- file_size            BIGINT
- status               VARCHAR(50) - 'pending', 'processing', 'completed', 'failed'
- upload_time          TIMESTAMP
- processed_at         TIMESTAMP
- billing_period       VARCHAR(20)
```

---

## 👤 **USER CREDENTIALS**

### Admin Users:
1. **Username:** admin  
   **Password:** admin123  
   **Role:** Administrator (default user)

2. **Username:** titans  
   **Password:** Tt123456!  
   **Role:** Administrator (custom user we created)

---

## 📁 **FILE STRUCTURE**

### Key Directories:
```
/home/ubuntu/RishonLetzionMuni-main/
├── backend/
│   ├── Dockerfile              # Fixed Docker configuration
│   ├── server-minimal.js       # Main backend server
│   ├── server.js              # Alternative server
│   ├── requirements.txt       # Python dependencies
│   └── scripts/               # Python processing scripts
│       ├── transform_final_corrected.py
│       ├── convert_to_tsv.py
│       └── convert_to_tsv_simple.py
├── frontend/
│   ├── Dockerfile.prod        # Production frontend Docker
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx  # Main dashboard page
│   │   │   ├── Upload.jsx     # File upload page
│   │   │   └── History.jsx    # Processing history
│   └── nginx.conf             # Frontend nginx config
├── database/
│   ├── init.sql               # Database initialization
│   └── add_billing_period.sql # Additional DB setup
├── nginx/
│   ├── nginx.aws.conf         # Current nginx config (HTTP)
│   ├── nginx.ssl.conf         # SSL config (when SSL is ready)
│   └── nginx.prod.conf        # Old production config
├── uploads/                   # Uploaded CSV files
├── output/                    # Processed files
├── logs/                      # Application logs
└── docker-compose.aws.yml     # Main deployment file
```

---

## 🔧 **COMMON COMMANDS**

### SSH to Server:
```bash
ssh -i your-key.pem ubuntu@18.192.238.102
cd /home/ubuntu/RishonLetzionMuni-main
```

### Docker Commands:
```bash
# View running containers
docker ps

# View logs
docker-compose -f docker-compose.aws.yml logs -f
docker-compose -f docker-compose.aws.yml logs -f backend
docker-compose -f docker-compose.aws.yml logs -f nginx

# Restart services
docker-compose -f docker-compose.aws.yml restart

# Stop all services
docker-compose -f docker-compose.aws.yml down

# Start all services
docker-compose -f docker-compose.aws.yml up -d

# Rebuild after code changes
docker-compose -f docker-compose.aws.yml build --no-cache
docker-compose -f docker-compose.aws.yml up -d
```

### Database Commands:
```bash
# Connect to database
docker-compose -f docker-compose.aws.yml exec postgres psql -U rishon_admin -d rishon_billing

# Common SQL queries:
SELECT COUNT(*) FROM billing_data;
SELECT COUNT(*) FROM file_uploads;
SELECT * FROM users;
SELECT * FROM billing_data ORDER BY created_at DESC LIMIT 10;

# Backup database
docker-compose -f docker-compose.aws.yml exec postgres pg_dump -U rishon_admin rishon_billing > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose -f docker-compose.aws.yml exec -T postgres psql -U rishon_admin rishon_billing < backup.sql
```

---

## ⚠️ **KNOWN ISSUES & FIXES**

### Issue 1: Dashboard Not Showing Data
**Problem:** Dashboard shows empty even after processing files  
**Cause:** Processed data not being inserted into `billing_data` table  
**Fix:** Need to modify backend to insert processed CSV data into billing_data table after processing

### Issue 2: File Processing Success but No Data Saved
**Problem:** Files process successfully but data isn't saved to database  
**Current Workaround:** Manually parse TSV output files and insert into billing_data table  
**Permanent Fix Needed:** Update `/app/server-minimal.js` to insert data after processing

### Issue 3: SSL Certificate
**Status:** HTTP works, HTTPS configured but certificate not yet installed  
**To Complete:**
```bash
sudo certbot certonly --standalone -d rishon.titans.global
# Then update docker-compose.aws.yml to use nginx.ssl.conf
```

---

## 🚀 **DEPLOYMENT WORKFLOW**

### To Deploy Updates:
1. Make changes locally
2. Push to GitHub repository
3. SSH to server
4. Pull changes:
   ```bash
   cd /home/ubuntu/RishonLetzionMuni-main
   git pull origin main
   ```
5. Rebuild and restart:
   ```bash
   docker-compose -f docker-compose.aws.yml build --no-cache
   docker-compose -f docker-compose.aws.yml down
   docker-compose -f docker-compose.aws.yml up -d
   ```

### To Add New User:
```bash
# Generate password hash
docker-compose -f docker-compose.aws.yml exec backend node -e 'console.log(require("bcryptjs").hashSync("YourPassword", 10))'

# Insert user
docker-compose -f docker-compose.aws.yml exec postgres psql -U rishon_admin -d rishon_billing
INSERT INTO users (username, password, email, role, created_at) 
VALUES ('newuser', 'HASH_FROM_ABOVE', 'email@domain.com', 'admin', NOW());
```

---

## 📊 **DATA FLOW**

1. **Upload:** User uploads CSV file via web interface
2. **Storage:** File saved to `/uploads/` directory and recorded in `file_uploads` table
3. **Processing:** Python script processes CSV and creates:
   - Excel file in `/output/`
   - TSV file in `/output/`
4. **Database:** Processed data should be inserted into `billing_data` table
5. **Dashboard:** Reads from `billing_data` table to display statistics

---

## 🔐 **ENVIRONMENT VARIABLES**

Location: `.env` file (created from `.env.aws`)

```env
# Database
DB_NAME=rishon_billing
DB_USER=rishon_admin
DB_PASSWORD=[Your secure password]

# Backend
JWT_SECRET=[Your JWT secret]
NODE_ENV=production
PORT=5000

# Frontend URLs
VITE_API_URL=https://rishon.titans.global/api
FRONTEND_URL=https://rishon.titans.global
```

---

## 🆘 **TROUBLESHOOTING**

### Check System Health:
```bash
# Run troubleshooting script
./troubleshoot-aws.sh

# Check disk space
df -h

# Check memory
free -h

# Check port usage
sudo netstat -tlnp | grep -E ':(80|443|5000|5432)'
```

### If Services Won't Start:
```bash
# Check logs for errors
docker-compose -f docker-compose.aws.yml logs

# Remove all containers and restart
docker-compose -f docker-compose.aws.yml down
docker system prune -a
docker-compose -f docker-compose.aws.yml up -d
```

### Database Connection Issues:
```bash
# Test database connection
docker-compose -f docker-compose.aws.yml exec postgres pg_isready

# Check if database exists
docker-compose -f docker-compose.aws.yml exec postgres psql -U rishon_admin -l
```

---

## 📝 **DEVELOPER NOTES**

### What We Fixed on Aug 21, 2025:
1. **Fixed Backend Dockerfile** - Added proper package.json and requirements.txt copying
2. **Created docker-compose.aws.yml** - Simplified version without SSL complexity
3. **Created nginx.aws.conf** - Basic HTTP configuration
4. **Fixed Database Tables** - Added missing billing_data and processed_data tables
5. **Added User 'titans'** - Created additional admin user
6. **Configured Domain** - Connected rishon.titans.global to Elastic IP

### Still Needs Work:
1. **Dashboard Data Integration** - Need to modify backend to save processed data to billing_data table
2. **SSL Certificate** - Need to complete Let's Encrypt setup
3. **Automated Backups** - Set up cron job for database backups
4. **Monitoring** - Add CloudWatch or similar monitoring

---

## 📞 **SUPPORT CONTACTS**

**AWS Region:** eu-central-1 (Frankfurt)  
**Domain Registrar:** [Your registrar for titans.global]  
**GitHub Repository:** https://github.com/RonTitans/RishonLetzionMuni  

---

## 🎯 **QUICK START FOR NEW DEVELOPER**

1. Get SSH key from Ron
2. SSH to server: `ssh -i key.pem ubuntu@18.192.238.102`
3. Navigate to: `cd /home/ubuntu/RishonLetzionMuni-main`
4. Check status: `docker ps`
5. View logs: `docker-compose -f docker-compose.aws.yml logs -f`
6. Access site: https://rishon.titans.global
7. Login with: titans / Tt123456!

---

**Document Created:** August 21, 2025  
**Last Updated:** August 21, 2025  
**Created By:** Claude & Ron  
**Purpose:** Complete system documentation for Rishon LeZion Municipal Billing System AWS deployment