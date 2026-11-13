// Supabase Edge Function: hiểu câu tìm kiếm tự nhiên → bộ lọc quán ăn.
// App gọi qua supabase.functions.invoke('parse-query') (xem app/src/lib/api.ts → smartParse).
// Khoá Claude API nằm ở secret của Supabase, KHÔNG nằm trong app:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy parse-query
import Anthropic from 'npm:@anthropic-ai/sdk';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Body = {
  text?: string;
  categories?: { id: number; name: string }[];
  districts?: string[];
  occasions?: { key: string; label: string }[];
  amenities?: { key: string; label: string }[];
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const client = new Anthropic(); // đọc ANTHROPIC_API_KEY từ secret

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const text = (body.text ?? '').trim().slice(0, 300);
  if (!text) return json({ error: 'empty text' }, 400);

  const categories = (body.categories ?? []).slice(0, 50);
  const districts = (body.districts ?? []).slice(0, 50);
  const occasions = (body.occasions ?? []).slice(0, 20);
  const amenities = (body.amenities ?? []).slice(0, 20);

  // Lược đồ đầu ra: đúng dạng ParsedQuery của app (trừ trường source).
  const schema = {
    type: 'object',
    properties: {
      categoryId: { type: ['integer', 'null'], description: 'id danh mục phù hợp nhất, hoặc null' },
      district: { type: ['string', 'null'], description: 'một tên quận trong danh sách, hoặc null' },
      maxPrice: { type: ['integer', 'null'], description: 'giá tối đa mỗi người, đơn vị VNĐ, hoặc null' },
      openOnly: { type: 'boolean', description: 'true nếu người dùng muốn quán đang mở cửa ngay bây giờ' },
      occasion: { type: ['string', 'null'], description: 'khóa mục đích trong danh sách, hoặc null' },
      nearMe: { type: 'boolean', description: 'true nếu muốn quán gần vị trí hiện tại' },
      radiusKm: { type: ['number', 'null'], description: 'bán kính tối đa (km), hoặc null' },
      amenities: {
        type: 'array',
        items: { type: 'string' },
        description: 'các khóa tiện ích bắt buộc phải có (trong danh sách tiện ích)',
      },
      keywords: { type: 'string', description: 'tên món/tên quán cụ thể cần tìm theo chữ (vd "phở bò"), rỗng nếu không có' },
      unsupported: {
        type: 'array',
        items: { type: 'string' },
        description: 'các yêu cầu không ánh xạ được vào trường nào (vd "có view đẹp", "cho mang thú cưng")',
      },
    },
    required: ['categoryId', 'district', 'maxPrice', 'openOnly', 'occasion', 'nearMe', 'radiusKm', 'amenities', 'keywords', 'unsupported'],
    additionalProperties: false,
  };

  const system = [
    'Bạn chuyển câu tìm quán ăn tiếng Việt (TP.HCM) thành bộ lọc JSON. Chỉ dùng giá trị có trong danh sách dưới đây; không chắc thì để null.',
    `Danh mục (id: tên): ${categories.map((c) => `${c.id}: ${c.name}`).join('; ')}`,
    `Quận/huyện: ${districts.join(', ')}`,
    `Mục đích (khóa: nhãn): ${occasions.map((o) => `${o.key}: ${o.label}`).join('; ')}`,
    `Tiện ích (khóa: nhãn): ${amenities.map((a) => `${a.key}: ${a.label}`).join('; ')}`,
    'Quy ước: "200k" = 200000; nhóm từ 3 người trở lên → mục đích đi nhóm bạn; "gần tôi/gần đây" → nearMe; "trong 3 km" → radiusKm 3 và nearMe.',
    'keywords chỉ chứa tên món hoặc tên quán cụ thể, không chứa từ đã ánh xạ vào trường khác.',
  ].join('\n');

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // Việc nhỏ, cần nhanh → effort thấp. Từ chối an toàn thì tự chuyển model dự phòng.
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: text }],
    } as never);

    const msg = response as unknown as Anthropic.Message;
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') {
      return json({ error: msg.stop_reason }, 422);
    }
    const out = msg.content.find((b) => b.type === 'text');
    if (!out || out.type !== 'text') return json({ error: 'no output' }, 502);
    return json(JSON.parse(out.text));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'rate limited' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `claude ${e.status}` }, 502);
    return json({ error: 'parse failed' }, 500);
  }
});
