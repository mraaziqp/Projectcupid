/*
  Project Cupid - Physical Love Lamp (ESP32)
  Requires: 
  - Arduino IDE
  - Adafruit NeoPixel library
  - ArduinoJson library
  - HTTPClient library (built-in)
  - WiFi library (built-in)

  Hardware Setup:
  - ESP32 Development Board
  - WS2812B LED strip (Data pin -> GPIO 5)
  - Power (5V/GND)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// --- USER CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Your Firebase Project ID (from firebase-applet-config.json)
const char* firebaseProjectId = "YOUR_PROJECT_ID";
const char* databaseId = "(default)"; // Change if you used a custom DB ID

// Pin configuration
#define LED_PIN 5
#define NUM_LEDS 30 // Update to match your strip length

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// Colors for Aurora animation
uint32_t colors[] = {
  strip.Color(138, 43, 226), // BlueViolet
  strip.Color(255, 20, 147), // DeepPink
  strip.Color(0, 191, 255)   // DeepSkyBlue
};

bool newLetterAvailable = false;
unsigned long lastCheckTime = 0;
const unsigned long checkInterval = 60000; // Check every 60 seconds

void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(100);
  strip.show(); // Initialize all pixels to 'off'

  connectToWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (millis() - lastCheckTime > checkInterval) {
      checkFirestore();
      lastCheckTime = millis();
    }
  } else {
    connectToWiFi();
  }

  if (newLetterAvailable) {
    playAuroraAnimation();
  } else {
    allOff();
    delay(1000);
  }
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void checkFirestore() {
  HTTPClient http;
  
  // REST API URL to query the 'letters' collection for unread, published letters
  // Note: For simplicity, this uses the open REST API. 
  // In production, you'd use a restricted API key or secure proxy.
  String url = "https://firestore.googleapis.com/v1/projects/" + String(firebaseProjectId) + 
               "/databases/" + String(databaseId) + "/documents/letters";
  
  http.begin(url);
  int httpCode = http.GET();

  if (httpCode > 0) {
    String payload = http.getString();
    DynamicJsonDocument doc(8192);
    deserializeJson(doc, payload);

    JsonArray documents = doc["documents"];
    bool unreadFound = false;

    for (JsonObject letter : documents) {
      JsonObject fields = letter["fields"];
      
      bool isPublished = fields["isPublished"]["booleanValue"];
      bool isRead = fields["isRead"]["booleanValue"];
      
      // Basic check: Is there any published but unread letter?
      if (isPublished && !isRead) {
        unreadFound = true;
        break;
      }
    }

    newLetterAvailable = unreadFound;
    Serial.println(newLetterAvailable ? "New letter waiting!" : "No new letters.");
  } else {
    Serial.print("Error on HTTP request: ");
    Serial.println(httpCode);
  }
  http.end();
}

void playAuroraAnimation() {
  static float t = 0;
  for (int i = 0; i < NUM_LEDS; i++) {
    // Breathing effect using sine wave
    float brightness = (sin(t + i * 0.2) + 1.2) / 2.2; 
    
    // Cycle through aurora colors
    int colorIdx = (int)(t / 5) % 3;
    uint32_t color = colors[colorIdx];
    
    uint8_t r = (uint8_t)(((color >> 16) & 0xFF) * brightness);
    uint8_t g = (uint8_t)(((color >> 8) & 0xFF) * brightness);
    uint8_t b = (uint8_t)((color & 0xFF) * brightness);
    
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
  strip.show();
  t += 0.05;
  delay(30);
}

void allOff() {
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, 0);
  }
  strip.show();
}
