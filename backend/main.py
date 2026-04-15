import os
import random
import string
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt as _bcrypt
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

import models
from database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

# Migrations for columns added after initial creation
_migrations = [
    "ALTER TABLE players ADD COLUMN is_locked BOOLEAN DEFAULT 0",
    "ALTER TABLE tables ADD COLUMN admin_user_id INTEGER REFERENCES users(id)",
    "ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id)",
]
with engine.connect() as conn:
    for stmt in _migrations:
        try:
            conn.execute(text(stmt))
            conn.commit()
        except Exception:
            pass  # Column already exists

# ---------- auth setup ----------

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "poker-night-jwt-secret-2024")
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    return jwt.encode({"sub": str(user_id)}, SECRET_KEY, algorithm=ALGORITHM)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return db.query(models.User).filter(models.User.id == user_id).first()
    except Exception:
        return None


def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    user = get_optional_user(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in")
    return user


# ---------- app ----------

app = FastAPI(title="Poker Organizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- helpers ----------

def generate_code(db: Session) -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not db.query(models.Table).filter(models.Table.code == code).first():
            return code


def table_dict(t: models.Table) -> dict:
    return {
        "id": t.id,
        "code": t.code,
        "name": t.name,
        "admin_name": t.admin_name,
        "buy_in_price": t.buy_in_price,
        "chips_per_buy_in": t.chips_per_buy_in,
        "is_locked": t.is_locked,
    }


def player_dict(p: models.Player) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "chips_remaining": p.chips_remaining,
        "buy_ins": p.buy_ins,
        "is_locked": p.is_locked,
    }


# ---------- schemas ----------

class AuthRequest(BaseModel):
    username: str
    password: str


class CreateTableRequest(BaseModel):
    name: str
    buy_in_price: float
    chips_per_buy_in: int


class JoinTableRequest(BaseModel):
    name: str


class UpdatePlayerRequest(BaseModel):
    player_token: str
    chips_remaining: Optional[float] = None
    buy_ins: Optional[int] = None


class LockPlayerRequest(BaseModel):
    player_token: str


class LockTableRequest(BaseModel):
    admin_secret: str


# ---------- auth routes ----------

@app.post("/api/auth/register")
def register(req: AuthRequest, db: Session = Depends(get_db)):
    if len(req.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    existing = db.query(models.User).filter(models.User.username == req.username.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = models.User(username=req.username.strip(), password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": {"id": user.id, "username": user.username}}


@app.post("/api/auth/login")
def login(req: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username.strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"token": create_token(user.id), "user": {"id": user.id, "username": user.username}}


@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(require_user), db: Session = Depends(get_db)):
    hosted = db.query(models.Table).filter(models.Table.admin_user_id == current_user.id).all()
    player_records = db.query(models.Player).filter(models.Player.user_id == current_user.id).all()
    return {
        "user": {"id": current_user.id, "username": current_user.username},
        "hosted_tables": [
            {**table_dict(t), "admin_secret": t.admin_secret}
            for t in hosted
        ],
        "player_tables": [
            {**table_dict(p.table), "player_id": p.id, "player_token": p.player_token}
            for p in player_records
            if p.table is not None
        ],
    }


# ---------- table routes ----------

@app.post("/api/tables")
def create_table(
    req: CreateTableRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    table = models.Table(
        code=generate_code(db),
        name=req.name,
        admin_name=current_user.username,
        admin_secret=str(uuid.uuid4()),
        admin_user_id=current_user.id,
        buy_in_price=req.buy_in_price,
        chips_per_buy_in=req.chips_per_buy_in,
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return {"code": table.code, "admin_secret": table.admin_secret, "table": table_dict(table)}


@app.get("/api/tables/{code}")
def get_table(code: str, db: Session = Depends(get_db)):
    table = db.query(models.Table).filter(models.Table.code == code.upper()).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"table": table_dict(table), "players": [player_dict(p) for p in table.players]}


@app.post("/api/tables/{code}/join")
def join_table(
    code: str,
    req: JoinTableRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_user),
):
    table = db.query(models.Table).filter(models.Table.code == code.upper()).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.is_locked:
        raise HTTPException(status_code=400, detail="This table is locked and no longer accepting players")

    existing = db.query(models.Player).filter(
        models.Player.table_id == table.id,
        models.Player.name == req.name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="That name is already taken at this table")

    # Check user hasn't already joined this table
    already_joined = db.query(models.Player).filter(
        models.Player.table_id == table.id,
        models.Player.user_id == current_user.id,
    ).first()
    if already_joined:
        raise HTTPException(status_code=400, detail="You have already joined this table")

    player = models.Player(
        table_id=table.id,
        user_id=current_user.id,
        name=req.name,
        player_token=str(uuid.uuid4()),
        buy_ins=1,
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return {"player_token": player.player_token, "player": player_dict(player)}


@app.put("/api/players/{player_id}")
def update_player(player_id: int, req: UpdatePlayerRequest, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if player.player_token != req.player_token:
        raise HTTPException(status_code=403, detail="Invalid player token")
    if player.table.is_locked:
        raise HTTPException(status_code=400, detail="Table is locked — no more edits allowed")
    if player.is_locked:
        raise HTTPException(status_code=400, detail="You have locked your results — no more edits allowed")

    if req.chips_remaining is not None:
        player.chips_remaining = req.chips_remaining
    if req.buy_ins is not None:
        player.buy_ins = req.buy_ins

    db.commit()
    db.refresh(player)
    return {"player": player_dict(player)}


@app.post("/api/players/{player_id}/lock")
def lock_player(player_id: int, req: LockPlayerRequest, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if player.player_token != req.player_token:
        raise HTTPException(status_code=403, detail="Invalid player token")
    if player.table.is_locked:
        raise HTTPException(status_code=400, detail="Table is already locked")
    player.is_locked = True
    db.commit()
    return {"success": True}


@app.post("/api/tables/{code}/lock")
def lock_table(code: str, req: LockTableRequest, db: Session = Depends(get_db)):
    table = db.query(models.Table).filter(models.Table.code == code.upper()).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.admin_secret != req.admin_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    table.is_locked = True
    db.commit()
    return {"success": True}


@app.get("/api/tables/{code}/settlement")
def get_settlement(code: str, db: Session = Depends(get_db)):
    table = db.query(models.Table).filter(models.Table.code == code.upper()).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if not table.is_locked:
        raise HTTPException(status_code=400, detail="Table must be locked before settlement can be calculated")

    nets = []
    for p in table.players:
        if p.chips_remaining is None:
            continue
        chips_value = (p.chips_remaining / table.chips_per_buy_in) * table.buy_in_price
        spent = p.buy_ins * table.buy_in_price
        nets.append({"name": p.name, "net": chips_value - spent})

    creditors = sorted([(n["name"], n["net"]) for n in nets if n["net"] > 0.005], key=lambda x: x[1], reverse=True)
    debtors = sorted([(n["name"], -n["net"]) for n in nets if n["net"] < -0.005], key=lambda x: x[1], reverse=True)

    transactions = []
    i, j = 0, 0
    while i < len(creditors) and j < len(debtors):
        c_name, credit = creditors[i]
        d_name, debt = debtors[j]
        amount = min(credit, debt)
        transactions.append({"from": d_name, "to": c_name, "amount": round(amount, 2)})
        creditors[i] = (c_name, credit - amount)
        debtors[j] = (d_name, debt - amount)
        if creditors[i][1] < 0.005:
            i += 1
        if debtors[j][1] < 0.005:
            j += 1

    return {
        "transactions": transactions,
        "player_nets": [{"name": n["name"], "net": round(n["net"], 2)} for n in nets],
    }


# ---------- serve frontend (production) ----------

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend/dist")

if os.path.exists(_static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(_static_dir, "index.html"))
