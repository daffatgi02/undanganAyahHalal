/**
 * server.js — Undangan Halal Bihalal
 * Simple Express backend with JSON-based ephemeral guest storage
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3005;
const GUESTS_FILE = path.join(__dirname, 'data', 'guests.json');

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname)); // Serve CSS, JS, Assets

// ── JSON Helpers ───────────────────────────────────────────
function readGuests() {
    try {
        const raw = fs.readFileSync(GUESTS_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeGuests(guests) {
    fs.writeFileSync(GUESTS_FILE, JSON.stringify(guests, null, 2), 'utf-8');
}

function generateSlug() {
    return crypto.randomBytes(4).toString('hex'); // e.g. "a3f9bc12"
}

// ── Routes: API ────────────────────────────────────────────

// GET /api/guests — list all guests (for admin)
app.get('/api/guests', (req, res) => {
    res.json(readGuests());
});

// GET /api/guest/:slug — get single guest info (for invitation page)
app.get('/api/guest/:slug', (req, res) => {
    const guests = readGuests();
    const guest = guests.find(g => g.slug === req.params.slug);
    if (!guest) return res.status(404).json({ error: 'Tamu tidak ditemukan' });
    res.json({ name: guest.name });
});

// POST /api/guests — create new guest invitation
app.post('/api/guests', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nama tidak boleh kosong' });
    }

    const guests = readGuests();

    // Generate a unique slug
    let slug;
    do { slug = generateSlug(); } while (guests.find(g => g.slug === slug));

    const newGuest = {
        id: Date.now(),
        slug,
        name: name.trim(),
        createdAt: new Date().toISOString()
    };

    guests.push(newGuest);
    writeGuests(guests);

    res.status(201).json(newGuest);
});

// DELETE /api/guests/:slug — delete a guest invitation
app.delete('/api/guests/:slug', (req, res) => {
    let guests = readGuests();
    const initial = guests.length;
    guests = guests.filter(g => g.slug !== req.params.slug);
    if (guests.length === initial) {
        return res.status(404).json({ error: 'Tamu tidak ditemukan' });
    }
    writeGuests(guests);
    res.json({ success: true });
});

// ── Routes: Pages ──────────────────────────────────────────

// GET /admin — serve admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// GET /inv/:slug — serve the invitation page
app.get('/inv/:slug', (req, res) => {
    // Validate that the slug exists before serving the page
    const guests = readGuests();
    const guest = guests.find(g => g.slug === req.params.slug);
    if (!guest) {
        return res.status(404).send(`
            <!DOCTYPE html><html lang="id"><head>
            <meta charset="UTF-8"><title>Undangan Tidak Ditemukan</title>
            <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#062b20;color:#e8d5a3;text-align:center;}</style>
            </head><body>
            <div><h2>🌙 Link undangan tidak valid</h2><p>Silakan hubungi panitia untuk mendapatkan link yang benar.</p></div>
            </body></html>
        `);
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// GET / — redirect to admin
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  Server berjalan di http://localhost:${PORT}`);
    console.log(`📋  Admin panel: http://localhost:${PORT}/admin`);
    console.log(`📨  Contoh undangan: http://localhost:${PORT}/inv/<slug>\n`);
});
