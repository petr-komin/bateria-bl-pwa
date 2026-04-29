const SERVICE_UUID        = '12345678-1234-1234-1234-123456789abc'
const CHARACTERISTIC_UUID = 'abcd1234-ab12-cd34-ef56-abcdef123456'

const btnConnect   = document.getElementById('btn-connect')
const statusEl     = document.getElementById('status')
const tempEl       = document.getElementById('temperature')
const lastUpdateEl = document.getElementById('last-update')

let bleDevice = null
let bleServer = null

function setStatus(state, text) {
  statusEl.className = `status ${state}`
  statusEl.textContent = text
}

function formatTime(date) {
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function onTemperatureUpdate(event) {
  const decoder = new TextDecoder('utf-8')
  const value = decoder.decode(event.target.value)
  const temp = parseFloat(value)

  if (!isNaN(temp)) {
    tempEl.textContent = temp.toFixed(1)
    tempEl.classList.toggle('hot', temp >= 45)
    lastUpdateEl.textContent = `Aktualizovano: ${formatTime(new Date())}`
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
