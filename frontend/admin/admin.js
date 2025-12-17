const API_URL = 'http://localhost:5000/api';

// ========= Auth Guard =========
if (!sessionStorage.getItem('adminLoggedIn')) {
  window.location.href = 'login.html';
}

function logout() {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.href = 'login.html';
}

// ========= Dashboard Stats =========
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/visitors/stats`);
    const stats = await response.json();

    document.getElementById('totalToday').textContent = stats.totalToday;
    document.getElementById('checkedIn').textContent = stats.checkedIn;
    document.getElementById('checkedOut').textContent = stats.checkedOut;
    document.getElementById('totalHosts').textContent = stats.totalHosts;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// ========= Visitors (with photo) =========
async function loadVisitors() {
  try {
    const status = document.getElementById('statusFilter').value;
    const date = document.getElementById('dateFilter').value;

    let url = `${API_URL}/visitors?`;
    if (status) url += `status=${status}&`;
    if (date) url += `date=${date}`;

    const response = await fetch(url);
    const visitors = await response.json();

    const visitorsList = document.getElementById('visitorsList');
    visitorsList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Photo</th>
            <th>Badge</th>
            <th>Name</th>
            <th>Company</th>
            <th>Host</th>
            <th>Purpose</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${visitors.map(v => `
            <tr>
              <td>
                <img src="${v.photoPath}"
                     alt="Visitor Photo"
                     style="width:60px;height:60px;border-radius:50%;object-fit:cover;">
              </td>
              <td>${v.badgeNumber}</td>
              <td>${v.name}</td>
              <td>${v.company}</td>
              <td>${v.hostId?.name || '-'}</td>
              <td>${v.purpose}</td>
              <td>${new Date(v.checkInTime).toLocaleString('en-IN')}</td>
              <td>${v.checkOutTime ? new Date(v.checkOutTime).toLocaleString('en-IN') : '-'}</td>
              <td><span class="badge ${v.status}">${v.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Apply current search filter after reload
    filterVisitorsClient();
  } catch (error) {
    console.error('Error loading visitors:', error);
  }
}

