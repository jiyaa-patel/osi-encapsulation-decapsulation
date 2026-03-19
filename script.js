/* ==============================================================
   OSI MODEL SIMULATOR – script.js
   ==============================================================
   This script handles:
   1. Predefined devices with realistic network attributes
   2. Layer metadata (layerInfo)
   3. Dynamic simulation step generation with real IPs, MACs, ports
   4. DOM rendering and updates
   5. Simulation controls (Next Step, Reset)
   ============================================================== */

// ─── Predefined Network Devices ──────────────────────────────
const devices = [
  { name: 'Office-PC',     ip: '192.168.1.10',  mac: 'AA:BB:CC:DD:EE:01', port: 80  },
  { name: 'Lab-PC',        ip: '192.168.1.25',  mac: 'AA:BB:CC:DD:EE:02', port: 21  },
  { name: 'Admin-System',  ip: '10.0.0.5',      mac: 'AA:BB:CC:DD:EE:03', port: 25  },
  { name: 'Student-Node',  ip: '172.16.0.100',  mac: 'AA:BB:CC:DD:EE:04', port: 53  },
  { name: 'Server-01',     ip: '192.168.1.100', mac: 'AA:BB:CC:DD:EE:FF', port: 443 }
];

// ─── Layer Metadata ──────────────────────────────────────────
const layerInfo = [
  {
    num: 7, name: 'Application', pdu: 'Data',
    protocols: ['HTTP', 'FTP', 'SMTP', 'DNS', 'SNMP'],
    fn: 'Provides network services directly to end-user applications.',
    desc: 'User data enters the network stack. The chosen application-layer protocol is identified.'
  },
  {
    num: 6, name: 'Presentation', pdu: 'Data',
    protocols: ['SSL/TLS', 'JPEG', 'MPEG', 'ASCII'],
    fn: 'Translates, encrypts, and compresses data for the application layer.',
    desc: 'Data is encoded / encrypted so both sides understand the format.'
  },
  {
    num: 5, name: 'Session', pdu: 'Data',
    protocols: ['NetBIOS', 'PPTP', 'RPC', 'SCP'],
    fn: 'Establishes, manages, and terminates sessions between applications.',
    desc: 'A session identifier is prepended to manage the dialog.'
  },
  {
    num: 4, name: 'Transport', pdu: 'Segment',
    protocols: ['TCP', 'UDP'],
    fn: 'Provides reliable or unreliable delivery, flow control, and error recovery.',
    desc: 'A transport header (TCP/UDP) is added; data becomes a segment.'
  },
  {
    num: 3, name: 'Network', pdu: 'Packet',
    protocols: ['IP', 'ICMP', 'ARP', 'OSPF'],
    fn: 'Routes data packets across networks using logical addressing (IP).',
    desc: 'Source and destination IP addresses are added; data becomes a packet.'
  },
  {
    num: 2, name: 'Data Link', pdu: 'Frame',
    protocols: ['Ethernet', 'Wi-Fi (802.11)', 'PPP'],
    fn: 'Provides node-to-node data transfer and handles error detection.',
    desc: 'MAC addresses and a trailer for error checking are added; data becomes a frame.'
  },
  {
    num: 1, name: 'Physical', pdu: 'Bits',
    protocols: ['USB', 'DSL', 'ISDN', 'Ethernet PHY'],
    fn: 'Transmits raw bit streams over a physical medium.',
    desc: 'The frame is converted into binary bits for electrical/optical transmission.'
  }
];

// ─── State ───────────────────────────────────────────────────
let simulationSteps = [];
let currentStep = -1;
let isRunning = false;   // tracks whether a simulation is active

// ─── DOM References ──────────────────────────────────────────
const $senderDevice   = document.getElementById('sender-device');
const $receiverDevice = document.getElementById('receiver-device');
const $messageInput   = document.getElementById('message-input');
const $transportProto = document.getElementById('transport-protocol');
const $encodingType   = document.getElementById('encoding-type');
const $validationMsg  = document.getElementById('validation-msg');

const $btnNext  = document.getElementById('btn-next');
const $btnReset = document.getElementById('btn-reset');

