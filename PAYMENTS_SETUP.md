# पूजनम् — ऑनलाइन भुगतान और WhatsApp बुकिंग संदेश

यह integration अभी **सेटअप के लिए तैयार किया गया है, लेकिन live payments चालू नहीं हैं**। असली Razorpay keys, Neon database, approved WhatsApp templates और Vercel environment variables जोड़ने के बाद ही यह चलेगा। पहले Razorpay TEST mode में पूरा परीक्षण करें।

## 1. Neon database
1. Neon में project/database बनाएँ या मौजूदा project चुनें।
2. Vercel के लिए pooled PostgreSQL connection string लें और Vercel Project Settings → Environment Variables में `DATABASE_URL` नाम से जोड़ें।
3. Neon SQL Editor में repository की `schema.sql` फ़ाइल की SQL एक बार चलाएँ।
4. Production और Preview environment के database URLs अलग रखें जहाँ संभव हो।

## 2. Razorpay
1. Razorpay merchant account बनाएँ और account/business verification पूरा करें।
2. पहले TEST mode API keys बनाएँ। Vercel में `RAZORPAY_KEY_ID` और `RAZORPAY_KEY_SECRET` जोड़ें।
3. Razorpay में payment capture automatic/enabled रखें ताकि सफल UPI payment `captured` हो सके।
4. Razorpay Dashboard → Webhooks में endpoint जोड़ें: `https://pujanbooking.vercel.app/api/razorpay-webhook`
5. `payment.captured` event चुनें। Dashboard में बनाया webhook secret Vercel के `RAZORPAY_WEBHOOK_SECRET` में डालें। यह API key secret से अलग हो सकता है।
6. TEST keys से payment, cancelled checkout, गलत signature और webhook delivery जाँचें। सब सही होने पर ही LIVE keys लगाएँ और live account activation पूरा करें।

## 3. WhatsApp Cloud API
1. Meta for Developers में app बनाएँ, WhatsApp product जोड़ें और business phone number सेट करें।
2. स्थायी/production access token और Phone Number ID सुरक्षित रूप से लें।
3. WhatsApp Manager में नीचे दिए गए दो Hindi **Utility** message templates बनाएँ और Meta approval प्राप्त करें। Template के variable क्रम को बिल्कुल वैसा रखें:
   - Customer template (6 variables):  
     `नमस्ते {{1}}, पूजनम् पर भुगतान प्राप्त हुआ। राशि: {{5}}। पूजा की तारीख: {{2}}, समय: {{3}}, पता: {{4}}। बुकिंग संदर्भ: {{6}}। पूजा की अंतिम पुष्टि आचार्य जी से होगी।`
   - Admin template (7 variables):  
     `नई भुगतान-पुष्ट बुकिंग। ग्राहक: {{1}}, मोबाइल: {{2}}, तारीख: {{3}}, समय: {{4}}, पता: {{5}}, राशि: {{6}}, संदर्भ: {{7}}।`
4. Vercel environment variables में ये मान जोड़ें:
   - `WHATSAPP_ACCESS_TOKEN`: Meta access token
   - `WHATSAPP_PHONE_NUMBER_ID`: sender phone number ID
   - `WHATSAPP_API_VERSION`: Meta Graph API version आपके app के लिए उपलब्ध (उदा. Meta dashboard/docs में दिखाया गया version)
   - `WHATSAPP_CUSTOMER_TEMPLATE`: approved customer template का exact name
   - `WHATSAPP_ADMIN_TEMPLATE`: approved admin template का exact name
   - `WHATSAPP_TEMPLATE_LANGUAGE=hi` (अगर template Hindi में इसी language code से approved है)
   - `DAD_WHATSAPP_NUMBER`: पिता जी का WhatsApp नंबर country code सहित, केवल digits, जैसे `919876543210`
5. ग्राहक को booking form में WhatsApp messages के लिए सहमति checkbox चुनना होगा। WhatsApp Business messaging rules और opt-in का पालन करें।

## 4. Vercel
Vercel project को इस GitHub repository की production branch से linked रखें। ऊपर के सभी environment variables जोड़ने के बाद redeploy करें। Server-side secrets कभी `index.html`, `script.js`, या GitHub में न डालें।

## 5. Flow और सीमाएँ
- Server fixed amount ₹2,100 का Razorpay order बनाता है; browser से भेजे गए amount पर भरोसा नहीं करता।
- Payment signature verify होता है और server Razorpay API से payment ID, order ID, amount, currency और captured status जाँचता है।
- `payment.captured` webhook भी server-side verification path है; repeated events duplicate notification से बचने के लिए idempotent हैं।
- सफल भुगतान के बाद booking database में paid होती है और approved WhatsApp templates से ग्राहक और पिता जी को संदेश भेजने की कोशिश होती है।
- WhatsApp template/account configuration fail हो तो payment फिर भी paid रह सकती है; booking row में notification status/error दर्ज होता है। अभी admin dashboard या automatic notification retry queue नहीं है।
- भुगतान सफल होने का अर्थ पूजा की तारीख की स्वतः पुष्टि नहीं है। आचार्य जी की availability confirm करनी होगी।
- यह integration यहाँ से live payment के साथ end-to-end test नहीं किया गया है। TEST mode और webhook delivery जाँचे बिना production में भुगतान स्वीकार न करें।