// Client-side filter for visitors table
function filterVisitorsClient() {
  const input = document.getElementById('visitorSearch');
  if (!input) return;

  const filter = input.value.toLowerCase();
  const table = document.querySelector('#visitorsList table');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');

  rows.forEach(row => {
    const cells = row.getElementsByTagName('td');
    let text = '';
    for (let i = 0; i < cells.length; i++) {
      text += (cells[i].textContent || '').toLowerCase() + ' ';
    }

    if (text.indexOf(filter) > -1) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// ========= Hosts (photo capture + upload) =========
let hostStream = null;
let hostCapturedImage = null;

async function loadHosts() {
  try {
    const response = await fetch(`${API_URL}/hosts`);
    const hosts = await response.json();

    const hostsList = document.getElementById('hostsList');
    hostsList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${hosts.map(h => `
            <tr>
              <td>
                ${h.photoPath
                  ? `<img src="${h.photoPath}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">`
                  : '<span style="color:#aaa;">No Photo</span>'}
              </td>
              <td>${h.name}</td>
              <td>${h.email}</td>
              <td>${h.phone}</td>
              <td>${h.department}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="editHost('${h._id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteHost('${h._id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading hosts:', error);
  }
}

function showAddHostForm() {
  document.getElementById('addHostForm').style.display = 'block';
  document.getElementById('hostForm').reset();
  document.getElementById('hostId').value = '';
  hostCapturedImage = null;

  const preview = document.getElementById('hostPhotoPreview');
  if (preview) {
    preview.style.display = 'none';
    preview.src = '';
  }

  stopHostCamera();
}

function hideAddHostForm() {
  document.getElementById('addHostForm').style.display = 'none';
  document.getElementById('hostForm').reset();
  hostCapturedImage = null;
  stopHostCamera();
}

// ===== Host camera & upload controls =====
const hostVideo = document.getElementById('hostVideo');
const hostCanvas = document.getElementById('hostCanvas');
const hostStartCamera = document.getElementById('hostStartCamera');
const hostCaptureBtn = document.getElementById('hostCaptureBtn');
const hostRetakeBtn = document.getElementById('hostRetakeBtn');
const hostPhotoPreview = document.getElementById('hostPhotoPreview');
const hostFileInput = document.getElementById('hostFileInput');

// Start camera
if (hostStartCamera) {
  hostStartCamera.addEventListener('click', async () => {
    try {
      hostStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      hostVideo.srcObject = hostStream;
      hostVideo.style.display = 'block';
      hostCaptureBtn.disabled = false;
      hostStartCamera.style.display = 'none';
    } catch (err) {
      alert('Camera error: ' + err.message);
    }
  });
}

// Capture from camera
if (hostCaptureBtn) {
  hostCaptureBtn.addEventListener('click', () => {
    hostCanvas.width = hostVideo.videoWidth;
    hostCanvas.height = hostVideo.videoHeight;
    const ctx = hostCanvas.getContext('2d');
    ctx.drawImage(hostVideo, 0, 0);

    hostCapturedImage = hostCanvas.toDataURL('image/png');
    hostPhotoPreview.src = hostCapturedImage;
    hostPhotoPreview.style.display = 'block';

    hostVideo.style.display = 'none';
    hostCaptureBtn.style.display = 'none';
    hostRetakeBtn.style.display = 'inline-block';

    stopHostCamera();
  });
}

// Retake
if (hostRetakeBtn) {
  hostRetakeBtn.addEventListener('click', () => {
    hostCapturedImage = null;
    hostPhotoPreview.style.display = 'none';
    hostPhotoPreview.src = '';

    hostRetakeBtn.style.display = 'none';
    hostStartCamera.style.display = 'inline-block';
  });
}

function stopHostCamera() {
  if (hostStream) {
    hostStream.getTracks().forEach(t => t.stop());
    hostStream = null;
  }
  if (hostVideo) hostVideo.style.display = 'none';
  if (hostCaptureBtn) {
    hostCaptureBtn.disabled = true;
    hostCaptureBtn.style.display = 'inline-block';
  }
  if (hostStartCamera) hostStartCamera.style.display = 'inline-block';
  if (hostRetakeBtn) hostRetakeBtn.style.display = 'none';
}

// File upload → preview
if (hostFileInput) {
  hostFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (ev) {
      hostCapturedImage = ev.target.result;  // base64
      hostPhotoPreview.src = hostCapturedImage;
      hostPhotoPreview.style.display = 'block';

      stopHostCamera();
      hostVideo.style.display = 'none';
      hostStartCamera.style.display = 'inline-block';
      hostRetakeBtn.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
}

// Add / Update host
document.getElementById('hostForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('hostId').value;

  const body = {
    name: document.getElementById('hostName').value,
    email: document.getElementById('hostEmail').value,
    phone: document.getElementById('hostPhone').value,
    department: document.getElementById('hostDept').value,
    photo: hostCapturedImage || ''  // may be empty
  };

  try {
    let response;
    if (id) {
      response = await fetch(`${API_URL}/hosts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      response = await fetch(`${API_URL}/hosts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    const data = await response.json();
    if (data.success) {
      alert('Host saved successfully!');
      hideAddHostForm();
      loadHosts();
      loadStats();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    alert('Error saving host: ' + error.message);
  }
});

// Edit host
async function editHost(id) {
  try {
    const res = await fetch(`${API_URL}/hosts`);
    const hosts = await res.json();
    const host = hosts.find(h => h._id === id);
    if (!host) return;

    showAddHostForm();

    document.getElementById('hostId').value = host._id;
    document.getElementById('hostName').value = host.name;
    document.getElementById('hostEmail').value = host.email;
    document.getElementById('hostPhone').value = host.phone;
    document.getElementById('hostDept').value = host.department;

    if (host.photoPath) {
      hostCapturedImage = null;
      hostPhotoPreview.src = host.photoPath;
      hostPhotoPreview.style.display = 'block';
    } else {
      hostPhotoPreview.style.display = 'none';
      hostPhotoPreview.src = '';
    }
  } catch (err) {
    console.error('Error editing host:', err);
  }
}

// Delete host
async function deleteHost(id) {
  if (!confirm('Are you sure you want to delete this host?')) return;

  try {
    await fetch(`${API_URL}/hosts/${id}`, { method: 'DELETE' });
    loadHosts();
    loadStats();
  } catch (error) {
    alert('Error deleting host: ' + error.message);
  }
}

// ========= Check-out Visitor =========
async function checkoutVisitor() {
  const badgeNumber = document.getElementById('badgeNumber').value;

  if (!badgeNumber) {
    alert('Please enter badge number');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/visitors/checkout/${badgeNumber}`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('checkoutResult').innerHTML = `
        <div class="success-message">
          <h3>✅ ${data.message}</h3>
          <p><strong>Name:</strong> ${data.visitor.name}</p>
          <p><strong>Check-Out Time:</strong> ${new Date(data.visitor.checkOutTime).toLocaleString('en-IN')}</p>
        </div>
      `;
      document.getElementById('badgeNumber').value = '';
      loadStats();
      loadVisitors();
    } else {
      alert('Check-out failed: ' + data.error);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ========= QR Scanner (html5-qrcode) =========
let qrScannerInstance = null;

function initQrScanner() {
  const qrDiv = document.getElementById('qr-reader');
  if (!qrDiv || typeof Html5Qrcode === 'undefined') {
    return;
  }

  if (qrScannerInstance) {
    // already initialized
    return;
  }

  const html5QrCode = new Html5Qrcode("qr-reader");
  qrScannerInstance = html5QrCode;

  const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } }; // recommended config [web:148][web:149]

  const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    // Expecting JSON from QR (we stored JSON when generating)
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(decodedText);
      } catch {
        // if QR contains only badge number, use directly
      }

      const badgeInput = document.getElementById('badgeNumber');
      if (parsed && parsed.badgeNumber) {
        badgeInput.value = parsed.badgeNumber;
      } else {
        badgeInput.value = decodedText;
      }

      document.getElementById('qr-reader-results').innerText =
        `Scanned: ${badgeInput.value}`;

      // Optionally auto-checkout immediately:
      // checkoutVisitor();

      // Stop scanning after first successful read
      html5QrCode.stop().catch(() => {});
      qrScannerInstance = null;
      qrDiv.innerHTML = '<p style="color:#28a745;">Scan complete. You can scan again by reloading page or switching tab.</p>';
    } catch (err) {
      console.error('QR parse error:', err);
    }
  };

  html5QrCode.start(
    { facingMode: "environment" },
    qrConfig,
    qrCodeSuccessCallback,
    (errorMessage) => {
      // console.log('QR scan error', errorMessage);
    }
  ).catch(err => {
    console.error('QR scanner start error:', err);
  });
}

// ========= Tab switching =========
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

  if (tabName === 'visitors') loadVisitors();
  if (tabName === 'hosts') loadHosts();
  if (tabName === 'checkout') initQrScanner();
}

// ========= Init =========
loadStats();
loadVisitors();
setInterval(loadStats, 30000);
