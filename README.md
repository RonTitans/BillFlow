# Rishon LeZion Municipality - Electricity Billing System

A comprehensive electricity billing management system for Rishon LeZion Municipality, designed to process CSV billing files, perform gap analysis, and export to various formats.

## 🌟 Features

- **CSV Processing**: Upload and process electricity billing CSV files
- **Gap Analysis**: Automatic detection and calculation of billing discrepancies
- **Excel Generation**: Create detailed Excel reports with all billing information
- **TSV Export**: Generate TSV files for accounting system integration
- **Analytics Dashboard**: View consumption trends, costs, and billing accuracy
- **Multi-language Support**: Full Hebrew RTL support
- **User Authentication**: Secure JWT-based authentication system

## 🛠️ Technology Stack

- **Frontend**: React 18, Material-UI, Vite
- **Backend**: Node.js, Express, PostgreSQL
- **Processing**: Python (pandas, openpyxl, xlsxwriter)
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT

## 📋 Prerequisites

- Docker and Docker Compose
- Git
- 8GB RAM minimum
- 10GB free disk space

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/RonTitans/RishonLetzionMuni.git
cd RishonLetzionMuni
```

2. **Create environment file**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the application**
```bash
docker-compose up -d
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: PostgreSQL on port 5432

### Default Credentials
- Username: `admin`
- Password: `admin123`

## 🏗️ Project Structure

```
RishonLetzionMuni/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── contexts/
├── backend/           # Node.js backend server
│   ├── scripts/       # Python processing scripts
│   ├── server-minimal.js
│   └── package.json
├── database/          # PostgreSQL schemas
│   └── init.sql
├── docker-compose.yml # Docker orchestration
└── README.md
```

## 📊 Database Schema

The system uses PostgreSQL with the following main tables:
- `users` - User management
- `file_uploads` - Track uploaded files and processing status
- `processing_logs` - Detailed processing logs
- `audit_logs` - User activity tracking

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=rishon_billing
DB_USER=rishon_admin
DB_PASSWORD=SecurePass123

# Backend
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:5000
```

## 📈 Analytics Features

The system provides comprehensive analytics including:
- Monthly consumption trends
- Cost analysis by billing period
- Gap analysis and accuracy metrics
- Year-over-year comparisons
- Top billing discrepancies

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention
- Input validation and sanitization
- Secure file upload handling

## 🚢 Production Deployment

### AWS EC2 Deployment

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - 20GB+ storage

2. **Install Dependencies**
```bash
sudo apt update
sudo apt install docker.io docker-compose
```

3. **Clone and Configure**
```bash
git clone https://github.com/RonTitans/RishonLetzionMuni.git
cd RishonLetzionMuni
# Configure production .env
```

4. **Start Services**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### SSL Configuration

Use Certbot for free SSL certificates:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d rishon.titans.global
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token

### Files
- `POST /api/upload` - Upload CSV file
- `GET /api/files` - List uploaded files
- `POST /api/process` - Process uploaded file
- `DELETE /api/files/:id` - Delete file

### Analytics
- `GET /api/analytics/consumption` - Get consumption analytics
- `GET /api/dashboard/stats` - Dashboard statistics

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is proprietary software for Rishon LeZion Municipality.

## 👥 Support

For issues and questions, please contact the development team.

---

Built with ❤️ for Rishon LeZion Municipality