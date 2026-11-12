(function(){
"use strict";

var MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
var WD=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
var WDS=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
var WDP=["Domingos","Segundas","Terças","Quartas","Quintas","Sextas","Sábados"];
var MARIANO="Movimento Sacerdotal Mariano";
var PARISH="Paróquia São Judas Tadeu";

var CFG=null, LISTA=[], cache={};
var M=null;            /* modelo do mês aberto */
var now=new Date(), lastDay=now.getDate();
var auto=true;         /* true enquanto o mês acompanha a data de hoje */
var S={v:"agenda",pad:{},tipo:{},loc:"",per:"",esp:"",q:"",sel:1,open:false,past:false};

function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pad2(n){return n<10?"0"+n:""+n}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function pc(p){return "var(--p-"+p+")"}
function periodo(min){return min<720?"m":(min<1080?"t":"n")}
function keys(o){return Object.keys(o)}
function nPad(){return keys(S.pad).filter(function(k){return S.pad[k]})}
function nTipo(){return keys(S.tipo).filter(function(k){return S.tipo[k]})}
function nomeMes(m){return MESES[m.m-1]+" de "+m.y}
function keyDe(y,m){return y+"-"+pad2(m)}
function hojeKey(){return keyDe(now.getFullYear(),now.getMonth()+1)}
function TODAY(){return (M&&M.y===now.getFullYear()&&M.m===now.getMonth()+1)?now.getDate():0}

/* ---------- cores dos padres (vêm do config.json) ---------- */
function aplicarCores(){
  var l="",d="";
  var okKey=/^[A-Za-z0-9]+$/, okCor=/^#[0-9a-fA-F]{3,8}$/;
  keys(CFG.padres).forEach(function(k){
    var p=CFG.padres[k];
    if(!okKey.test(k)||!okCor.test(p.l)||!okCor.test(p.d)){console.warn("Cor de padre ignorada:",k);return}
    l+="--p-"+k+":"+p.l+";";d+="--p-"+k+":"+p.d+";";
  });
  var st=document.createElement("style");
  st.textContent=":root{"+l+"}:root[data-theme=\"dark\"]{"+d+"}";
  document.head.appendChild(st);
}

/* ---------- dados ---------- */
function getJSON(url){
  return fetch(url,{cache:"no-cache"}).then(function(r){
    if(!r.ok) throw new Error(url+" ("+r.status+")");
    return r.json();
  });
}
function construir(key,json){
  var p=key.split("-"), y=+p[0], mo=+p[1], dim=new Date(y,mo,0).getDate(), first=new Date(y,mo-1,1).getDay();
  var DAYS=[], ALL=[], SPECIAL={}, ignoradas=0;
  (json.destaques||[]).forEach(function(f){SPECIAL[f[0]]=f[1]});
  for(var d=1;d<=dim;d++){
    var wd=new Date(y,mo-1,d).getDay();
    var items=(json.dias&&json.dias[d]||[]).filter(function(r){
      var ok=Array.isArray(r)&&/^\d{1,2}h(\d{2})?$/.test(r[0])&&CFG.locais[r[1]]&&CFG.tipos[r[2]]&&CFG.padres[r[3]]&&/^[A-Za-z0-9]+$/.test(r[3]);
      if(!ok){ignoradas++;console.warn("Celebração ignorada (dado inválido):",key,d,r)}
      return ok;
    }).map(function(r){
      var m=/(\d+)h(\d+)?/.exec(r[0]), min=(+m[1])*60+(+(m[2]||0)), o=r[4]||"";
      return {d:d,wd:wd,h:r[0],min:min,l:r[1],t:r[2],p:r[3],o:o,
        sol:/solenidade|tríduo/i.test(o), vot:/votiva/i.test(o), mar:o===MARIANO,
        when:new Date(y,mo-1,d,Math.floor(min/60),min%60)};
    }).sort(function(a,b){return a.min-b.min});
    DAYS.push({d:d,wd:wd,items:items});
    ALL=ALL.concat(items);
  }
  ALL.forEach(function(it,i){it.id=i});
  return {key:key,y:y,m:mo,dim:dim,first:first,DAYS:DAYS,ALL:ALL,SPECIAL:SPECIAL,FEASTS:(json.destaques||[]).filter(function(f){return f[0]>=1&&f[0]<=dim}),ignoradas:ignoradas};
}
function carregar(key){
  if(cache[key]) return Promise.resolve(cache[key]);
  return getJSON("data/"+key+".json").then(function(j){return cache[key]=construir(key,j)});
}

/* ---------- abertura de mês ---------- */
function abrir(pedido,resetar){
  var key=pedido, aviso="";
  if(LISTA.indexOf(key)<0){
    var p=key.split("-");
    aviso="A agenda de "+MESES[(+p[1])-1]+" de "+p[0]+" ainda não foi publicada. Mostrando "+nomeMesKey(LISTA[LISTA.length-1])+".";
    key=LISTA[LISTA.length-1];
  }
  return carregar(key).then(function(m){
    var mudou=!M||M.key!==m.key;
    M=m;
    if(mudou||resetar){clearAll();S.past=false;S.sel=TODAY()||1}
    if(S.sel>M.dim) S.sel=1;
    var h="#"+key;
    if(location.hash!==h) history.replaceState(null,"",h);
    if(m.ignoradas) aviso+=(aviso?" ":"")+m.ignoradas+(m.ignoradas===1?" celebração foi ignorada":" celebrações foram ignoradas")+" por erro nos dados deste mês.";
    $("aviso").hidden=!aviso; $("aviso").textContent=aviso;
    render();
    if(mudou) window.scrollTo(0,0);
  }).catch(erro);
}
function nomeMesKey(k){var p=k.split("-");return MESES[(+p[1])-1]+" de "+p[0]}
function erro(e){
  console.error(e);
  $("view").innerHTML='<div class="empty">Não foi possível carregar a agenda. '+
    (location.protocol==="file:"?'Abra a página por um servidor (por exemplo <code>python3 -m http.server</code>) em vez de abrir o arquivo direto.':'Verifique sua conexão e tente novamente.')+'</div>';
}
function hashKey(){var h=location.hash.replace("#","");return /^\d{4}-\d{2}$/.test(h)?h:""}
function navegar(delta){
  var i=LISTA.indexOf(M.key)+delta;
  if(i<0||i>=LISTA.length) return;
  auto=false; abrir(LISTA[i]);
}

/* ---------- filtros ---------- */
function match(it){
  var np=nPad(); if(np.length&&!S.pad[it.p]) return false;
  var nt=nTipo(); if(nt.length&&!S.tipo[it.t]) return false;
  if(S.loc&&it.l!==S.loc) return false;
  if(S.per&&periodo(it.min)!==S.per) return false;
  if(S.esp==="sol"&&!it.sol) return false;
  if(S.esp==="sac"&&it.t==="m") return false;
  if(S.esp==="vot"&&!it.vot) return false;
  if(S.q){
    var hay=(CFG.locais[it.l].n+" "+CFG.padres[it.p].n+" "+it.o+" "+CFG.tipos[it.t]).toLowerCase();
    var qs=S.q.toLowerCase().split(/\s+/).filter(Boolean);
    for(var i=0;i<qs.length;i++){if(hay.indexOf(qs[i])<0) return false}
  }
  return true;
}
function filtered(){return M.DAYS.map(function(D){return {d:D.d,wd:D.wd,items:D.items.filter(match)}})}
function nActive(){return (S.q?1:0)+(S.loc?1:0)+(S.per?1:0)+(S.esp?1:0)+nPad().length+nTipo().length}
function clearAll(){S.pad={};S.tipo={};S.loc="";S.per="";S.esp="";S.q="";$("q").value=""}
function presentes(campo){var o={};M.ALL.forEach(function(i){o[i[campo]]=(o[i[campo]]||0)+1});return o}
function curto(n){return n.replace(/^Pe\.\s*/,"").split(" ")[0]}
function ordemConfig(cfgObj,presente){return keys(cfgObj).filter(function(k){return presente[k]})}

/* ---------- rótulos ---------- */
function relDay(d){
  var T=TODAY();
  if(T&&d===T) return "Hoje";
  if(T&&d===T+1) return "Amanhã";
  return cap(WD[new Date(M.y,M.m-1,d).getDay()]);
}
function dateLine(d){return WD[new Date(M.y,M.m-1,d).getDay()]+", "+d+" de "+MESES[M.m-1]}
function countdown(when){
  var m=Math.round((when-new Date())/60000);
  if(m<=0) return "agora";
  if(m<60) return "em "+m+" min";
  if(m<1440){var h=Math.floor(m/60),r=m%60;return "em "+h+"h"+(r?pad2(r):"")}
  return "";
}
function ddmm(d){return pad2(d)+"/"+pad2(M.m)}

/* ---------- itens ---------- */
function itemHTML(it,cls){
  var L=CFG.locais[it.l], tags="";
  if(cls&&cls.indexOf("next-it")>=0) tags+='<span class="tag nx">Próxima</span>';
  if(it.sol) tags+='<span class="tag sol">Solenidade</span>';
  if(it.t!=="m") tags+='<span class="tag sac">'+esc(CFG.tipos[it.t])+'</span>';
  if(L.ext) tags+='<span class="tag out">Fora da paróquia</span>';
  var obs=it.o?(it.t==="c"?"Noivos: "+esc(it.o):esc(it.o)):"";
  var add=(cls&&cls.indexOf("past")>=0)?"":'<button type="button" class="addbtn" data-add="'+it.id+'" title="Adicionar à agenda" aria-label="Adicionar à agenda: '+esc(CFG.tipos[it.t])+' às '+esc(it.h)+' em '+esc(L.n)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/></svg></button>';
  return '<div class="item'+(cls?" "+cls:"")+'"><span class="h">'+esc(it.h)+'</span><div><div class="loc">'+tags+esc(L.n)+'</div>'+
    '<div class="sub"><span class="dot" style="background:'+pc(it.p)+'"></span><b>'+esc(CFG.padres[it.p].n)+'</b></div>'+(obs?'<span class="obs">'+obs+'</span>':'')+'</div>'+add+'</div>';
}
function dayText(D){
  var t=cap(WD[D.wd])+", "+pad2(D.d)+"/"+pad2(M.m)+"/"+M.y+"\n";
  D.items.forEach(function(i){
    t+="• "+i.h+" – "+CFG.locais[i.l].n+" – "+CFG.tipos[i.t]+" – "+CFG.padres[i.p].n+(i.o?" ("+(i.t==="c"?"Noivos: ":"")+i.o+")":"")+"\n";
  });
  return t+PARISH;
}
function shareBtn(d){return navigator.share?'<button type="button" class="copy" data-share="'+d+'">Compartilhar</button>':""}
function dayBlock(D){
  var T=TODAY(), isToday=D.d===T, past=T&&D.d<T, nextIdx=-1;
  if(isToday){for(var i=0;i<D.items.length;i++){if(D.items[i].when>=now){nextIdx=i;break}}}
  var body=D.items.map(function(it,i){
    return itemHTML(it,isToday?(it.when<now?"past":(i===nextIdx?"next-it":"")):"");
  }).join("");
  var sp=M.SPECIAL[D.d]?'<span class="sp">'+esc(M.SPECIAL[D.d])+'</span>':'';
  return '<section class="day'+(isToday?" today":"")+(D.wd===0?" sun":"")+(past?" pastday":"")+'" id="dia-'+D.d+'"><div class="dcard"><div class="dhead"><div class="t"><div class="rel">'+relDay(D.d)+'</div><div class="dt">'+dateLine(D.d)+'</div>'+sp+'</div><div class="actions">'+shareBtn(D.d)+'<button type="button" class="copy" data-copy="'+D.d+'">Copiar</button></div></div>'+body+'</div></section>';
}

/* ---------- próxima celebração ---------- */
function nextHTML(){
  if(M.key<hojeKey()) return "";
  var T=TODAY(), ref=T?new Date():new Date(M.y,M.m-1,1,0,0);
  var nx=M.ALL.filter(function(i){return i.when>=ref&&match(i)})[0];
  var mes=MESES[M.m-1];
  if(!nx) return '<div class="next empty"><div class="lbl">Agenda de '+mes+'</div><div class="when">Sem próximas celebrações</div><div class="obs" style="margin-top:6px;color:var(--muted)">'+(nActive()?"Nenhuma celebração futura com os filtros atuais.":"Todas as celebrações do quadro já aconteceram.")+'</div></div>';
  var cd=T?countdown(nx.when):"";
  return '<div class="next"><div class="lbl"><span>'+(T?"Próxima celebração":"Primeira celebração do mês")+'</span><span>'+cd+'</span></div>'+
    '<div class="when">'+(nx.d===T?"Hoje":(nx.d===T+1&&T?"Amanhã":WDS[nx.wd]+", "+ddmm(nx.d)))+' · '+esc(nx.h)+'</div>'+
    '<div class="where">'+esc(CFG.locais[nx.l].n)+(nx.t!=="m"?' · '+esc(CFG.tipos[nx.t]):'')+'</div>'+
    '<div class="who"><span class="dot"></span>'+esc(CFG.padres[nx.p].n)+'</div>'+
    (nx.o&&nx.t!=="c"?'<div class="obs">'+esc(nx.o)+'</div>':'')+'</div>';
}
function feastHTML(){
  var T=TODAY(), f=M.FEASTS.filter(function(x){return !T||x[0]>=T});
  if(!f.length) return "";
  return '<div class="feast" aria-label="Datas especiais">'+f.map(function(x){
    var wd=new Date(M.y,M.m-1,x[0]).getDay();
    return '<button type="button" data-go="'+x[0]+'"><span class="d">'+(T&&x[0]===T?"Hoje":(T&&x[0]===T+1?"Amanhã":ddmm(x[0])+" · "+WDS[wd]))+'</span><span class="t">'+esc(x[1])+'</span></button>';
  }).join("")+'</div>';
}

/* ---------- filtros (só o que aparece no mês) ---------- */
function renderFilters(){
  var pp=presentes("p"), ll=presentes("l"), tt=presentes("t");
  $("fPad").innerHTML=ordemConfig(CFG.padres,pp).filter(function(k){return k!=="X"}).map(function(k){
    return '<button type="button" class="chip" data-pad="'+k+'" aria-pressed="'+!!S.pad[k]+'"><span class="dot" style="background:'+pc(k)+'"></span>'+esc(curto(CFG.padres[k].n))+'</button>';
  }).join("");
  $("fLoc").innerHTML='<option value="">Todas as comunidades</option>'+keys(ll).sort(function(a,b){return CFG.locais[a].n.localeCompare(CFG.locais[b].n,"pt")}).map(function(k){
    return '<option value="'+k+'"'+(S.loc===k?' selected':'')+'>'+esc(CFG.locais[k].n)+' ('+ll[k]+')</option>';
  }).join("");
  var per=[["","Todos"],["m","Manhã"],["t","Tarde"],["n","Noite"]];
  $("fPer").innerHTML=per.map(function(p){return '<button type="button" class="chip" data-per="'+p[0]+'" aria-pressed="'+(S.per===p[0])+'">'+p[1]+'</button>'}).join("");
  $("fTipo").innerHTML=ordemConfig(CFG.tipos,tt).map(function(k){return '<button type="button" class="chip" data-tipo="'+k+'" aria-pressed="'+!!S.tipo[k]+'">'+esc(CFG.tipos[k])+'</button>'}).join("");
  var esp=[["","Todos"]];
  if(M.ALL.some(function(i){return i.sol})) esp.push(["sol","Solenidades e tríduo"]);
  if(M.ALL.some(function(i){return i.t!=="m"})) esp.push(["sac","Sacramentos"]);
  if(M.ALL.some(function(i){return i.vot})) esp.push(["vot","Missas votivas"]);
  $("fEsp").innerHTML=esp.map(function(p){return '<button type="button" class="chip" data-esp="'+p[0]+'" aria-pressed="'+(S.esp===p[0])+'">'+p[1]+'</button>'}).join("");
  updateCount();
}
function updateCount(){var n=nActive(),c=$("fcount");c.hidden=!n;c.textContent=n;$("clear").hidden=!n}

/* ---------- visões ---------- */
function viewAgenda(){
  var F=filtered(), T=TODAY(), html=nextHTML()+feastHTML(), start=1;
  if(T){
    var TD=F[T-1];
    html+='<div class="sec"><h2>Hoje</h2></div>';
    html+=TD.items.length?dayBlock(TD):'<div class="empty" id="dia-'+T+'">'+(nActive()?"Nenhuma celebração hoje com os filtros atuais.":"Sem celebrações hoje.")+'</div>';
    start=T+1;
  }
  var up=F.filter(function(D){return D.d>=start&&D.items.length}), upN=0;
  up.forEach(function(D){upN+=D.items.length});
  html+='<div class="sec"><h2>'+(T?"Próximos dias":"Todos os dias")+'</h2><span class="tnum">'+upN+' celebrações</span></div>';
  html+=up.length?up.map(dayBlock).join(""):'<div class="empty">Nenhuma celebração encontrada.'+(nActive()?'<br><button type="button" class="linkbtn" data-clear="1">Limpar filtros</button>':'')+'</div>';
  if(T>1){
    var pastDays=F.filter(function(D){return D.d<T&&D.items.length});
    if(pastDays.length){
      html+='<div class="sec"><h2>Dias anteriores</h2><span class="tnum">'+pastDays.length+' dias</span></div>';
      html+=S.past?pastDays.map(dayBlock).join("")+'<button type="button" class="iconbtn morebtn" data-past="0">Ocultar dias anteriores</button>'
                  :'<button type="button" class="iconbtn morebtn" data-past="1">Mostrar dias anteriores</button>';
    }
  }
  return html;
}
function viewCal(){
  var F=filtered(), T=TODAY(), html='<div class="cal">';
  WDS.forEach(function(w){html+='<div class="wh">'+w.charAt(0)+'</div>'});
  for(var b=0;b<M.first;b++) html+='<div class="cell blank" aria-hidden="true"></div>';
  F.forEach(function(D){
    var cls="cell"+(D.items.length?"":" dim")+(D.d===T?" today":"")+(D.d===S.sel?" sel":"");
    var dots=D.items.slice(0,12).map(function(i){return '<span class="dot" style="background:'+pc(i.p)+'"></span>'}).join("");
    html+='<button type="button" class="'+cls+'" data-sel="'+D.d+'" aria-label="Dia '+D.d+' de '+MESES[M.m-1]+', '+D.items.length+(D.items.length===1?' celebração':' celebrações')+'"><span class="cellrow"><span class="num tnum">'+D.d+'</span>'+(M.SPECIAL[D.d]?'<span class="star">★</span>':'')+'</span><span class="dots">'+dots+'</span></button>';
  });
  var pp=presentes("p");
  html+='</div><div class="legend">'+ordemConfig(CFG.padres,pp).map(function(k){return '<span><i class="dot" style="background:'+pc(k)+'"></i>'+esc(CFG.padres[k].n)+'</span>'}).join("")+'<span><b style="color:var(--gold-text)">★</b> Data especial</span></div>';
  var D=F[S.sel-1];
  html+='<section class="detail"><h3>'+cap(dateLine(D.d))+'</h3>';
  html+=D.items.length?'<div class="dcard"><div class="dhead"><div class="t">'+(M.SPECIAL[D.d]?'<span class="sp" style="margin:0">'+esc(M.SPECIAL[D.d])+'</span>':'<span class="dt">'+D.items.length+(D.items.length===1?" celebração":" celebrações")+'</span>')+'</div><div class="actions">'+shareBtn(D.d)+'<button type="button" class="copy" data-copy="'+D.d+'">Copiar</button></div></div>'+D.items.map(function(i){return itemHTML(i,"")}).join("")+'</div>'
    :'<div class="empty">'+(nActive()?"Nenhuma celebração neste dia com os filtros atuais.":"Sem celebrações neste dia.")+'</div>';
  return html+'</section>';
}
function patternsFor(k){
  var m={};
  M.ALL.filter(function(i){return i.l===k}).forEach(function(i){
    var key=i.wd+"|"+i.min;(m[key]=m[key]||{wd:i.wd,h:i.h,min:i.min,n:0,tipos:{}}).n++;m[key].tipos[i.t]=1;
  });
  return keys(m).map(function(x){return m[x]}).sort(function(a,b){return ((a.wd+6)%7)-((b.wd+6)%7)||a.min-b.min});
}
function viewLoc(){
  var ll=presentes("l");
  var ks=keys(ll).sort(function(a,b){return ll[b]-ll[a]});
  var html='<h2 class="pagetitle">Comunidades</h2><div class="cards">';
  ks.forEach(function(k){
    var its=M.ALL.filter(function(i){return i.l===k}), L=CFG.locais[k], by={};
    its.forEach(function(i){by[i.p]=(by[i.p]||0)+1});
    var bar=keys(by).map(function(p){return '<i style="--pc:'+pc(p)+';width:'+(by[p]/its.length*100)+'%" title="'+esc(CFG.padres[p].n)+': '+by[p]+'"></i>'}).join("");
    var pats=patternsFor(k).map(function(p){
      var tag=keys(p.tipos).some(function(t){return t!=="m"})?" *":"";
      return '<span class="pat'+(p.n===1?' once':'')+'"><b>'+WDP[p.wd]+'</b> '+esc(p.h)+(p.n>1?' ×'+p.n:'')+tag+'</span>';
    }).join("");
    var leg=keys(by).map(function(p){return '<span><b>'+by[p]+'</b> '+esc(CFG.padres[p].n.replace("Pe. ",""))+'</span>'}).join("");
    html+='<article class="card"><div><h3>'+esc(L.n)+'</h3><div class="sub">'+(L.ext?'Fora da paróquia':'Comunidade da paróquia')+'</div></div>'+
      '<div class="big tnum">'+its.length+'<small>celebrações no mês</small></div>'+
      '<div><div class="sub" style="margin-bottom:6px">Horários (× = vezes no mês; tracejado = ocorrência única)</div><div class="patterns">'+pats+'</div></div>'+
      '<div><div class="bar">'+bar+'</div><div class="kv" style="margin-top:8px">'+leg+'</div></div>'+
      '<button type="button" class="iconbtn" data-loc="'+k+'">Ver na agenda</button></article>';
  });
  return html+'</div><p class="note">* inclui celebração que não é missa.</p>';
}
function viewPad(){
  var pp=presentes("p"), html='<h2 class="pagetitle">Padres</h2><div class="cards">';
  ordemConfig(CFG.padres,pp).forEach(function(k){
    var its=M.ALL.filter(function(i){return i.p===k}), days={}, locs={}, tp={}, sol=0;
    its.forEach(function(i){days[i.d]=1;locs[i.l]=(locs[i.l]||0)+1;tp[i.t]=(tp[i.t]||0)+1;if(i.sol) sol++});
    var top=keys(locs).sort(function(a,b){return locs[b]-locs[a]}).slice(0,4);
    var strip="";
    for(var d=1;d<=M.dim;d++){var wd=new Date(M.y,M.m-1,d).getDay();strip+='<i class="'+(days[d]?'on':'')+(wd===0?' sun':'')+'" title="'+ddmm(d)+(days[d]?' · celebra':'')+'"></i>'}
    var tps=keys(tp).filter(function(t){return t!=="m"}).map(function(t){return '<span><b>'+tp[t]+'</b> '+esc(CFG.tipos[t].toLowerCase())+'</span>'}).join("");
    html+='<article class="card" style="--pc:'+pc(k)+'"><div><h3 style="display:flex;align-items:center;gap:10px"><span class="dot" style="background:var(--pc);width:14px;height:14px"></span>'+esc(CFG.padres[k].n)+'</h3>'+(k==="X"?'<div class="sub">Celebração sem padre indicado no quadro</div>':'')+'</div>'+
      '<div class="big tnum">'+its.length+'<small>celebrações em '+keys(days).length+' dias</small></div>'+
      '<div><div class="sub" style="margin-bottom:6px">Dias do mês (domingos com contorno)</div><div class="strip" style="grid-template-columns:repeat('+M.dim+',minmax(0,1fr))">'+strip+'</div></div>'+
      '<div><div class="sub" style="margin-bottom:6px">Onde mais celebra</div><div class="kv">'+top.map(function(l){return '<span><b>'+locs[l]+'</b> '+esc(CFG.locais[l].n)+'</span>'}).join("")+'</div></div>'+
      (tps||sol?'<div class="kv">'+tps+(sol?'<span><b>'+sol+'</b> em solenidades</span>':'')+'</div>':'')+
      (k!=="X"?'<button type="button" class="iconbtn" data-padgo="'+k+'">Ver na agenda</button>':'')+'</article>';
  });
  return html+'</div>';
}

/* ---------- adicionar à agenda ---------- */
function localTexto(L){return [L.n,L.end,L.cidade].filter(Boolean).join(", ")}
function mapsURL(L){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(L.geo||localTexto(L))}
function evento(it){
  var L=CFG.locais[it.l], dur=it.t==="m"?60:90;
  /* horário de Brasília (UTC-3, sem horário de verão) */
  var ini=Date.UTC(M.y,M.m-1,it.d,Math.floor(it.min/60)+3,it.min%60), fim=ini+dur*60000;
  var desc=[CFG.padres[it.p].n==="A confirmar"?"Padre a confirmar":"Celebrante: "+CFG.padres[it.p].n];
  if(it.o) desc.push((it.t==="c"?"Noivos: ":"")+it.o);
  desc.push(PARISH+" · Confirme os horários com a secretaria paroquial.");
  return {titulo:CFG.tipos[it.t]+" – "+L.n,ini:ini,fim:fim,local:localTexto(L),desc:desc.join("\n"),uid:M.key+"-"+it.d+"-"+it.min+"-"+it.l+"-"+it.p+"@agenda-missas"};
}
function utc(ms){return new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g,"")}
function googleURL(e){
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(e.titulo)+
    "&dates="+utc(e.ini)+"/"+utc(e.fim)+"&location="+encodeURIComponent(e.local)+"&details="+encodeURIComponent(e.desc);
}
function icsEsc(t){return String(t).replace(/\\/g,"\\\\").replace(/;/g,"\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n")}
function icsFold(l){var o=[];while(l.length>73){o.push(l.slice(0,73));l=" "+l.slice(73)}o.push(l);return o.join("\r\n")}
function icsText(e){
  var L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Agenda de Missas//PT-BR//","CALSCALE:GREGORIAN","BEGIN:VEVENT",
    "UID:"+e.uid,"DTSTAMP:"+utc(Date.now()),"DTSTART:"+utc(e.ini),"DTEND:"+utc(e.fim),
    "SUMMARY:"+icsEsc(e.titulo),"LOCATION:"+icsEsc(e.local),"DESCRIPTION:"+icsEsc(e.desc),
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(e.titulo),"TRIGGER:-PT1H","END:VALARM","END:VEVENT","END:VCALENDAR"];
  return L.map(icsFold).join("\r\n")+"\r\n";
}
var sheetFoco=null, sheetEv=null;
function abrirSheet(it,btn){
  var L=CFG.locais[it.l]; sheetEv=evento(it); sheetFoco=btn;
  $("sheetTitle").textContent=sheetEv.titulo;
  $("sheetWhen").textContent=cap(dateLine(it.d))+" · "+it.h;
  $("sheetWhere").textContent=sheetEv.local;
  $("sheetGoogle").href=googleURL(sheetEv);
  $("sheetMap").href=mapsURL(L);
  $("sheet").hidden=false; $("sheetGoogle").focus();
}
function fecharSheet(){
  $("sheet").hidden=true; sheetEv=null;
  if(sheetFoco&&document.body.contains(sheetFoco)) sheetFoco.focus();
}
function baixarIcs(){
  if(!sheetEv) return;
  var blob=new Blob([icsText(sheetEv)],{type:"text/calendar;charset=utf-8"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="missa-"+M.key+"-"+pad2(new Date(sheetEv.ini-10800000).getUTCDate())+".ics";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
  toast("Arquivo de agenda baixado");
}

/* ---------- instalar como app ---------- */
var instEv=null, instFoco=null;
function standalone(){return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true}
function instrucoes(){
  var ua=navigator.userAgent;
  if(/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1))
    return "No Safari, toque no botão Compartilhar (quadrado com uma seta para cima) e depois em “Adicionar à Tela de Início”.";
  if(/SamsungBrowser/i.test(ua))
    return "Toque no menu (três linhas), depois em “Adicionar página a” e escolha “Tela inicial”.";
  if(/Android/i.test(ua))
    return "Toque no menu (três pontinhos) e escolha “Instalar app” ou “Adicionar à tela inicial”.";
  return "No menu do navegador, procure “Instalar app” ou “Adicionar à tela inicial”.";
}
function instalar(){
  if(instEv){
    var ev=instEv; instEv=null; ev.prompt();
    ev.userChoice.then(function(r){if(r&&r.outcome==="accepted") toast("Instalando…")});
    return;
  }
  instFoco=document.activeElement;
  $("instTxt").textContent=instrucoes();
  $("inst").hidden=false; $("inst").querySelector(".opt").focus();
}
function fecharInst(){$("inst").hidden=true;if(instFoco&&document.body.contains(instFoco)) instFoco.focus()}
var INST_KEY="missas-inst", instTimer=0;
var INSTALADO_KEY="missas-instalado";
function jaInstalado(){try{return !!localStorage.getItem(INSTALADO_KEY)}catch(e){return false}}
function marcarInstalado(){try{localStorage.setItem(INSTALADO_KEY,"1")}catch(e){}}
function ehIOS(){var ua=navigator.userAgent;return /iPhone|iPad|iPod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)}
function instDispensado(){try{var t=+localStorage.getItem(INST_KEY);return t&&Date.now()-t<14*86400000}catch(e){return false}}
function agendarInstBar(ms){
  clearTimeout(instTimer);
  instTimer=setTimeout(function(){
    /* só avisa quando o navegador oferece instalar (evento) ou no iPhone, que não tem evento; app já instalado não dispara o evento */
    if(standalone()||jaInstalado()||instDispensado()||TOUR||!M||!(instEv||ehIOS())) return;
    $("instbar").hidden=false; document.body.classList.add("com-aviso");
  },ms);
}
function fecharInstBar(){$("instbar").hidden=true;document.body.classList.remove("com-aviso");try{localStorage.setItem(INST_KEY,String(Date.now()))}catch(e){}}
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();instEv=e});
window.addEventListener("appinstalled",function(){marcarInstalado();instEv=null;$("instBtn").hidden=true;$("instbar").hidden=true;document.body.classList.remove("com-aviso");toast("App instalado")});
if(standalone()){marcarInstalado();$("instBtn").hidden=true}
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))
  window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(e){console.warn("Service worker:",e)})});

