from datetime import date
from pathlib import Path
import sqlite3
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, condecimal

DB_PATH = Path(__file__).resolve().parent / "spendly.db"

app = FastAPI(title="Spendly API")


class TransactionIn(BaseModel):
    kind: str = Field(..., pattern="^(income|expense)$")
    amount: condecimal(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(..., min_length=1, max_length=200)
    entry_date: date


class Transaction(TransactionIn):
    id: int


class Summary(BaseModel):
    income_total: float
    expense_total: float
    balance: float


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
                amount REAL NOT NULL,
                description TEXT NOT NULL,
                entry_date TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/transactions", response_model=List[Transaction])
def list_transactions(kind: Optional[str] = None) -> List[Transaction]:
    conn = get_connection()
    try:
        if kind:
            if kind not in {"income", "expense"}:
                raise HTTPException(status_code=400, detail="Invalid kind")
            rows = conn.execute(
                "SELECT * FROM transactions WHERE kind = ? ORDER BY entry_date DESC, id DESC",
                (kind,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM transactions ORDER BY entry_date DESC, id DESC"
            ).fetchall()
        return [Transaction(**row) for row in rows]
    finally:
        conn.close()


@app.post("/api/transactions", response_model=Transaction, status_code=201)
def create_transaction(payload: TransactionIn) -> Transaction:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO transactions (kind, amount, description, entry_date)
            VALUES (?, ?, ?, ?)
            """,
            (payload.kind, float(payload.amount), payload.description, payload.entry_date.isoformat()),
        )
        conn.commit()
        transaction_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM transactions WHERE id = ?",
            (transaction_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=500, detail="Failed to create transaction")
        return Transaction(**row)
    finally:
        conn.close()


@app.get("/api/summary", response_model=Summary)
def get_summary() -> Summary:
    conn = get_connection()
    try:
        income_total = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE kind = 'income'"
        ).fetchone()["total"]
        expense_total = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE kind = 'expense'"
        ).fetchone()["total"]
        balance = income_total - expense_total
        return Summary(
            income_total=round(income_total, 2),
            expense_total=round(expense_total, 2),
            balance=round(balance, 2),
        )
    finally:
        conn.close()