const $progressLabel = document.getElementById('progress-label');
const $progressPct   = document.getElementById('progress-pct');
const $progressBar   = document.getElementById('progress-bar');

const $senderLayers   = document.getElementById('sender-layers');
const $receiverLayers = document.getElementById('receiver-layers');
const $senderLabel    = document.getElementById('sender-label');
const $receiverLabel  = document.getElementById('receiver-label');

const $currentData     = document.getElementById('current-data-display');
const $packetDot       = document.getElementById('packet-dot');
const $transmissionLbl = document.getElementById('transmission-label');

const $detailStep      = document.getElementById('detail-step');
const $detailSide      = document.getElementById('detail-side');
const $detailLayer     = document.getElementById('detail-layer');
const $detailAction    = document.getElementById('detail-action');
const $detailPdu       = document.getElementById('detail-pdu');

const $senderInfoBody   = document.getElementById('sender-info-body');
const $receiverInfoBody = document.getElementById('receiver-info-body');

const $successOverlay = document.getElementById('success-overlay');
const $successDetail  = document.getElementById('success-detail');

// ─── Populate Device Dropdowns ───────────────────────────────
function populateDeviceDropdowns() {
  devices.forEach((dev, i) => {
    const optS = document.createElement('option');
    optS.value = i;
    optS.textContent = `${dev.name}  (${dev.ip})`;
    $senderDevice.appendChild(optS);

    const optR = document.createElement('option');
    optR.value = i;
    optR.textContent = `${dev.name}  (${dev.ip})`;
    $receiverDevice.appendChild(optR);
  });
  // Default: sender = 0 (Office-PC), receiver = 4 (Server-01)
  $senderDevice.value = 0;
  $receiverDevice.value = 4;
}

// ─── Render Device Info Card ─────────────────────────────────
function renderDeviceInfo(device, container) {
  const tp  = $transportProto.value;
  const enc = $encodingType.value;
  container.innerHTML = `
    <div class="device-info-row"><span class="device-info-label">Name</span><span class="device-info-value">${device.name}</span></div>
    <div class="device-info-row"><span class="device-info-label">IP</span><span class="device-info-value">${device.ip}</span></div>
    <div class="device-info-row"><span class="device-info-label">MAC</span><span class="device-info-value">${device.mac}</span></div>
    <div class="device-info-row"><span class="device-info-label">Port</span><span class="device-info-value">${device.port}</span></div>
    <div class="device-info-row"><span class="device-info-label">Trans</span><span class="protocol-badge badge-transport">${tp}</span></div>
    <div class="device-info-row"><span class="device-info-label">Encode</span><span class="protocol-badge badge-encoding">${enc}</span></div>
  `;
}

function updateDeviceCards() {
  const sender   = devices[parseInt($senderDevice.value)];
  const receiver = devices[parseInt($receiverDevice.value)];
  renderDeviceInfo(sender, $senderInfoBody);
  renderDeviceInfo(receiver, $receiverInfoBody);
}

