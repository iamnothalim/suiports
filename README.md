# SPL - Sports Prediction League

A full-stack sports prediction platform built with React and FastAPI, featuring AI-powered prediction scoring and community engagement.

## Features

- **Breaking News**: Real-time sports news and updates
- **Statistics**: Team and player performance data
- **Community**: User-generated content and discussions
- **Prediction Game**: AI-scored prediction events with betting functionality
- **Admin Panel**: Content moderation and prediction approval system
- **AI Scoring**: Gemini-powered prediction quality assessment

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Query for data fetching
- Lucide React for icons

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite database
- JWT authentication
- Gemini AI API for scoring

## Project Structure

```
sui_ports/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── types/        # TypeScript type definitions
│   │   ├── utils/        # Utility functions
│   │   └── main.tsx      # Main application entry point
│   ├── package.json
│   └── vite.config.ts
├── backend/           # FastAPI backend application
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core configuration
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic services
│   ├── main.py
│   ├── init_db.py
│   └── requirements.txt
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.10+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iamnothalim/suiports.git
   cd suiports
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python init_db.py
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=sqlite:///./sui_ports.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3001","http://localhost:3000"]
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/me` - Get current user

### Predictions
- `GET /api/v1/predictions/` - Get all predictions (admin only)
- `GET /api/v1/predictions/approved` - Get approved predictions
- `POST /api/v1/predictions/` - Create new prediction
- `PUT /api/v1/predictions/{id}/approve` - Approve/reject prediction

### AI Scoring
- `POST /api/v1/scoring/calculate/{id}` - Calculate AI score
- `GET /api/v1/scoring/{id}` - Get prediction score

### Content
- `GET /api/v1/news/` - Get news articles
- `GET /api/v1/community/` - Get community posts
- `GET /api/v1/standings/` - Get league standings

## Default Accounts

- **Admin**: username: `admin`, password: `admin123`
- **User**: username: `testuser`, password: `testpass123`

## AI Scoring System

The platform uses Google's Gemini AI to score prediction events based on five criteria:

1. **Quality & Resolvability (35%)** - Clarity, data sources, timeframe, compliance
2. **Demand & Timing (25%)** - Trend indicators, topic popularity, timeliness  
3. **Reputation & Skin-in-the-game (20%)** - User loyalty, success history, engagement
4. **Novelty & Dedupe (10%)** - First-mover advantage, duplication check
5. **Economic Viability (10%)** - Expected liquidity, spread, oracle costs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- GitHub: [@iamnothalim](https://github.com/iamnothalim)
- Project Link: [https://github.com/iamnothalim/suiports](https://github.com/iamnothalim/suiports)