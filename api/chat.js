const scenarioProfiles = {
  burnout: {
    name: '燃え尽き・モチベーション低下',
    persona: '田中さん（28歳）',
    context: '残業が続き、以前より反応が薄くなっている部下です。最初は「問題ない」と言いがちです。',
    traits: 'まじめで責任感が強い。弱音をそのままは言いにくい。少しずつ本音が出る。',
    opening: 'あ、部長、お時間いただいてありがとうございます。えっと...特に何も問題はないんですが、1on1ということで...'
  },
  conflict: {
    name: 'チーム内人間関係の悩み',
    persona: '佐藤さん（32歳）',
    context: '同僚との関係が悪化し、仕事のしづらさとストレスが高まっています。',
    traits: '感情を強くぶつけるタイプではない。空気を読みながら慎重に話す。',
    opening: 'はい、呼んでいただいてありがとうございます。えーと...何でしょうか？'
  },
  career: {
    name: 'キャリアの方向性・成長の悩み',
    persona: '鈴木さん（25歳）',
    context: '入社3年目前後で、このまま今の部署にいてよいのか迷い始めています。',
    traits: 'すぐに転職したいわけではないが、将来像が見えず曖昧な不安がある。',
    opening: 'あ、はい。お時間ありがとうございます。実は、少し相談したいことがあって...'
  },
  performance: {
    name: '業務パフォーマンスの課題',
    persona: '高橋さん（35歳）',
    context: '最近のミス増加で自信を失い、プライドもあり弱みを出しづらい状態です。',
    traits: '能力不足だと思われたくなくて、防御的になりやすい。',
    opening: '失礼します。呼んでいただきましたが...何かありましたでしょうか？'
  },
  worklife: {
    name: '仕事と私生活のバランス',
    persona: '中村さん（30歳）',
    context: '仕事と家庭の両立に限界を感じつつも、迷惑をかけたくない思いが強い部下です。',
    traits: '周りに迷惑をかけたくない。助かる提案でもすぐに飛びつかず、現実的な不安を返す。',
    opening: 'お時間いただいてありがとうございます。最近はまあ、なんとかやっています。'
  }
};

function getJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function buildTranscript(messages, opening) {
  const lines = [];
  if (opening) lines.push(`部下: ${opening}`);
  for (const message of messages || []) {
    if (!message || !message.content) continue;
    const speaker = message.role === 'user' ? '上司' : '部下';
    lines.push(`${speaker}: ${message.content}`);
  }
  return lines.join('\n');
}

function extractReply(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const outputs = Array.isArray(data.output) ? data.output : [];
  for (const item of outputs) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = getJsonBody(req);
  const { action, scenario, messages } = body;

  if (action !== 'chat') {
    res.status(400).json({ error: 'Unsupported action' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    return;
  }

  const profile = scenarioProfiles[scenario] || scenarioProfiles.burnout;
  const baseUrl = (process.env.BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.CASE_PRACTICE_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';

  const systemPrompt = [
    `あなたは1on1中の部下役です。名前は${profile.persona}です。`,
    `ケース: ${profile.name}`,
    `状況: ${profile.context}`,
    `性格・話し方: ${profile.traits}`,
    '必ず部下として自然な日本語で返答してください。',
    '上司を指導したり、会話の進め方を解説したりしないでください。',
    '1回の返答は1〜3文、長すぎない自然な会話にしてください。',
    '上司の質問や提案に対して、部下として現実的に受け答えしてください。',
    '助言や結論を急がれたら、助かる気持ちと同時に、すぐ決めにくい事情や気持ちを自然に返してください。',
    'すでに話した内容は繰り返しすぎず、少しずつ具体化してください。'
  ].join('\n');

  const userPrompt = [
    '以下は1on1の会話履歴です。',
    buildTranscript(messages, profile.opening),
    '',
    '次に、部下として自然に一言返してください。'
  ].join('\n');

  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }]
          }
        ],
        reasoning: { effort: 'minimal' },
        text: { verbosity: 'low' },
        max_output_tokens: 180
      })
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || 'OpenAI API error' });
      return;
    }

    const reply = extractReply(data);
    if (!reply) {
      res.status(502).json({ error: 'Empty reply from OpenAI' });
      return;
    }

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unexpected server error' });
  }
};
