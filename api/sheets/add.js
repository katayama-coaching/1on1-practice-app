import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, status } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:D',
    });
    const rows = existing.data.values || [];
    // メール＋アプリ名の組み合わせで重複チェック
    if (rows.some(row => row[0] === email && row[3] === '1on1練習アプリ')) {
      return res.status(200).json({ added: false });
    }

    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:D',
      valueInputOption: 'RAW',
      requestBody: { values: [[email, now, status || 'trial', '1on1練習アプリ']] },
    });

    return res.status(200).json({ added: true });
  } catch (error) {
    console.error('Sheets error:', error);
    return res.status(200).json({ added: false });
  }
}
