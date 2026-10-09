import { neon } from '@neondatabase/serverless';
const pujanIds=new Set(['satyanarayan','griha-pravesh','rudrabhishek','mahamrityunjaya','other']);
const productIds=new Set(['thali','kit','havan','none']);
const clean=(v,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'अनुमत विधि नहीं'});
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'बुकिंग सेवा अभी तैयार नहीं है। व्यवस्थापक को डेटाबेस संयोजन निर्धारित करना होगा।'});
 const body=req.body||{};const name=clean(body.name,100),phone=clean(body.phone,20),pujan=clean(body.pujan,40),date=clean(body.date,10),time=clean(body.time,40),address=clean(body.address,500),notes=clean(body.notes,1000),samagri=clean(body.samagri||'none',40);
 if(name.length<2||!/^[0-9+() -]{8,18}$/.test(phone)||!pujanIds.has(pujan)||!productIds.has(samagri)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!time||address.length<8)return res.status(400).json({error:'कृपया सभी आवश्यक जानकारी सही भरें।'});
 if(date<new Date().toISOString().slice(0,10))return res.status(400).json({error:'कृपया आज या भविष्य की तिथि चुनें।'});
 try{
  const sql=neon(process.env.DATABASE_URL);
  const ps=await sql`SELECT id,name_hi,price_inr,advance_inr FROM pujans WHERE id=${pujan} AND active=true LIMIT 1`;
  if(!ps.length)return res.status(400).json({error:'यह पूजन अभी उपलब्ध नहीं है।'});
  let product=null;if(samagri!=='none'){const found=await sql`SELECT id,name_hi,price_inr FROM products WHERE id=${samagri} AND active=true LIMIT 1`;if(!found.length)return res.status(400).json({error:'चुनी गई सामग्री अभी उपलब्ध नहीं है।'});product=found[0]}
  const p=ps[0],publicId='PUJ-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  const rows=await sql`INSERT INTO bookings(public_id,customer_name,phone,pujan_id,pujan_name,requested_date,requested_time,address,notes,samagri_id,samagri_name,samagri_price_inr,pujan_price_inr,advance_inr,total_price_inr) VALUES(${publicId},${name},${phone},${p.id},${p.name_hi},${date},${time},${address},${notes},${product?.id||null},${product?.name_hi||null},${product?.price_inr||0},${p.price_inr},${p.advance_inr},${p.price_inr===null?null:p.price_inr+(product?.price_inr||0)}) RETURNING public_id,status,advance_inr,total_price_inr`;
  return res.status(201).json({bookingId:rows[0].public_id,status:rows[0].status,advanceInr:rows[0].advance_inr,totalInr:rows[0].total_price_inr,message:'निवेदन दर्ज हुआ है; यह तिथि की पुष्टि नहीं है।'});
 }catch(e){console.error('booking request insert failed');return res.status(500).json({error:'निवेदन सुरक्षित नहीं हो सका। कृपया बाद में पुनः प्रयास करें।'})}
}