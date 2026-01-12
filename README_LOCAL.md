# 🚀 Running Rishon LeZion Billing System Locally

## Prerequisites

✅ **Docker Desktop for Windows** must be installed and running
- Download from: https://www.docker.com/products/docker-desktop/

## Quick Start

### 1. Start Docker Desktop
Make sure Docker Desktop is running (you should see the whale icon in your system tray).

### 2. Start the Application

**Option A: Using the batch file (Recommended)**
```batch
double-click start-local.bat
```

**Option B: Using command line**
```bash
docker-compose up --build -d
```

### 3. Access the Application

Wait about 30-60 seconds for all services to start, then open:

- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:5000/health
- 💾 **Database**: localhost:5432

### 4. Login

- **Username**: `admin`
- **Password**: `admin123`

## 📋 Testing the Complete Workflow

### Step 1: Upload CSV File
1. Login to the system
2. Go to "העלאת קבצים" (File Upload)
3. Click or drag to upload `sample_test.csv` (included in the project)
4. Wait for upload confirmation

### Step 2: Process the File
1. After upload, click "עיבוד" (Process)
2. The system will:
   - Convert CSV to Excel format
   - Calculate totals and gaps
   - Show comparison results

### Step 3: View Results
- See the CSV total amount
- See the Excel total amount
- View the gap (difference) and percentage

### Step 4: Download Files
- Download processed Excel file
- Download TSV file for import

## 🛠️ Useful Commands

### View Logs
```bash
docker-compose logs -f
```

### View specific service logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop the Application
```batch
double-click stop-local.bat
```
Or:
```bash
docker-compose down
```

### Reset Everything (including database)
```bash
docker-compose down -v
docker-compose up --build -d
```

### Check Service Status
```bash
docker-compose ps
```

## 🐛 Troubleshooting

### Issue: "Docker is not running"
**Solution**: Start Docker Desktop and wait for it to fully initialize

### Issue: Port already in use
**Solution**: 
- Port 3000: Close any other React apps
- Port 5000: Close any other Node.js servers
- Port 5432: Close any other PostgreSQL instances

### Issue: Services won't start
**Solution**:
1. Check Docker Desktop is running
2. Run `docker-compose down -v`
3. Delete any existing containers
4. Run `docker-compose up --build`

### Issue: Can't access the frontend
**Solution**:
1. Wait 60 seconds for services to start
2. Check logs: `docker-compose logs frontend`
3. Try: http://localhost:3000 (not https)

### Issue: File processing fails
**Solution**:
1. Check the CSV file format matches expected columns
2. Check backend logs: `docker-compose logs backend`
3. Ensure Python scripts have correct permissions

## 📁 File Locations

- **Uploaded Files**: `./uploads/`
- **Processed Files**: `./output/`
- **Logs**: `./logs/`
- **Database Data**: Docker volume `postgres_data`

## 🔄 Development Workflow

1. **Make code changes** in your editor
2. **Backend changes**: Will auto-restart (nodemon)
3. **Frontend changes**: Will hot-reload (Vite)
4. **Database changes**: Run migrations or restart with `-v` flag

## 📊 Database Access

To access PostgreSQL directly:
```bash
docker exec -it rishon-postgres psql -U rishon_admin -d rishon_billing
```

Common queries:
```sql
-- View all users
SELECT * FROM users;

-- View recent uploads
SELECT * FROM file_uploads ORDER BY upload_time DESC LIMIT 10;

-- Check processing status
SELECT processing_status, COUNT(*) FROM file_uploads GROUP BY processing_status;
```

## 🎉 Success Checklist

When everything is working, you should be able to:
- ✅ Access login page at http://localhost:3000
- ✅ Login with admin/admin123
- ✅ See the dashboard
- ✅ Upload a CSV file
- ✅ Process the file
- ✅ See comparison results
- ✅ Download Excel file
- ✅ Download TSV file

## 💡 Tips

- Keep Docker Desktop running while developing
- Check logs if something doesn't work
- The first build takes longer (downloading images)
- Subsequent starts are much faster
- Use Chrome DevTools for debugging frontend
- Check backend logs for API issues

---

**Ready to start?** Run `start-local.bat` and enjoy! 🚀