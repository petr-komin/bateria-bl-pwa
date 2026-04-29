#include <Arduino.h>
#include <NimBLEDevice.h>

// UUIDs - unique pro tento projekt
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcd1234-ab12-cd34-ef56-abcdef123456"

NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;
uint16_t connHandle = BLE_HS_CONN_HANDLE_NONE;

// Simulovana teplota jadra ESP32
float simulateTemperature() {
  static float temp = 38.0f;
  temp += ((float)random(-20, 21)) / 100.0f;
  if (temp < 30.0f) temp = 30.0f;
  if (temp > 50.0f) temp = 50.0f;
  return temp;
}

// Precti RSSI pripojeneho klienta
int readRSSI() {
  if (connHandle == BLE_HS_CONN_HANDLE_NONE) return 0;
  int8_t rssi = 0;
  ble_gap_conn_rssi(connHandle, &rssi);
  return (int)rssi;
}

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer, ble_gap_conn_desc* desc) override {
    deviceConnected = true;
    connHandle = desc->conn_handle;
    Serial.printf("Klient pripojen, handle=%d\n", connHandle);
  }

  void onDisconnect(NimBLEServer* pServer) override {
    deviceConnected = false;
    connHandle = BLE_HS_CONN_HANDLE_NONE;
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

  // BLE 5.0 Long Range - Coded PHY (S=8, nejvetsi dosah)
  //Advertise na vsech PHY: 1M (kompatibilita) + Coded (dosah)
  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setPrimaryPhy(BLE_HCI_LE_PHY_CODED);
  pAdvertising->setSecondaryPhy(BLE_HCI_LE_PHY_CODED);
  NimBLEDevice::startAdvertising();

  Serial.println("BLE Long Range (Coded PHY) advertising spusten.");
  Serial.println("Cekam na pripojeni...");
}

void loop() {
  if (deviceConnected) {
    float temp = simulateTemperature();
    int rssi = readRSSI();

    char buf[32];
    snprintf(buf, sizeof(buf), "{\"t\":%.1f,\"r\":%d}", temp, rssi);

    pCharacteristic->setValue((uint8_t*)buf, strlen(buf));
    pCharacteristic->notify();

    Serial.printf("Odeslan: %s\n", buf);
  }
  delay(1000);
}
