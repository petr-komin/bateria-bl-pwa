#include <Arduino.h>
#include <NimBLEDevice.h>

// UUIDs - unique pro tento projekt
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcd1234-ab12-cd34-ef56-abcdef123456"

NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;

// Simulovana teplota jadra ESP32
float simulateTemperature() {
  // Zakladni teplota 35-45 °C s malymi nahodnymi zmenami
  static float temp = 38.0f;
  temp += ((float)random(-20, 21)) / 100.0f;
  if (temp < 30.0f) temp = 30.0f;
  if (temp > 50.0f) temp = 50.0f;
  return temp;
}

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("Klient pripojen");
  }

  void onDisconnect(NimBLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("Klient odpojen - restartuji advertising");
    NimBLEDevice::startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Spoustim BLE server...");

  NimBLEDevice::init("ESP32-C3-Temp");
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);

  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService* pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    NIMBLE_PROPERTY::NOTIFY
  );

  pService->start();

  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  NimBLEDevice::startAdvertising();

  Serial.println("BLE advertising spusten. Cekam na pripojeni...");
}

void loop() {
  if (deviceConnected) {
    float temp = simulateTemperature();
    char buf[16];
    snprintf(buf, sizeof(buf), "%.1f", temp);

    pCharacteristic->setValue((uint8_t*)buf, strlen(buf));
    pCharacteristic->notify();

    Serial.printf("Odeslan: %s °C\n", buf);
  }
  delay(1000);
}
