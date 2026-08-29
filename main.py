from fastapi import FastAPI,HTTPException,Depends
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta,timezone,datetime
from pydantic import BaseModel
import jwt
from pwdlib import PasswordHash
import mysql.connector
from loguru import logger

app = FastAPI()

# test.html 是用浏览器直接打开的本地文件（origin 是 null），跨域请求 /login 时
# 浏览器会先发 OPTIONS 预检请求；没有这段中间件的话预检会被拒绝，
# fetch() 直接抛异常，页面上不会有任何提示（只有控制台能看到 CORS 报错）。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # 仅用于本地测试；正式环境要改成具体的前端域名
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "temporary-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

password_hash = PasswordHash.recommended()

class User(BaseModel):
    id: int
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateUser(BaseModel):
    name: str
    email: str


def create_access_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "user_id": user_id,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload["user_id"]

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


@app.post("/login")
def login(login_data: LoginRequest):
    cursor = db.cursor(dictionary=True,buffered=True)

    cursor.execute(
        "SELECT * FROM user WHERE email = %s",
        (login_data.email,)
    )

    user = cursor.fetchone()
    cursor.close()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not password_hash.verify(
        login_data.password,
        user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user["id"])

    return {
        "access_token": token,
        "token_type": "bearer"
    }


db = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="123456",
    database="fastapi_test"
)




@app.get("/users/me")
def get_current_user(
    user_id: int = Depends(get_current_user_id)
):
    cursor = db.cursor(dictionary=True, buffered=True)

    cursor.execute(
        "SELECT id, name, email FROM user WHERE id = %s",
        (user_id,)
    )

    user = cursor.fetchone()
    cursor.close()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


@app.post("/users")
def create_user(user: User):
    cursor = db.cursor()

    hashed_password = password_hash.hash(user.password)

    sql = """
        INSERT INTO user (id, name, email, password)
        VALUES (%s, %s, %s, %s)
    """

    values = (
        user.id,
        user.name,
        user.email,
        hashed_password
    )

    cursor.execute(sql, values)
    db.commit()

    cursor.close()

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }


@app.put("/users/me")
def update_user(
    updated_user: UpdateUser,
    user_id: int = Depends(get_current_user_id)
):
    cursor = db.cursor()

    sql = """
        UPDATE user
        SET name = %s, email = %s
        WHERE id = %s
    """

    values = (
        updated_user.name,
        updated_user.email,
        user_id
    )

    cursor.execute(sql, values)
    db.commit()

    if cursor.rowcount == 0:
        cursor.close()
        return {"message": "User not found"}

    cursor.close()

    return {
        "id": user_id,
        "name": updated_user.name,
        "email": updated_user.email
    }


@app.delete("/users/me")
def delete_user(
    user_id: int = Depends(get_current_user_id)
):
    cursor = db.cursor()

    sql = "DELETE FROM user WHERE id = %s"

    cursor.execute(sql, (user_id,))
    db.commit()

    if cursor.rowcount == 0:
        cursor.close()
        return {"message": "User not found"}

    cursor.close()

    return {"message": "User deleted"}


@app.get("/users")
def list_users(current_user=Depends(get_current_user)):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, email FROM user")
    users = cursor.fetchall()
    cursor.close()
    return users

@app.get("/loguru-test")
def loguru_test():
    logger.debug("Loguru debug test")
    logger.info("Loguru info test")
    logger.success("Loguru success test")
    logger.warning("Loguru warning test")
    logger.error("Loguru error test")
    return {"message": "Loguru test completed"}