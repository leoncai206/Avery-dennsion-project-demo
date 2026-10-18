"""
API 权限控制示例 - JWT 认证
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
import datetime
from typing import Optional

app = FastAPI()

# ==================== 配置 ====================

SECRET_KEY = "your-secret-key-change-in-production"  # 生产环境用环境变量
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# 模拟用户数据库
USERS_DB = {
    "admin": {
        "user_id": 1,
        "username": "admin",
        "password": "admin123",  # 实际应该存加密后的密码
        "role": "admin"
    },
    "operator": {
        "user_id": 2,
        "username": "operator",
        "password": "op123",
        "role": "operator"
    },
    "viewer": {
        "user_id": 3,
        "username": "viewer",
        "password": "view123",
        "role": "viewer"
    }
}

# 权限配置：不同角色能访问的接口
PERMISSIONS = {
    "admin": ["read", "write", "delete", "optimize"],
    "operator": ["read", "optimize"],
    "viewer": ["read"]
}


# ==================== 数据模型 ====================

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str


# ==================== 工具函数 ====================

def create_token(user_id: int, username: str, role: str) -> str:
    """生成 JWT Token"""
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """验证 JWT Token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的 Token")


# ==================== 认证依赖 ====================

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """获取当前登录用户（依赖注入）"""
    token = credentials.credentials
    payload = verify_token(token)
    return payload


async def require_permission(required_permission: str):
    """检查用户是否有某个权限"""
    async def checker(user: dict = Depends(get_current_user)):
        user_role = user.get("role")
        if user_role not in PERMISSIONS:
            raise HTTPException(status_code=403, detail="未知角色")

        if required_permission not in PERMISSIONS[user_role]:
            raise HTTPException(status_code=403, detail="权限不足")

        return user
    return checker


# ==================== API 接口 ====================

@app.post("/api/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    登录接口 - 获取 Token

    示例：
    POST /api/login
    {"username": "admin", "password": "admin123"}
    """
    user = USERS_DB.get(request.username)

    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_token(user["user_id"], user["username"], user["role"])

    return TokenResponse(
        access_token=token,
        expires_in=TOKEN_EXPIRE_HOURS * 3600,
        role=user["role"]
    )


@app.get("/api/products")
async def get_products(user: dict = Depends(get_current_user)):
    """
    获取产品列表 - 需要登录

    前端调用：
    fetch('/api/products', {
        headers: {
            'Authorization': 'Bearer <token>'
        }
    })
    """
    return {
        "success": True,
        "data": ["T001", "T002", "T003"],
        "requested_by": user["username"]
    }


@app.post("/api/schedule/optimize")
async def optimize_schedule(
    weights: dict,
    user: dict = Depends(require_permission("optimize"))
):
    """
    运行优化 - 需要 optimize 权限

    权限要求：
    - admin: ✅ 有权限
    - operator: ✅ 有权限
    - viewer: ❌ 无权限
    """
    return {
        "success": True,
        "message": "优化完成",
        "optimized_by": user["username"]
    }


@app.post("/api/products")
async def create_product(
    product: dict,
    user: dict = Depends(require_permission("write"))
):
    """
    创建产品 - 需要 write 权限

    权限要求：
    - admin: ✅ 有权限
    - operator: ❌ 无权限
    - viewer: ❌ 无权限
    """
    return {
        "success": True,
        "message": f"产品创建成功，操作人：{user['username']}"
    }


@app.delete("/api/products/{product_id}")
async def delete_product(
    product_id: str,
    user: dict = Depends(require_permission("delete"))
):
    """
    删除产品 - 需要 delete 权限

    权限要求：
    - admin: ✅ 有权限
    - operator: ❌ 无权限
    - viewer: ❌ 无权限
    """
    return {
        "success": True,
        "message": f"产品 {product_id} 已删除，操作人：{user['username']}"
    }


# ==================== 前端调用示例 ====================

"""
// 1. 登录获取 Token
const loginResponse = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: 'admin', password: 'admin123'})
});
const {access_token} = await loginResponse.json();

// 2. 保存 Token（localStorage 或 sessionStorage）
localStorage.setItem('token', access_token);

// 3. 带上 Token 访问受保护接口
const productsResponse = await fetch('/api/products', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
});
const products = await productsResponse.json();
"""

# ==================== 运行测试 ====================
# uvicorn api_auth:app --reload --port 8000
#
# 测试步骤：
# 1. 访问 http://localhost:8000/docs
# 2. 点击 /api/login 登录获取 token
# 3. 点击右上角 "Authorize" 按钮，输入 Bearer <token>
# 4. 测试其他接口