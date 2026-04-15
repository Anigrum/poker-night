from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hosted_tables = relationship("Table", back_populates="admin_user")
    player_records = relationship("Player", back_populates="user")


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True)
    code = Column(String(6), unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    admin_name = Column(String, nullable=False)
    admin_secret = Column(String, nullable=False)
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    buy_in_price = Column(Float, nullable=False)
    chips_per_buy_in = Column(Integer, nullable=False)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    admin_user = relationship("User", back_populates="hosted_tables")
    players = relationship("Player", back_populates="table", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    player_token = Column(String, nullable=False)
    chips_remaining = Column(Float, nullable=True)
    buy_ins = Column(Integer, default=1)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    table = relationship("Table", back_populates="players")
    user = relationship("User", back_populates="player_records")
