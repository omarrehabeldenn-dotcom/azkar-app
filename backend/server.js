require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.query('SELECT 1')
  .then(() => console.log('Connected to MySQL'))
  .catch(err => console.error('DB connection failed:', err.message));

// ===== حارس التذكرة: بيتأكد إن المستخدم مسجّل دخول =====
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'لازم تسجّل دخول الأول' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'الجلسة انتهت، سجّل دخول تاني' });
  }
}

// ===== الأذكار =====
// /api/azkar?category=morning  أو  evening
app.get('/api/azkar', async (req, res) => {
  try {
    const { category } = req.query;

    if (category && !['morning', 'evening'].includes(category)) {
      return res.status(400).json({ error: 'التصنيف غير صحيح' });
    }

    const [rows] = category
      ? await db.query('SELECT * FROM azkar WHERE category = ? ORDER BY id', [category])
      : await db.query('SELECT * FROM azkar ORDER BY id');

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== المفضلة (محمية بالتذكرة) =====
app.get('/api/favorites', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.* FROM azkar a
       JOIN favorites f ON f.zekr_id = a.id
       WHERE f.user_id = ?
       ORDER BY a.id`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/favorites/:zekrId', auth, async (req, res) => {
  try {
    await db.query(
      'INSERT IGNORE INTO favorites (user_id, zekr_id) VALUES (?, ?)',
      [req.user.id, req.params.zekrId]
    );
    res.json({ message: 'اتضاف للمفضلة' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/favorites/:zekrId', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND zekr_id = ?',
      [req.user.id, req.params.zekrId]
    );
    res.json({ message: 'اتشال من المفضلة' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== تسجيل حساب جديد =====
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'كل الحقول مطلوبة' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'الباسورد لازم يكون 6 حروف على الأقل' });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );

    res.json({ message: 'تم إنشاء الحساب' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'اسم المستخدم أو الإيميل مستخدم قبل كده' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ===== تسجيل الدخول =====
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'الإيميل والباسورد مطلوبين' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'الإيميل أو الباسورد غلط' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'الإيميل أو الباسورد غلط' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});