import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8000/api";

const initialForm = {
  kind: "expense",
  amount: "",
  description: "",
  entry_date: new Date().toISOString().split("T")[0]
};

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income_total: 0, expense_total: 0, balance: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const balanceClass = useMemo(() => {
    if (summary.balance > 0) return "positive";
    if (summary.balance < 0) return "negative";
    return "neutral";
  }, [summary.balance]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [txRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/transactions`),
        fetch(`${API_BASE}/summary`)
      ]);
      if (!txRes.ok || !summaryRes.ok) {
        throw new Error("تعذر تحميل البيانات");
      }
      const [txData, summaryData] = await Promise.all([txRes.json(), summaryRes.json()]);
      setTransactions(txData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        })
      });
      if (!response.ok) {
        throw new Error("تعذر حفظ العملية");
      }
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err.message ?? "تعذر حفظ العملية");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">لوحة متابعة المصروفات والدخل</p>
          <h1>Spendly</h1>
        </div>
        <div className={`balance ${balanceClass}`}>
          <span>الرصيد الحالي</span>
          <strong>{summary.balance.toFixed(2)} ر.س</strong>
        </div>
      </header>

      <section className="summary">
        <div>
          <h3>إجمالي الدخل</h3>
          <p>{summary.income_total.toFixed(2)} ر.س</p>
        </div>
        <div>
          <h3>إجمالي المصروفات</h3>
          <p>{summary.expense_total.toFixed(2)} ر.س</p>
        </div>
      </section>

      <section className="card">
        <h2>إضافة عملية جديدة</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            النوع
            <select name="kind" value={form.kind} onChange={handleChange}>
              <option value="expense">مصروف</option>
              <option value="income">دخل</option>
            </select>
          </label>
          <label>
            المبلغ
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </label>
          <label>
            الوصف
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="مثال: تسوق"
              required
            />
          </label>
          <label>
            التاريخ
            <input
              type="date"
              name="entry_date"
              value={form.entry_date}
              onChange={handleChange}
              required
            />
          </label>
          <button type="submit">حفظ العملية</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>سجل العمليات</h2>
        {loading ? (
          <p className="muted">جاري التحميل...</p>
        ) : transactions.length === 0 ? (
          <p className="muted">لا توجد عمليات مسجلة بعد.</p>
        ) : (
          <div className="table">
            <div className="table-row table-head">
              <span>النوع</span>
              <span>الوصف</span>
              <span>التاريخ</span>
              <span>المبلغ</span>
            </div>
            {transactions.map((item) => (
              <div className="table-row" key={item.id}>
                <span className={`pill ${item.kind}`}>{item.kind === "income" ? "دخل" : "مصروف"}</span>
                <span>{item.description}</span>
                <span>{item.entry_date}</span>
                <span>{Number(item.amount).toFixed(2)} ر.س</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
