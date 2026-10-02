const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ScholarHub' });
});

app.listen(PORT, () => {
  console.log(`ScholarHub running on port ${PORT}`);
});
