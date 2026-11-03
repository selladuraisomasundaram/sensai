import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { callGemini } from '@/lib/gemini';
import type {
  VideoDomain,
  LLMExtractionPayload,
  RawExtractedModule,
  QuizQuestion,
} from '@/types/course';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow sufficient compute time for heavy LLM generation

/**
 * Builds domain-specific system instruction and JSON structural contract across 5 learning pillars.
 */
function buildSystemPrompt(domain: VideoDomain): string {
  const commonQuizContract = `Each module must contain "module_quiz": 1-2 challenging multiple-choice questions:
[
  {
    "question": "Diagnostic question checking conceptual understanding?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer_index": 0,
    "explanation": "Clear diagnostic rationale."
  }
]

The root JSON object must also contain "final_quiz": 3-5 comprehensive questions evaluating mastery of the video:
[
  {
    "question": "Comprehensive trial question?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer_index": 1,
    "explanation": "Why this answer is correct."
  }
]`;

  const commonFooter = `
${commonQuizContract}

CRITICAL JSON SPECIFICATION (RFC 8259):
1. Return ONLY valid, parseable JSON. Do not wrap in markdown fences (\`\`\`json). No conversational preamble or postscript.
2. Inside strings (especially code snippets or explanations), NEVER use raw line breaks. All newlines MUST be escaped as \\n.
3. All quotes inside code strings must be escaped as \\" or written using single quotes.
4. No trailing commas anywhere in objects or arrays.
5. If the source is marked as (NO CLOSED CAPTIONS - SYLLABUS SYNTHESIS MODE), use the verified video title, runtime, chapters, and syllabus to construct a chronologically realistic, high-yield curriculum spanning the video duration with sequential start_timestamp and end_timestamp (e.g. 00:00 to 02:30, 02:30 to 05:06, etc.).`;

  // Pillar 1: technical_coding
  if (domain === 'technical_coding') {
    return `You are Sensai's Technical Curriculum Architect.
Decompose this technical programming/engineering video into 3 to 6 structured sequential lesson modules.
You must output a strictly valid JSON object adhering to this schema:

{
  "modules": [
    {
      "title": "Clear Technical Lesson Title",
      "start_timestamp": "MM:SS",
      "end_timestamp": "MM:SS",
      "architectural_objective": "Precise explanation of what system component is being constructed and why.",
      "code_blocks": [
        {
          "language": "typescript|python|rust|etc",
          "code": "executable code snippet",
          "filename": "optional/filepath.ts"
        }
      ],
      "challenge_mission": "A practical hands-on mission the student must implement in their local IDE.",
      "module_quiz": [ ... 1-2 questions ... ]
    }
  ],
  "final_quiz": [ ... 3 to 5 questions ... ]
}

${commonFooter}`;
  }

  // Pillar 2: podcast_debate
  if (domain === 'podcast_debate') {
    return `You are Sensai's Dialectic Discourse Analyst.
Decompose this podcast/interview/debate video into 3 to 6 sequential thematic argument modules.
You must output a strictly valid JSON object adhering to this schema:

{
  "modules": [
    {
      "title": "Thematic Discourse Chapter Title",
      "start_timestamp": "MM:SS",
      "end_timestamp": "MM:SS",
      "context": "Background context and debate topic being examined in this section.",
      "speaker_perspectives": [
        {
          "speaker": "Name or Persona",
          "perspective": "Their core thesis, argumentative stance, and supporting claims."
        }
      ],
      "key_takeaways": [
        "Unpacked conclusion 1",
        "Counter-argument or nuance 2"
      ],
      "module_quiz": [ ... 1-2 questions ... ]
    }
  ],
  "final_quiz": [ ... 3 to 5 questions ... ]
}

${commonFooter}`;
  }

  // Pillar 3: academic_lecture
  if (domain === 'academic_lecture') {
    return `You are Sensai's Academic Research Director.
Decompose this academic lecture into 3 to 6 structured pedagogical modules.
You must output a strictly valid JSON object adhering to this schema:

{
  "modules": [
    {
      "title": "Academic Lecture Module Title",
      "start_timestamp": "MM:SS",
      "end_timestamp": "MM:SS",
      "core_theories": ["Primary theoretical concept 1", "Theoretical concept 2"],
      "formulas_or_dates": ["Mathematical theorem/equation, historical date, or foundational law"],
      "real_world_application": "How this theoretical framework directly applies to modern systems or empirical phenomena.",
      "module_quiz": [ ... 1-2 questions ... ]
    }
  ],
  "final_quiz": [ ... 3 to 5 questions ... ]
}

${commonFooter}`;
  }

  // Pillar 4: diy_hardware
  if (domain === 'diy_hardware') {
    return `You are Sensai's Hardware Engineering Operative.
Decompose this physical hardware/electronics/maker video into 3 to 6 sequential build phases.
You must output a strictly valid JSON object adhering to this schema:

{
  "modules": [
    {
      "title": "Hardware Build Phase Title",
      "start_timestamp": "MM:SS",
      "end_timestamp": "MM:SS",
      "materials_needed": ["Specific component, gauge wire, board model, or physical tool required"],
      "step_by_step_actions": ["Precise physical action 1", "Physical action 2"],
      "safety_warnings": ["Crucial electrical, heat, chemical, or mechanical hazard precautions"],
      "troubleshooting": ["Common defect, short-circuit, or calibration fix if the step fails"],
      "module_quiz": [ ... 1-2 questions ... ]
    }
  ],
  "final_quiz": [ ... 3 to 5 questions ... ]
}

${commonFooter}`;
  }

  // Pillar 5: software_walkthrough (Figma, Notion, Excel, Blender, etc.)
  return `You are Sensai's Software Workflow Master.
Decompose this productivity/creative software walkthrough into 3 to 6 procedural mastery modules.
You must output a strictly valid JSON object adhering to this schema:

{
  "modules": [
    {
      "title": "Workflow Phase Title",
      "start_timestamp": "MM:SS",
      "end_timestamp": "MM:SS",
      "workflow_objective": "Specific end-state document, component, or data model being created in the tool.",
      "ui_navigation_steps": ["Specific menu, panel, or workspace path to navigate"],
      "keyboard_shortcuts": [
        {
          "key": "Ctrl+Shift+L / Cmd+Option+K",
          "action": "Description of the operation triggered by this hotkey"
        }
      ],
      "module_quiz": [ ... 1-2 questions ... ]
    }
  ],
  "final_quiz": [ ... 3 to 5 questions ... ]
}

${commonFooter}`;
}

