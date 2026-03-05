import time
import json
import requests
import random
import os
import paho.mqtt.client as mqtt

# Look for Docker broker, default to localhost if running outside Docker
BROKER = os.getenv("MQTT_BROKER", "localhost")
TOPIC= "velocity/telemetry"
TRUCK_ID = 101

latitude = 36.8065
longitude = 10.1815

# Setup MQTT Client
# CallbackAPIVersion.VERSION2 is the modern Paho MQTT syntax
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

def drive_truck():
    global latitude, longitude
    print(f"Truck {TRUCK_ID} engine started! Connecting to Broker: {BROKER}...")

    # Connect to the broker on port 1883
    client.connect(BROKER, 1883, 60)
    client.loop_start() # Start the network loop in the background 
    while True:
        latitude += random.uniform(-0.0005, 0.0015) 
        longitude += random.uniform(-0.0005, 0.0015)
        
        data = {
            "truck_id": TRUCK_ID,
            "latitude": latitude,
            "longitude": longitude
        }
        
        # PUBLISH the data to the megaphone!
        client.publish(TOPIC, json.dumps(data))
        print(f"PUBLISHED: {latitude:.4f}, {longitude:.4f}")
        # Always wait 1 second
        time.sleep(1)

if __name__ == "__main__":
    drive_truck()
