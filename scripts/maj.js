// Mise à jour automatique de index.html depuis l'API publique euromillions.api.pedromealha.dev
// (données issues de euro-millions.com). Ne modifie rien si la réponse est inattendue.
const fs=require('fs');
const BASE='https://euromillions.api.pedromealha.dev/v1/draws';
const html=fs.readFileSync('index.html','utf8');
const m=html.match(/const RAW=`([\s\S]*?)`;/);
if(!m)throw new Error('RAW introuvable');
let lines=m[1].trim().split('\n');
const last=lines[lines.length-1].slice(0,10);
const pad=n=>String(n).padStart(2,'0');
async function get(url){
  const r=await fetch(url,{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error(url+' -> HTTP '+r.status);
  return r.json();
}
function norm(x){
  const date=String(x.date||x.draw_date||'').slice(0,10);
  const n=(x.numbers||x.main_numbers||[]).map(Number).sort((a,b)=>a-b);
  const s=(x.stars||x.lucky_stars||[]).map(Number).sort((a,b)=>a-b);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||n.length!==5||s.length!==2||[...n,...s].some(v=>!(v>0)))return null;
  let amount=null,won=null;
  const prizes=x.prizes||x.prize_breakdown;
  if(Array.isArray(prizes)){const p=prizes.find(p=>+p.rank===1)||prizes[0];if(p){amount=+p.prize||+p.amount||null;won=(+p.winners||0)>0}}
  if(x.has_winner!==undefined)won=!!x.has_winner;
  if(x.jackpot&&!amount)amount=+x.jackpot;
  return{date,n,s,amount,won};
}
(async()=>{
  const y=new Date().getUTCFullYear();
  let raw=[];
  for(const yr of [y-1<+last.slice(0,4)?y:+last.slice(0,4),y].filter((v,i,a)=>a.indexOf(v)===i)){
    const j=await get(`${BASE}?year=${yr}`);
    raw=raw.concat(Array.isArray(j)?j:(j.draws||j.data||[]));
  }
  const draws=raw.map(norm).filter(Boolean).filter(d=>d.date>last).sort((a,b)=>a.date.localeCompare(b.date));
  if(!raw.length||(raw.length&&!raw.some(norm)))throw new Error('Format de réponse inattendu : '+JSON.stringify(raw[0]));
  if(!draws.length){console.log('Rien de nouveau (dernier :',last+')');return}
  for(const d of draws){
    const dow=new Date(d.date+'T12:00:00Z').getUTCDay();
    if(dow!==2&&dow!==5)throw new Error('Date inattendue '+d.date);
    let l=`${d.date} ${d.n.join(' ')} | ${d.s.join(' ')}`;
    if(d.amount&&d.won!==null)l+=` | ${Math.round(d.amount)} ${d.won?'G':'R'}`;
    lines.push(l);console.log('Ajout :',l);
  }
  const newest=lines[lines.length-1].slice(0,10);
  const c=new Date(newest+'T12:00:00Z');c.setUTCMonth(c.getUTCMonth()-24);
  const lim=c.toISOString().slice(0,10);
  lines=lines.filter(l=>l.slice(0,10)>lim);
  // prochain tirage : prochain mardi/vendredi ; jackpot inconnu => jp:0 ("pas encore annoncé")
  const nd=new Date(newest+'T12:00:00Z');do{nd.setUTCDate(nd.getUTCDate()+1)}while(![2,5].includes(nd.getUTCDay()));
  const nextDate=nd.toISOString().slice(0,10);
  let out=html.replace(/const RAW=`[\s\S]*?`;/,()=>'const RAW=`'+lines.join('\n')+'`;');
  out=out.replace(/const NEXT=\{date:'[^']*',jp:\d+/,`const NEXT={date:'${nextDate}',jp:0`);
  fs.writeFileSync('index.html',out);
  console.log('Mis à jour jusqu\'au',newest,'| prochain',nextDate);
})().catch(e=>{console.error('ERREUR :',e.message);process.exit(1)});
