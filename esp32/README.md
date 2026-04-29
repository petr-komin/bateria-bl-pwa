# ESP32 BLE Temperature

PlatformIO projekt pro ESP32-C3 s BLE GATT serverem.

## Co delá

- Spustí BLE GATT server s názvem `ESP32-C3-Temp`
- Každou sekundu odesílá simulovanou teplotu jadra (30–50 °C) přes BLE Notify
- Po odpojení klienta automaticky restartuje advertising

## UUIDs

| Typ            | UUID                                   |
|----------------|----------------------------------------|
| Service        | `12345678-1234-1234-1234-123456789abc` |
| Characteristic | `abcd1234-ab12-cd34-ef56-abcdef123456` |

## Upload

```bash
pio run --target upload
pio device monitor
```
