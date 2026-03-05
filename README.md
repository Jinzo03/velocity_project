#  VeloCity: Real-Time Fleet Tracking & AI Dispatch Pipeline

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

##  Overview
VeloCity is a containerized microservices application designed to simulate, ingest, process, and analyze real-time geospatial IoT telemetry. Built as a comprehensive Data Engineering portfolio project, it bridges the gap between raw sensor data, stream processing, and Generative AI.

**[INSERT A GIF OR SCREENSHOT OF YOUR DASHBOARD HERE]**

## 🚀 Key Features
* **📡 High-Throughput Data Streaming (IoT):** A Python-based virtual sensor publishes GPS coordinates via the **MQTT** protocol (Eclipse Mosquitto broker), replacing traditional, blocking HTTP requests.
* **🧮 Real-Time Stream Processing:** The FastAPI backend acts as a subscriber, intercepting the stream and applying the **Haversine formula** (spherical trigonometry) to calculate the truck's distance from a central hub dynamically.
* **🚨 Automated Geofencing:** If a vehicle breaches a predefined 2km radius, the system instantly triggers a state update, turning the React dashboard's geofence red and throwing a critical alert.
* **🗺️ Intelligent Map Tracking:** Features a premium Dark Mode SaaS UI with an auto-following map camera that automatically breaks its lock if the user manually drags the map to inspect the route.
* **🧠 GenAI Dispatcher:** Integrates the modern `google-genai` SDK with **Gemini 2.5 Flash**. The AI acts as a virtual fleet manager, querying the PostGIS database to generate human-readable performance reports based on coordinate history.
* **🐳 True Microservices Architecture:** The entire stack (Database, Broker, Backend, Frontend, and Simulator) is orchestrated via **Docker Compose** across a custom Docker network.

## 🏗️ System Architecture
1. **Virtual Truck (Python):** Generates GPS drift and publishes to `velocity/telemetry`.
2. **Mosquitto Broker:** Handles Pub/Sub message queuing.
3. **FastAPI Backend:** Subscribes to the broker, runs math models, saves to DB, and serves REST endpoints.
4. **PostgreSQL + PostGIS:** Stores the historical spatial data.
5. **React + Leaflet (Vite):** Polls the backend, renders the live map, draws polyline paths, and displays the Gemini AI analysis.

## 🛠️ Tech Stack
* **Frontend:** React, Vite, React-Leaflet, Custom CSS (Dark Theme)
* **Backend:** Python 3.10, FastAPI, Uvicorn, Paho-MQTT, Google GenAI SDK
* **Database:** PostgreSQL with PostGIS extension, SQLModel (ORM)
* **Infrastructure:** Docker, Docker Compose, Eclipse Mosquitto

##  How to Run the Project

Because this project is fully containerized, you do not need to install Node.js, Python, or PostgreSQL on your local machine. You only need Docker.

**1. Clone the repository:**
```bash
git clone [https://github.com/YOUR_USERNAME/velocity.git](https://github.com/YOUR_USERNAME/velocity.git)
cd velocity
```

**2. Configure Environment Variables (Security First):**
This project uses a .env file to keep API keys secure.

Copy the example file:

```bash

cp .env.example .env
Open the new .env file and insert your free Google Gemini API key (get one from Google AI Studio).
```

**3. Build and launch the cluster:**

```bash

docker compose up --build
```

**4. Access the Dashboard:**
Open your browser and navigate to http://localhost:5173. You will see the truck begin its route, update the KPI metrics in real-time, and eventually trigger the geofence breach.

## License ##
This project is open-source and available under the MIT License.