// ─── Initialise Layer Boxes ──────────────────────────────────
function initLayerBoxes() {
  [{ container: $senderLayers, side: 'sender' },
   { container: $receiverLayers, side: 'receiver' }].forEach(({ container, side }) => {
    container.innerHTML = '';
    layerInfo.forEach((layer) => {
      const box = document.createElement('div');
      box.className = 'layer-box';
      box.id = `${side}-layer-${layer.num}`;
      box.innerHTML = `
        <span class="layer-num">${layer.num}</span>
        <span class="layer-name">${layer.name}</span>
        <span class="layer-pdu">${layer.pdu}</span>
        <span class="layer-tooltip">${layer.fn}<br><em>Protocols: ${layer.protocols.join(', ')}</em></span>
      `;
      container.appendChild(box);
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────

// Convert string → 8-bit binary per character
function toBinary(str) {
  return str.split('').map(ch =>
    ch.charCodeAt(0).toString(2).padStart(8, '0')
  ).join(' ');
}

// Generate a random session ID (3-digit number)
function generateSessionId() {
  return Math.floor(100 + Math.random() * 900);
}

// Generate a random ephemeral source port (49152–65535)
function generateSrcPort() {
  return Math.floor(49152 + Math.random() * (65535 - 49152));
}

// Generate a realistic-looking FCS value (4-char hex)
function generateFCS(message) {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = ((hash << 5) - hash + message.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).toUpperCase().slice(-4).padStart(4, '0');
}

// ─── Build Simulation Steps (Dynamic) ───────────────────────
function buildSteps(sender, receiver, message, tp, enc) {
  const steps = [];
  const sessionId = generateSessionId();
  const srcPort   = generateSrcPort();
  const dstPort   = receiver.port;
  const fcs       = generateFCS(message);

  // ──── ENCAPSULATION (Sender) ────

  // Layer 7 – Application
  const appData = `${tp} DATA: ${message}`;
  steps.push({
    side: 'Sender', layerNum: 7, layer: layerInfo[0],
    action: `User data "${message}" is handed to the application layer on ${sender.name} using ${tp}.`,
    data: appData
  });

  // Layer 6 – Presentation (encode)
  const presData = `${enc}_ENC(${message})`;
  steps.push({
    side: 'Sender', layerNum: 6, layer: layerInfo[1],
    action: `Data is encoded using ${enc} encoding by the Presentation layer.`,
    data: presData
  });

  // Layer 5 – Session
  const sesData = `SES#${sessionId}[${presData}]`;
  steps.push({
    side: 'Sender', layerNum: 5, layer: layerInfo[2],
    action: `Session ID #${sessionId} is assigned to manage the dialog between ${sender.name} and ${receiver.name}.`,
    data: sesData
  });

  // Layer 4 – Transport
  const transHeader = `[${tp} | SrcPort: ${srcPort} | DstPort: ${dstPort}]`;
  const transData = `${transHeader} ${sesData}`;
  steps.push({
    side: 'Sender', layerNum: 4, layer: layerInfo[3],
    action: `${tp} header added with source port ${srcPort} and destination port ${dstPort}. Data becomes a segment.`,
    data: transData
  });

  // Layer 3 – Network
  const netHeader = `[IP | Src: ${sender.ip} | Dst: ${receiver.ip}]`;
  const netData = `${netHeader} ${transData}`;
  steps.push({
    side: 'Sender', layerNum: 3, layer: layerInfo[4],
    action: `IP header added with source ${sender.ip} → destination ${receiver.ip}. Segment becomes a packet.`,
    data: netData
  });

  // Layer 2 – Data Link
  const dlHeader = `[ETH | Src: ${sender.mac} | Dst: ${receiver.mac} | FCS: ${fcs}]`;
  const dlData = `${dlHeader} ${netData}`;
  steps.push({
    side: 'Sender', layerNum: 2, layer: layerInfo[5],
    action: `Ethernet frame header added with source MAC ${sender.mac} and destination MAC ${receiver.mac}. FCS trailer: ${fcs}. Packet becomes a frame.`,
    data: dlData
  });

  // Layer 1 – Physical (binary)
  const binaryBits = toBinary(message);
  steps.push({
    side: 'Sender', layerNum: 1, layer: layerInfo[6],
    action: `Frame is converted to raw binary bits for transmission over the physical medium from ${sender.name}.`,
    data: binaryBits
  });

  // ──── DECAPSULATION (Receiver) ────

  // Layer 1 – Physical
  steps.push({
    side: 'Receiver', layerNum: 1, layer: layerInfo[6],
    action: `Raw binary bits received at ${receiver.name} from the physical medium.`,
    data: binaryBits
  });

  // Layer 2 – Data Link (remove Ethernet header)
  steps.push({
    side: 'Receiver', layerNum: 2, layer: layerInfo[5],
    action: `Ethernet header removed. MAC destination ${receiver.mac} verified, FCS ${fcs} checked. Frame → Packet.`,
    data: netData
  });

  // Layer 3 – Network (remove IP header)
  steps.push({
    side: 'Receiver', layerNum: 3, layer: layerInfo[4],
    action: `IP header removed. Destination IP ${receiver.ip} confirmed. Packet → Segment.`,
    data: transData
  });

  // Layer 4 – Transport (remove TCP/UDP header)
  steps.push({
    side: 'Receiver', layerNum: 4, layer: layerInfo[3],
    action: `${tp} header removed. Destination port ${dstPort} matched. Segment → Session Data.`,
    data: sesData
  });

  // Layer 5 – Session (remove session wrapper)
  steps.push({
    side: 'Receiver', layerNum: 5, layer: layerInfo[2],
    action: `Session #${sessionId} wrapper removed. Session between ${sender.name} and ${receiver.name} managed.`,
    data: presData
  });

  // Layer 6 – Presentation (decode)
  steps.push({
    side: 'Receiver', layerNum: 6, layer: layerInfo[1],
    action: `Data decoded from ${enc} encoding by the Presentation layer.`,
    data: message
  });

  // Layer 7 – Application (deliver)
  steps.push({
    side: 'Receiver', layerNum: 7, layer: layerInfo[0],
    action: `Original message "${message}" delivered to the application on ${receiver.name}.`,
    data: `${tp} DATA: ${message}`
  });

  return steps;
}

// ─── Render Current Step ─────────────────────────────────────
function renderStep(index) {
  const totalSteps = simulationSteps.length;
  const step = simulationSteps[index];

  // Progress bar
  const pct = Math.round(((index + 1) / totalSteps) * 100);
  $progressLabel.textContent = `Step ${index + 1} / ${totalSteps}`;
  $progressPct.textContent = `${pct}%`;
  $progressBar.style.width = `${pct}%`;

  // Layer highlights
  updateLayerStates(index);

  // Current data display
  $currentData.textContent = step.data;
  $currentData.classList.remove('data-flash');
  void $currentData.offsetWidth; // force reflow
  $currentData.classList.add('data-flash');

  // Step detail table
  $detailStep.textContent = `${index + 1} of ${totalSteps}`;
  $detailSide.textContent = step.side;
  $detailLayer.textContent = `Layer ${step.layerNum} – ${step.layer.name}`;
  $detailAction.textContent = step.action;
  $detailPdu.textContent = step.layer.pdu;

  // Packet animation
  handlePacketAnimation(index, totalSteps);

  // Scroll active layer into view
  const activeSide = step.side === 'Sender' ? 'sender' : 'receiver';
  const activeBox = document.getElementById(`${activeSide}-layer-${step.layerNum}`);
  if (activeBox) {
    activeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ─── Layer State Management ─────────────────────────────────
function updateLayerStates(currentIndex) {
  document.querySelectorAll('.layer-box').forEach(box => {
    box.classList.remove('active', 'completed');
  });

  simulationSteps.forEach((step, i) => {
    const side = step.side === 'Sender' ? 'sender' : 'receiver';
    const box = document.getElementById(`${side}-layer-${step.layerNum}`);
    if (!box) return;

    if (i < currentIndex) {
      box.classList.add('completed');
    } else if (i === currentIndex) {
      box.classList.add('active');
    }
  });
}

// ─── Packet Animation ────────────────────────────────────────
function handlePacketAnimation(index, total) {
  const senderDone = 6;
  const receiverStart = 7;

  if (index < senderDone) {
    $packetDot.className = 'packet-dot at-start';
    $transmissionLbl.textContent = 'Encapsulating data on Sender side…';
  } else if (index === senderDone) {
    $packetDot.className = 'packet-dot';
    requestAnimationFrame(() => {
      $packetDot.classList.add('animate-send');
    });
    $transmissionLbl.textContent = '⚡ Transmitting bits over the medium…';
  } else if (index >= receiverStart) {
    $packetDot.className = 'packet-dot at-end';
    if (index === total - 1) {
      $transmissionLbl.textContent = '✅ Transmission complete!';
    } else {
      $transmissionLbl.textContent = 'Decapsulating data on Receiver side…';
    }
  }
}

// ─── Validation ──────────────────────────────────────────────
function validate() {
  const sIdx = parseInt($senderDevice.value);
  const rIdx = parseInt($receiverDevice.value);
  const message = $messageInput.value.trim();
  const errors = [];

  if (sIdx === rIdx) errors.push('Sender and Receiver cannot be the same device.');
  if (!message) errors.push('Message cannot be empty.');

  if (errors.length) {
    $validationMsg.textContent = errors.join(' ');
    return false;
  }
  $validationMsg.textContent = '';
  return true;
}

// ─── Start Simulation (called on first Next Step click) ─────
function startSimulation() {
  if (!validate()) return false;

  const sender   = devices[parseInt($senderDevice.value)];
  const receiver = devices[parseInt($receiverDevice.value)];
  const message  = $messageInput.value.trim();
  const tp       = $transportProto.value;
  const enc      = $encodingType.value;

  // Update panel labels
  $senderLabel.textContent   = `Sender – ${sender.name}`;
  $receiverLabel.textContent = `Receiver – ${receiver.name}`;

  // Build dynamic steps
  simulationSteps = buildSteps(sender, receiver, message, tp, enc);
  currentStep = -1;
  isRunning = true;

  // Disable inputs
  toggleInputs(false);
  $btnReset.disabled = false;
  $successOverlay.classList.add('hidden');

  // Reset visuals
  updateLayerStates(-1);
  $packetDot.className = 'packet-dot';
  $transmissionLbl.textContent = 'Ready to begin…';
  $currentData.textContent = '—';

  // Reset progress
  $progressLabel.textContent = `Step 0 / ${simulationSteps.length}`;
  $progressPct.textContent = '0%';
  $progressBar.style.width = '0%';

  return true;
}

// ─── Next Step ───────────────────────────────────────────────
function nextStep() {
  // If simulation hasn't started yet, start it first
  if (!isRunning) {
    if (!startSimulation()) return;
  }

  if (currentStep >= simulationSteps.length - 1) {
    finishSimulation();
    return;
  }

  currentStep++;
  renderStep(currentStep);

  if (currentStep >= simulationSteps.length - 1) {
    finishSimulation();
  }
}

// ─── Finish ──────────────────────────────────────────────────
function finishSimulation() {
  $btnNext.disabled = true;

  const sender   = devices[parseInt($senderDevice.value)];
  const receiver = devices[parseInt($receiverDevice.value)];
  $successDetail.textContent = `${sender.name} → ${receiver.name}`;
  $successOverlay.classList.remove('hidden');
}

// ─── Reset ───────────────────────────────────────────────────
function resetSimulation() {
  simulationSteps = [];
  currentStep = -1;
  isRunning = false;

  toggleInputs(true);
  $btnNext.disabled  = false;
  $btnReset.disabled = true;

  initLayerBoxes();
  $senderLabel.textContent   = 'Sender';
  $receiverLabel.textContent = 'Receiver';
  $currentData.textContent   = '—';
  $packetDot.className       = 'packet-dot';
  $transmissionLbl.textContent = 'Awaiting transmission…';
  $validationMsg.textContent = '';

  [$detailStep, $detailSide, $detailLayer, $detailAction, $detailPdu]
    .forEach(el => el.textContent = '—');

  $progressLabel.textContent = 'Step 0 / 14';
  $progressPct.textContent   = '0%';
  $progressBar.style.width   = '0%';

  $successOverlay.classList.add('hidden');

  // Refresh device cards
  updateDeviceCards();
}

// ─── Toggle Inputs ───────────────────────────────────────────
function toggleInputs(enabled) {
  [$senderDevice, $receiverDevice, $messageInput, $transportProto, $encodingType].forEach(el => {
    el.disabled = !enabled;
  });
}

// ─── Event Listeners ─────────────────────────────────────────
$btnNext.addEventListener('click', nextStep);
$btnReset.addEventListener('click', resetSimulation);

// Update device info cards when any dropdown changes
$senderDevice.addEventListener('change', updateDeviceCards);
$receiverDevice.addEventListener('change', updateDeviceCards);
$transportProto.addEventListener('change', updateDeviceCards);
$encodingType.addEventListener('change', updateDeviceCards);

// Click overlay to dismiss
$successOverlay.addEventListener('click', () => {
  $successOverlay.classList.add('hidden');
});

// Enter key starts / advances simulation
$messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') nextStep();
});

// ─── Boot ────────────────────────────────────────────────────
populateDeviceDropdowns();
updateDeviceCards();
initLayerBoxes();
