const API_URL = 'http://localhost:5000/api';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const startCamera = document.getElementById('startCamera');
const retakeBtn = document.getElementById('retakeBtn');
const photoPreview = document.getElementById('photoPreview');
const capturedPhoto = document.getElementById('capturedPhoto');
const checkinForm = document.getElementById('checkinForm');

let stream = null;
let capturedImage = null;

// Start camera
startCamera.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = stream;
        video.style.display = 'block';
        captureBtn.disabled = false;
        startCamera.style.display = 'none';
    } catch (error) {
        alert('Camera access denied: ' + error.message);
    }
});

// Capture photo
captureBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    
    capturedImage = canvas.toDataURL('image/png');
    photoPreview.src = capturedImage;
    
    video.style.display = 'none';
    capturedPhoto.style.display = 'block';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';
    
    // Stop camera
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Retake photo
retakeBtn.addEventListener('click', () => {
    capturedPhoto.style.display = 'none';
    retakeBtn.style.display = 'none';
    startCamera.style.display = 'inline-block';
    capturedImage = null;
});

// Load hosts
async function loadHosts() {
    try {
        const response = await fetch(`${API_URL}/hosts`);
        const hosts = await response.json();
        
        const hostSelect = document.getElementById('hostId');
        hosts.forEach(host => {
            const option = document.createElement('option');
            option.value = host._id;
            option.textContent = `${host.name} - ${host.department}`;
            hostSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading hosts:', error);
    }
}

// Submit check-in
checkinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!capturedImage) {
        alert('Please capture a photo first!');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        company: document.getElementById('company').value || 'N/A',
        purpose: document.getElementById('purpose').value,
        hostId: document.getElementById('hostId').value,
        idProof: document.getElementById('idProof').value,
        photo: capturedImage
    };
    
    try {
        const response = await fetch(`${API_URL}/visitors/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showBadge(data.visitor);
        } else {
            alert('Check-in failed: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// Show badge modal
function showBadge(visitor) {
    document.getElementById('badgePhoto').src = capturedImage;
    document.getElementById('badgeName').textContent = visitor.name;
    document.getElementById('badgeNumber').textContent = visitor.badgeNumber;
    document.getElementById('badgeHost').textContent = visitor.hostId.name || 'N/A';
    document.getElementById('badgeTime').textContent = new Date(visitor.checkInTime).toLocaleString('en-IN');
    document.getElementById('badgeQR').src = visitor.qrCode;
    
    document.getElementById('badgeModal').style.display = 'flex';
}

// Initialize
loadHosts();
