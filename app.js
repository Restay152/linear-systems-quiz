(() => {
'use strict';
const Q=BANK.questions, ids=new Map(Q.map(q=>[q.id,q])), $=s=>document.querySelector(s), key=BANK.id;
const modes={all:'顺序练习',random:'随机练习',wrong:'错题重练',starred:'收藏题目'};
const types={single_choice:'单选题',multiple_choice:'多选题',true_false:'判断题'};
const fresh=()=>({history:{},stars:[],attempts:0,correct:0,round:null});
let state=fresh(),available=true;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function valid(r){return r&&Object.hasOwn(modes,r.mode)&&typeof r.chapter==='string'&&typeof r.type==='string'&&Array.isArray(r.ids)&&new Set(r.ids).size===r.ids.length&&r.ids.every(id=>ids.has(id))&&Number.isInteger(r.index)&&r.index>=0&&(r.ids.length===0||r.index<r.ids.length)&&r.answers&&typeof r.answers==='object'&&r.drafts&&typeof r.drafts==='object'&&Object.entries(r.answers).every(([id,a])=>ids.has(id)&&a&&typeof a.ok==='boolean'&&Array.isArray(a.selected)&&a.selected.every(v=>ids.get(id).options.some(o=>o.id===v)));}
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.history&&Array.isArray(saved.stars)&&Number.isInteger(saved.attempts)&&saved.attempts>=0&&Number.isInteger(saved.correct)&&saved.correct>=0&&saved.correct<=saved.attempts){state={...saved,history:Object.fromEntries(Object.entries(saved.history).filter(([id,v])=>ids.has(id)&&typeof v==='boolean')),stars:[...new Set(saved.stars.filter(id=>ids.has(id)))]};}}catch(e){available=false;}
function save(){try{localStorage.setItem(key,JSON.stringify(state));available=true;}catch(e){available=false;}$('#save-status').innerHTML=available?'<i></i>进度保存在此浏览器':'本次进度暂未保存';}
function wrongIds(){return Q.filter(q=>state.history[q.id]===false).map(q=>q.id);}
function begin(mode='all',chapter='all',type='all'){
let list=Q.filter(q=>(chapter==='all'||q.chapter===chapter)&&(type==='all'||q.type===type));
if(mode==='wrong')list=list.filter(q=>state.history[q.id]===false);if(mode==='starred')list=list.filter(q=>state.stars.includes(q.id));
const order=list.map(q=>q.id);if(mode==='random')for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
state.round={mode,chapter,type,ids:order,index:0,answers:{},drafts:{}};save();render();}
function answered(){return state.round.ids.filter(id=>Boolean(state.round.answers[id]));}
function render(){
const r=state.round,done=Q.filter(q=>typeof state.history[q.id]==='boolean').length,n=answered().length;
$('#stat-done').innerHTML=done+'<small> / '+Q.length+' 题</small>';$('#overall-bar').style.width=100*done/Q.length+'%';
$('#stat-rate').innerHTML=state.attempts?Math.round(100*state.correct/state.attempts)+'<small>%</small>':'—<small> 暂无记录</small>';
$('#stat-attempts').textContent=state.attempts?'累计作答 '+state.attempts+' 次 · 答对 '+state.correct+' 次':'从第一题开始积累';
$('#stat-wrong').innerHTML=wrongIds().length+'<small> 题</small>';$('#wrong-count').textContent=wrongIds().length;$('#star-count').textContent=state.stars.length;
document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===r.mode);b.setAttribute('aria-current',b.dataset.mode===r.mode?'page':'false');});
$('#mode-title').textContent=modes[r.mode];$('#topic-filter').value=r.chapter;$('#type-filter').value=r.type;
$('#round-progress').textContent=n+' / '+r.ids.length;$('#round-bar').style.width=(r.ids.length?100*n/r.ids.length:0)+'%';
$('#question-grid').innerHTML=r.ids.map((id,i)=>{const a=r.answers[id];return `<button class="grid-item ${a?(a.ok?'correct':'incorrect'):''} ${i===r.index?'current':''}" data-index="${i}" aria-label="第${i+1}题 ${id}，${a?(a.ok?'已答对':'已答错'):'未作答'}" ${i===r.index?'aria-current="step"':''}>${i+1}</button>`;}).join('');
$('#summary-button').disabled=!r.ids.length;$('#restart-button').disabled=!r.ids.length;
if(!r.ids.length){const message=r.mode==='wrong'?'这个范围暂时没有待巩固错题。':r.mode==='starred'?'这个范围暂时没有收藏题目。':'试试其他章节或题型。';$('#question-card').innerHTML=`<div class="empty"><div class="empty-symbol">◇</div><h3>这里暂时没有题目</h3><p>${message}</p><button id="back-all">开始顺序练习</button></div>`;$('#back-all').onclick=()=>begin();return;}
const q=ids.get(r.ids[r.index]),a=r.answers[q.id],selected=a?a.selected:r.drafts[q.id]||[],star=state.stars.includes(q.id);
const answer=q.options.filter(o=>q.answer_ids.includes(o.id)).map(o=>q.type==='true_false'?o.text:o.id).join('、');
$('#question-card').innerHTML=`
<div class="q-top"><div class="q-meta"><span class="pill">${types[q.type]}</span><span class="source">${esc(q.id)} · 原资料第${q.pages.join('、')}页</span></div><button class="star ${star?'saved':''}" id="star-button" aria-label="${star?'取消收藏':'收藏此题'}" aria-pressed="${star}">${star?'★':'☆'}</button></div>
<div class="q-index">QUESTION ${r.index+1} <span>/ ${r.ids.length}</span></div><div class="q-text" id="question-stem">${q.stem_html}</div>
<div class="choices" role="group" aria-label="选择答案">${q.options.map((o,i)=>`<button class="choice ${selected.includes(o.id)?'selected '+(a?(q.answer_ids.includes(o.id)?'correct':'incorrect'):'pending'):''} ${a&&q.answer_ids.includes(o.id)?'correct-answer':''}" data-option="${esc(o.id)}" aria-pressed="${selected.includes(o.id)}" ${a?'disabled':''}><span class="choice-icon">${q.type==='true_false'?(i?'×':'✓'):o.id}</span><span class="choice-text">${o.html}</span></button>`).join('')}</div>
${!a?`<div class="submit-row"><span>${q.type==='multiple_choice'?'选择所有正确选项，完整匹配得分':'请选择一个选项，再提交答案'}</span><button id="submit-answer" ${!selected.length?'disabled':''}>提交答案</button></div>`:''}
${a?`<section class="feedback" aria-live="polite"><h4 class="feedback-heading ${a.ok?'':'wrong'}">${a.ok?'✓ 回答正确':'↺ 再巩固一下'}<span>正确答案：${esc(answer)}</span></h4><div class="explanation">${q.explanation_html}</div><div class="key-point"><b>复习定位</b>${esc(BANK.chapters.find(c=>c.id===q.chapter).title)} · 原资料第${q.pages.join('、')}页</div></section>`:''}
<div class="q-bottom"><button class="previous" id="previous-button" ${r.index===0?'disabled':''}>← 上一题</button><span class="answer-prompt">${a?'理解原因，把知识串起来':'作答后查看解析'}</span><button class="next" id="next-button">${r.index===r.ids.length-1?'本轮总结 ↗':'下一题 →'}</button></div>`;
$('#star-button').onclick=()=>{state.stars=star?state.stars.filter(id=>id!==q.id):[...state.stars,q.id];save();render();};
document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{if(r.answers[q.id])return;const value=b.dataset.option,previous=r.drafts[q.id]||[];r.drafts[q.id]=q.type==='multiple_choice'?(previous.includes(value)?previous.filter(x=>x!==value):[...previous,value]):[value];save();render();});
if($('#submit-answer'))$('#submit-answer').onclick=submit;$('#previous-button').onclick=()=>move(-1);$('#next-button').onclick=()=>move(1);
}
function submit(){const r=state.round,q=ids.get(r.ids[r.index]),selected=r.drafts[q.id]||[];if(!selected.length||r.answers[q.id])return;const ok=selected.length===q.answer_ids.length&&selected.every(v=>q.answer_ids.includes(v));r.answers[q.id]={selected:[...selected],ok};state.history[q.id]=ok;state.attempts++;if(ok)state.correct++;delete r.drafts[q.id];save();render();}
function move(d){const r=state.round,n=r.index+d;if(n<0)return;if(n>=r.ids.length){summary();return;}r.index=n;save();render();}
function modal(content){$('#modal-content').innerHTML=content;$('#modal').showModal();}
function summary(){
const r=state.round,done=answered(),correct=done.filter(id=>r.answers[id].ok).length,wrong=done.filter(id=>!r.answers[id].ok);
modal(`<div class="dialog-label">YOUR PRACTICE REVIEW</div><h2>本轮练习</h2><p>已完成 ${done.length} / ${r.ids.length} 题；正确率 ${done.length?Math.round(correct/done.length*100)+'%':'—'}。多选题须完整匹配才算正确。</p><div class="result-stats"><div>已完成<b>${done.length}</b></div><div>答对<b>${correct}</b></div><div>答错<b>${wrong.length}</b></div></div><div class="dialog-actions"><button id="continue-round">返回练习</button>${wrong.length?'<button class="primary" id="retry-round">重练本轮错题</button>':''}</div>`);
$('#continue-round').onclick=()=>$('#modal').close();if($('#retry-round'))$('#retry-round').onclick=()=>{$('#modal').close();state.round={mode:'wrong',chapter:r.chapter,type:r.type,ids:wrong,index:0,answers:{},drafts:{}};save();render();};}
for(const chapter of BANK.chapters){const o=document.createElement('option');o.value=chapter.id;o.textContent=chapter.title;$('#topic-filter').append(o);}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>begin(b.dataset.mode,state.round.chapter,state.round.type));$('.brand').onclick=e=>{e.preventDefault();begin();};
$('#topic-filter').onchange=e=>begin(state.round.mode,e.target.value,state.round.type);$('#type-filter').onchange=e=>begin(state.round.mode,state.round.chapter,e.target.value);
$('#question-grid').onclick=e=>{const b=e.target.closest('[data-index]');if(b){state.round.index=Number(b.dataset.index);save();render();}};$('#summary-button').onclick=summary;
$('#restart-button').onclick=()=>{modal('<h2>重新开始这一轮？</h2><p>本轮作答将重置，累计统计、错题和收藏保留。</p><div class="dialog-actions"><button id="cancel">取消</button><button class="primary" id="confirm">重新开始</button></div>');$('#cancel').onclick=()=>$('#modal').close();$('#confirm').onclick=()=>{$('#modal').close();begin(state.round.mode,state.round.chapter,state.round.type);};};
$('#modal-close').onclick=()=>$('#modal').close();
$('#about-button').onclick=()=>modal('<div class="dialog-label">ABOUT THIS QUESTION BANK</div><h2>自主智能运动系统记忆题库</h2><p>依据《复习2026-final-NEW.pdf》及完整复习笔记整理。当前上线110题：单选50题、多选30题、判断30题，按五章内容练习。填空、简答、计算题暂未加入。</p><p>多选题须选齐正确项且不多选。累计正确率按提交次数计算，错题本按最近一次作答更新。支持章节与题型筛选，原资料页码附在每道题上。</p><p>公式按正确数学定义排版；汽车自由度按题目给定模型理解。仅列于课件目录、没有正文展开的算法不作为新增考点。</p><p>新题库使用独立的浏览器进度记录，当前题目不会继承旧题的得分或收藏。</p>');
$('#reset-button').onclick=()=>{modal('<h2>清除本题库学习记录？</h2><p>将删除本浏览器中这套110题的作答统计、错题、收藏和本轮进度。</p><div class="dialog-actions"><button id="cancel">取消</button><button class="primary" id="confirm">确认清除</button></div>');$('#cancel').onclick=()=>$('#modal').close();$('#confirm').onclick=()=>{state=fresh();$('#modal').close();begin();};};
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||$('#modal').open||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)||!state.round.ids.length)return;if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}if(e.key==='ArrowRight'){e.preventDefault();move(1);}});
if(!valid(state.round))begin();else{save();render();}
})();
