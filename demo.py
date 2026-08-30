from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Version 1"}