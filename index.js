// UTILS
function base32toBytes(base32) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "", bytes = [];
    base32 = base32.replace(/=+$/, "").toUpperCase().replace(/ /g, '');
    for (let i = 0; i < base32.length; i++) {
        const val = alphabet.indexOf(base32[i]);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
}

async function generateTOTP(secret, step = 30) {
    const key = base32toBytes(secret);
    const counter = Math.floor(Date.now() / 1000 / step);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, counter);

    const cryptoKey = await crypto.subtle.importKey(
        "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const hmac = await crypto.subtle.sign("HMAC", cryptoKey, buffer);
    const bytes = new Uint8Array(hmac);
    const offset = bytes[bytes.length - 1] & 0xf;
    const bin =
      ((bytes[offset] & 0x7f) << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      (bytes[offset + 3]);
    const otp = bin % 1000000;
    //console.warn(">>> Regenarating Code...");
    return otp.toString().padStart(6, '0');
}

const form = document.getElementById("form");
const accountsDiv = document.getElementById("accounts");

let accounts = JSON.parse(localStorage.getItem("accounts")) || [];

function startQRImport() {
    const qrReader = document.getElementById("qr-reader");
    qrReader.style.display = "block";

    var scanner = new Html5QrcodeScanner(
        "qr-reader", { fps: 10, qrbox: 250 }
    );
    scanner.render(qrScanSuccess);
}

function qrScanSuccess(decodedText, decodedResult) {
    console.log(`QR Scanned: ${decodedText}`, decodedResult);
}

function saveAccounts() {
    localStorage.setItem("accounts", JSON.stringify(accounts));
}

function removeAccount(index) {
    accounts.splice(index, 1);
    saveAccounts();
    renderAccounts();
}

function exportAccounts() {
    const data = localStorage.getItem("accounts");
    if (!data) {
        alert("No accounts to export.");
        return;
    }

    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hauth-export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function renderAccounts() {
    accountsDiv.innerHTML = "";
    for (let i = 0; i < accounts.length; i++) {
        const { issuer, label, secret } = accounts[i];
        const code = await generateTOTP(secret);
        const remaining = 30 - Math.floor(Date.now() / 1000) % 30;

        const div = document.createElement("div");
        div.className = "account";
        div.innerHTML = `
           <div class="title">${issuer} (${label})</div>
           <div class="code">${code}</div>
           <div class="timer">Next in ${remaining}s</div>
           <button onclick="removeAccount(${i})">X</button>
        `;
        accountsDiv.appendChild(div);
    }
    //console.warn(">>> Rendering Accounts Again.");
}

form.addEventListener("submit", e => {
    e.preventDefault();
    const issuer = document.getElementById("issuer").value.trim();
    const label = document.getElementById("label").value.trim();
    const secret = document.getElementById("secret").value.trim().replace(/ /g, '');
    if (issuer && label && secret) {
        accounts.push({ issuer, label, secret });
        saveAccounts();
        form.reset();
        renderAccounts();
    }
});

setInterval(renderAccounts, 1000);
renderAccounts();

/**
 * Security Warning (stay safe!)
 */
console.log(
    "%c🚨 SECURITY WARNING 🚨\n\n%cDo NOT paste anything here!\nYou could be hacked and lose your data!",
    "color: red; font-size: 30px; font-weight: bold; text-shadow: 2px 2px black;",
    "color: orange; font-size: 18px; font-weight: bold;"
);
console.log(
    "%cIf someone told you to paste something here, they might be trying to hack you.",
    "color: yellow; font-size: 16px;"
);
console.log(
    "%c🛡️ Stay safe. Close the DevTools if you're not sure what you're doing.",
    "color: lightgreen; font-size: 16px;"
);
console.log(
    "%c🚫 Don't try to get 'cracked' copies of HAuthenticator! 🚫",
    "color: red; font-size: 20px; font-weight: bold; text-shadow: 1px 1px black;"
);  
