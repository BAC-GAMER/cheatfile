import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './uploads');
const MAX = Number(process.env.MAX_FILE_BYTES || 5 * 1024 * 1024 * 1024);
const TTL = Number(process.env.TRANSFER_TTL_SECONDS || 3600);
fs.mkdirSync(STORAGE_DIR, { recursive: true });
const dbPath = path.join(STORAGE_DIR, 'transfers.json');

type Transfer = { id:string; code:string; fileName:string; size:number; mime:string; objectName:string; createdAt:number; expiresAt:number; status:'active'|'expired'; downloads:number; attempts:number; lockedUntil:number };
let transfers: Transfer[] = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath,'utf8')) : [];
const save = () => fs.writeFileSync(dbPath, JSON.stringify(transfers,null,2));
const now = () => Date.now();
const cleanup = () => {
  const t = now();
  let changed = false;
  for (const x of transfers) if (x.status==='active' && t >= x.expiresAt) {
    x.status='expired'; changed=true;
    const f=path.join(STORAGE_DIR,x.objectName); if(fs.existsSync(f)) fs.rmSync(f,{force:true});
  }
  if(changed) save();
};
setInterval(cleanup, 15_000).unref();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: ORIGIN }));
app.use(express.json({limit:'1mb'}));

const upload = multer({
  dest: STORAGE_DIR,
  limits: { fileSize: MAX },
});

function newCode(){ return String(crypto.randomInt(0,10000)).padStart(4,'0'); }
function uniqueCode(){
  for(let i=0;i<100;i++){ const c=newCode(); if(!transfers.some(t=>t.code===c && t.status==='active')) return c; }
  throw new Error('No transfer code available');
}
function publicTransfer(t:Transfer){ return {code:t.code,fileName:t.fileName,size:t.size,mime:t.mime,createdAt:t.createdAt,expiresAt:t.expiresAt,downloads:t.downloads}; }

app.get('/health',(_req,res)=>res.json({ok:true,service:'cheatfile-api'}));
app.post('/api/transfers', upload.single('file'), (req,res)=>{
  cleanup();
  if(!req.file) return res.status(400).json({error:'No file selected.'});
  if(req.file.size > MAX){ fs.rmSync(req.file.path,{force:true}); return res.status(413).json({error:'Maximum file size is 5GB.'}); }
  const id=crypto.randomUUID(); const code=uniqueCode(); const createdAt=now();
  const objectName=`${id}.bin`; fs.renameSync(req.file.path,path.join(STORAGE_DIR,objectName));
  const t:Transfer={id,code,fileName:req.file.originalname,size:req.file.size,mime:req.file.mimetype||'application/octet-stream',objectName,createdAt,expiresAt:createdAt+TTL*1000,status:'active',downloads:0,attempts:0,lockedUntil:0};
  transfers.push(t); save(); res.status(201).json(publicTransfer(t));
});

const attempts = new Map<string,{count:number;until:number}>();
app.post('/api/transfers/verify', (req,res)=>{
  cleanup(); const code=String(req.body?.code||'').replace(/\D/g,'').slice(0,4);
  if(!/^\d{4}$/.test(code)) return res.status(400).json({error:'Enter a valid 4-digit code.'});
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown'); const key=`${ip}:${code}`; const a=attempts.get(key); const t=now();
  if(a && a.until>t && a.count>=8) return res.status(429).json({error:'Too many attempts. Please try again later.'});
  const transfer=transfers.find(x=>x.code===code && x.status==='active' && x.expiresAt>t);
  if(!transfer){ const next=a && a.until>t ? {count:a.count+1,until:a.until} : {count:1,until:t+10*60*1000}; attempts.set(key,next); return res.status(404).json({error:'We could not find an active transfer with that code.'}); }
  attempts.delete(key); res.json(publicTransfer(transfer));
});

app.get('/api/transfers/:code/download', (req,res)=>{
  cleanup(); const code=String(req.params.code||''); const t=transfers.find(x=>x.code===code && x.status==='active');
  if(!t || t.expiresAt<=now()) return res.status(404).json({error:'This transfer has expired or is unavailable.'});
  const file=path.join(STORAGE_DIR,t.objectName); if(!fs.existsSync(file)) return res.status(404).json({error:'This transfer is currently unavailable.'});
  t.downloads++; save();
  res.download(file,t.fileName,{headers:{'Cache-Control':'private, no-store'}});
});

app.listen(PORT,()=>console.log(`CheatFile API running at http://localhost:${PORT}`));