/**
 * Dispatches LLM call with enforced JSON mode across OpenAI, Gemini, and Anthropic.
 */
async function callLLMWithJsonMode(
  apiKey: string,
  systemInstruction: string,
  transcriptPayload: string
): Promise<string> {
  // Branch 1: Gemini (AIza...)
  if (apiKey.startsWith('AIza')) {
    return await callGemini(
      apiKey,
      systemInstruction,
      `=== SOURCE TRANSCRIPT ===\n${transcriptPayload}`,
      true
    );
  }

  // Branch 2: Anthropic (sk-ant...)
  if (apiKey.startsWith('sk-ant')) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.2,
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: `Decompose the following video transcript into the requested JSON schema. Output ONLY valid JSON.\n\n=== TRANSCRIPT ===\n${transcriptPayload}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic LLM Extraction failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // Branch 3: OpenAI & Compatible (default)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content: `Extract the curriculum and quizzes from the following transcript into the JSON schema:\n\n${transcriptPayload}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI LLM Extraction failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Robustly sanitizes common LLM JSON defects:
 * - Extracts JSON payload between outer braces
 * - Escapes raw control characters (literal newlines, carriage returns, tabs) inside string literals
 * - Removes illegal trailing commas before closing braces/brackets
 */
function sanitizeJsonString(raw: string): string {
  let text = raw.trim();

  // Strip markdown fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Extract content between outer braces
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    } else {
      text = text.substring(firstBrace);
    }
  }

  let inString = false;
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
        result += char;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  if (inString) {
    result += '"';
  }

  // Strip trailing commas before closing brackets/braces
  result = result.replace(/,\s*([\]}])/g, '$1');
  return result;
}

/**
 * Balances unclosed brackets if an LLM output was cut off mid-generation.
 */
function repairTruncatedJson(str: string): string {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (c === '\\') {
        esc = true;
      } else if (c === '"') {
        inStr = false;
      }
    } else {
      if (c === '"') inStr = true;
      else if (c === '{') stack.push('}');
      else if (c === '[') stack.push(']');
      else if (c === '}' || c === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === c) {
          stack.pop();
        }
      }
    }
  }

  let repaired = str;
  if (inStr) repaired += '"';
  while (stack.length > 0) {
    repaired += stack.pop();
  }
  return repaired;
}

/**
 * Sanitizes and parses LLM JSON output with multi-tier fault-tolerant repair.
 */
