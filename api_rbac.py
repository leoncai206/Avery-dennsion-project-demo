"""
完整的权限控制 API 设计
- 数据库表结构
- 登录认证流程
- 权限验证
- 数据范围过滤
"""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import jwt
import datetime
import hashlib

app = FastAPI(title="生产排程系统 API", version="2.0")

# ==================== 配置 ====================

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

# ==================== 数据模型 ====================

class LoginRequest(BaseModel):
    username: str
    password: str


class User(BaseModel):
    user_id: int
    username: str
    roles: List[str]
    permissions: List[str]
    departments: List[int]


# ==================== 模拟数据库 ====================

# 实际应该用 SQLAlchemy 或其他 ORM 连接真实数据库

USERS = {
    "admin": {
        "id": 1,
        "username": "admin",
        "password_hash": hashlib.sha256("admin123".encode()).hexdigest(),
        "roles": ["admin"],
        "permissions": ["products:read", "products:write", "lines:read", "lines:write", "optimize", "admin"],
        "departments": [1, 2, 3]  # 总部，可看所有部门
    },
    "manager_a": {
        "id": 2,
        "username": "manager_a",
        "password_hash": hashlib.sha256("manager123".encode()).hexdigest(),
        "roles": ["manager"],
        "permissions": ["products:read", "products:write", "lines:read", "lines:write", "optimize"],
        "departments": [1]  # 只能看工厂A
    },
    "operator_a": {
        "id": 3,
        "username": "operator_a",
        "password_hash": hashlib.sha256("operator123".encode()).hexdigest(),
        "roles": ["operator"],
        "permissions": ["products:read", "lines:read", "optimize"],
        "departments": [1]  # 只能看工厂A
    },
    "viewer_b": {
        "id": 4,
        "username": "viewer_b",
        "password_hash": hashlib.sha256("viewer123".encode()).hexdigest(),
        "roles": ["viewer"],
        "permissions": ["products:read", "lines:read"],
        "departments": [2]  # 只能看工厂B
    }
}

PRODUCTS = [
    {"id": "T001", "name": "Thermal Paper", "department_id": 1},
    {"id": "T002", "name": "Direct Thermal", "department_id": 1},
    {"id": "T003", "name": "High-Temp Label", "department_id": 2},
    {"id": "T004", "name": "RFID Label", "department_id": 2},
]

LINES = [
    {"id": "Line-01", "name": "Label Coating", "department_id": 1},
    {"id": "Line-02", "name": "Film & Label", "department_id": 1},
    {"id": "Line-03", "name": "RFID & Special", "department_id": 2},
]

DEPARTMENTS = [
    {"id": 1, "name": "工厂A"},
    {"id": 2, "name": "工厂B"},
    {"id": 3, "name": "总部"},
]


# ==================== 工具函数 ====================