/* ---------- tutorial do primeiro acesso ---------- */
var TOUR=null, TOUR_KEY="missas-tour";
var PASSOS=[
  {sel:"#view .next",t:"Próxima celebração",x:"Aqui você vê a próxima missa e quanto falta para ela. Logo abaixo estão o dia de hoje e os próximos dias."},
  {sel:"#monthnav",t:"Mudar de mês",x:"Use as setas para ver a agenda de outros meses."},
  {sel:"#ftoggle",t:"Filtros",x:"Toque em Filtros para abrir a busca.",click:true},
  {sel:"#panel",t:"Encontre o que procura",x:"Busque por comunidade, horário ou tipo de celebração. Os botões com o nome dos padres, ao lado de Filtros, filtram com um toque.",depois:function(){S.open=false;$("ftoggle").setAttribute("aria-expanded","false");$("panel").classList.remove("open")}},
  {sel:"#view .addbtn",t:"Adicionar à agenda",x:"Toque neste ícone para salvar a missa na agenda do seu celular, com o endereço da comunidade.",click:true,add:true},
  {sel:"#sheet .box",t:"Escolha como salvar",x:"Google Agenda, arquivo .ics para os outros aplicativos de agenda, ou veja o local no mapa.",add:true,depois:function(){if(!$("sheet").hidden) fecharSheet()}},
  {sel:".nav",t:"Outras telas",x:"Calendário do mês, Comunidades com seus horários e Padres com as escalas de cada um."}
];
function tourAlvo(st){
  if(st.sel==="#view .addbtn") return document.querySelector("#view .item.next-it .addbtn")||document.querySelector("#view .addbtn");
  return document.querySelector(st.sel);
}
function jaViuTour(){try{return !!localStorage.getItem(TOUR_KEY)}catch(e){return false}}
function marcarTour(){try{localStorage.setItem(TOUR_KEY,"1")}catch(e){}}
function iniciarTour(){
  if(TOUR||!M) return;
  S.v="agenda"; clearAll(); S.open=false; render(); window.scrollTo(0,0);
  var temAdd=!!document.querySelector("#view .addbtn");
  var passos=PASSOS.filter(function(p){return (!p.add||temAdd)&&(p.sel!=="#view .next"||document.querySelector("#view .next"))});
  var box=document.createElement("div"); box.className="tour";
  box.innerHTML='<div class="t-b"></div><div class="t-b"></div><div class="t-b"></div><div class="t-b"></div><div class="t-spot"></div>'+
    '<div class="t-tip" role="dialog" aria-modal="true" aria-label="Tutorial" aria-live="polite"><div class="t-n"></div><h2></h2><p></p><div class="t-hint"></div>'+
    '<div class="t-act"><button type="button" class="linkbtn t-skip">Pular tutorial</button><button type="button" class="iconbtn t-next"></button></div></div>';
  document.body.appendChild(box);
  TOUR={i:-1,passos:passos,box:box,alvo:null,raf:0,foco:document.activeElement};
  box.querySelector(".t-skip").addEventListener("click",function(){fimTour()});
  box.querySelector(".t-next").addEventListener("click",function(){avancarTour()});
  window.addEventListener("scroll",agendarPos,true); window.addEventListener("resize",agendarPos);
  avancarTour();
}
function agendarPos(){if(!TOUR||TOUR.raf) return;TOUR.raf=requestAnimationFrame(function(){TOUR.raf=0;posTour()})}
function avancarTour(){
  var T=TOUR; if(!T) return;
  var ant=T.passos[T.i];
  if(T.alvo&&T.cb){T.alvo.removeEventListener("click",T.cb,true);T.cb=null}
  if(ant&&ant.depois) ant.depois();
  T.i++;
  if(T.i>=T.passos.length){fimTour();return}
  var st=T.passos[T.i], el=tourAlvo(st);
  if(!el){avancarTour();return}
  T.alvo=el;
  var tip=T.box.querySelector(".t-tip"), last=T.i===T.passos.length-1;
  tip.querySelector(".t-n").textContent=(T.i+1)+" de "+T.passos.length;
  tip.querySelector("h2").textContent=st.t;
  tip.querySelector("p").textContent=st.x;
  tip.querySelector(".t-hint").textContent=st.click?"Toque no botão destacado para continuar.":"";
  var nx=tip.querySelector(".t-next"); nx.textContent=last?"Concluir":"Próximo"; nx.hidden=!!st.click;
  T.box.querySelector(".t-spot").style.pointerEvents=st.click?"none":"auto";
  el.scrollIntoView({block:"center",inline:"nearest"});
  if(st.click){
    T.cb=function(){setTimeout(avancarTour,120)};
    el.addEventListener("click",T.cb,true);
  }
  posTour();
  (st.click?tip.querySelector(".t-skip"):nx).focus({preventScroll:true});
}
function posTour(){
  var T=TOUR; if(!T||!T.alvo) return;
  var r=T.alvo.getBoundingClientRect(), p=6, vw=document.documentElement.clientWidth, vh=window.innerHeight;
  var x=Math.max(0,r.left-p), y=Math.max(0,r.top-p), w=Math.min(vw-x,r.width+p*2), h=Math.min(vh-y,r.height+p*2);
  var bl=T.box.querySelectorAll(".t-b"), rects=[[0,0,vw,y],[0,y+h,vw,vh-y-h],[0,y,x,h],[x+w,y,vw-x-w,h]];
  rects.forEach(function(q,i){var s=bl[i].style;s.left=q[0]+"px";s.top=q[1]+"px";s.width=Math.max(0,q[2])+"px";s.height=Math.max(0,q[3])+"px"});
  var sp=T.box.querySelector(".t-spot").style; sp.left=x+"px";sp.top=y+"px";sp.width=w+"px";sp.height=h+"px";
  var tip=T.box.querySelector(".t-tip"), tw=Math.min(320,vw-24); tip.style.width=tw+"px";
  tip.style.left=Math.max(12,Math.min(vw-tw-12,x+w/2-tw/2))+"px";
  var th=tip.offsetHeight, abaixo=vh-(y+h)>=th+16;
  tip.style.top=Math.max(8,abaixo?y+h+12:y-th-12)+"px";
}
function fimTour(){
  var T=TOUR; if(!T) return;
  if(T.alvo&&T.cb) T.alvo.removeEventListener("click",T.cb,true);
  var st=T.passos[T.i]; if(st&&st.depois) st.depois();
  window.removeEventListener("scroll",agendarPos,true); window.removeEventListener("resize",agendarPos);
  T.box.remove(); TOUR=null; marcarTour();
  if(!$("sheet").hidden) fecharSheet();
  window.scrollTo(0,0);
  if(T.foco&&document.body.contains(T.foco)) T.foco.focus({preventScroll:true});
  agendarInstBar(1500);
}

