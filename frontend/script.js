const CIRC = 326.73; // محيط الدايرة

const card = document.getElementById('zekrCard');
const zekrText = document.getElementById('zekrText');
const tapHint = document.getElementById('tapHint');
const favBtn = document.getElementById('favBtn');
const ringFill = document.getElementById('ringFill');
const counterNum = document.getElementById('counterNum');
const progressText = document.getElementById('progressText');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const emptyMsg = document.getElementById('emptyMsg');
const counterWrap = document.querySelector('.counter-wrap');
const navBtns = document.querySelector('.nav-btns');
const welcomeText = document.getElementById('welcomeText');
const loginLink = document.getElementById('loginLink');
const logoutBtn = document.getElementById('logoutBtn');
const tabButtons = document.querySelectorAll('nav.tabs .tab');

let currentTab = 'morning';
let list = [];
let index = 0;
let remaining = {};      // المتبقي من العدّ لكل ذكر
let favIds = new Set();  // أرقام الأذكار المفضلة
let advanceTimer = null;

// ===== المستخدم =====
function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return { Authorization: 'Bearer ' + getToken() };
}

function updateUserBar() {
  const token = getToken();
  if (token) {
    welcomeText.textContent = 'أهلاً يا ' + localStorage.getItem('username');
    loginLink.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    welcomeText.textContent = '';
    loginLink.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

function forceLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  favIds = new Set();
  updateUserBar();
}

async function loadFavIds() {
  if (!getToken()) {
    favIds = new Set();
    return;
  }
  try {
    const res = await fetch('/api/favorites', { headers: authHeaders() });
    if (res.status === 401) {
      forceLogout();
      return;
    }
    const data = await res.json();
    favIds = new Set(data.map(z => z.id));
  } catch (err) {
    // نتجاهل الخطأ، النجوم بس هتفضل فاضية
  }
}

// ===== العرض =====
function showEmpty(text, withLoginLink) {
  clearTimeout(advanceTimer);
  card.classList.add('hidden');
  counterWrap.classList.add('hidden');
  navBtns.classList.add('hidden');
  progressText.textContent = '';

  emptyMsg.textContent = text;
  if (withLoginLink) {
    emptyMsg.appendChild(document.createElement('br'));
    const a = document.createElement('a');
    a.href = 'login.html';
    a.className = 'pill';
    a.textContent = 'تسجيل الدخول';
    emptyMsg.appendChild(a);
  }
  emptyMsg.classList.remove('hidden');
}

function showContent() {
  emptyMsg.classList.add('hidden');
  card.classList.remove('hidden');
  counterWrap.classList.remove('hidden');
  navBtns.classList.remove('hidden');
}

function updateCounter(zekr) {
  const rem = remaining[zekr.id];
  const total = zekr.repeat_count;

  // الدايرة بتتفرّغ كل ما العدّ يخلص
  ringFill.style.strokeDashoffset = CIRC * (1 - rem / total);
  counterNum.textContent = rem === 0 ? '✓' : rem;
  card.classList.toggle('done', rem === 0);

  if (rem === 0) {
    tapHint.textContent = 'ما شاء الله، تم الذكر ✨';
  } else {
    tapHint.textContent = total > 1 ? 'المس الذكر للعدّ' : 'المس الذكر لإتمامه';
  }
}

function render(animate) {
  const zekr = list[index];
  if (remaining[zekr.id] === undefined) {
    remaining[zekr.id] = zekr.repeat_count;
  }

  zekrText.textContent = zekr.text;
  zekrText.scrollTop = 0;
  progressText.textContent = `الذكر ${index + 1} من ${list.length}`;

  const isFav = favIds.has(zekr.id);
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.classList.toggle('active', isFav);

  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === list.length - 1;

  updateCounter(zekr);

  if (animate) {
    card.classList.remove('slide', 'pop');
    void card.offsetWidth; // يعيد تشغيل الأنيميشن
    card.classList.add('slide');
  }
}

// ===== تحميل التاب =====
async function loadTab(tab) {
  currentTab = tab;
  index = 0;
  clearTimeout(advanceTimer);

  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  try {
    if (tab === 'favorites') {
      if (!getToken()) {
        list = [];
        showEmpty('سجّل دخولك علشان تشوف أذكارك المفضلة ⭐', true);
        return;
      }

      const res = await fetch('/api/favorites', { headers: authHeaders() });
      if (res.status === 401) {
        forceLogout();
        list = [];
        showEmpty('الجلسة انتهت، سجّل دخول تاني', true);
        return;
      }

      list = await res.json();
      favIds = new Set(list.map(z => z.id));

      if (list.length === 0) {
        showEmpty('لسه مفيش أذكار في المفضلة. اضغط ⭐ على أي ذكر علشان تضيفه هنا');
        return;
      }
    } else {
      const res = await fetch('/api/azkar?category=' + tab);
      list = await res.json();
    }

    showContent();
    render(true);
  } catch (err) {
    showEmpty('حصل خطأ في تحميل الأذكار، اتأكد إن السيرفر شغال');
  }
}

// ===== الأحداث =====
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => loadTab(btn.dataset.tab));
});

