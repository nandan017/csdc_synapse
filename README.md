# CSDC Synapse

**Chathurya Student Developers Club — Digital Identity & Engagement Platform**

> NFC-powered member identity, attendance, gamification, and community platform for Seshadripuram College.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend | FastAPI (Python, async, Pydantic v2) |
| Database + Auth | Supabase (PostgreSQL + Auth + Realtime) |
| Email | Brevo (transactional) |
| Styling | Tailwind CSS |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
csdc_synapse/
├── frontend/          # Next.js 14 app
│   ├── app/
│   │   ├── api/register/    # Next.js API route → proxies to FastAPI
│   │   ├── register/        # Registration page
│   │   └── u/[uid]/         # Public member profile
│   ├── components/
│   ├── lib/                 # Supabase client, utils
│   └── styles/
└── backend/           # FastAPI
    ├── routers/       # register, members, attendance, xp, admin
    ├── models/        # Pydantic schemas
    ├── services/      # supabase_service, brevo_service, crypto_service
    └── core/          # config, security
```

---

## Quick Start

### 1. Clone & setup env files
```bash
git clone https://github.com/YOUR_USERNAME/csdc_synapse.git
cd csdc_synapse
```

Copy `.env` files and fill in your credentials (see `.env.example` files in each folder).

### 2. Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload     # http://localhost:8000
```

### 4. Supabase
Run the SQL in `backend/supabase/schema.sql` in your Supabase SQL editor.

---

## Environment Variables

### frontend/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
BACKEND_URL=http://localhost:8000
```

### backend/.env
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BREVO_API_KEY=your_brevo_api_key
AES_SECRET_KEY=generate_with_script_below
```

Generate AES key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
