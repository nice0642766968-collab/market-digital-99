const firebaseConfig = {
    apiKey: "AIzaSyAmbzRxqYFti6IEksy2WunKCVa_v8Gg0F0",
    authDomain: "market-digital-3d10e.firebaseapp.com",
    projectId: "market-digital-3d10e",
    storageBucket: "market-digital-3d10e.firebasestorage.app",
    messagingSenderId: "368580098929",
    appId: "1:368580098929:web:7e005211ceb83b3b9794d0",
    measurementId: "G-Q985QSMDDT"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let isLoginMode = true;
let currentChatId = null;

// --- 1. ระบบ Authentication ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authSubtitle').innerText = isLoginMode ? "เข้าสู่ระบบเพื่อดำเนินการต่อ" : "สร้างบัญชีใหม่เพื่อเริ่มการซื้อขาย";
    document.getElementById('btnAuth').innerText = isLoginMode ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
    document.getElementById('btnToggle').innerText = isLoginMode ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if(!email || !pass) return alert("กรุณากรอกข้อมูลให้ครบ");
    try {
        if (isLoginMode) await auth.signInWithEmailAndPassword(email, pass);
        else await auth.createUserWithEmailAndPassword(email, pass);
    } catch (e) { alert(e.message); }
}

auth.onAuthStateChanged(user => {
    document.getElementById('authView').style.display = user ? 'none' : 'flex';
    document.getElementById('appView').style.display = user ? 'block' : 'none';
    if (user) loadProducts();
});

function logout() { auth.signOut(); }

// --- 2. ระบบลงประกาศและอัปโหลดรูป ---
function previewImg(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = document.getElementById('imgPre');
            img.src = reader.result;
            img.style.display = 'block';
            document.getElementById('uploadPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

async function savePost() {
    const file = document.getElementById('pImage').files[0];
    const btn = document.getElementById('btnSave');
    if (!file) return alert("กรุณาเลือกรูปภาพสินค้า");

    btn.disabled = true;
    btn.innerText = "กำลังประมวลผล...";

    try {
        // อัปโหลดรูปไป Storage
        const ref = storage.ref(`products/${Date.now()}_${file.name}`);
        const snap = await ref.put(file);
        const url = await snap.ref.getDownloadURL();

        // บันทึกลง Firestore
        await db.collection("products").add({
            title: document.getElementById('pTitle').value,
            cat: document.getElementById('pCat').value,
            price: Number(document.getElementById('pPrice').value),
            desc: document.getElementById('pDesc').value,
            img: url,
            owner: auth.currentUser.email,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeModal();
        alert("ลงประกาศสำเร็จ!");
    } catch (e) { alert(e.message); } 
    finally { btn.disabled = false; btn.innerText = "ยืนยันประกาศ"; }
}

// --- 3. ดึงข้อมูลสินค้าและการกรอง ---
function loadProducts(filter = 'ทั้งหมด') {
    db.collection("products").orderBy("time", "desc").onSnapshot(snap => {
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            if (filter !== 'ทั้งหมด' && data.cat !== filter) return;
            
            grid.innerHTML += `
                <div class="card">
                    <img src="${data.img}" class="card-img">
                    <small style="color:var(--accent); font-weight:bold;">${data.cat}</small>
                    <h3 style="margin:5px 0;">${data.title}</h3>
                    <p class="price-tag">฿${data.price.toLocaleString()}</p>
                    <button class="btn-primary" onclick="openChat('${doc.id}', '${data.title}')">💬 สอบถามแชท</button>
                </div>`;
        });
    });
}

function filterCategory(cat) {
    document.querySelectorAll('#categoryList li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
    loadProducts(cat);
}

// --- 4. ระบบแชทภายใน ---
function openChat(id, title) {
    currentChatId = id;
    document.getElementById('chatWindow').style.display = 'flex';
    document.getElementById('chatTitle').innerText = title;
    
    db.collection("products").doc(id).collection("messages").orderBy("time")
    .onSnapshot(snap => {
        const box = document.getElementById('chatMsgs');
        box.innerHTML = '';
        snap.forEach(m => {
            const d = m.data();
            const isMe = d.user === auth.currentUser.email;
            box.innerHTML += `
                <div style="align-self:${isMe ? 'flex-end' : 'flex-start'}; 
                            background:${isMe ? 'var(--primary)' : '#eee'}; 
                            color:${isMe ? 'white' : 'black'};
                            padding:8px 12px; border-radius:12px; max-width:85%; font-size:14px;">
                    ${d.text}
                </div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

async function sendMsg() {
    const text = document.getElementById('msgInput').value;
    if (!text) return;
    await db.collection("products").doc(currentChatId).collection("messages").add({
        text, user: auth.currentUser.email, time: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('msgInput').value = '';
}

// Helpers
function openModal() { document.getElementById('postModal').style.display = 'flex'; }
function closeModal() { document.getElementById('postModal').style.display = 'none'; }
function closeChat() { document.getElementById('chatWindow').style.display = 'none'; }
