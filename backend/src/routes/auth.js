// src/routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const pool    = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

function signAccess(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, organizationId: user.organization_id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function signRefresh(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Email and password must be strings' });
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  if (password.length > 128)
    return res.status(400).json({ error: 'Invalid credentials' });

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });

    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    const accessToken  = signAccess(user);
    const refreshToken = signRefresh(user);
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, hashToken(refreshToken), expiresAt]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: true, sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organization_id },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const allowedRoles = ['aide', 'teacher', 'parent'];
  const userRole = allowedRoles.includes(role) ? role : 'aide';

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);
    if (existing[0])
      return res.status(409).json({ error: 'An account with this email already exists' });

    const [orgs] = await pool.execute('SELECT id FROM organizations LIMIT 1');
    const orgId = orgs[0]?.id || 1;
    const passwordHash = await bcrypt.hash(password, 12);
    const name = `${firstName.trim()} ${lastName.trim()}`;

    const [result] = await pool.execute(
      'INSERT INTO users (organization_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [orgId, name, email.toLowerCase().trim(), passwordHash, userRole]
    );
    return res.status(201).json({ message: 'Account created successfully', userId: result.insertId });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/join ───────────────────────────────────────────────────────
// After registration, user enters a code to link to a class or student.
// Class code  → teacher sees all students in org
// Student code → parent sees only that student
router.post('/join', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string')
    return res.status(400).json({ error: 'Code is required' });

  const clean = code.trim().toUpperCase();

  try {
    // Check class code (teacher)
    const [orgs] = await pool.execute(
      'SELECT id, name FROM organizations WHERE class_code = ? LIMIT 1', [clean]
    );
    if (orgs[0]) {
      const org = orgs[0];
      // Update user org and role
      await pool.execute(
        `UPDATE users SET organization_id = ?,
          role = CASE WHEN role IN ('aide','parent') THEN 'teacher' ELSE role END
         WHERE id = ?`,
        [org.id, req.user.id]
      );
      // Assign ALL students in this org to the teacher so they can see them
      const [students] = await pool.execute(
        'SELECT id FROM students WHERE organization_id = ?', [org.id]
      );
      for (const s of students) {
        await pool.execute(
          'INSERT IGNORE INTO student_assignments (student_id, user_id) VALUES (?, ?)',
          [s.id, req.user.id]
        );
      }
      return res.json({ type: 'class', message: `Joined ${org.name} as teacher`, orgName: org.name });
    }

    // Check student/parent code
    const [students] = await pool.execute(
      'SELECT id, first_name, last_name, organization_id FROM students WHERE parent_code = ? LIMIT 1', [clean]
    );
    if (students[0]) {
      const s = students[0];
      await pool.execute(
        'INSERT IGNORE INTO student_assignments (student_id, user_id) VALUES (?, ?)', [s.id, req.user.id]
      );
      await pool.execute(
        `UPDATE users SET organization_id = ?,
          role = CASE WHEN role NOT IN ('admin','bcba','teacher') THEN 'parent' ELSE role END
         WHERE id = ?`,
        [s.organization_id, req.user.id]
      );
      return res.json({ type: 'student', message: `Linked to ${s.first_name} ${s.last_name}`, studentName: `${s.first_name} ${s.last_name}` });
    }

    return res.status(404).json({ error: 'Invalid code. Please check with your administrator.' });
  } catch (err) {
    console.error('Join error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/codes ───────────────────────────────────────────────────────
// Admin/BCBA: get class code + all student parent codes
router.get('/codes', requireAuth, async (req, res) => {
  if (!['admin', 'bcba'].includes(req.user.role))
    return res.status(403).json({ error: 'Admin only' });
  try {
    const [orgs] = await pool.execute(
      'SELECT class_code FROM organizations WHERE id = ? LIMIT 1', [req.user.organizationId]
    );
    const [students] = await pool.execute(
      'SELECT id, first_name, last_name, parent_code FROM students WHERE organization_id = ? ORDER BY first_name',
      [req.user.organizationId]
    );
    return res.json({ classCode: orgs[0]?.class_code || null, students });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const [rows] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND revoked = FALSE AND expires_at > NOW() LIMIT 1',
      [payload.id, hashToken(token)]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Refresh token invalid or expired' });

    const [users] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [payload.id]);
    const user = users[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    await pool.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [hashToken(token)]);

    const newAccess  = signAccess(user);
    const newRefresh = signRefresh(user);
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, hashToken(newRefresh), expiresAt]
    );

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true, secure: true, sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken: newAccess });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      await pool.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [hashToken(token)]);
    } catch (_) {}
  }
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, organization_id, preferences, last_login FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;