function parseLLMResponse(rawText: string): LLMExtractionPayload {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed: any = null;

  // Attempt 1: Direct JSON.parse
  try {
    parsed = JSON.parse(cleaned);
  } catch (err1: any) {
    // Attempt 2: Sanitize control characters & trailing commas
    try {
      const sanitized = sanitizeJsonString(cleaned);
      parsed = JSON.parse(sanitized);
    } catch (err2: any) {
      // Attempt 3: Sanitize + Repair truncation
      try {
        const sanitized = sanitizeJsonString(cleaned);
        const repaired = repairTruncatedJson(sanitized);
        parsed = JSON.parse(repaired);
      } catch (err3: any) {
        console.error('Failed all JSON parse attempts. Raw snippet:', cleaned.slice(0, 400));
        throw new Error(
          `JSON parsing failed: ${err1?.message || 'Unterminated or malformed JSON structure'}`
        );
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('LLM output parsed as non-object.');
  }

  const modules: RawExtractedModule[] = Array.isArray(parsed.modules)
    ? parsed.modules
    : [];

  if (modules.length === 0) {
    throw new Error('LLM did not return any modules in the modules array.');
  }

  const final_quiz: QuizQuestion[] = Array.isArray(parsed.final_quiz)
    ? parsed.final_quiz
    : [];

  return { modules, final_quiz };
}

function parseTimestampToSeconds(ts: string | number | undefined): number {
  if (typeof ts === 'number') return Math.floor(ts);
  if (!ts || typeof ts !== 'string') return 0;
  const parts = ts.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const parsed = parseInt(ts, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Zero-Trust BYOK
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Zero-Trust Protocol: Missing Authorization Bearer token with LLM API key.' },
        { status: 401 }
      );
    }
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

    // 2. Parse request payload
    const body = await req.json().catch(() => null);
    const courseId = body?.course_id || body?.courseId;
    const domainType: VideoDomain = body?.domain_type || body?.domainType || 'technical_coding';
    const transcript = body?.transcript;
    const isAppendMode = Boolean(body?.append_mode);

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing course_id identifier in payload.' },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing transcript text in payload. Provide transcript from Phase 2 ingestion.' },
        { status: 400 }
      );
    }

    // 3. Mark course status as processing
    await supabase
      .from('courses')
      .update({ status: 'processing' })
      .eq('id', courseId);

    // 4. Build Domain-Specific Prompt & Schema
    const systemPrompt = buildSystemPrompt(domainType);

    // Squeeze transcript if excessively long (cap at 18,000 words to respect context and rate limits)
    const tokenBudgetTranscript = transcript.split(/\s+/).slice(0, 18000).join(' ');

    // 5. Invoke LLM with JSON format enforcement
    const rawLLMOutput = await callLLMWithJsonMode(apiKey, systemPrompt, tokenBudgetTranscript);

    // 6. Strict Structural Parsing
    const parsedPayload = parseLLMResponse(rawLLMOutput);

    // 7. Database Insertion: Polymorphic Modules Table Mapping
    let startOrder = 0;
    if (!isAppendMode) {
      await supabase.from('modules').delete().eq('course_id', courseId);
    } else {
      const { data: existingModules } = await supabase
        .from('modules')
        .select('module_order')
        .eq('course_id', courseId)
        .order('module_order', { ascending: false })
        .limit(1);

      if (existingModules && existingModules.length > 0) {
        startOrder = existingModules[0].module_order;
      }
    }

    const moduleInsertions = parsedPayload.modules.map((mod, index) => {
      const { module_quiz, title, ...contentPayload } = mod;

      const startSeconds = parseTimestampToSeconds(mod.start_timestamp);
      const endSeconds = parseTimestampToSeconds(mod.end_timestamp);

      return {
        course_id: courseId,
        module_order: startOrder + index + 1,
        content: {
          title: title || `Module ${startOrder + index + 1}`,
          ...contentPayload,
          start_timestamp: mod.start_timestamp || '00:00',
          end_timestamp: mod.end_timestamp || '00:00',
        },
        start_timestamp: startSeconds,
        end_timestamp: endSeconds,
        module_quiz: Array.isArray(module_quiz) ? module_quiz : [],
        is_completed: false,
      };
    });

    const { data: insertedModules, error: moduleError } = await supabase
      .from('modules')
      .insert(moduleInsertions)
      .select();

    if (moduleError) {
      console.error('Supabase module insertion failure:', moduleError);
      throw new Error(`Failed to persist modules: ${moduleError.message}`);
    }

    // 8. Update Courses Table: Final Trial Quiz & Status
    const { error: courseUpdateError } = await supabase
      .from('courses')
      .update({
        final_quiz: parsedPayload.final_quiz, // JSONB column
        status: 'completed',
      })
      .eq('id', courseId);

    if (courseUpdateError) {
      console.error('Supabase course finalization failure:', courseUpdateError);
      throw new Error(`Failed to finalize course status: ${courseUpdateError.message}`);
    }

    return NextResponse.json({
      success: true,
      courseId,
      domainType,
      status: 'completed',
      moduleCount: insertedModules?.length || moduleInsertions.length,
      finalQuizQuestionCount: parsedPayload.final_quiz.length,
    });
  } catch (err: any) {
    console.error('Curriculum extraction pipeline exception:', err);
    return NextResponse.json(
      { error: err.message || 'Fatal error during LLM curriculum extraction.' },
      { status: 500 }
    );
  }
}
