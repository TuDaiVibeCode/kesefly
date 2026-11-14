const root = document.documentElement;
const params = new URLSearchParams(location.search);
const themeButton = document.querySelector('#theme');
const stateSelect = document.querySelector('#preview-state');
const full = document.querySelector('#full-state');
const statePanel = document.querySelector('#state-panel');
const dialog = document.querySelector('#reference-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogCopy = document.querySelector('#dialog-copy');
let mode = params.get('mode') || root.dataset.mode || 'light';
let state = params.get('state') || 'full';
function setMode(next) {
  mode = next;
  root.dataset.mode = mode;
  themeButton.setAttribute('aria-label', mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
  params.set('mode', mode);
  try { history.replaceState(null, '', '?' + params); } catch {}
}
function setState(next) {
  state = next;
  full.hidden = state !== 'full';
  statePanel.hidden = state === 'full';
  stateSelect.value = state;
  statePanel.setAttribute('role', state === 'error' ? 'alert' : 'status');
  statePanel.replaceChildren();
  if (state !== 'full') {
    const title = document.createElement('h2');
    const copy = document.createElement('p');
    title.textContent = { empty: 'Bắt đầu từ khoản chi đầu tiên', loading: 'Đang mở sổ chi tiêu…', error: 'Chưa tải được tổng quan' }[state];
    copy.textContent = { empty: 'Tháng này chưa có giao dịch. Ghi một khoản chi để biết tiền của bạn đi đâu.', loading: 'Đang lấy các giao dịch đã ghi nhận.', error: 'Dữ liệu chưa hiển thị. Thử tải lại để xem bản minh họa.' }[state];
    statePanel.append(title, copy);
    if(state === 'loading') { const block = document.createElement('div'); block.className='loading-block'; block.setAttribute('aria-hidden','true'); statePanel.append(block); }
    if(state === 'error') { const retry=document.createElement('button'); retry.className='text-button'; retry.textContent='Thử lại'; retry.onclick=()=>setState('full'); statePanel.append(retry); }
  }
  params.set('state', state);
  try { history.replaceState(null, '', '?' + params); } catch {}
}
function explain(title, copy) { dialogTitle.textContent=title;dialogCopy.textContent=copy;dialog.showModal(); }
themeButton.onclick=()=>setMode(mode==='light'?'dark':'light');
stateSelect.onchange=()=>setState(stateSelect.value);
document.querySelector('#close-dialog').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
document.querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>explain(button.dataset.title || button.textContent.trim(),button.dataset.preview));
setMode(mode);setState(['full','empty','loading','error'].includes(state)?state:'full');
