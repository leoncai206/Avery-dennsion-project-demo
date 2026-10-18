"""
生产排程优化 API
配合 production-optimization-v2 前端使用
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json

# 创建 FastAPI 应用
app = FastAPI(
    title="Production Scheduler API",
    description="生产排程优化系统 API",
    version="1.0.0"
)

# 允许跨域访问（前端 HTML 可以调用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 数据模型 ====================

class Product(BaseModel):
    """产品数据模型"""
    id: str
    name: str
    series: str
    process_temp: int
    energy_factor: float
    speed: int  # m/min
    quantity: int  # kg
    due_date: str
    priority: str  # normal, rush, emergency
    batches: int


class ProductionLine(BaseModel):
    """产线数据模型"""
    id: str
    name: str
    types: List[str]  # 可生产的产品类型
    max_speed: int
    efficiency: float


class ScheduleResult(BaseModel):
    """排程结果"""
    product_id: str
    line_id: str
    start_time: str
    end_time: str
    shift: str
    energy_cost: float
    setup_time: float


# ==================== 模拟数据库 ====================
# 实际使用时替换为真实数据库查询

MOCK_PRODUCTS = [
    {
        "id": "T001",
        "name": "Thermal Paper",
        "series": "coated-paper",
        "process_temp": 80,
        "energy_factor": 1.5,
        "speed": 80,
        "quantity": 1500,
        "due_date": "2024-07-05",
        "priority": "normal",
        "batches": 3
    },
    {
        "id": "T003",
        "name": "High-Temp Label",
        "series": "adhesive",
        "process_temp": 130,
        "energy_factor": 2.0,
        "speed": 60,
        "quantity": 1200,
        "due_date": "2024-07-03",
        "priority": "rush",
        "batches": 3
    },
    {
        "id": "T016",
        "name": "RFID Label",
        "series": "rfid",
        "process_temp": 90,
        "energy_factor": 2.5,
        "speed": 50,
        "quantity": 800,
        "due_date": "2024-07-04",
        "priority": "emergency",
        "batches": 2
    }
]

MOCK_LINES = [
    {
        "id": "Line-01",
        "name": "Label Coating Line",
        "types": ["label"],
        "max_speed": 150,
        "efficiency": 0.92
    },
    {
        "id": "Line-02",
        "name": "Film & Label Line",
        "types": ["film", "label"],
        "max_speed": 120,
        "efficiency": 0.88
    },
    {
        "id": "Line-03",
        "name": "RFID & Special Line",
        "types": ["rfid", "special"],
        "max_speed": 100,
        "efficiency": 0.85
    }
]


# ==================== API 接口 ====================

@app.get("/")
async def root():
    """API 根路径"""
    return {
        "message": "Production Scheduler API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/products")
async def get_products():
    """
    获取所有产品列表
    前端调用: fetch('/api/products')
    """
    return {
        "success": True,
        "data": MOCK_PRODUCTS,
        "count": len(MOCK_PRODUCTS)
    }


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    """
    获取单个产品详情
    前端调用: fetch('/api/products/T001')
    """
    product = next((p for p in MOCK_PRODUCTS if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "data": product}


@app.get("/api/lines")
async def get_lines():
    """
    获取所有产线列表
    前端调用: fetch('/api/lines')
    """
    return {
        "success": True,
        "data": MOCK_LINES,
        "count": len(MOCK_LINES)
    }


@app.get("/api/shifts")
async def get_shifts():
    """
    获取班次电价配置
    前端调用: fetch('/api/shifts')
    """
    shifts = [
        {"name": "Valley", "hours": [0, 1, 2, 3, 4, 5, 6, 23], "rate": 0.20},
        {"name": "Flat", "hours": [7, 8, 9, 10, 11, 17, 18, 19, 20, 21], "rate": 0.35},
        {"name": "Peak", "hours": [12, 13, 14, 15, 16, 22], "rate": 0.50}
    ]
    return {"success": True, "data": shifts}


@app.post("/api/schedule/optimize")
async def optimize_schedule(weights: dict):
    """
    运行排程优化
    前端调用: fetch('/api/schedule/optimize', {method: 'POST', body: JSON.stringify({energy: 0.35, delivery: 0.45, setup: 0.20})})

    这里返回模拟结果，实际应该调用你的 optimizer_sa_en.js 中的算法
    """
    # 模拟优化结果
    result = {
        "total_energy_cost": 1847.50,
        "total_setup_time": 12.5,
        "oee": 78.3,
        "on_time_rate": 92.5,
        "schedule": [
            {
                "product_id": "T003",
                "line_id": "Line-02",
                "start_time": "2024-07-01 00:00",
                "end_time": "2024-07-01 08:30",
                "shift": "Valley",
                "energy_cost": 510.00,
                "setup_time": 0
            },
            {
                "product_id": "T016",
                "line_id": "Line-03",
                "start_time": "2024-07-01 08:30",
                "end_time": "2024-07-01 14:00",
                "shift": "Flat",
                "energy_cost": 375.00,
                "setup_time": 2.0
            }
        ]
    }
    return {"success": True, "data": result}


@app.post("/api/schedule/save")
async def save_schedule(schedule: dict):
    """
    保存排程结果到数据库
    前端调用: fetch('/api/schedule/save', {method: 'POST', body: JSON.stringify(schedule)})
    """
    # TODO: 实际保存到数据库
    # db.execute("INSERT INTO schedules ...")

    return {
        "success": True,
        "message": "Schedule saved successfully",
        "timestamp": datetime.now().isoformat()
    }


# ==================== 数据库连接示例 ====================
# 如果要连接真实数据库，取消下面的注释

"""
from sqlalchemy import create_engine, Column, String, Integer, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 数据库连接
DATABASE_URL = "mysql+pymysql://user:password@localhost/production_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 数据库模型
Base = declarative_base()

class ProductDB(Base):
    __tablename__ = "products"
    id = Column(String(10), primary_key=True)
    name = Column(String(100))
    series = Column(String(50))
    process_temp = Column(Integer)
    energy_factor = Column(Float)
    speed = Column(Integer)
    quantity = Column(Integer)
    due_date = Column(String(20))
    priority = Column(String(20))
    batches = Column(Integer)

# 使用数据库查询替换 MOCK_PRODUCTS
@app.get("/api/products")
async def get_products():
    db = SessionLocal()
    products = db.query(ProductDB).all()
    return {"success": True, "data": products}
"""


# ==================== 运行命令 ====================
# uvicorn api:app --reload --port 8000
#
# 访问:
# - API: http://localhost:8000/api/products
# - 文档: http://localhost:8000/docs
# - 前端调用: fetch('http://localhost:8000/api/products')