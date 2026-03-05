# 1. Start with a lightweight Python "mini-computer"
FROM python:3.10-slim

# 2. Create a folder inside this container called /app
WORKDIR /app

# 3. Copy the requirement file into the container
COPY requirements.txt .

# 4. Install the libraries
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of our Python code (main.py, etc.) into the container
COPY . .

# 6. Open port 8000 so the frontend can talk to it
EXPOSE 8000

# 7. The command to start the server when the container turns on
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
