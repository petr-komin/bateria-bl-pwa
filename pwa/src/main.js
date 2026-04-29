const SERVICE_UUID        = '12345678-1234-1234-1234-123456789abc'
const CHARACTERISTIC_UUID = 'abcd1234-ab12-cd34-ef56-abcdef123456'

const btnConnect   = document.getElementById('btn-connect')
const statusEl     = document.getElementById('status')
const tempEl       = document.getElementById('temperature')
const lastUpdateEl = document.getElementById('last-update')
const rssiValueEl  = document.getElementById('rssi-value')
const rssiBars     = [
  document.getElementById('bar1'),
  document.getElementById('bar2'),
  document.getElementById('bar3'),
  document.getElementById('bar4'),
]

let bleDevice = null
let bleServer = null

function setStatus(state, text) {
  statusEl.className = `status ${state}`
  statusEl.textContent = text
}

function formatTime(date) {
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// RSSI -30 az -50 = vyborny (4 bary), -51 az -65 = dobry (3), -66 az -75 = ok (2), -76+ = slaby (1)
function updateRSSI(rssi) {
  rssiValueEl.textContent = `${rssi} dBm`
  let bars = 0
  if (rssi >= -50) bars = 4
  else if (rssi >= -65) bars = 3
  else if (rssi >= -75) bars = 2
  else bars = 1

  rssiBars.forEach((bar, i) => {
    bar.classList.toggle('active', i < bars)
  })
}

function onTemperatureUpdate(event) {
  const decoder = new TextDecoder('utf-8')
  const raw = decoder.decode(event.target.value)

  let temp, rssi
  try {
    const data = JSON.parse(raw)
    temp = data.t
    rssi = data.r
  } catch {
    // fallback pro stary format (plain cislo)
    temp = parseFloat(raw)
  }

  if (!isNaN(temp)) {
    tempEl.textContent = temp.toFixed(1)
    tempEl.classList.toggle('hot', temp >= 45)
    lastUpdateEl.textContent = `Aktualizovano: ${formatTime(new Date())}`
  }
  if (rssi !== undefined) {
    updateRSSI(rssi)
  }
}

async function connect() {
  if (!navigator.bluetooth) {
    alert('Tento prohlizec nepodporuje Web Bluetooth API.\nPouzijte Chrome na Androidu.')
    return
  }

  try {
    setStatus('connecting', 'Vyhledavam...')
    btnConnect.disabled = true

    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
    })

    bleDevice.addEventListener('gattserverdisconnected', onDisconnected)

    setStatus('connecting', 'Pripojuji...')
    bleServer = await bleDevice.gatt.connect()

    const service = await bleServer.getPrimaryService(SERVICE_UUID)
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID)

    await characteristic.startNotifications()
    characteristic.addEventListener('characteristicvaluechanged', onTemperatureUpdate)

    setStatus('connected', `Pripojeno: ${bleDevice.name || 'ESP32'}`)
    btnConnect.textContent = 'Odpojit'
    btnConnect.classList.add('connected')
    btnConnect.disabled = false

  } catch (err) {
    console.error(err)
    if (err.name !== 'NotFoundError') {
      setStatus('disconnected', 'Chyba pripojeni')
    } else {
      setStatus('disconnected', 'Odpojeno')
    }
    btnConnect.disabled = false
    btnConnect.textContent = 'Pripojit'
    btnConnect.classList.remove('connected')
  }
}

function onDisconnected() {
  setStatus('disconnected', 'Odpojeno')
  btnConnect.textContent = 'Pripojit'
  btnConnect.classList.remove('connected')
  btnConnect.disabled = false
  bleDevice = null
  bleServer = null
}

function disconnect() {
  if (bleDevice && bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect()
  }
  onDisconnected()
}

btnConnect.addEventListener('click', () => {
  if (bleDevice && bleDevice.gatt.connected) {
    disconnect()
  } else {
    connect()
  }
})

// Service Worker registrace
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error)
  })
}
