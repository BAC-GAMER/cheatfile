'use client';
import {useEffect,useRef,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
function fmtSize(n:number){if(n<1024)return `${n} B`;const u=['KB','MB','GB'];let i=-1;do{n/=1024;i++}while(n>=1024&&i<u.length-1);return `${n.toFixed(n>=10?0:1)} ${u[i]}`}
function Countdown({expiresAt}:{expiresAt:number}){const [left,setLeft]=useState(Math.max(0,expiresAt-Date.now()));useEffect(()=>{const id=setInterval(()=>setLeft(Math.max(0,expiresAt-Date.now())),1000);return()=>clearInterval(id)},[expiresAt]);const s=Math.floor(left/1000);return <div className="timer">Available for {String(Math.floor(s/60)).padStart(2,'0')}:{String(s%60).padStart(2,'0')}</div>}

const faqs=[
 ['What is CheatFile?','CheatFile is a temporary file-transfer service. Upload a file, get a 4-digit code, share the code, and let other people download the file while the transfer is active.'],
 ['How long is a transfer available?','Every transfer has a fixed 1-hour lifetime starting when the transfer is created. Downloads do not extend the timer.'],
 ['How many people can use one code?','Multiple people can use the same active 4-digit code. A successful download does not invalidate the transfer.'],
 ['What is the maximum file size?','The product is designed for files up to 5GB per transfer. The production version should use resumable multipart uploads and private object storage.'],
 ['Do I need an account?','No account is required for the basic send and receive flow.'],
 ['Are files public?','No. Production storage should remain private, with protected access and short-lived download URLs rather than permanent public file URLs.'],
 ['What happens when the hour ends?','The transfer becomes unavailable and the stored file should be removed by the server-side cleanup process.']
];

export default function Home(){
 const [mode,setMode]=useState<'home'|'send'|'receive'>('home');
 const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [transfer,setTransfer]=useState<any>(null);const [code,setCode]=useState('');const [found,setFound]=useState<any>(null);const [error,setError]=useState('');
 const codeRefs=useRef<Array<HTMLInputElement|null>>([]);
 const go=(next:'home'|'send'|'receive')=>{setMode(next);setError('');if(next==='home')window.scrollTo({top:0,behavior:'smooth'});else setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),0)};
 async function send(){if(!file)return;setBusy(true);setError('');const fd=new FormData();fd.append('file',file);try{const r=await fetch(`${API}/api/transfers`,{method:'POST',body:fd});const j=await r.json();if(!r.ok)throw new Error(j.error);setTransfer(j)}catch(e:any){setError(e.message||'Upload failed.')}finally{setBusy(false)}}
 async function verify(){setBusy(true);setError('');try{const r=await fetch(`${API}/api/transfers/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const j=await r.json();if(!r.ok)throw new Error(j.error);setFound(j)}catch(e:any){setError(e.message||'Verification failed.')}finally{setBusy(false)}}
 const reset=()=>{setMode('home');setFile(null);setTransfer(null);setFound(null);setCode('');setError('');window.scrollTo({top:0,behavior:'smooth'})};
 const codeDigits=Array.from({length:4},(_,i)=>code[i]||'');
 const setDigit=(index:number,value:string)=>{const digit=value.replace(/\D/g,'').slice(-1);const next=codeDigits.slice();next[index]=digit;setCode(next.join(''));if(digit&&index<3)codeRefs.current[index+1]?.focus()};
 const onCodeKey=(index:number,e:React.KeyboardEvent<HTMLInputElement>)=>{if(e.key==='Backspace'&&!codeDigits[index]&&index>0){codeRefs.current[index-1]?.focus()}};
 return <div className="wrap">
  <nav className="nav"><button className="logo logoButton" onClick={()=>go('home')}>CheatFile</button><div className="navLinks"><button onClick={()=>go('home')}>Home</button><button className={mode==='send'?'active':''} onClick={()=>go('send')}>Send</button><button className={mode==='receive'?'active':''} onClick={()=>go('receive')}>Receive</button><button onClick={()=>document.getElementById('how')?.scrollIntoView({behavior:'smooth'})}>How it works</button><button onClick={()=>document.getElementById('faq')?.scrollIntoView({behavior:'smooth'})}>FAQ</button></div></nav>
  <section className="hero"><div className="eyebrow">Temporary file transfer</div><h1>Share. Code. Download.</h1><p>Send files up to 5GB with a simple 4-digit code. Anyone with the code can download while the transfer is active.</p>{mode==='home'&&<div className="actions"><button className="btn primary" onClick={()=>go('send')}>SEND</button><button className="btn secondary" onClick={()=>go('receive')}>RECEIVE</button></div>}</section>
  {mode!=='home'&&<div className="card">
   {mode==='send'&&!transfer&&<><h2>Send a file</h2><p className="muted">Maximum 5GB. Your transfer lasts exactly 1 hour.</p><div className="drop"><input id="file" type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/><label htmlFor="file"><b>{file?'Change file':'Choose a file'}</b><br/><span className="muted">or drag and drop in a future upload client</span></label></div>{file&&<div className="file"><span>{file.name}</span><b>{fmtSize(file.size)}</b></div>}{error&&<p className="error">{error}</p>}<button disabled={!file||busy} className="btn primary" onClick={send}>{busy?'UPLOADING…':'UPLOAD & GET CODE'}</button></>}
   {mode==='send'&&transfer&&<div className="center"><p className="success">YOUR TRANSFER IS READY</p><div className="code">{transfer.code}</div><p>{transfer.fileName} · {fmtSize(transfer.size)}</p><Countdown expiresAt={transfer.expiresAt}/><button className="btn ghost" onClick={()=>navigator.clipboard?.writeText(transfer.code)}>COPY CODE</button><button className="btn secondary" onClick={reset}>DONE</button></div>}
   {mode==='receive'&&!found&&<><h2>Receive a file</h2><p className="muted">Enter the 4-digit code you received.</p><div className="inputCode" aria-label="4-digit transfer code">{codeDigits.map((digit,index)=><input key={index} ref={el=>{codeRefs.current[index]=el}} aria-label={`Code digit ${index+1}`} maxLength={1} inputMode="numeric" autoComplete={index===0?'one-time-code':'off'} value={digit} onChange={e=>setDigit(index,e.target.value)} onKeyDown={e=>onCodeKey(index,e)}/>)}</div>{error&&<p className="error">{error}</p>}<button disabled={code.length!==4||busy} className="btn secondary" onClick={verify}>{busy?'VERIFYING…':'RECEIVE FILE'}</button></>}
   {mode==='receive'&&found&&<div className="center"><p className="success">TRANSFER FOUND</p><h2>{found.fileName}</h2><p>{fmtSize(found.size)}</p><Countdown expiresAt={found.expiresAt}/><div className="adBox">Advertisement placeholder<br/><small className="muted">Connect a legitimate provider here later.</small></div><a className="btn primary" href={`${API}/api/transfers/${found.code}/download`}>DOWNLOAD FILE</a><button className="btn ghost" onClick={reset}>BACK</button></div>}
  </div>}
  <div className="grid" id="how"><div className="feature"><b>01 · SEND</b><p>Choose a file and upload it.</p></div><div className="feature"><b>02 · CODE</b><p>Get a unique 4-digit transfer code.</p></div><div className="feature"><b>03 · SHARE</b><p>Give the code to as many people as you want.</p></div><div className="feature"><b>04 · DOWNLOAD</b><p>Anyone with the code can download until the fixed 1-hour expiry.</p></div></div>
  <section className="faq" id="faq"><div className="faqIntro"><div className="eyebrow">Need to know</div><h2>Frequently asked questions</h2><p className="muted">Simple answers about sending, receiving, expiration and file safety.</p></div><div className="faqList">{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
  <footer className="footer">Transfers automatically expire after 1 hour · CheatFile</footer>
 </div>
}
