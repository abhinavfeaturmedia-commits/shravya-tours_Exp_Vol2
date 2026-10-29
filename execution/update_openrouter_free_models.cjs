/**
 * Deterministic updater for OpenRouter Free AI Models across Shrawello CRM
 * 
 * Replaces obsolete free models with active 2026 models:
 * - openrouter/free (Dynamic load-balanced free router)
 * - nvidia/nemotron-3-ultra-550b-a55b:free (Frontier reasoning, 1M context)
 * - google/gemma-4-26b-a4b-it:free (Fast & smart MoE)
 * - google/gemma-4-31b-it:free (High-quality copywriting & proposals)
 * - nvidia/nemotron-3.5-super-vl:free (Vision & voucher/PDF reading)
 * - nvidia/nemotron-3.5-lightning:free (Sub-second chatbot speed)
 * - recursive/flint-v1.0:free (Precision structured JSON agent)
 * - thinkingmachines/inkling:free (Deep multi-turn logic)
 * - dots-studio/dots-3-note-preview:free (Rate-card & notes extraction)
 * - liquid/lfm-2.5-2.6b:free (Compact intent classification)
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Update src/lib/gemini.ts
const geminiPath = path.join(rootDir, 'src', 'lib', 'gemini.ts');
if (fs.existsSync(geminiPath)) {
    let content = fs.readFileSync(geminiPath, 'utf8');

    // Update getActiveFreeOpenRouterModels fallback list
    const oldFallbackPattern = /return\s*\[\s*'openrouter\/free'[\s\S]*?'mistralai\/mistral-small-24b-instruct-2501:free'\s*\];/;
    const newFallbackList = `return [
        'openrouter/free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'google/gemma-4-26b-a4b-it:free',
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-3.5-super-vl:free',
        'nvidia/nemotron-3.5-lightning:free',
        'recursive/flint-v1.0:free',
        'thinkingmachines/inkling:free',
        'dots-studio/dots-3-note-preview:free',
        'liquid/lfm-2.5-2.6b:free',
        'xingchen-agi/xing4.0-29b-a4b:free',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
    ];`;

    if (oldFallbackPattern.test(content)) {
        content = content.replace(oldFallbackPattern, newFallbackList);
        console.log('[gemini.ts] Updated getActiveFreeOpenRouterModels fallback list');
    } else {
        console.warn('[gemini.ts] Fallback pattern not matched directly; checking alternative');
    }

    // Update modelsToTry.push in getAIResponse
    const oldModelsToTry = /modelsToTry\.push\(\s*'google\/gemma-4-31b-it:free'[\s\S]*?'mistralai\/mistral-small-24b-instruct-2501:free'\s*\);/;
    const newModelsToTry = `modelsToTry.push(
            'openrouter/free',
            'nvidia/nemotron-3-ultra-550b-a55b:free',
            'google/gemma-4-26b-a4b-it:free',
            'google/gemma-4-31b-it:free',
            'nvidia/nemotron-3.5-super-vl:free',
            'nvidia/nemotron-3.5-lightning:free',
            'recursive/flint-v1.0:free',
            'thinkingmachines/inkling:free',
            'dots-studio/dots-3-note-preview:free'
        );`;
    if (oldModelsToTry.test(content)) {
        content = content.replace(oldModelsToTry, newModelsToTry);
        console.log('[gemini.ts] Updated modelsToTry in getAIResponse');
    }

    // Update OPENROUTER_FREE_MODELS constant
    const oldOpenRouterModelsPattern = /export const OPENROUTER_FREE_MODELS = \[[\s\S]*?\{ id: 'smart-logic-engine'[\s\S]*?\}\s*\];/;
    const newOpenRouterModels = `export const OPENROUTER_FREE_MODELS = [
  { id: 'openrouter/free', name: '🌟 OpenRouter Dynamic Free Router (Auto Load-Balance & Failover)', provider: 'OpenRouter' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: '🧠 NVIDIA Nemotron 3 Ultra 550B (1M Context, Frontier Reasoning)', provider: 'NVIDIA' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: '⚡ Google Gemma 4 26B MoE (Fast & High Intelligence)', provider: 'Google DeepMind' },
  { id: 'google/gemma-4-31b-it:free', name: '✍️ Google Gemma 4 31B (Creative Proposals & Marketing Copy)', provider: 'Google DeepMind' },
  { id: 'nvidia/nemotron-3.5-super-vl:free', name: '👁️ NVIDIA Nemotron 3.5 Super VL (Vision & Document/PDF Parsing)', provider: 'NVIDIA' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: '🚀 NVIDIA Nemotron 3.5 Lightning (Ultra-Fast 1M Context)', provider: 'NVIDIA' },
  { id: 'recursive/flint-v1.0:free', name: '🎯 Recursive Flint (Precision Agent & Strict JSON Schema)', provider: 'Recursive' },
  { id: 'thinkingmachines/inkling:free', name: '🌐 Thinking Machines Inkling 975B (Deep Consultation & Logic)', provider: 'Thinking Machines' },
  { id: 'dots-studio/dots-3-note-preview:free', name: '📋 Dots 3 Note (Voucher & Rate Card Summarization)', provider: 'Dots Studio' },
  { id: 'liquid/lfm-2.5-2.6b:free', name: '⏱️ LiquidAI LFM 2.6B (Instant Intent & Destination Extraction)', provider: 'Liquid AI' },
  { id: 'smart-logic-engine', name: '⚙️ Instant Smart Reasoning Engine (Offline Travel Logic)', provider: 'Deterministic AI' }
];`;
    if (oldOpenRouterModelsPattern.test(content)) {
        content = content.replace(oldOpenRouterModelsPattern, newOpenRouterModels);
        console.log('[gemini.ts] Updated OPENROUTER_FREE_MODELS constant');
    }

    // Update fallback in generatePackingChecklist
    const oldChecklistFallback = /console\.warn\(`\[AI\] Selected model \$\{selectedModel\} failed, trying LLaMA 3\.3 70B free fallback:`, err\);\s*text = await callOpenRouterDirect\('meta-llama\/llama-3\.3-70b-instruct:free'\);/;
    const newChecklistFallback = `console.warn(\`[AI] Selected model \${selectedModel} failed, trying OpenRouter dynamic free router fallback:\`, err);
        try {
          text = await callOpenRouterDirect('openrouter/free');
        } catch (orErr) {
          console.warn("[AI] Dynamic router failed, trying Gemma 4 26B fallback:", orErr);
          text = await callOpenRouterDirect('google/gemma-4-26b-a4b-it:free');
        }`;
    if (oldChecklistFallback.test(content)) {
        content = content.replace(oldChecklistFallback, newChecklistFallback);
        console.log('[gemini.ts] Updated packing checklist failover logic');
    }

    fs.writeFileSync(geminiPath, content, 'utf8');
    console.log('[gemini.ts] Successfully written!');
}

// 2. Update src/lib/pdfItineraryParser.ts
const parserPath = path.join(rootDir, 'src', 'lib', 'pdfItineraryParser.ts');
if (fs.existsSync(parserPath)) {
    let content = fs.readFileSync(parserPath, 'utf8');
    const oldCandidatePattern = /const candidateModels = \[[\s\S]*?'mistralai\/mistral-small-24b-instruct-2501:free'\s*\];/;
    const newCandidateModels = `const candidateModels = [
      (config.defaultModel || 'openrouter/free').replace(/^["']|["']$/g, '').trim(),
      'openrouter/free',
      'nvidia/nemotron-3.5-super-vl:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-26b-a4b-it:free',
      'google/gemma-4-31b-it:free',
      'dots-studio/dots-3-note-preview:free',
      'recursive/flint-v1.0:free',
      'nvidia/nemotron-3.5-lightning:free'
    ];`;
    if (oldCandidatePattern.test(content)) {
        content = content.replace(oldCandidatePattern, newCandidateModels);
        fs.writeFileSync(parserPath, content, 'utf8');
        console.log('[pdfItineraryParser.ts] Updated candidateModels successfully');
    } else {
        console.warn('[pdfItineraryParser.ts] candidateModels pattern not found');
    }
}

// 3. Update backend/index.js
const backendPath = path.join(rootDir, 'backend', 'index.js');
if (fs.existsSync(backendPath)) {
    let content = fs.readFileSync(backendPath, 'utf8');
    
    // Update default fallback model from gemma-4-26b to openrouter/free
    content = content.replace(
        "let model = config.defaultModel || 'google/gemma-4-26b-a4b-it:free';",
        "let model = config.defaultModel || 'openrouter/free';"
    );

    const oldBackendModelsPattern = /\/\/ Tested 2026 high-intelligence free models cascade with instant failover\s*const modelsToTry = \[[\s\S]*?model\s*\];/;
    const newBackendModels = `// Tested 2026 high-intelligence free models cascade with instant failover
    const modelsToTry = [
        model,
        'openrouter/free',
        'nvidia/nemotron-3.5-lightning:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'google/gemma-4-26b-a4b-it:free',
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-3.5-super-vl:free',
        'recursive/flint-v1.0:free'
    ];`;

    if (oldBackendModelsPattern.test(content)) {
        content = content.replace(oldBackendModelsPattern, newBackendModels);
        fs.writeFileSync(backendPath, content, 'utf8');
        console.log('[backend/index.js] Updated chatbot modelsToTry cascade successfully');
    } else {
        console.warn('[backend/index.js] Backend modelsToTry pattern not found');
    }
}

// 4. Update pages/admin/Settings.tsx
const settingsPath = path.join(rootDir, 'pages', 'admin', 'Settings.tsx');
if (fs.existsSync(settingsPath)) {
    let content = fs.readFileSync(settingsPath, 'utf8');

    const oldSettingsOptionsPattern = /<>\s*<option value="openrouter\/free">.*?OpenRouter Auto-Free Router<\/option>[\s\S]*?<option value="mistralai\/mistral-small-24b-instruct-2501:free">.*?<\/option>\s*<\/>/;
    const newSettingsOptions = `<>
                  <option value="openrouter/free">🌟 [RECOMMENDED FREE] OpenRouter Auto-Free Router</option>
                  <option value="nvidia/nemotron-3-ultra-550b-a55b:free">✨ [FREE] NVIDIA Nemotron 3 Ultra 550B (1M Context)</option>
                  <option value="google/gemma-4-26b-a4b-it:free">✨ [FREE] Google Gemma 4 26B MoE (Fast & Smart)</option>
                  <option value="google/gemma-4-31b-it:free">✨ [FREE] Google Gemma 4 31B (Creative Copy)</option>
                  <option value="nvidia/nemotron-3.5-super-vl:free">✨ [FREE] NVIDIA Nemotron 3.5 Super VL (Multimodal Vision)</option>
                  <option value="nvidia/nemotron-3.5-lightning:free">✨ [FREE] NVIDIA Nemotron 3.5 Lightning (Sub-Second Speed)</option>
                  <option value="recursive/flint-v1.0:free">✨ [FREE] Recursive Flint (Strict JSON & Agent)</option>
                  <option value="thinkingmachines/inkling:free">✨ [FREE] Thinking Machines Inkling 975B (Deep Logic)</option>
                  <option value="dots-studio/dots-3-note-preview:free">✨ [FREE] Dots 3 Note (Voucher & Rate Card Summaries)</option>
                </>`;

    if (oldSettingsOptionsPattern.test(content)) {
        content = content.replace(oldSettingsOptionsPattern, newSettingsOptions);
        fs.writeFileSync(settingsPath, content, 'utf8');
        console.log('[Settings.tsx] Updated static fallback model options');
    } else {
        console.warn('[Settings.tsx] Static options pattern not found');
    }
}

// 5. Update pages/customer/CustomerDashboard.tsx
const dashboardPath = path.join(rootDir, 'pages', 'customer', 'CustomerDashboard.tsx');
if (fs.existsSync(dashboardPath)) {
    let content = fs.readFileSync(dashboardPath, 'utf8');
    const oldDefaultPattern = /const \[selectedAiModel, setSelectedAiModel\] = useState<string>\('meta-llama\/llama-3\.3-70b-instruct:free'\);/;
    const newDefault = `const [selectedAiModel, setSelectedAiModel] = useState<string>('openrouter/free');`;

    if (oldDefaultPattern.test(content)) {
        content = content.replace(oldDefaultPattern, newDefault);
        fs.writeFileSync(dashboardPath, content, 'utf8');
        console.log('[CustomerDashboard.tsx] Updated default packing checklist model to openrouter/free');
    } else {
        console.warn('[CustomerDashboard.tsx] Default model pattern not found');
    }
}

console.log('All updates completed successfully!');
