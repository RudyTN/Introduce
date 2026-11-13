/* Giao diện GitHub Pages. Không cần thư viện ngoài. */
(() => {
  'use strict';
  const groups = window.HOLLAND_GROUPS;
  const ids = ['R','I','A','S','E','C'];
  const app = document.getElementById('app');
  const apiForm = document.getElementById('api-form');
  const apiPayload = document.getElementById('api-payload');
  const apiFrame = document.getElementById('api-frame');
  const apiUrl = String(window.HOLLAND_API_URL || '').trim();
  const state = {page:0,fullName:'',studentId:'',answers:ids.map(()=>Array(10).fill(null)),
    completedAt:Array(6).fill(null),top3:[],chosenGroup:'',career:'',busy:false};
  const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => document.getElementById(id);
  const showError = message => {const el=byId('error');if(el)el.textContent=message||'';};
  const scrollTop = () => window.scrollTo({top:0,behavior:'instant'});
  const configured = () => /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(apiUrl);
  const progress = i => `<div class="progress" aria-label="Đã đến nhóm ${i+1} trên 6"><div style="width:${(i+1)/6*100}%"></div></div>`;
  const tag = s => `<span class="tag">${esc(s)}</span>`;
  let pending = null;
  function request(action,data) {
    if (!configured()) return Promise.reject(new Error('Chưa cấu hình đường dẫn Google Apps Script trong config.js.'));
    if (pending) return Promise.reject(new Error('Đang xử lý yêu cầu trước đó.'));
    const requestId = (window.crypto && crypto.randomUUID ? crypto.randomUUID() :
      Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        if(pending && pending.id===requestId){pending=null;reject(new Error(
          'Không nhận được phản hồi từ máy chủ. Nếu bạn vừa nộp bài, KHÔNG nhấn nộp lại ngay. Hãy tải lại trang và kiểm tra MSSV đã được ghi nhận hay chưa.'));}
      },60000);
      pending={id:requestId,resolve,reject,timer};
      apiForm.action=apiUrl;
      apiPayload.value=JSON.stringify({action,requestId,...data});
      try{apiForm.submit();}catch(err){clearTimeout(timer);pending=null;reject(err);}
    });
  }
  window.addEventListener('message',event=>{
    if (!pending) return;
    // Chỉ nhận kết quả từ các miền chính thức của Google Apps Script.
    const allowed = /^https:\/\/(script\.google\.com|script\.googleusercontent\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin);
    if (!allowed) return;
    const msg=event.data;
    if(!msg||typeof msg!=='object'||msg.requestId!==pending.id||typeof msg.ok!=='boolean')return;
    const job=pending;pending=null;clearTimeout(job.timer);
    if(msg.ok)job.resolve(msg.data);
    else job.reject(new Error(msg.error||'Máy chủ không xử lý được yêu cầu.'));
  });
  function go(page){state.page=page;render();scrollTop();}
  function render(){
    if(state.page===0)return startPage();
    if(state.page>=1&&state.page<=12){const i=Math.floor((state.page-1)/2);return state.page%2?introPage(i):quizPage(i);}
    if(state.page===13)return resultsPage();
    if(state.page===14)return choosePage();
    thanksPage();
  }
  function startPage(){
    app.innerHTML=`${tag('60 câu hỏi · 6 nhóm RIASEC')}<h1>Trắc nghiệm định hướng nghề nghiệp Holland</h1>
      <p class="muted">Mỗi MSSV chỉ được nộp bài <strong>một lần</strong>. Vui lòng điền thông tin chính xác.</p>
      <label class="field" for="fullName">Họ và tên *</label>
      <input id="fullName" type="text" autocomplete="name" maxlength="100" value="${esc(state.fullName)}">
      <label class="field" for="studentId">Mã số sinh viên (MSSV) *</label>
      <input id="studentId" type="text" maxlength="30" autocomplete="off" value="${esc(state.studentId)}">
      <div class="notice tiny">Thông tin họ tên, MSSV và kết quả sẽ được lưu trong Google Sheets của đơn vị tổ chức khảo sát.</div>
      <p id="error" class="error" role="alert"></p><div class="actions"><button id="startBtn" type="button">Kiểm tra MSSV và bắt đầu</button></div>`;
    byId('startBtn').addEventListener('click',async()=>{
      state.fullName=byId('fullName').value.trim().replace(/\s+/g,' ');
      state.studentId=byId('studentId').value.trim().toUpperCase();
      if(state.fullName.length<2||!(/^[A-Z0-9_-]{3,30}$/.test(state.studentId))){showError('Vui lòng nhập họ tên và MSSV hợp lệ.');return;}
      const btn=byId('startBtn');btn.disabled=true;showError('Đang kiểm tra MSSV...');
      try{const r=await request('check',{fullName:state.fullName,studentId:state.studentId});
        if(!r.allowed){showError('MSSV này đã nộp bài trước đó và không được làm lại.');return;}
        go(1);
      }catch(err){showError(err.message||String(err));}
      finally{btn.disabled=false;}
    });
  }
  function introPage(i){const g=groups[i];
    app.innerHTML=`${tag('Giới thiệu nhóm '+(i+1)+'/6 · '+g.id)}${progress(i)}<h1>${esc(g.name)}</h1>
      <p>${esc(g.description)}</p><p>${esc(g.careers)}</p>
      <div class="notice"><strong>Hướng dẫn:</strong> Chọn <strong>1 – ĐỒNG Ý</strong> nếu phù hợp với bạn; chọn <strong>2 – KHÔNG ĐỒNG Ý</strong> nếu không phù hợp. Hãy trả lời cả 10 câu.</div>
      <div class="actions"><button id="beginGroup" type="button">Bắt đầu nhóm ${g.id}</button></div>`;
    byId('beginGroup').addEventListener('click',()=>go(i*2+2));
  }
  function quizPage(i){const g=groups[i];
    app.innerHTML=`${tag('Nhóm '+(i+1)+'/6 · '+g.id)}${progress(i)}<h1>10 câu hỏi – ${esc(g.name)}</h1>
      <p class="muted">1 = ĐỒNG Ý (1 điểm) · 2 = KHÔNG ĐỒNG Ý (0 điểm)</p>`+
      g.questions.map((q,j)=>`<div class="question"><div class="question-title">Câu ${j+1}. ${esc(q)}</div>
        <div class="options"><label class="option"><input type="radio" name="q${j}" value="1" data-j="${j}" ${state.answers[i][j]===1?'checked':''}> 1 – ĐỒNG Ý</label>
        <label class="option"><input type="radio" name="q${j}" value="2" data-j="${j}" ${state.answers[i][j]===2?'checked':''}> 2 – KHÔNG ĐỒNG Ý</label></div></div>`).join('')+
      `<p id="error" class="error" role="alert"></p><div class="actions"><button class="button-secondary" id="backIntro" type="button">Xem lại giới thiệu</button>
      <button id="nextGroup" type="button">${i===5?'Xem kết quả':'Hoàn thành nhóm '+g.id+' → Nhóm '+groups[i+1].id}</button></div>`;
    app.querySelectorAll('input[type=radio]').forEach(input=>input.addEventListener('change',()=>{
      state.answers[i][Number(input.dataset.j)]=Number(input.value);showError('');
    }));
    byId('backIntro').addEventListener('click',()=>go(i*2+1));
    byId('nextGroup').addEventListener('click',()=>{
      if(state.answers[i].some(x=>x===null)){showError('Bạn cần trả lời đủ 10 câu trước khi tiếp tục.');return;}
      const now=Date.now();
      state.completedAt[i]=Math.max(now,i===0?now:state.completedAt[i-1]||now);
      if(i<5)go(i*2+3);
      else{const scores=state.answers.map(a=>a.filter(x=>x===1).length);
        state.top3=groups.map((g,k)=>({id:g.id,score:scores[k],time:state.completedAt[k],random:Math.random()}))
          .sort((a,b)=>b.score-a.score||a.time-b.time||a.random-b.random).slice(0,3).map(x=>x.id);
        go(13);
      }
    });
  }
  function resultsPage(){const scores=state.answers.map(a=>a.filter(x=>x===1).length);
    app.innerHTML=`${tag('Đã trả lời 60/60 câu')}<h1>Kết quả Holland của bạn</h1><p>Điểm số của 6 nhóm:</p>`+
      groups.map((g,i)=>`<div class="score"><strong>${g.id}</strong><div class="track"><div class="bar" style="width:${scores[i]*10}%"></div></div><strong>${scores[i]}/10</strong></div>`).join('')+
      `<h2>3 chữ cái nổi bật</h2><div class="code">${state.top3.join(' – ')}</div>
      <p class="muted tiny">Kết quả là gợi ý về sở thích nghề nghiệp, không quyết định năng lực hoặc tương lai của bạn.</p>
      <div class="actions"><button id="chooseBtn" type="button">Tiếp tục lựa chọn</button></div>`;
    byId('chooseBtn').addEventListener('click',()=>go(14));
  }
  function choosePage(){app.innerHTML=`${tag('Bước cuối cùng')}<h1>Chọn nhóm bạn quan tâm nhất</h1>
    <p>Chọn <strong>đúng 1 chữ cái</strong> trong 3 chữ cái kết quả:</p>`+
    state.top3.map(id=>`<label class="pick"><input type="radio" name="chosen" value="${id}" ${state.chosenGroup===id?'checked':''}>
      <span><strong>${id}</strong> – ${esc(groups.find(g=>g.id===id).name)}</span></label>`).join('')+
    `<label class="field" for="career">Ngành nghề bạn quan tâm *</label><input id="career" type="text" maxlength="150" placeholder="Ví dụ: Tâm lý học" value="${esc(state.career)}">
    <p class="muted tiny">Sau khi nộp thành công, MSSV này không thể nộp lại hoặc sửa kết quả.</p>
    <p id="error" class="error" role="alert"></p><div class="actions"><button id="backResults" class="button-secondary" type="button">Xem lại điểm</button>
    <button id="submitBtn" type="button">Hoàn tất và nộp bài</button></div>`;
    app.querySelectorAll('input[name=chosen]').forEach(input=>input.addEventListener('change',()=>{state.chosenGroup=input.value;}));
    byId('backResults').addEventListener('click',()=>{state.career=byId('career').value;go(13);});
    byId('submitBtn').addEventListener('click',async()=>{
      if(state.busy)return;
      state.career=byId('career').value.trim();
      if(!state.top3.includes(state.chosenGroup)||!state.career){showError('Vui lòng chọn 1 chữ cái và nhập ngành nghề.');return;}
      state.busy=true;byId('submitBtn').disabled=true;showError('Đang lưu dữ liệu, vui lòng đợi...');
      try{const r=await request('submit',{fullName:state.fullName,studentId:state.studentId,
        answers:state.answers,completedAt:state.completedAt,top3:state.top3,
        chosenGroup:state.chosenGroup,career:state.career});
        if(!r.saved)throw new Error('Máy chủ chưa xác nhận lưu kết quả.');
        go(15);
      }catch(err){showError(err.message||String(err));byId('submitBtn').disabled=false;}
      finally{state.busy=false;}
    });
  }
  function thanksPage(){app.innerHTML=`<div class="thanks"><div class="done-icon">✓</div>${tag('Đã lưu thành công')}
    <h1>CẢM ƠN BẠN!</h1><p>Cảm ơn bạn đã dành thời gian tham gia bài trắc nghiệm định hướng nghề nghiệp Holland!</p>
    <p>Hy vọng bài trắc nghiệm đã giúp bạn hiểu thêm về sở thích và định hướng nghề nghiệp của bản thân.</p>
    <div class="notice"><strong>HÃY GHI NHỚ CHỮ CÁI BẠN ĐÃ CHỌN NHÉ!</strong><div class="big-letter">${esc(state.chosenGroup)}</div></div>
    <p>Chúc bạn luôn tự tin khám phá bản thân và tìm được con đường nghề nghiệp phù hợp!</p></div>`;
  }
  if(!Array.isArray(groups)||groups.length!==6||groups.some((g,i)=>g.id!==ids[i]||g.questions.length!==10)) {
    app.textContent='Lỗi dữ liệu: thiếu câu hỏi Holland. Vui lòng liên hệ người quản trị.';
    return;
  }
  // Không quay lại trang làm bài sau khi nộp thành công.
  window.addEventListener('beforeunload',()=>{if(pending){/* Yêu cầu đang xử lý; không đánh dấu đã nộp khi chưa xác nhận. */}});
  render();
})();