/* ---------- render ---------- */
function render(){
  if(!M) return;
  now=new Date();
  var i=LISTA.indexOf(M.key);
  $("mlabel").textContent=nomeMes(M);
  $("mprev").disabled=i<=0; $("mnext").disabled=i>=LISTA.length-1;
  $("note").textContent="Transcrito do quadro de avisos da paróquia (Agenda de Missas e Sacramentos, "+nomeMes(M)+"). Confirme os horários com a secretaria paroquial, pois podem mudar.";
  document.title="Agenda de Missas · "+cap(MESES[M.m-1])+" "+M.y+" · "+PARISH;
  Array.prototype.forEach.call(document.querySelectorAll(".tab"),function(t){t.setAttribute("aria-selected",t.dataset.v===S.v)});
  $("view").setAttribute("aria-labelledby","tab-"+S.v);
  var full=S.v==="loc"||S.v==="pad";
  $("wrap").className="wrap"+(full?" wide":"");
  $("fbar").hidden=full;
  $("panel").classList.toggle("open",S.open&&!full);
  renderFilters();
  $("view").innerHTML=S.v==="agenda"?viewAgenda():S.v==="cal"?viewCal():S.v==="loc"?viewLoc():viewPad();
}
function setView(v){S.v=v;render();window.scrollTo(0,0)}
function goDay(d){
  S.v="agenda";
  if(TODAY()&&d<TODAY()) S.past=true;
  if(!filtered()[d-1].items.length) clearAll();
  render();
  var el=$("dia-"+d); if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
}
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("show")},1800)}
function copyText(text){
  function fb(){var ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);toast(ok?"Copiado":"Selecione e copie manualmente")}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast("Copiado")},fb)}else fb();
}