// لمس الذكر = عدّ
card.addEventListener('click', () => {
  if (list.length === 0) return;

  const zekr = list[index];
  if (remaining[zekr.id] === 0) return;

  remaining[zekr.id]--;

  card.classList.remove('slide', 'pop');
  void card.offsetWidth;
  card.classList.add('pop');

  updateCounter(zekr);

  // لما الذكر يخلص ننتقل للي بعده تلقائياً
  if (remaining[zekr.id] === 0 && index < list.length - 1) {
    advanceTimer = setTimeout(() => {
      index++;
      render(true);
    }, 900);
  }
});

nextBtn.addEventListener('click', () => {
  clearTimeout(advanceTimer);
  if (index < list.length - 1) {
    index++;
    render(true);
  }
});

prevBtn.addEventListener('click', () => {
  clearTimeout(advanceTimer);
  if (index > 0) {
    index--;
    render(true);
  }
});

// المفضلة
favBtn.addEventListener('click', async (e) => {
  e.stopPropagation(); // علشان الضغط على النجمة ميتحسبش عدّ

  if (!getToken()) {
    alert('سجّل دخولك الأول علشان تستخدم المفضلة');
    window.location.href = 'login.html';
    return;
  }

  const zekr = list[index];
  const isFav = favIds.has(zekr.id);

  try {
    const res = await fetch('/api/favorites/' + zekr.id, {
      method: isFav ? 'DELETE' : 'POST',
      headers: authHeaders()
    });

    if (res.status === 401) {
      forceLogout();
      alert('الجلسة انتهت، سجّل دخول تاني');
      window.location.href = 'login.html';
      return;
    }
    if (!res.ok) return;

    if (isFav) favIds.delete(zekr.id);
    else favIds.add(zekr.id);

    // لو بنشيل ذكر وإحنا جوه تاب المفضلة، يختفي من القايمة
    if (currentTab === 'favorites' && isFav) {
      list.splice(index, 1);
      if (list.length === 0) {
        showEmpty('لسه مفيش أذكار في المفضلة. اضغط ⭐ على أي ذكر علشان تضيفه هنا');
        return;
      }
      if (index >= list.length) index = list.length - 1;
      render(true);
    } else {
      render(false);
    }
  } catch (err) {
    alert('حصل خطأ، حاول تاني');
  }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', () => {
  forceLogout();
  if (currentTab === 'favorites') {
    list = [];
    showEmpty('سجّل دخولك علشان تشوف أذكارك المفضلة ⭐', true);
  } else if (list.length > 0) {
    render(false);
  }
});

// ===== التشغيل =====
async function init() {
  updateUserBar();
  await loadFavIds();
  loadTab('morning');
}

init();