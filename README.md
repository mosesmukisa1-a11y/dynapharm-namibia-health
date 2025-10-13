# 🏥 Dynapharm International Namibia - Cloud Edition

**Comprehensive Health Management System v2.0**

[![Railway](https://img.shields.io/badge/Railway-Backend-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com)

## 🌟 Features

- **Multi-Device Access**: Works on any device with a web browser
- **Real-time Synchronization**: Data syncs across all devices instantly
- **Cloud Hosting**: 99.9% uptime with Railway + Vercel
- **Secure Authentication**: Role-based access control
- **Branch Management**: Support for 15+ locations across Namibia
- **Client Registration**: Complete patient management system
- **Consultant Portal**: Healthcare professional tools
- **Dispenser Portal**: Pharmacy management system
- **Admin Portal**: System administration and reporting

## 🚀 Live Demo

- **Frontend**: [dynapharm-cloud.vercel.app](https://dynapharm-cloud.vercel.app)
- **API**: [dynapharm-backend-production.up.railway.app](https://dynapharm-backend-production.up.railway.app)
- **Health Check**: [API Health Status](https://dynapharm-backend-production.up.railway.app/api/health)

## 🏢 Branches

| Branch | Location | Phone |
|--------|----------|-------|
| TOWNSHOP | Windhoek (Head Office) | 814683999 |
| KHOMASDAL DPC | Windhoek | 814682991 |
| KATIMA DPC | Katima | 817375818 |
| OUTAPI DPC | Outapi | 814685886 |
| ONDANGWA DPC | Ondangwa | 814685882 |
| OKONGO DPC | Okongo | 814684935 |
| OKAHAO DPC | Okahao | 814683963 |
| NKURENKURU DPC | Nkurenkuru | 814684939 |
| SWAKOPMUND DPC | Swakopmund | 814686806 |
| HOCHLAND PARK | Windhoek | 813207195 |
| RUNDU DPC | Rundu | 814050125 |
| GOBABIS | Gobabis | 814685905 |
| WALVISBAY | Walvis Bay | 814685894 |
| EENHANA | Eenhana | 814682049 |
| OTJIWARONGO DPC | Otjiwarongo | 814681997 |

## 🔐 Default Login Credentials

### Admin Portal
- **Username**: `admin`
- **Password**: `admin123`

### Consultant Portal
- **Username**: `consultant`
- **Password**: `consultant123`

### Dispenser Portal
- **Username**: `dispenser`
- **Password**: `dispenser123`

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Modern semantic markup
- **CSS3** - Responsive design with Flexbox/Grid
- **JavaScript ES6+** - Modern async/await patterns
- **Vercel** - Global CDN hosting

### Backend
- **Python 3.9+** - Core server logic
- **HTTP Server** - Built-in Python web server
- **JSON** - File-based data storage
- **Railway** - Cloud hosting platform

### Infrastructure
- **GitHub** - Source code repository
- **Railway** - Backend API hosting
- **Vercel** - Frontend hosting & CDN
- **SSL/TLS** - Automatic HTTPS encryption

## 📱 Mobile Responsive

The system is fully responsive and works seamlessly on:
- 📱 **Mobile Phones** (iOS/Android)
- 📱 **Tablets** (iPad/Android)
- 💻 **Laptops** (Windows/Mac/Linux)
- 🖥️ **Desktop Computers**

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mosesmukisa1-a11y/dynapharm-cloud.git
   cd dynapharm-cloud
   ```

2. **Start the backend server**
   ```bash
   cd backend
   python3 dynapharm_backend.py
   ```

3. **Open the frontend**
   - Open `frontend/index.html` in your browser
   - Or use a local server: `python3 -m http.server 8080`

### Cloud Deployment

Follow the [Deployment Guide](DEPLOYMENT_GUIDE.md) for step-by-step instructions to deploy to Railway and Vercel.

## 📊 API Endpoints

### Health Check
```
GET /api/health
```

### Clients
```
GET    /api/clients    - Get all clients
POST   /api/clients    - Create new client
PUT    /api/clients    - Update client
```

### Users
```
GET    /api/users      - Get all users
POST   /api/users      - Create new user
PUT    /api/users      - Update user
DELETE /api/users      - Delete user
```

### Branches
```
GET    /api/branches   - Get all branches
POST   /api/branches   - Create new branch
DELETE /api/branches   - Delete branch
```

### Reports
```
GET    /api/reports    - Get all reports
POST   /api/reports    - Create new report
PUT    /api/reports    - Update report
```

## 🔧 Configuration

### Environment Variables

**Backend (Railway)**
- `PORT` - Server port (auto-set by Railway)
- `NODE_ENV` - Environment (production/development)

**Frontend (Vercel)**
- `API_URL` - Backend API endpoint
- `CORS_ORIGIN` - Allowed origins for CORS

### Local Configuration

Update the API endpoint in `frontend/index.html`:
```javascript
// For local development
API_BASE = 'http://localhost:8001/api';

// For production
API_BASE = 'https://your-railway-project.up.railway.app/api';
```

## 📈 Performance

- **Load Time**: < 2 seconds
- **API Response**: < 500ms
- **Uptime**: 99.9% SLA
- **Global CDN**: Vercel Edge Network
- **Auto-scaling**: Handles traffic spikes

## 🔒 Security

- **HTTPS**: All traffic encrypted
- **CORS**: Configured for secure cross-origin requests
- **Authentication**: Role-based access control
- **Data Validation**: Client-side and server-side validation
- **Rate Limiting**: Protection against abuse

## 📞 Contact

**Dynapharm International Namibia**
- 📧 Email: info@dynapharm.com.na
- 📞 Phone: +264 61 300 877
- 🌐 Website: [dynapharm.com.na](https://dynapharm.com.na)
- 📍 Head Office: Shop No.1 Continental Building, Independence Avenue, Windhoek

**Technical Support**
- 👨‍💻 Developer: Moses Mukisa
- 📧 Email: mosesmukisa1@gmail.com
- 🐙 GitHub: [mosesmukisa1-a11y](https://github.com/mosesmukisa1-a11y)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- **Dynapharm International Namibia** - For the opportunity to modernize their healthcare system
- **Railway** - For providing excellent backend hosting
- **Vercel** - For fast and reliable frontend hosting
- **GitHub** - For source code management and CI/CD

---

**Made with ❤️ for Healthcare in Namibia**