def create_token(user_data: dict) -> str:
    """生成 JWT Token，包含用户信息和权限"""
    payload = {
        "user_id": user_data["id"],
        "username": user_data["username"],
        "roles": user_data["roles"],
        "permissions": user_data["permissions"],
        "departments": user_data["departments"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """验证并解析 Token"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的 Token")


def hash_password(password: str) -> str:
    """密码加密"""
    return hashlib.sha256(password.encode()).hexdigest()


# ==================== 认证依赖 ====================

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """获取当前用户信息"""
    token = credentials.credentials
    return verify_token(token)


async def require_permission(permission: str):
    """检查用户是否有某个权限"""
    async def checker(user: dict = Depends(get_current_user)):
        if permission not in user.get("permissions", []):
            raise HTTPException(
                status_code=403,
                detail=f"权限不足，需要 {permission} 权限"
            )
        return user
    return checker


# ==================== API 接口 ====================

@app.post("/api/login")
async def login(request: LoginRequest):
    """
    登录接口

    流程：
    1. 查询 users 表验证用户名密码
    2. 查询 user_roles + roles 表获取角色
    3. 查询 role_permissions + permissions 表获取权限
    4. 查询 user_departments 表获取数据范围
    5. 生成 JWT Token 返回

    实际 SQL（伪代码）：
    ```sql
    -- 1. 验证用户
    SELECT * FROM users WHERE username = ?;

    -- 2. 获取角色
    SELECT r.name FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?;

    -- 3. 获取权限
    SELECT p.name FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?;

    -- 4. 获取部门
    SELECT department_id FROM user_departments WHERE user_id = ?;
    ```
    """
    user = USERS.get(request.username)

    # 验证用户名和密码
    if not user:
        raise HTTPException(status_code=401, detail="用户名不存在")

    if user["password_hash"] != hash_password(request.password):
        raise HTTPException(status_code=401, detail="密码错误")

    # 生成 Token（包含所有权限信息）
    token = create_token(user)

    return {
        "success": True,
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": TOKEN_EXPIRE_HOURS * 3600,
            "user": {
                "username": user["username"],
                "roles": user["roles"],
                "departments": [DEPARTMENTS[d-1]["name"] for d in user["departments"] if d <= len(DEPARTMENTS)]
            }
        }
    }


@app.get("/api/products")
async def get_products(user: dict = Depends(get_current_user)):
    """
    获取产品列表

    权限检查：
    1. 需要 products:read 权限
    2. 只返回用户所属部门的产品

    实际 SQL：
    ```sql
    SELECT p.* FROM products p
    WHERE p.department_id IN (
        SELECT department_id FROM user_departments
        WHERE user_id = ?
    );
    ```
    """
    # 检查权限
    if "products:read" not in user["permissions"]:
        raise HTTPException(status_code=403, detail="无权限查看产品")

    # 过滤部门范围
    user_depts = user["departments"]
    filtered_products = [
        p for p in PRODUCTS
        if p["department_id"] in user_depts
    ]

    return {
        "success": True,
        "data": filtered_products,
        "count": len(filtered_products),
        "filtered_by_department": True
    }


@app.post("/api/products")
async def create_product(
    product: dict,
    user: dict = Depends(require_permission("products:write"))
):
    """
    创建产品 - 需要 products:write 权限
    """
    # 产品自动归属到用户所在部门
    product["department_id"] = user["departments"][0]
    product["created_by"] = user["user_id"]

    return {
        "success": True,
        "message": "产品创建成功",
        "data": product
    }


@app.get("/api/lines")
async def get_lines(user: dict = Depends(get_current_user)):
    """
    获取产线列表 - 需要 lines:read 权限
    """
    if "lines:read" not in user["permissions"]:
        raise HTTPException(status_code=403, detail="无权限查看产线")

    # 过滤部门范围
    user_depts = user["departments"]
    filtered_lines = [
        l for l in LINES
        if l["department_id"] in user_depts
    ]

    return {
        "success": True,
        "data": filtered_lines,
        "count": len(filtered_lines)
    }


@app.post("/api/schedule/optimize")
async def optimize_schedule(
    weights: dict,
    user: dict = Depends(require_permission("optimize"))
):
    """
    运行优化 - 需要 optimize 权限

    权限要求：
    - admin: ✅
    - manager: ✅
    - operator: ✅
    - viewer: ❌
    """
    return {
        "success": True,
        "message": "优化完成",
        "optimized_by": user["username"],
        "weights": weights
    }


@app.get("/api/users/me")
async def get_my_info(user: dict = Depends(get_current_user)):
    """
    获取当前用户信息
    """
    return {
        "success": True,
        "data": {
            "user_id": user["user_id"],
            "username": user["username"],
            "roles": user["roles"],
            "permissions": user["permissions"],
            "departments": user["departments"]
        }
    }


# ==================== 前端调用示例 ====================

"""
// 1. 登录
const loginRes = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        username: 'operator_a',
        password: 'operator123'
    })
});
const {access_token, user} = loginRes.data;

// 2. 保存 Token
localStorage.setItem('token', access_token);

// 3. 获取产品（自动过滤部门）
const productsRes = await fetch('/api/products', {
    headers: {'Authorization': `Bearer ${token}`}
});
// operator_a 只能看到工厂A的产品
// viewer_b 只能看到工厂B的产品
// admin 可以看到所有产品
"""

# ==================== 运行 ====================
# uvicorn api_rbac:app --reload --port 8000
#
# 测试：
# 1. 访问 http://localhost:8000/docs
# 2. POST /api/login 登录获取 token
# 3. 点击 Authorize，输入 Bearer <token>
# 4. 测试不同用户看到的数据范围不同