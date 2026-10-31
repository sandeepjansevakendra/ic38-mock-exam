/* IC-38 Mock Exam — app logic (exam engine + Firebase login + database) */
(function(){
"use strict";
var NSETS=25, PER=50, DURATION=60*60*1000, PASS=18;
var $=function(id){return document.getElementById(id)};

/* ---------- helpers ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(arr,r){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var x=a[i];a[i]=a[j];a[j]=x}return a}
function store(k,v){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function load(k,d){try{var s=localStorage.getItem(k);return s?JSON.parse(s):d}catch(e){return d}}
function pad(n){return(n<10?"0":"")+n}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

/* ---------- 25 sets of 50 (same for every user) ---------- */
var SETS=(function(){
  var ids=BANK.map(function(q){return q.id}), queue=[];
  for(var k=0;k<5;k++)queue=queue.concat(shuffle(ids,rng(38000+k*101)));
  var sets=[],cur=[],seen={},deferred=[];
  function push(id){cur.push(id);seen[id]=1;if(cur.length===PER){sets.push(cur);cur=[];seen={};var d=deferred;deferred=[];d.forEach(function(x){if(cur.length<PER&&!seen[x])push(x);else deferred.push(x)})}}
  for(var i=0;i<queue.length&&sets.length<NSETS;i++){var id=queue[i];if(seen[id])deferred.push(id);else push(id)}
  return sets;
})();
var BY={};BANK.forEach(function(q){BY[q.id]=q});
function optionsFor(s,q){var o=[q.a].concat(q.w);var order=shuffle([0,1,2,3],rng((s+1)*7919+q.id*31));return order.map(function(i){return{text:o[i],correct:i===0}})}

/* ---------- state ---------- */
var me=null, profile=null, hist={}, ex=null, tick=null, filter="all", lastRes=null, chosenSet=0;
function liveKey(){return "ic38_live_"+(me?me.uid:"x")}
function pendKey(){return "ic38_pending_"+(me?me.uid:"x")}

var SCREENS=["loading","auth","verify","home","instr","exam","result"];
function show(id){SCREENS.forEach(function(s){$(s).hidden=s!==id});
  var inExam=id==="exam";$("timer").hidden=!inExam;$("palBtn").hidden=!inExam;$("candBox").hidden=!inExam;
  $("userChip").hidden=inExam||!me||!me.emailVerified||id==="auth"||id==="verify";
  window.scrollTo(0,0)}

/* ---------- Firebase ---------- */
var cfg=window.FIREBASE_CONFIG||{}, configured=cfg.apiKey&&cfg.apiKey.indexOf("PASTE")!==0, auth=null, db=null;
if(configured){firebase.initializeApp(cfg);auth=firebase.auth();db=firebase.firestore();auth.languageCode="hi"}
var TS=function(){return firebase.firestore.FieldValue.serverTimestamp()};

var ERR={
  "auth/email-already-in-use":"यह ईमेल पहले से रजिस्टर है। Login टैब से लॉगिन करें।",
  "auth/invalid-email":"ईमेल सही नहीं है।",
  "auth/weak-password":"पासवर्ड कम से कम 6 अक्षर का रखें।",
  "auth/invalid-credential":"ईमेल या पासवर्ड ग़लत है।",
  "auth/wrong-password":"ईमेल या पासवर्ड ग़लत है।",
  "auth/user-not-found":"इस ईमेल से कोई खाता नहीं है। पहले Register करें।",
  "auth/too-many-requests":"बहुत ज़्यादा कोशिश हो गई। कुछ देर बाद फिर से कोशिश करें।",
  "auth/network-request-failed":"इंटरनेट कनेक्शन नहीं है। नेट चेक करके फिर से कोशिश करें।",
  "auth/unauthorized-domain":"यह वेबसाइट Firebase में Authorized domain नहीं है (README स्टेप 2.5)।"
};
function errText(e){return ERR[e&&e.code]||("कुछ गड़बड़ हुई: "+((e&&e.message)||e))}
function msg(el,text,kind){var m=$(el);m.textContent=text;m.className="msg "+(kind||"err");m.hidden=!text}
function busy(btn,on){$(btn).disabled=on}

function setTab(reg){$("tabLogin").setAttribute("aria-selected",!reg);$("tabReg").setAttribute("aria-selected",reg);$("loginForm").hidden=reg;$("regForm").hidden=!reg;msg("authMsg","")}
$("tabLogin").addEventListener("click",function(){setTab(false)});
$("tabReg").addEventListener("click",function(){setTab(true)});

$("loginForm").addEventListener("submit",function(e){e.preventDefault();if(!auth)return;
  var em=$("liEmail").value.trim(),pw=$("liPass").value;
  if(!em||!pw){msg("authMsg","ईमेल और पासवर्ड दोनों भरें।");return}
  busy("liBtn",true);auth.signInWithEmailAndPassword(em,pw).catch(function(err){msg("authMsg",errText(err))}).then(function(){busy("liBtn",false)})});

$("forgotBtn").addEventListener("click",function(){if(!auth)return;var em=$("liEmail").value.trim();
  if(!em){msg("authMsg","पहले ऊपर अपना ईमेल लिखें, फिर Reset password दबाएँ।");return}
  auth.sendPasswordResetEmail(em).then(function(){msg("authMsg","पासवर्ड बदलने का लिंक "+em+" पर भेज दिया गया है।","ok")}).catch(function(err){msg("authMsg",errText(err))})});

var registering=false;
$("regForm").addEventListener("submit",function(e){e.preventDefault();if(!auth)return;
  var name=$("rgName").value.trim().replace(/\s+/g," "),mob=$("rgMobile").value.replace(/\D/g,""),em=$("rgEmail").value.trim().toLowerCase(),dob=$("rgDob").value,pw=$("rgPass").value;
  if(name.length<3)return msg("authMsg","पूरा नाम लिखें।");
  if(!/^[6-9]\d{9}$/.test(mob))return msg("authMsg","10 अंकों का सही मोबाइल नंबर लिखें (6, 7, 8 या 9 से शुरू)।");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return msg("authMsg","सही ईमेल लिखें।");
  if(!dob)return msg("authMsg","जन्म तिथि चुनें।");
  var age=(Date.now()-new Date(dob).getTime())/3.15576e10;
  if(age<17||age>100)return msg("authMsg","जन्म तिथि सही नहीं लग रही। एजेंट बनने के लिए 18 वर्ष आयु चाहिए।");
  if(pw.length<6)return msg("authMsg","पासवर्ड कम से कम 6 अक्षर का रखें।");
  if(!$("rgAgree").checked)return msg("authMsg","आगे बढ़ने के लिए सहमति वाला बॉक्स टिक करें।");
  busy("rgBtn",true);registering=true;var user;
  auth.createUserWithEmailAndPassword(em,pw).then(function(c){user=c.user;
    return db.collection("mobiles").doc(mob).set({uid:user.uid,createdAt:TS()}).catch(function(err){
      var dup=new Error("dup");dup.code="dup-mobile";throw dup});
  }).then(function(){
    return db.collection("users").doc(user.uid).set({name:name,mobile:mob,email:em,dob:dob,emailVerified:false,attempts:0,bestScore:null,lastScore:null,lastSet:null,createdAt:TS(),lastLogin:TS(),lastAttemptAt:null});
  }).then(function(){return user.updateProfile({displayName:name})})
  .then(function(){return user.sendEmailVerification()})
  .then(function(){registering=false;busy("rgBtn",false);onUser(user)})
  .catch(function(err){registering=false;busy("rgBtn",false);
    if(err.code==="dup-mobile"&&user){user.delete().catch(function(){auth.signOut()});msg("authMsg","यह मोबाइल नंबर पहले से रजिस्टर है। उसी खाते के ईमेल से लॉगिन करें।");return}
    msg("authMsg",errText(err))})});

$("vCheck").addEventListener("click",function(){var u=auth.currentUser;if(!u)return;
  u.reload().then(function(){if(auth.currentUser.emailVerified){return auth.currentUser.getIdToken(true).then(function(){onUser(auth.currentUser)})}
    msg("vMsg","अभी ईमेल वेरीफाई नहीं हुआ। ईमेल वाले लिंक पर क्लिक करें, फिर यह बटन दबाएँ।")}).catch(function(e){msg("vMsg",errText(e))})});
$("vResend").addEventListener("click",function(){var u=auth.currentUser;if(!u)return;
  u.sendEmailVerification().then(function(){msg("vMsg","लिंक दोबारा भेज दिया गया है।","ok")}).catch(function(e){msg("vMsg",errText(e))})});
$("vLogout").addEventListener("click",logout);
$("logoutBtn").addEventListener("click",logout);
function logout(){if(ex&&!$("exam").hidden)return;me=null;profile=null;hist={};ex=null;auth&&auth.signOut()}

function onUser(u){
  me=u;
  if(!u){setTab(false);show("auth");return}
  if(!u.emailVerified){$("vEmail").textContent=u.email;msg("vMsg","");show("verify");return}
  show("loading");
  var ref=db.collection("users").doc(u.uid);
  ref.get().then(function(s){profile=s.exists?s.data():{name:u.displayName||"",email:u.email};
    if(s.exists)ref.update({lastLogin:TS(),emailVerified:true}).catch(function(){});
    $("userName").textContent=profile.name||u.email;$("candName").value=profile.name||"";
    return flushPending();
  }).then(loadHistory).then(function(){
    ex=load(liveKey(),null);if(ex&&(!ex.ans||ex.ans.length!==PER))ex=null;
    renderHome();
  }).catch(function(e){console.error(e);renderHome()});
}
function loadHistory(){
  hist={};
  return db.collection("attempts").where("uid","==",me.uid).get().then(function(qs){
    var rows=[];qs.forEach(function(d){var x=d.data();rows.push({set:x.set-1,score:x.score,date:x.clientTime||0,used:(x.timeUsedSec||0)*1000})});
    load(pendKey(),[]).forEach(function(p){rows.push({set:p.set-1,score:p.score,date:p.clientTime,used:p.timeUsedSec*1000})});
    rows.sort(function(a,b){return a.date-b.date}).forEach(function(r){(hist[r.set]=hist[r.set]||[]).push(r)});
  }).catch(function(e){console.error(e)});
}
function saveAttempt(rec){
  return db.collection("attempts").add(Object.assign({},rec,{createdAt:TS()})).then(function(){
    var best=profile&&profile.bestScore!=null?Math.max(profile.bestScore,rec.score):rec.score;
    if(profile){profile.bestScore=best;profile.attempts=(profile.attempts||0)+1}
    return db.collection("users").doc(me.uid).update({attempts:firebase.firestore.FieldValue.increment(1),lastScore:rec.score,lastSet:rec.set,bestScore:best,lastAttemptAt:TS()}).catch(function(){});
  });
}
function flushPending(){
  var p=load(pendKey(),[]);if(!p.length)return Promise.resolve();
  var left=[];return p.reduce(function(chain,rec){return chain.then(function(){return saveAttempt(rec).catch(function(){left.push(rec)})})},Promise.resolve())
    .then(function(){store(pendKey(),left.length?left:null)});
}

/* ---------- HOME ---------- */
function bestOf(h){return Math.max.apply(null,h.map(function(x){return x.score}))}
function renderHome(){
  var done=0,pass=0,best=null,sum=0,n=0,html="";
  for(var s=0;s<NSETS;s++){
    var h=hist[s]||[];var last=h[h.length-1];
    if(h.length){done++;var b=bestOf(h);if(b>=PASS)pass++;best=best===null?b:Math.max(best,b);h.forEach(function(x){sum+=x.score;n++})}
    var live=ex&&ex.set===s;
    var pill=live?'<span class="pill live">In progress · जारी</span>':last?('<span class="pill '+(last.score>=PASS?"pass":"fail")+'">'+last.score+'/50 · '+(last.score>=PASS?"Pass":"Fail")+'</span>'):'<span class="pill new">Not attempted</span>';
    var meta=h.length?(h.length+" attempt"+(h.length>1?"s":"")+" · best "+bestOf(h)):"50 प्रश्न · 60 मिनट";
    html+='<button class="setcard" data-s="'+s+'"><span class="no">SET '+pad(s+1)+'</span><span class="ttl">टेस्ट सेट '+(s+1)+'</span>'+pill+'<span class="meta">'+meta+'</span></button>';
  }
  $("sets").innerHTML=html;
  $("pDone").textContent=done+" / 25";$("pPass").textContent=pass;$("pBest").textContent=best===null?"—":best+" / 50";$("pAvg").textContent=n?(sum/n).toFixed(1)+" / 50":"—";
  if(ex){$("resume").hidden=false;$("resumeText").textContent="टेस्ट सेट "+(ex.set+1)+" अधूरा है · "+fmt(ex.endAt-Date.now())+" बाकी"}else $("resume").hidden=true;
  show("home");
}
$("sets").addEventListener("click",function(e){var b=e.target.closest(".setcard");if(!b)return;var s=+b.dataset.s;
  if(ex&&ex.set===s){resume();return}openInstr(s)});
function openInstr(s){chosenSet=s;$("instrTitle").textContent="टेस्ट सेट "+(s+1)+" — निर्देश";$("agree").checked=false;$("startBtn").disabled=true;show("instr")}
$("agree").addEventListener("change",function(){$("startBtn").disabled=!this.checked});
$("instrBack").addEventListener("click",renderHome);
$("startBtn").addEventListener("click",function(){
  var name=$("candName").value.trim()||(profile&&profile.name)||"";
  ex={set:chosenSet,name:name,ans:Array(PER).fill(null),mark:Array(PER).fill(false),vis:Array(PER).fill(false),cur:0,startAt:Date.now(),endAt:Date.now()+DURATION};
  ex.vis[0]=true;save();startExam()});
$("resumeGo").addEventListener("click",resume);
$("resumeDrop").addEventListener("click",function(){$("dropModal").hidden=false});
$("dmNo").addEventListener("click",function(){$("dropModal").hidden=true});
$("dmYes").addEventListener("click",function(){$("dropModal").hidden=true;ex=null;store(liveKey(),null);renderHome()});

/* ---------- EXAM ---------- */
function save(){store(liveKey(),ex)}
function fmt(ms){ms=Math.max(0,ms);var t=Math.ceil(ms/1000);return pad(Math.floor(t/60))+":"+pad(t%60)}
function resume(){if(ex.endAt<=Date.now()){finish(true);return}startExam()}
function startExam(){
  $("candBox").innerHTML="<b>"+esc(ex.name||"Candidate")+"</b><br>Test Set "+(ex.set+1)+" · IC-38";
  show("exam");renderQ();clearInterval(tick);tick=setInterval(updClock,500);updClock()}
function updClock(){if(!ex)return;var left=ex.endAt-Date.now();$("clock").textContent=fmt(left);
  $("timer").classList.toggle("warn",left<=10*60000);$("timer").classList.toggle("crit",left<=60000);
  if(left<=0)finish(true)}
function status(i){var a=ex.ans[i]!==null,m=ex.mark[i];if(m&&a)return"am";if(m)return"mr";if(a)return"an";if(ex.vis[i])return"na";return""}
function renderQ(){
  var i=ex.cur,q=BY[SETS[ex.set][i]],opts=optionsFor(ex.set,q);
  $("qn").textContent="प्रश्न "+(i+1)+" / "+PER;$("qtopic").textContent=TOPICS[q.t];
  $("qtext").textContent=q.q;
  var h="";opts.forEach(function(o,k){var on=ex.ans[i]===k;
    h+='<li><button class="opt" role="radio" aria-checked="'+on+'" data-k="'+k+'"><span class="k">'+"ABCD"[k]+'</span><span>'+esc(o.text)+'</span></button></li>'});
  $("opts").innerHTML=h;$("prevBtn").disabled=i===0;
  $("nextBtn").innerHTML=i===PER-1?"Save<small>सहेजें</small>":"Save & Next<small>सहेजें और आगे</small>";
  $("markBtn").innerHTML=ex.mark[i]?"Unmark & Next<small>चिह्न हटाएँ और आगे</small>":"Mark for Review & Next<small>चिह्नित करें और आगे</small>";
  renderPal()}
function renderPal(){
  var c={an:0,na:0,"":0,mr:0,am:0},h="";
  for(var i=0;i<PER;i++){var st=status(i);c[st]++;h+='<button class="q '+st+(i===ex.cur?" cur":"")+'" data-i="'+i+'" aria-label="Question '+(i+1)+'">'+(i+1)+'</button>'}
  $("grid").innerHTML=h;
  $("counts").innerHTML='<div><span class="q an">'+c.an+'</span>Answered</div><div><span class="q na">'+c.na+'</span>Not Answered</div><div><span class="q">'+c[""]+'</span>Not Visited</div><div><span class="q mr">'+c.mr+'</span>Marked</div><div style="grid-column:1/-1"><span class="q am">'+c.am+'</span>Answered & Marked</div>'}
function go(i){if(i<0||i>=PER)return;ex.cur=i;ex.vis[i]=true;save();renderQ();closePal()}
$("opts").addEventListener("click",function(e){var b=e.target.closest(".opt");if(!b)return;ex.ans[ex.cur]=+b.dataset.k;save();renderQ()});
$("nextBtn").addEventListener("click",function(){if(ex.cur<PER-1)go(ex.cur+1);else renderQ()});
$("prevBtn").addEventListener("click",function(){go(ex.cur-1)});
$("clearBtn").addEventListener("click",function(){ex.ans[ex.cur]=null;save();renderQ()});
$("markBtn").addEventListener("click",function(){ex.mark[ex.cur]=!ex.mark[ex.cur];save();if(ex.cur<PER-1)go(ex.cur+1);else renderQ()});
$("grid").addEventListener("click",function(e){var b=e.target.closest(".q");if(b)go(+b.dataset.i)});
function openPal(){$("side").classList.add("open");$("scrim").classList.add("open")}
function closePal(){$("side").classList.remove("open");$("scrim").classList.remove("open")}
$("palBtn").addEventListener("click",function(){$("side").classList.contains("open")?closePal():openPal()});
$("scrim").addEventListener("click",closePal);
document.addEventListener("keydown",function(e){
  if($("exam").hidden||!$("confirmModal").hidden||e.target.tagName==="INPUT")return;
  if(/^[1-4]$/.test(e.key)){ex.ans[ex.cur]=+e.key-1;save();renderQ()}
  else if(e.key==="ArrowRight"){go(ex.cur+1)}else if(e.key==="ArrowLeft"){go(ex.cur-1)}});
$("submitBtn").addEventListener("click",function(){
  closePal();var a=0,m=0,nv=0;for(var i=0;i<PER;i++){if(ex.ans[i]!==null)a++;if(ex.mark[i])m++;if(!ex.vis[i])nv++}
  $("cmTable").innerHTML="<tr><td>उत्तर दिए · Answered</td><td>"+a+"</td></tr><tr><td>उत्तर नहीं दिए · Not answered</td><td>"+(PER-a)+"</td></tr><tr><td>समीक्षा हेतु चिह्नित · Marked</td><td>"+m+"</td></tr><tr><td>नहीं देखे · Not visited</td><td>"+nv+"</td></tr><tr><td>शेष समय · Time left</td><td>"+fmt(ex.endAt-Date.now())+"</td></tr>";
  $("confirmModal").hidden=false;$("cmYes").focus()});
$("cmNo").addEventListener("click",function(){$("confirmModal").hidden=true});
$("cmYes").addEventListener("click",function(){$("confirmModal").hidden=true;finish(false)});
$("tmOk").addEventListener("click",function(){$("timeModal").hidden=true});
window.addEventListener("beforeunload",function(e){if(ex&&!$("exam").hidden){e.preventDefault();e.returnValue=""}});

function finish(timeUp){
  clearInterval(tick);if(!ex)return;
  var s=ex.set,ids=SETS[s],correct=0,wrong=0,skip=0,topics={},items=[];
  ids.forEach(function(id,i){var q=BY[id],opts=optionsFor(s,q),ans=ex.ans[i],ok=ans!==null&&opts[ans].correct;
    if(ans===null)skip++;else if(ok)correct++;else wrong++;
    var t=topics[q.t]||(topics[q.t]={n:0,c:0});t.n++;if(ok)t.c++;
    items.push({i:i,q:q,opts:opts,ans:ans,ok:ok})});
  var used=Math.min(DURATION,(timeUp?ex.endAt:Date.now())-ex.startAt);
  (hist[s]=hist[s]||[]).push({score:correct,date:Date.now(),used:used});
  var rec={uid:me.uid,name:(profile&&profile.name)||ex.name||"",mobile:(profile&&profile.mobile)||"",email:me.email,
    set:s+1,score:correct,correct:correct,wrong:wrong,skipped:skip,total:PER,percent:Math.round(correct/PER*100),
    result:correct>=PASS?"PASS":"FAIL",timeUsedSec:Math.round(used/1000),autoSubmitted:!!timeUp,clientTime:Date.now()};
  saveAttempt(rec).catch(function(){var p=load(pendKey(),[]);p.push(rec);store(pendKey(),p)});
  lastRes={set:s,correct:correct,wrong:wrong,skip:skip,topics:topics,items:items,used:used,name:ex.name};
  ex=null;store(liveKey(),null);renderResult();if(timeUp)$("timeModal").hidden=false}

/* ---------- RESULT ---------- */
function renderResult(){
  var r=lastRes,pass=r.correct>=PASS,pct=Math.round(r.correct/PER*100);
  $("scoreNum").textContent=r.correct;
  $("scoreRing").style.borderColor=pass?"var(--ok)":"var(--bad)";
  $("resSet").textContent="टेस्ट सेट "+(r.set+1)+" · Result"+(r.name?" · "+r.name:"");
  $("verdict").textContent=pass?"PASS · उत्तीर्ण":"FAIL · अनुत्तीर्ण";$("verdict").className="verdict "+(pass?"pass":"fail");
  $("verdictNote").textContent=pass?("पास अंक 18 से "+(r.correct-PASS)+" अंक ज़्यादा। इसी तरह अगले सेट दें।"):("पास होने के लिए "+(PASS-r.correct)+" और सही उत्तर चाहिए। नीचे ग़लत उत्तर देखें।");
  var m=Math.floor(r.used/60000),sec=Math.floor(r.used%60000/1000);
  $("resStats").innerHTML="<div><b>"+r.correct+"</b>सही · Correct</div><div><b>"+r.wrong+"</b>ग़लत · Wrong</div><div><b>"+r.skip+"</b>खाली · Skipped</div><div><b>"+pct+"%</b>प्रतिशत</div><div><b>"+pad(m)+":"+pad(sec)+"</b>लगा समय · Time used</div>";
  var rows="";Object.keys(r.topics).map(Number).sort(function(a,b){return a-b}).forEach(function(t){var x=r.topics[t],p=Math.round(x.c/x.n*100);
    rows+="<tr><td>"+esc(TOPICS[t])+"</td><td class='n'>"+x.c+" / "+x.n+"</td><td><div class='bar-mini'><i class='"+(p<50?"low":"")+"' style='width:"+p+"%'></i></div></td></tr>"});
  $("topicRows").innerHTML=rows;
  $("resNext").hidden=r.set>=NSETS-1;
  setFilter("all");show("result")}
function setFilter(f){filter=f;Array.prototype.forEach.call($("filters").children,function(c){c.setAttribute("aria-pressed",c.dataset.f===f)});renderReview()}
$("filters").addEventListener("click",function(e){var c=e.target.closest(".chip");if(c)setFilter(c.dataset.f)});
function renderReview(){
  var h="",n=0;lastRes.items.forEach(function(it){
    var kind=it.ans===null?"skip":it.ok?"ok":"bad";if(filter!=="all"&&filter!==kind)return;n++;
    var li="";it.opts.forEach(function(o,k){var cls=o.correct?"c":(k===it.ans?"w":"");var tag=o.correct?(k===it.ans?"आपका उत्तर ✓":"सही उत्तर"):(k===it.ans?"आपका उत्तर ✗":"");
      li+='<li class="'+cls+'"><b>'+"ABCD"[k]+'.</b><span>'+esc(o.text)+'</span>'+(tag?'<span class="tag">'+tag+'</span>':"")+"</li>"});
    h+='<article class="rv '+(kind==="skip"?"":kind)+'"><div class="h"><span>प्रश्न '+(it.i+1)+" · "+esc(TOPICS[it.q.t])+'</span><span>'+(kind==="ok"?"सही":kind==="bad"?"ग़लत":"उत्तर नहीं दिया")+'</span></div><div class="t">'+esc(it.q.q)+"</div><ul>"+li+"</ul>"+(it.q.e?'<div class="ex">समझ: '+esc(it.q.e)+"</div>":"")+"</article>"});
  $("rvlist").innerHTML=n?h:'<div class="panel" style="color:var(--muted)">इस श्रेणी में कोई प्रश्न नहीं है।</div>'}
$("resHome").addEventListener("click",renderHome);
$("resRetry").addEventListener("click",function(){openInstr(lastRes.set)});
$("resNext").addEventListener("click",function(){openInstr(lastRes.set+1)});

/* ---------- boot ---------- */
if(!configured){$("setupNote").hidden=false;show("auth");$("liBtn").disabled=true;$("rgBtn").disabled=true;return}
auth.onAuthStateChanged(function(u){if(registering)return;onUser(u)});
})();
