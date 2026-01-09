# 🎓 SkillForge LMS

**AI-Powered Learning Management System**

A full-stack web application that enables students to enroll in courses, watch lessons, take AI-generated quizzes, and earn certificates. Instructors can create courses, add lessons with video/file attachments, and monitor student performance.

---

## ✨ Features

### 👨‍🎓 For Students
- Browse and enroll in courses
- Watch video lessons and download attachments
- Track learning progress
- Take AI-generated quizzes
- Earn PDF certificates on course completion
- AI chatbot for learning assistance

### 👨‍🏫 For Instructors
- Create and manage courses
- Add lessons with videos, PDFs, and attachments
- Create manual quizzes or generate AI quizzes
- View student submissions and analytics
- Monitor course performance

### 👨‍💼 For Admins
- User management (view, delete users)
- Platform-wide analytics
- Role-based access control

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas |
| Auth | JWT (JSON Web Tokens) |
| File Storage | Cloudinary |
| AI | Google Gemini API |
| Email | Nodemailer |

---

## 📁 Project Structure

```
skillforge-lms/
├── src/                    # Frontend React code
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   └── contexts/           # React contexts
│
├── backend/                # Backend Node.js code
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routes
│   ├── controllers/        # Business logic
│   ├── middleware/         # Auth & validation
│   └── utils/              # Helper functions
│
├── public/                 # Static assets
└── package.json            # Dependencies
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account
- Google Gemini API key

### 1. Clone the Repository
```bash
git clone https://github.com/Dhruvil135/learnflow-dashboard-main.git
cd learnflow-dashboard-main
```

### 2. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 3. Configure Environment Variables

Create `backend/.env`:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GEMINI_API_KEY=your_gemini_api_key

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

### 4. Run the Application
```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
npm run dev
```

### 5. Open in Browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 📸 Screenshots

| Student Dashboard | Course Detail |
|-------------------|---------------|
| Browse courses, take quizzes | Enroll, watch lessons |

| Instructor Dashboard | AI Quiz Generation |
|---------------------|-------------------|
| Manage courses, view analytics | Generate quizzes with AI |

---

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/forgot-password` | Request reset |
| POST | `/api/auth/reset-password/:token` | Reset password |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | Get all courses |
| POST | `/api/courses` | Create course |
| GET | `/api/courses/:id` | Get course |
| POST | `/api/courses/:id/enroll` | Enroll in course |

### Exams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exams` | Get all exams |
| POST | `/api/exams` | Create exam |
| POST | `/api/exams/:id/submit` | Submit exam |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/quiz` | Generate AI quiz |
| POST | `/api/ai/chat` | Chat with AI |

---

## 📄 Documentation

- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) - Complete technical documentation
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Free deployment instructions

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Dhruvil Shah**

- GitHub: [@Dhruvil135](https://github.com/Dhruvil135)

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [MongoDB](https://www.mongodb.com/)
- [Cloudinary](https://cloudinary.com/)
- [Google Gemini](https://ai.google.dev/)

---

⭐ **Star this repo if you found it helpful!**
