# Spendly

تطبيق بسيط لمتابعة المصروفات والدخل باستخدام React في الواجهة الأمامية وFastAPI في الخلفية مع قاعدة بيانات SQLite.

## تشغيل الخلفية (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## تشغيل الواجهة الأمامية (React)

```bash
cd frontend
npm install
npm run dev
```

بعد تشغيل الخدمتين افتح المتصفح على:
- الواجهة الأمامية: `http://localhost:5173`
- الخلفية: `http://localhost:8000/docs`
