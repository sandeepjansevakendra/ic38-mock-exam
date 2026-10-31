# IC-38 Mock Exam

IC-38 (जीवन बीमा एजेंट) परीक्षा की मुफ़्त तैयारी वेबसाइट — 25 टेस्ट सेट, हर सेट में 50 प्रश्न, 60 मिनट का टाइमर, प्रश्न पैलेट, ऑटो-सबमिट और पूरा रिज़ल्ट रिव्यू।

**Created by – Sandeep Kumar · Sandeep Jan Seva Kendra · Mob. 8299430081**

## फ़ाइलें

| फ़ाइल | काम |
|---|---|
| `index.html` | छात्रों की वेबसाइट (लॉगिन + परीक्षा) |
| `admin.html` | आपका एडमिन पेज — सभी users और attempts, Excel (CSV) डाउनलोड |
| `app.js` | परीक्षा और लॉगिन का कोड |
| `data.js` | सभी 272 प्रश्न |
| `firebase-config.js` | आपकी Firebase settings और admin email |
| `firestore.rules` | डेटाबेस की सुरक्षा के नियम |

## डेटाबेस (Firebase Firestore)

- **users** (Sheet 1) — हर user की एक ही row: नाम, मोबाइल, ईमेल, जन्म तिथि, ईमेल वेरीफाई हुआ या नहीं, कुल attempts, best score, रजिस्ट्रेशन और आख़िरी लॉगिन।
- **attempts** (Sheet 2) — हर टेस्ट की नई row, एक के बाद एक: तारीख, नाम, मोबाइल, ईमेल, सेट, स्कोर, ग़लत, खाली, PASS/FAIL, लगा समय।
- **mobiles** — एक मोबाइल नंबर से एक ही खाता बने, इसके लिए।

## Firebase setup (एक बार, लगभग 10 मिनट)

1. https://console.firebase.google.com खोलें → **Add project** → नाम दें (जैसे `ic38-mock-exam`) → Google Analytics बंद करके **Create**।
2. Project में **⚙ Project settings → General → Your apps → Web (`</>`)** → नाम देकर **Register app**। जो `firebaseConfig` दिखे, उसकी values `firebase-config.js` में `PASTE_...` की जगह डालें।
3. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**।
4. **Authentication → Settings → Authorized domains → Add domain** → `<aapka-github-username>.github.io` जोड़ें।
5. **Build → Firestore Database → Create database** → location `asia-south1 (Mumbai)` → **production mode**।
6. **Firestore → Rules** टैब में `firestore.rules` फ़ाइल का पूरा text डालकर **Publish**।
7. `firebase-config.js` में `ADMIN_EMAILS` और `firestore.rules` में `isAdmin()` के अंदर — दोनों जगह अपना admin email डालें (rules में बदलाव के बाद फिर से Publish करें)।
8. अपने admin email से मुख्य वेबसाइट पर एक बार Register करके ईमेल वेरीफाई करें। फिर `admin.html` खोलकर उसी email से लॉगिन करें।

Spark (मुफ़्त) प्लान में रोज़ 50,000 reads और 20,000 writes मुफ़्त हैं — हज़ारों छात्रों के लिए काफ़ी।

## GitHub Pages

Repository → **Settings → Pages → Deploy from a branch → `main` / `root` → Save**। वेबसाइट यहाँ खुलेगी:
`https://<username>.github.io/<repo-name>/` और एडमिन पेज `.../admin.html` पर।
