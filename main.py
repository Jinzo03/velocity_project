from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlmodel import SQLModel, Field, Session, create_engine, select
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import os
import time
import json
import paho.mqtt.client as mqtt
import math

# DATABASE SETUP
# Connection format: postgresql://user:password@address:port/database_name
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:velocity_pass@localhost:5432/velocity")
engine = create_engine(DATABASE_URL)
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session    

# 2. DEFINE THE DATA MODEL (The Table)
# This class defines the columns in our database table
class TruckLocation(SQLModel, table=True):
    id: Optional[int] = Field(default=None,primary_key=True) # Auto-generated ID
    truck_id: int
    latitude: float
    longitude: float
    timestamp: float = Field(default=None) # We will add a timestamp


# AI configuration 
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable not found!")

client_ai = genai.Client(api_key=API_KEY)

# 3. INITIALIZE APP
app=FastAPI()


# Allow CORS for local development (optional, but useful if you have a frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow any website to talk to the backend
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],
)

# -MQTT SUBSCRIBER (THE BIG DATA LISTENER) ---
BROKER = os.getenv("MQTT_BROKER", "localhost")
TOPIC = "velocity/telemetry"

# Geofencing Logic
CENTER_LAT = 36.8065
CENTER_LON=10.1815
GEOFENCE_RADIUS_KM=2.0

# This global variable womm hold the very latest stream analysis
STREAM_STATE ={
    "distance_km": 0.0,
    "is_breached": False
}

def calculate_haversine(lat1,lon1,lat2,lon2):
   """Calculates the distance in km between two GPS points on Earth"""
   R =6371.0 # Earth radius in KM
   dlat= math.radians(lat2-lat1)
   dlon=math.radians(lon2-lon1) 
   a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))* math.cos(math.radians(lat2))*math.sin(dlon/2)**2
   c = 2*math.atan2(math.sqrt(a), math.sqrt(1-a))
   return R*c

def on_message(client, userdata,msg):
    """This function triggers automatically every time a truck publishes a message"""
    global STREAM_STATE
    try:
        # 1. read the JSON from the megaphone
        payload = json.loads(msg.payload.decode())
        truck_lat = payload["latitude"]
        truck_lon = payload["longitude"]
        # 1. Stream Processing: Run the math model instantly !
        distance= calculate_haversine(CENTER_LAT, CENTER_LON, truck_lat,truck_lon)
        is_breached = distance > GEOFENCE_RADIUS_KM

        # Update the gloabal state
        STREAM_STATE["distance_km"]=distance
        STREAM_STATE["is_breached"]=is_breached

        if is_breached:
            print(f"ALERT ! Truck {payload['truck_id']} breached geofence! Distance: {distance:.2f}km")
        # 2. Save it directly to the Database!

        with Session(engine) as session:
            new_location = TruckLocation(
                truck_id=payload["truck_id"],
                latitude=truck_lat,
                longitude=truck_lon,
                timestamp=time.time()
            )
            session.add(new_location)
            session.commit()
            print(f"INGESTED : Truck {new_location.truck_id} via MQTT")
    except Exception as e:
        print(f"Error processing MQTT message: {e}")

# Setup the MQTT client
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.on_message= on_message # Link the function above


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Connect to the broker when FastAPI starts
    try:
        mqtt_client.connect(BROKER, 1883 , 60)
        mqtt_client.subscribe(TOPIC) # Tell the broker we want ot listen to this topic
        mqtt_client.loop_start() # Listen in the background forever
        print("Connected to MQTT Broker succesfully!")
    except Exception as e:
        print(f"Could not connect to MQTT: {e}")    
# 4. ROUTES

# End point to see the history
@app.get("/history")
def get_history(session: Session = Depends(get_session)):
    locations = session.exec(select(TruckLocation)).all()
    return locations

@app.get("/generate-report/{truck_id}")
def generate_ai_report(truck_id: int, session: Session = Depends(get_session)):
    # 1. Get all data for this truck
    locations = session.exec(select(TruckLocation).where(TruckLocation.truck_id == truck_id)).all()

    if len(locations) < 2 :
        return{"report": "Not enough data to generate a report. Keep driving!"}
    
    # 2. Extract some basic stats for AI
    start_point=locations[0]
    end_point=locations[-1]
    total_updates=len(locations)

    # 3 .Write the prompt for the  AI

    prompt = f"""
    You are a professional fleet manager for VeloCity Logistics.
    Analyze the following trip data for Truck {truck_id}:
    -The truck sent {total_updates} GPS location updates.
    -The trip started at Latitude {start_point.latitude: .4f}, Longitude {start_point.longitude: .4f}.
    -the trip ended at Latitude {end_point.latitude: .4f}, Longitude {end_point.longitude: .4f}.

    Write a short, professional, 3-sentence summary of this trip.
    Make it sound like a real dispatch report. Be creative but professional.
    """
    # 4. Send to Gemini and get the response
    try:
        response = client_ai.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt
        )
        ai_text = response.text
    except Exception as e:
        ai_text = f"AI Error: {str(e)}"

    return {"truck_id": truck_id, "report": ai_text}  

# New ENDpoint          
@app.get("/live-status")
def get_live_status():
    return STREAM_STATE