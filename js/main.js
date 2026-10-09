(()=> {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const today=()=>{const n=new Date();return [n.getFullYear(),String(n.getMonth()+1).padStart(2,'0'),String(n.getDate()).padStart(2,'0')].join('-')};
 $('#year').textContent=new Date().getFullYear();
 const dateInput=$('#date'); if(dateInput)dateInput.min=today();
 $('#menu')?.addEventListener('click',()=>document.querySelector('nav')?.classList.toggle('open'));
 const names={thali:'पूजन थाली',kit:'पूजन सामग्री किट',havan:'हवन सामग्री किट'};
 $$('[data-book]').forEach(b=>b.addEventListener('click',()=>{const sel=$('#pujan-select');if(sel)sel.value=b.dataset.book;$('#booking')?.scrollIntoView({behavior:'smooth'})}));
 $$('[data-product]').forEach(b=>b.addEventListener('click',()=>{const sel=$('#samagri-select');if(sel)sel.value=b.dataset.product;$('#booking')?.scrollIntoView({behavior:'smooth'});const toast=$('#toast');if(toast){toast.textContent=(names[b.dataset.product]||'सामग्री')+' चुनी गई। अब निवेदन भेजें।';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500)}}));
 async function openPayment(id,phone,box,payButton){
  if(box)box.textContent='भुगतान आदेश तैयार हो रहा है…';
  const r=await fetch('/api/create-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,phone})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(j.error||'भुगतान अभी शुरू नहीं हो सका।');
  await new Promise((resolve,reject)=>{if(window.Razorpay)return resolve();const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(Error('भुगतान पटल लोड नहीं हुआ।'));document.head.appendChild(s)});
  const checkout=new window.Razorpay({key:j.keyId,amount:j.amount,currency:j.currency,name:j.name,description:j.description,order_id:j.orderId,handler:async response=>{try{const vr=await fetch('/api/verify-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,phone,...response})});const v=await vr.json().catch(()=>({}));if(!vr.ok)throw Error(v.error||'भुगतान की पुष्टि नहीं हो सकी।');if(box)box.textContent=v.message+' आपका निवेदन तिथि की पुष्टि के अधीन है।';if(payButton)payButton.hidden=true;alert('भुगतान सफलतापूर्वक सत्यापित हुआ। तिथि की अंतिम पुष्टि अलग से की जाएगी।')}catch(err){if(box)box.textContent=err.message+' कृपया भुगतान क्रमांक सुरक्षित रखें और सहायता लें।'}},modal:{ondismiss:()=>{if(box)box.textContent='भुगतान प्रक्रिया बन्द की गई। निवेदन क्रमांक सुरक्षित रखें; भुगतान बाद में भी किया जा सकता है।'}}});
  checkout.open();
 }
 $('#booking-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type=submit]'),m=$('#message');btn.disabled=true;btn.textContent='निवेदन भेजा जा रहा है…';m.textContent='';
  try{
   const formData=Object.fromEntries(new FormData(f));
   const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)}),j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||'निवेदन भेजा नहीं जा सका।');
   m.textContent='निवेदन क्रमांक: '+j.bookingId+'। अग्रिम राशि: '+(j.advanceInr!=null?'₹'+Number(j.advanceInr).toLocaleString('en-IN'):'अभी निर्धारित नहीं')+'. भुगतान खुलने के बाद भी तिथि की अंतिम पुष्टि व्यवस्थापक करेंगे।';
   if(Number(j.advanceInr)>0){
    try{await openPayment(j.bookingId,formData.phone,m,null)}
    catch(payErr){m.textContent+=' ऑनलाइन भुगतान अभी शुरू नहीं हो सका: '+payErr.message+' आपका निवेदन दर्ज है। इसी पृष्ठ पर नीचे निवेदन क्रमांक और मोबाइल नम्बर डालकर बाद में भुगतान कर सकते हैं।';const idField=$('#status-form [name=id]'),phoneField=$('#status-form [name=phone]');if(idField)idField.value=j.bookingId;if(phoneField)phoneField.value=formData.phone;$('#status-form')?.scrollIntoView({behavior:'smooth',block:'center'})}
   }else{m.textContent+=' इस पूजन की निश्चित अग्रिम राशि व्यवस्थापक पटल पर निर्धारित होने के बाद ही भुगतान सम्भव होगा।'}
   f.reset();if(dateInput)dateInput.min=today();
  }catch(err){m.textContent=err.message==='Failed to fetch'?'बुकिंग सेवा अभी उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः प्रयास करें।':err.message}
  finally{btn.disabled=false;btn.textContent='बुकिंग हेतु निवेदन भेजें ↗'}
 });
 $('#order-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type=submit]'),msg=$('#order-message'),fd=new FormData(f),ids=fd.getAll('item');
  if(!ids.length){msg.textContent='कृपया कम से कम एक सामग्री चुनें।';return}
  const items=ids.map(id=>({id,quantity:Number(f.querySelector('[data-qty="'+id+'"]').value)||1}));
  btn.disabled=true;btn.textContent='निवेदन भेजा जा रहा है…';
  try{const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),phone:fd.get('phone'),address:fd.get('address'),items})}),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'निवेदन भेजा नहीं जा सका।');msg.textContent='सामग्री निवेदन दर्ज हुआ। क्रमांक: '+j.orderId+'। कुल सामग्री मूल्य ₹'+j.totalInr+' है; स्वीकृति और भुगतान के लिए व्यवस्थापक आपसे सम्पर्क करेंगे।';f.reset()}catch(err){msg.textContent=err.message==='Failed to fetch'?'सामग्री सेवा अभी उपलब्ध नहीं है। बाद में पुनः प्रयास करें।':err.message}finally{btn.disabled=false;btn.textContent='सामग्री मँगाने का निवेदन भेजें ↗'}
 });
 let activeStatus=null;
 $('#status-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(e.currentTarget),id=String(fd.get('id')).trim(),phone=String(fd.get('phone')).trim(),box=$('#status-result'),pay=$('#pay-button');activeStatus={id,phone};pay.hidden=true;box.textContent='निवेदन की स्थिति जाँची जा रही है…';
  try{const r=await fetch('/api/booking-status?id='+encodeURIComponent(id)+'&phone='+encodeURIComponent(phone)),j=await r.json();if(!r.ok)throw Error(j.error||'स्थिति नहीं मिली।');const statusNames={pending_review:'पुष्टि की प्रतीक्षा',approved:'स्वीकृत',rejected:'अस्वीकृत',completed:'पूर्ण',cancelled:'रद्द'},payNames={unpaid:'भुगतान शेष',created:'भुगतान की प्रक्रिया शुरू',paid:'भुगतान प्राप्त',refunded:'राशि वापस',failed:'भुगतान असफल'};box.textContent='क्रमांक: '+j.id+' | स्थिति: '+(statusNames[j.status]||j.status)+' | भुगतान: '+(payNames[j.paymentStatus]||j.paymentStatus)+(j.advanceInr!=null?' | देय राशि: ₹'+Number(j.advanceInr).toLocaleString('en-IN'):'');if(j.paymentReady)pay.hidden=false}catch(err){box.textContent=err.message}
 });
 $('#pay-button')?.addEventListener('click',async()=>{if(!activeStatus)return;const pay=$('#pay-button'),box=$('#status-result');pay.disabled=true;pay.textContent='भुगतान तैयार हो रहा है…';try{await openPayment(activeStatus.id,activeStatus.phone,box,pay)}catch(err){box.textContent=err.message}finally{pay.disabled=false;pay.textContent='अग्रिम राशि का भुगतान करें ↗'}});
})();