/* ---------- eventos ---------- */
document.addEventListener("click",function(e){
  if(e.target.closest("[data-close]")){
    if(!$("inst").hidden) fecharInst(); else if(!$("sheet").hidden) fecharSheet();
    return;
  }
  var b=e.target.closest("button"); if(!b||!M) return;
  var ds=b.dataset;
  if(b.id==="mprev"){navegar(-1);return}
  if(b.id==="mnext"){navegar(1);return}
  if(ds.v){setView(ds.v);return}
  if(ds.go){goDay(+ds.go);return}
  if(ds.pad){S.pad[ds.pad]=!S.pad[ds.pad];render();return}
  if(ds.tipo){S.tipo[ds.tipo]=!S.tipo[ds.tipo];render();return}
  if(ds.per!==undefined){S.per=ds.per;render();return}
  if(ds.esp!==undefined){S.esp=ds.esp;render();return}
  if(ds.sel){S.sel=+ds.sel;render();var dt=document.querySelector(".detail");if(dt) dt.scrollIntoView({behavior:"smooth",block:"nearest"});return}
  if(ds.past!==undefined){S.past=ds.past==="1";render();return}
  if(ds.add){abrirSheet(M.ALL[+ds.add],b);return}
  if(b.id==="sheetIcs"){baixarIcs();return}
  if(b.id==="tourBtn"){iniciarTour();return}
  if(b.id==="instBtn"){instalar();return}
  if(b.id==="instGo"){$("instbar").hidden=true;document.body.classList.remove("com-aviso");instalar();return}
  if(b.id==="instNo"){fecharInstBar();return}
  if(ds.share){navigator.share({text:dayText(M.DAYS[+ds.share-1])}).catch(function(){});return}
  if(ds.copy){copyText(dayText(M.DAYS[+ds.copy-1]));return}
  if(ds.loc){clearAll();S.loc=ds.loc;S.v="agenda";S.open=true;render();window.scrollTo({top:0,behavior:"smooth"});return}
  if(ds.padgo){clearAll();S.pad[ds.padgo]=true;S.v="agenda";render();window.scrollTo({top:0,behavior:"smooth"});return}
  if(b.id==="clear"||ds.clear){clearAll();render();return}
  if(b.id==="ftoggle"){S.open=!S.open;b.setAttribute("aria-expanded",S.open);$("panel").classList.toggle("open",S.open)}
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"&&TOUR){fimTour();return}
  if(e.key==="Escape"&&!$("inst").hidden){fecharInst();return}
  if(e.key==="Escape"&&!$("sheet").hidden) fecharSheet();
  if(e.key==="Tab"&&!$("sheet").hidden){
    var f=[].slice.call($("sheet").querySelectorAll("a[href],button")).filter(function(x){return x.offsetParent!==null});
    if(!f.length) return;
    var first=f[0], last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});
$("theme").addEventListener("click",function(){
  var nx=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
  document.documentElement.setAttribute("data-theme",nx);
  try{localStorage.setItem("missas-tema",nx)}catch(_){}
});
$("q").addEventListener("input",function(e){
  if(!M) return;
  S.q=e.target.value.trim();
  $("view").innerHTML=S.v==="cal"?viewCal():viewAgenda();
  updateCount();
});
$("fLoc").addEventListener("change",function(e){S.loc=e.target.value;render()});
window.addEventListener("hashchange",function(){
  var k=hashKey(); if(!k||(M&&k===M.key)) return;
  auto=false; abrir(k);
});

/* atualiza "hoje", "próxima" e a contagem; vira o dia sozinho */
setInterval(function(){
  if(document.hidden||!M) return;
  var n=new Date();
  if(n.getDate()!==lastDay){
    lastDay=n.getDate(); now=n;
    if(TOUR) return;
    if(auto){abrir(hojeKey(),true);return}
    render();return;
  }
  if(S.v==="agenda"&&!TOUR){var y=window.scrollY;render();window.scrollTo(0,y)}
},30000);
document.addEventListener("visibilitychange",function(){
  if(document.hidden||!M||TOUR) return;
  var n=new Date();
  if(n.getDate()!==lastDay){lastDay=n.getDate();now=n;if(auto){abrir(hojeKey(),true);return}}
  render();
});

/* ---------- início ---------- */
Promise.all([getJSON("data/config.json"),getJSON("data/meses.json")]).then(function(r){
  CFG=r[0]; LISTA=r[1].slice().sort();
  if(!LISTA.length) throw new Error("meses.json vazio");
  aplicarCores();
  var h=hashKey();
  auto=!h;
  return abrir(h||hojeKey()).then(function(){
    if(!jaViuTour()) setTimeout(iniciarTour,700); else agendarInstBar(4000);
  });
}).catch(erro);
})();
