const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const message = document.getElementById('message');

function showMessage(text, type) {
  message.textContent = text;
  message.className = 'message ' + type;
}

// التبديل بين التابين
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  showMessage('', '');
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  showMessage('', '');
});

// إنشاء حساب
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error, 'error');
      return;
    }

    showMessage('تم إنشاء الحساب، سجّل دخول دلوقتي', 'success');
    registerForm.reset();
    tabLogin.click();
  } catch (err) {
    showMessage('السيرفر مش شغال', 'error');
  }
});

// تسجيل الدخول
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error, 'error');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = 'index.html';
  } catch (err) {
    showMessage('السيرفر مش شغال', 'error');
  }
});