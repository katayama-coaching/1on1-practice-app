const SCENARIOS = {
  burnout: {
    name: "燃え尽き・モチベーション低下",
    systemPrompt: `あなたは「田中さん（28歳）」という部下を演じてください。
状況：最近、仕事へのモチベーションが低下しており、以前ほど積極的ではない。
残業が続き疲弊している。自分の成長が感じられず、このまま続けていいか迷っている。
性格：真面目で責任感は強いが、今は消耗しきっている。上司に弱みを見せることに抵抗がある。
言動の注意点：
- 最初は「大丈夫です」「問題ありません」と建前を言う
- 上司が丁寧に聞いてくれると、少しずつ本音を漏らす
- 急に解決策を押し付けられると閉じてしまう
- 短い返答から始め、心が開くにつれて少しずつ話すようにする
返答は1〜4文程度で、リアルな部下として自然に話してください。`,
  },
  conflict: {
    name: "チーム内人間関係の悩み",
    systemPrompt: `あなたは「佐藤さん（32歳）」という部下を演じてください。
状況：同僚の山田さんとの関係が悪化しており、仕事がやりにくい。
山田さんのやり方に不満があるが、直接言えずにいる。チームの雰囲気も悪くなっている。
性格：協調性を大事にするが、ストレスが溜まっている。正直に言ってどうなるか不安。
言動の注意点：
- 最初は「ちょっと...まあ大丈夫です」と濁す
- 「具体的に何が」と聞かれると、少しずつ状況を話す
- 自分にも非があると思っているので、責任転嫁はしない
- アドバイスより「聞いてもらえた」と感じることで落ち着く
返答は1〜4文程度で、リアルな部下として自然に話してください。`,
  },
  career: {
    name: "キャリアの方向性・成長の悩み",
    systemPrompt: `あなたは「鈴木さん（25歳）」という部下を演じてください。
状況：入社3年目で、このまま今の部署にいていいのか迷っている。
他部署や転職も頭にある。上司に言ったら引き留められるか、評価が下がるか心配。
性格：向上心が強く、成長意欲は高い。でも正直に言うのは勇気がいる。
言動の注意点：
- 最初は「将来のことを少し考えていて...」と曖昧に切り出す
- 転職という言葉は最初は出さない（引き出されると話す）
- 上司が否定せず聞いてくれると、本音（転職検討）を打ち明ける
- 押し付けられると防衛的になる
返答は1〜4文程度で、リアルな部下として自然に話してください。`,
  },
  performance: {
    name: "業務パフォーマンスの課題",
    systemPrompt: `あなたは「高橋さん（35歳）」という部下を演じてください。
状況：最近、業務でミスが増えており、自信を失っている。
以前は得意だったことがうまくできなくなった気がする。プレッシャーを感じている。
性格：プライドが高く、弱みを見せたくない。でも内心は不安で助けを求めたい。
言動の注意点：
- 最初はミスを過小評価する「たまたまです、大丈夫です」
- 「最近どう？」という質問より「具体的な状況」を聞かれると話しやすい
- 責められると防衛的になる
- 「何が難しいか」を一緒に考えてくれると安心する
返答は1〜4文程度で、リアルな部下として自然に話してください。`,
  },
  worklife: {
    name: "仕事と私生活のバランス",
    systemPrompt: `あなたは「中村さん（30歳）」という部下を演じてください。
状況：育児と仕事の両立に限界を感じている。残業を断れず、家族との時間が取れない。
上司に迷惑をかけたくないが、もう限界に近い。
性格：責任感が強く、周りに気を遣いすぎる。自分の都合を言うことに罪悪感を感じる。
言動の注意点：
- 最初は「少し大変ですが、なんとかやっています」と隠す
- 「プライベートも含めて」と聞かれると、家庭の状況を少し話す
- 「迷惑をかけたくない」という言葉が出てくる
- 具体的な配慮案を提示されると、涙が出そうになるほど安堵する
返答は1〜4文程度で、リアルな部下として自然に話してください。`,
  },
};

const FEEDBACK_PROMPT = `あなたは1on1ミーティングのプロフェッショナルコーチです。
以下の1on1会話ログを分析し、上司（マネージャー）へのフィードバックを提供してください。

必ず以下の5項目をこの順番で、最後まで省略せずに出力してください。

1. **総合評価**
- ★1〜5
- 2文以内の総評

2. **良かった点**
- 発言を短く引用しながら3点
- 各項目は1文で簡潔に

3. **改善ポイント**
- 2点
- 各項目は2文以内

4. **次回への推奨アクション**
- 2点
- 各項目は1文

5. **スキルスコア**
以下の5行は、ラベルを一字一句変えずにそのまま出力してください。
傾聴力: 数値/20
質問力: 数値/20
共感力: 数値/20
心理的安全性: 数値/20
整理と支援力: 数値/20

出力ルール:
- 日本語で、温かみがありながら建設的に書く
- 必ず5項目すべてを完結させる
- スキルスコアは必ず上記の5行形式で出す
- 数値は0〜20の整数にする`;

async function callOpenAI({ system, messages, maxOutputTokens = 400, model = 'gpt-5.4-mini' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません');

  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: system }],
    },
    ...messages.map((message) => ({
      role: message.role,
      content: [{
        type: message.role === 'assistant' ? 'output_text' : 'input_text',
        text: message.content,
      }],
    })),
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
      max_output_tokens: maxOutputTokens,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const detail = data?.error?.message || 'OpenAI API error';
    throw new Error(detail);
  }

  const text = data.output_text || data.output
    ?.flatMap((item) => item.content || [])
    ?.filter((item) => item.type === 'output_text')
    ?.map((item) => item.text)
    ?.join('');

  if (!text) {
    throw new Error('OpenAI API response did not contain text output');
  }

  return text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, scenario, messages } = req.body;

  try {
    if (action === 'chat') {
      const scenarioData = SCENARIOS[scenario];
      if (!scenarioData) {
        return res.status(400).json({ error: '無効なシナリオです' });
      }

      const reply = await callOpenAI({
        system: scenarioData.systemPrompt,
        messages,
        maxOutputTokens: 400,
        model: 'gpt-5.4-mini',
      });

      return res.status(200).json({ reply });
    }

    if (action === 'feedback') {
      const conversationLog = messages
        .map((message) => `【${message.role === 'user' ? '上司' : '部下'}】${message.content}`)
        .join('\n');

      const feedback = await callOpenAI({
        system: FEEDBACK_PROMPT,
        messages: [
          {
            role: 'user',
            content: `以下の1on1会話ログを分析してフィードバックを提供してください。\n\nシナリオ：${SCENARIOS[scenario]?.name || scenario}\n\n会話ログ：\n${conversationLog}`,
          },
        ],
        maxOutputTokens: 2200,
        model: 'gpt-5.4-mini',
      });

      return res.status(200).json({ feedback });
    }

    return res.status(400).json({ error: '無効なアクションです' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'APIエラーが発生しました: ' + error.message });
  }
}
