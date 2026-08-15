import{k as oe}from"./index-Br_90n_2.js";var L;(function(e){e.STRING="string",e.NUMBER="number",e.INTEGER="integer",e.BOOLEAN="boolean",e.ARRAY="array",e.OBJECT="object"})(L||(L={}));/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var D;(function(e){e.LANGUAGE_UNSPECIFIED="language_unspecified",e.PYTHON="python"})(D||(D={}));var x;(function(e){e.OUTCOME_UNSPECIFIED="outcome_unspecified",e.OUTCOME_OK="outcome_ok",e.OUTCOME_FAILED="outcome_failed",e.OUTCOME_DEADLINE_EXCEEDED="outcome_deadline_exceeded"})(x||(x={}));/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $=["user","model","function","system"];var G;(function(e){e.HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",e.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",e.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",e.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",e.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT",e.HARM_CATEGORY_CIVIC_INTEGRITY="HARM_CATEGORY_CIVIC_INTEGRITY"})(G||(G={}));var q;(function(e){e.HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",e.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",e.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",e.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",e.BLOCK_NONE="BLOCK_NONE"})(q||(q={}));var F;(function(e){e.HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",e.NEGLIGIBLE="NEGLIGIBLE",e.LOW="LOW",e.MEDIUM="MEDIUM",e.HIGH="HIGH"})(F||(F={}));var H;(function(e){e.BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",e.SAFETY="SAFETY",e.OTHER="OTHER"})(H||(H={}));var _;(function(e){e.FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",e.STOP="STOP",e.MAX_TOKENS="MAX_TOKENS",e.SAFETY="SAFETY",e.RECITATION="RECITATION",e.LANGUAGE="LANGUAGE",e.BLOCKLIST="BLOCKLIST",e.PROHIBITED_CONTENT="PROHIBITED_CONTENT",e.SPII="SPII",e.MALFORMED_FUNCTION_CALL="MALFORMED_FUNCTION_CALL",e.OTHER="OTHER"})(_||(_={}));var U;(function(e){e.TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",e.RETRIEVAL_QUERY="RETRIEVAL_QUERY",e.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",e.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",e.CLASSIFICATION="CLASSIFICATION",e.CLUSTERING="CLUSTERING"})(U||(U={}));var P;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.AUTO="AUTO",e.ANY="ANY",e.NONE="NONE"})(P||(P={}));var j;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.MODE_DYNAMIC="MODE_DYNAMIC"})(j||(j={}));/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class m extends Error{constructor(t){super(`[GoogleGenerativeAI Error]: ${t}`)}}class O extends m{constructor(t,n){super(t),this.response=n}}class X extends m{constructor(t,n,s,o){super(t),this.status=n,this.statusText=s,this.errorDetails=o}}class E extends m{}class Q extends m{}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ie="https://generativelanguage.googleapis.com",ae="v1beta",re="0.24.1",ce="genai-js";var C;(function(e){e.GENERATE_CONTENT="generateContent",e.STREAM_GENERATE_CONTENT="streamGenerateContent",e.COUNT_TOKENS="countTokens",e.EMBED_CONTENT="embedContent",e.BATCH_EMBED_CONTENTS="batchEmbedContents"})(C||(C={}));class le{constructor(t,n,s,o,i){this.model=t,this.task=n,this.apiKey=s,this.stream=o,this.requestOptions=i}toString(){var t,n;const s=((t=this.requestOptions)===null||t===void 0?void 0:t.apiVersion)||ae;let i=`${((n=this.requestOptions)===null||n===void 0?void 0:n.baseUrl)||ie}/${s}/${this.model}:${this.task}`;return this.stream&&(i+="?alt=sse"),i}}function de(e){const t=[];return e!=null&&e.apiClient&&t.push(e.apiClient),t.push(`${ce}/${re}`),t.join(" ")}async function ue(e){var t;const n=new Headers;n.append("Content-Type","application/json"),n.append("x-goog-api-client",de(e.requestOptions)),n.append("x-goog-api-key",e.apiKey);let s=(t=e.requestOptions)===null||t===void 0?void 0:t.customHeaders;if(s){if(!(s instanceof Headers))try{s=new Headers(s)}catch(o){throw new E(`unable to convert customHeaders value ${JSON.stringify(s)} to Headers: ${o.message}`)}for(const[o,i]of s.entries()){if(o==="x-goog-api-key")throw new E(`Cannot set reserved header name ${o}`);if(o==="x-goog-api-client")throw new E(`Header name ${o} can only be set using the apiClient field`);n.append(o,i)}}return n}async function fe(e,t,n,s,o,i){const a=new le(e,t,n,s,i);return{url:a.toString(),fetchOptions:Object.assign(Object.assign({},pe(i)),{method:"POST",headers:await ue(a),body:o})}}async function w(e,t,n,s,o,i={},a=fetch){const{url:r,fetchOptions:c}=await fe(e,t,n,s,o,i);return he(r,c,a)}async function he(e,t,n=fetch){let s;try{s=await n(e,t)}catch(o){ge(o,e)}return s.ok||await me(s,e),s}function ge(e,t){let n=e;throw n.name==="AbortError"?(n=new Q(`Request aborted when fetching ${t.toString()}: ${e.message}`),n.stack=e.stack):e instanceof X||e instanceof E||(n=new m(`Error fetching from ${t.toString()}: ${e.message}`),n.stack=e.stack),n}async function me(e,t){let n="",s;try{const o=await e.json();n=o.error.message,o.error.details&&(n+=` ${JSON.stringify(o.error.details)}`,s=o.error.details)}catch{}throw new X(`Error fetching from ${t.toString()}: [${e.status} ${e.statusText}] ${n}`,e.status,e.statusText,s)}function pe(e){const t={};if((e==null?void 0:e.signal)!==void 0||(e==null?void 0:e.timeout)>=0){const n=new AbortController;(e==null?void 0:e.timeout)>=0&&setTimeout(()=>n.abort(),e.timeout),e!=null&&e.signal&&e.signal.addEventListener("abort",()=>{n.abort()}),t.signal=n.signal}return t}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function k(e){return e.text=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),S(e.candidates[0]))throw new O(`${y(e)}`,e);return ye(e)}else if(e.promptFeedback)throw new O(`Text not available. ${y(e)}`,e);return""},e.functionCall=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),S(e.candidates[0]))throw new O(`${y(e)}`,e);return console.warn("response.functionCall() is deprecated. Use response.functionCalls() instead."),B(e)[0]}else if(e.promptFeedback)throw new O(`Function call not available. ${y(e)}`,e)},e.functionCalls=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),S(e.candidates[0]))throw new O(`${y(e)}`,e);return B(e)}else if(e.promptFeedback)throw new O(`Function call not available. ${y(e)}`,e)},e}function ye(e){var t,n,s,o;const i=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const a of(o=(s=e.candidates)===null||s===void 0?void 0:s[0].content)===null||o===void 0?void 0:o.parts)a.text&&i.push(a.text),a.executableCode&&i.push("\n```"+a.executableCode.language+`
`+a.executableCode.code+"\n```\n"),a.codeExecutionResult&&i.push("\n```\n"+a.codeExecutionResult.output+"\n```\n");return i.length>0?i.join(""):""}function B(e){var t,n,s,o;const i=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const a of(o=(s=e.candidates)===null||s===void 0?void 0:s[0].content)===null||o===void 0?void 0:o.parts)a.functionCall&&i.push(a.functionCall);if(i.length>0)return i}const Ee=[_.RECITATION,_.SAFETY,_.LANGUAGE];function S(e){return!!e.finishReason&&Ee.includes(e.finishReason)}function y(e){var t,n,s;let o="";if((!e.candidates||e.candidates.length===0)&&e.promptFeedback)o+="Response was blocked",!((t=e.promptFeedback)===null||t===void 0)&&t.blockReason&&(o+=` due to ${e.promptFeedback.blockReason}`),!((n=e.promptFeedback)===null||n===void 0)&&n.blockReasonMessage&&(o+=`: ${e.promptFeedback.blockReasonMessage}`);else if(!((s=e.candidates)===null||s===void 0)&&s[0]){const i=e.candidates[0];S(i)&&(o+=`Candidate was blocked due to ${i.finishReason}`,i.finishMessage&&(o+=`: ${i.finishMessage}`))}return o}function v(e){return this instanceof v?(this.v=e,this):new v(e)}function Ce(e,t,n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var s=n.apply(e,t||[]),o,i=[];return o={},a("next"),a("throw"),a("return"),o[Symbol.asyncIterator]=function(){return this},o;function a(l){s[l]&&(o[l]=function(u){return new Promise(function(f,p){i.push([l,u,f,p])>1||r(l,u)})})}function r(l,u){try{c(s[l](u))}catch(f){g(i[0][3],f)}}function c(l){l.value instanceof v?Promise.resolve(l.value.v).then(d,h):g(i[0][2],l)}function d(l){r("next",l)}function h(l){r("throw",l)}function g(l,u){l(u),i.shift(),i.length&&r(i[0][0],i[0][1])}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const K=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;function Oe(e){const t=e.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),n=Ie(t),[s,o]=n.tee();return{stream:ve(s),response:_e(o)}}async function _e(e){const t=[],n=e.getReader();for(;;){const{done:s,value:o}=await n.read();if(s)return k(we(t));t.push(o)}}function ve(e){return Ce(this,arguments,function*(){const n=e.getReader();for(;;){const{value:s,done:o}=yield v(n.read());if(o)break;yield yield v(k(s))}})}function Ie(e){const t=e.getReader();return new ReadableStream({start(s){let o="";return i();function i(){return t.read().then(({value:a,done:r})=>{if(r){if(o.trim()){s.error(new m("Failed to parse stream"));return}s.close();return}o+=a;let c=o.match(K),d;for(;c;){try{d=JSON.parse(c[1])}catch{s.error(new m(`Error parsing JSON response: "${c[1]}"`));return}s.enqueue(d),o=o.substring(c[0].length),c=o.match(K)}return i()}).catch(a=>{let r=a;throw r.stack=a.stack,r.name==="AbortError"?r=new Q("Request aborted when reading from the stream"):r=new m("Error reading from the stream"),r})}}})}function we(e){const t=e[e.length-1],n={promptFeedback:t==null?void 0:t.promptFeedback};for(const s of e){if(s.candidates){let o=0;for(const i of s.candidates)if(n.candidates||(n.candidates=[]),n.candidates[o]||(n.candidates[o]={index:o}),n.candidates[o].citationMetadata=i.citationMetadata,n.candidates[o].groundingMetadata=i.groundingMetadata,n.candidates[o].finishReason=i.finishReason,n.candidates[o].finishMessage=i.finishMessage,n.candidates[o].safetyRatings=i.safetyRatings,i.content&&i.content.parts){n.candidates[o].content||(n.candidates[o].content={role:i.content.role||"user",parts:[]});const a={};for(const r of i.content.parts)r.text&&(a.text=r.text),r.functionCall&&(a.functionCall=r.functionCall),r.executableCode&&(a.executableCode=r.executableCode),r.codeExecutionResult&&(a.codeExecutionResult=r.codeExecutionResult),Object.keys(a).length===0&&(a.text=""),n.candidates[o].content.parts.push(a)}o++}s.usageMetadata&&(n.usageMetadata=s.usageMetadata)}return n}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Z(e,t,n,s){const o=await w(t,C.STREAM_GENERATE_CONTENT,e,!0,JSON.stringify(n),s);return Oe(o)}async function ee(e,t,n,s){const i=await(await w(t,C.GENERATE_CONTENT,e,!1,JSON.stringify(n),s)).json();return{response:k(i)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function te(e){if(e!=null){if(typeof e=="string")return{role:"system",parts:[{text:e}]};if(e.text)return{role:"system",parts:[e]};if(e.parts)return e.role?e:{role:"system",parts:e.parts}}}function I(e){let t=[];if(typeof e=="string")t=[{text:e}];else for(const n of e)typeof n=="string"?t.push({text:n}):t.push(n);return Re(t)}function Re(e){const t={role:"user",parts:[]},n={role:"function",parts:[]};let s=!1,o=!1;for(const i of e)"functionResponse"in i?(n.parts.push(i),o=!0):(t.parts.push(i),s=!0);if(s&&o)throw new m("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");if(!s&&!o)throw new m("No content is provided for sending chat message.");return s?t:n}function Se(e,t){var n;let s={model:t==null?void 0:t.model,generationConfig:t==null?void 0:t.generationConfig,safetySettings:t==null?void 0:t.safetySettings,tools:t==null?void 0:t.tools,toolConfig:t==null?void 0:t.toolConfig,systemInstruction:t==null?void 0:t.systemInstruction,cachedContent:(n=t==null?void 0:t.cachedContent)===null||n===void 0?void 0:n.name,contents:[]};const o=e.generateContentRequest!=null;if(e.contents){if(o)throw new E("CountTokensRequest must have one of contents or generateContentRequest, not both.");s.contents=e.contents}else if(o)s=Object.assign(Object.assign({},s),e.generateContentRequest);else{const i=I(e);s.contents=[i]}return{generateContentRequest:s}}function Y(e){let t;return e.contents?t=e:t={contents:[I(e)]},e.systemInstruction&&(t.systemInstruction=te(e.systemInstruction)),t}function Ae(e){return typeof e=="string"||Array.isArray(e)?{content:I(e)}:e}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const V=["text","inlineData","functionCall","functionResponse","executableCode","codeExecutionResult"],be={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall","executableCode","codeExecutionResult"],system:["text"]};function Te(e){let t=!1;for(const n of e){const{role:s,parts:o}=n;if(!t&&s!=="user")throw new m(`First content should be with role 'user', got ${s}`);if(!$.includes(s))throw new m(`Each item should include role field. Got ${s} but valid roles are: ${JSON.stringify($)}`);if(!Array.isArray(o))throw new m("Content should have 'parts' property with an array of Parts");if(o.length===0)throw new m("Each Content should have at least one part");const i={text:0,inlineData:0,functionCall:0,functionResponse:0,fileData:0,executableCode:0,codeExecutionResult:0};for(const r of o)for(const c of V)c in r&&(i[c]+=1);const a=be[s];for(const r of V)if(!a.includes(r)&&i[r]>0)throw new m(`Content with role '${s}' can't contain '${r}' part`);t=!0}}function J(e){var t;if(e.candidates===void 0||e.candidates.length===0)return!1;const n=(t=e.candidates[0])===null||t===void 0?void 0:t.content;if(n===void 0||n.parts===void 0||n.parts.length===0)return!1;for(const s of n.parts)if(s===void 0||Object.keys(s).length===0||s.text!==void 0&&s.text==="")return!1;return!0}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const W="SILENT_ERROR";class Ne{constructor(t,n,s,o={}){this.model=n,this.params=s,this._requestOptions=o,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=t,s!=null&&s.history&&(Te(s.history),this._history=s.history)}async getHistory(){return await this._sendPromise,this._history}async sendMessage(t,n={}){var s,o,i,a,r,c;await this._sendPromise;const d=I(t),h={safetySettings:(s=this.params)===null||s===void 0?void 0:s.safetySettings,generationConfig:(o=this.params)===null||o===void 0?void 0:o.generationConfig,tools:(i=this.params)===null||i===void 0?void 0:i.tools,toolConfig:(a=this.params)===null||a===void 0?void 0:a.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(c=this.params)===null||c===void 0?void 0:c.cachedContent,contents:[...this._history,d]},g=Object.assign(Object.assign({},this._requestOptions),n);let l;return this._sendPromise=this._sendPromise.then(()=>ee(this._apiKey,this.model,h,g)).then(u=>{var f;if(J(u.response)){this._history.push(d);const p=Object.assign({parts:[],role:"model"},(f=u.response.candidates)===null||f===void 0?void 0:f[0].content);this._history.push(p)}else{const p=y(u.response);p&&console.warn(`sendMessage() was unsuccessful. ${p}. Inspect response object for details.`)}l=u}).catch(u=>{throw this._sendPromise=Promise.resolve(),u}),await this._sendPromise,l}async sendMessageStream(t,n={}){var s,o,i,a,r,c;await this._sendPromise;const d=I(t),h={safetySettings:(s=this.params)===null||s===void 0?void 0:s.safetySettings,generationConfig:(o=this.params)===null||o===void 0?void 0:o.generationConfig,tools:(i=this.params)===null||i===void 0?void 0:i.tools,toolConfig:(a=this.params)===null||a===void 0?void 0:a.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(c=this.params)===null||c===void 0?void 0:c.cachedContent,contents:[...this._history,d]},g=Object.assign(Object.assign({},this._requestOptions),n),l=Z(this._apiKey,this.model,h,g);return this._sendPromise=this._sendPromise.then(()=>l).catch(u=>{throw new Error(W)}).then(u=>u.response).then(u=>{if(J(u)){this._history.push(d);const f=Object.assign({},u.candidates[0].content);f.role||(f.role="model"),this._history.push(f)}else{const f=y(u);f&&console.warn(`sendMessageStream() was unsuccessful. ${f}. Inspect response object for details.`)}}).catch(u=>{u.message!==W&&console.error(u)}),l}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ke(e,t,n,s){return(await w(t,C.COUNT_TOKENS,e,!1,JSON.stringify(n),s)).json()}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Me(e,t,n,s){return(await w(t,C.EMBED_CONTENT,e,!1,JSON.stringify(n),s)).json()}async function Le(e,t,n,s){const o=n.requests.map(a=>Object.assign(Object.assign({},a),{model:t}));return(await w(t,C.BATCH_EMBED_CONTENTS,e,!1,JSON.stringify({requests:o}),s)).json()}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z{constructor(t,n,s={}){this.apiKey=t,this._requestOptions=s,n.model.includes("/")?this.model=n.model:this.model=`models/${n.model}`,this.generationConfig=n.generationConfig||{},this.safetySettings=n.safetySettings||[],this.tools=n.tools,this.toolConfig=n.toolConfig,this.systemInstruction=te(n.systemInstruction),this.cachedContent=n.cachedContent}async generateContent(t,n={}){var s;const o=Y(t),i=Object.assign(Object.assign({},this._requestOptions),n);return ee(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(s=this.cachedContent)===null||s===void 0?void 0:s.name},o),i)}async generateContentStream(t,n={}){var s;const o=Y(t),i=Object.assign(Object.assign({},this._requestOptions),n);return Z(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(s=this.cachedContent)===null||s===void 0?void 0:s.name},o),i)}startChat(t){var n;return new Ne(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(n=this.cachedContent)===null||n===void 0?void 0:n.name},t),this._requestOptions)}async countTokens(t,n={}){const s=Se(t,{model:this.model,generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:this.cachedContent}),o=Object.assign(Object.assign({},this._requestOptions),n);return ke(this.apiKey,this.model,s,o)}async embedContent(t,n={}){const s=Ae(t),o=Object.assign(Object.assign({},this._requestOptions),n);return Me(this.apiKey,this.model,s,o)}async batchEmbedContents(t,n={}){const s=Object.assign(Object.assign({},this._requestOptions),n);return Le(this.apiKey,this.model,t,s)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class De{constructor(t){this.apiKey=t}getGenerativeModel(t,n){if(!t.model)throw new m("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new z(this.apiKey,t,n)}getGenerativeModelFromCachedContent(t,n,s){if(!t.name)throw new E("Cached content must contain a `name` field.");if(!t.model)throw new E("Cached content must contain a `model` field.");const o=["model","systemInstruction"];for(const a of o)if(n!=null&&n[a]&&t[a]&&(n==null?void 0:n[a])!==t[a]){if(a==="model"){const r=n.model.startsWith("models/")?n.model.replace("models/",""):n.model,c=t.model.startsWith("models/")?t.model.replace("models/",""):t.model;if(r===c)continue}throw new E(`Different value for "${a}" specified in modelParams (${n[a]}) and cachedContent (${t[a]})`)}const i=Object.assign(Object.assign({},n),{model:t.model,tools:t.tools,toolConfig:t.toolConfig,systemInstruction:t.systemInstruction,cachedContent:t});return new z(this.apiKey,i,s)}}const xe="AIzaSyCiJ4EKsxdQInVDkmN9aLo5SO0tigZwfvc";let N=null;N=new De(xe);const ne=async()=>{try{const e=await oe.getSettings(),t=(e==null?void 0:e.data)||[],n={enabled:!1,apiKey:"",defaultModel:"google/gemini-2.5-flash"};return t&&Array.isArray(t)&&t.forEach(s=>{if(s.key==="integrations.openrouter.enabled")try{n.enabled=JSON.parse(s.value)}catch{}else if(s.key==="integrations.openrouter.apiKey")try{n.apiKey=JSON.parse(s.value)}catch{}else if(s.key==="integrations.openrouter.defaultModel")try{n.defaultModel=JSON.parse(s.value)}catch{}}),n}catch(e){return console.warn("[OpenRouter Config] Failed to load settings from DB, using fallback:",e),{enabled:!1,apiKey:"",defaultModel:"google/gemini-2.5-flash"}}},A=async(e,t)=>{var s;const n=await ne();if(n.enabled&&n.apiKey){let o=(n.defaultModel||"meta-llama/llama-3.3-70b-instruct:free").replace(/^["']|["']$/g,"");o==="openrouter/free"&&(o="meta-llama/llama-3.3-70b-instruct:free");const i=[o,"meta-llama/llama-3.3-70b-instruct:free","meta-llama/llama-3.2-3b-instruct:free","nvidia/nemotron-nano-9b-v2:free"],a=Array.from(new Set(i)),r=async d=>{var u;let h;if(t){const f=t.split(",")[1]||t,p=((u=t.match(/data:([^;]+);/))==null?void 0:u[1])||"image/jpeg";h={model:d,messages:[{role:"user",content:[{type:"text",text:e},{type:"image_url",image_url:{url:`data:${p};base64,${f}`}}]}]}}else h={model:d,messages:[{role:"user",content:e}]};const g=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify(h)});if(!g.ok){const f=await g.text();throw new Error(`OpenRouter Error (${g.status}): ${f}`)}const l=await g.json();if(!l.choices||l.choices.length===0)throw new Error("OpenRouter returned an empty response.");return l.choices[0].message.content};let c=null;for(const d of a)try{return console.log(`[AI] Attempting OpenRouter call with model: ${d}`),await r(d)}catch(h){console.warn(`[AI] OpenRouter call failed with model ${d}:`,h),c=h}throw c||new Error("All OpenRouter models in the fallback queue failed.")}else{if(console.log("[AI] Using direct Gemini API fallback"),!N)throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file or enable OpenRouter AI in Settings.");let o="gemini-1.5-flash";n.defaultModel&&n.defaultModel.replace(/^["']|["']$/g,"").toLowerCase().includes("pro")&&(o="gemini-1.5-pro");const i=N.getGenerativeModel({model:o});if(t){const a=t.split(",")[1]||t,r=((s=t.match(/data:([^;]+);/))==null?void 0:s[1])||"image/jpeg",c={inlineData:{data:a,mimeType:r}};return(await i.generateContent([e,c])).response.text()}else return(await i.generateContent(e)).response.text()}},M=e=>{let t=e.replace(/```json/g,"").replace(/```/g,"").trim();const n=t.indexOf("{"),s=t.indexOf("[");let o=-1,i=-1;return n!==-1&&s!==-1?n<s?(o=n,i=t.lastIndexOf("}")):(o=s,i=t.lastIndexOf("]")):n!==-1?(o=n,i=t.lastIndexOf("}")):s!==-1&&(o=s,i=t.lastIndexOf("]")),o!==-1&&i!==-1&&i>o&&(t=t.substring(o,i+1)),JSON.parse(t)},qe=async(e,t,n,s)=>{const o=`
    You are an expert travel planner for SHRAWELLO Travel Hub.
    Create a detailed ${t}-day itinerary for a trip to ${e} for ${n}.
    The trip starts on ${s}.

    Return ONLY a JSON object with the following structure (no markdown, no extra text):
    {
      "title": "A catchy title for the trip",
      "days": [
        {
          "day": 1,
          "title": "Short title for the day (e.g. Arrival & Relax)",
          "activities": [
             {
               "time": "10:00 AM",
               "description": "Activity detail...",
               "cost": 0,
               "type": "activity" 
             }
          ]
        }
      ]
    }
  `;try{const i=await A(o);return M(i)}catch(i){throw console.error("Itinerary Generation Error:",i),i}},Fe=async e=>{const t=`
    Analyze this invoice/receipt image and extract the following details:
    1. Total Amount (numeric only)
    2. Vendor/Company Name
    3. Invoice Number / Reference ID (if any)
    4. Description of service (short summary)

    Return ONLY a JSON object:
    {
        "amount": 10500,
        "vendor": "Taj Hotels",
        "reference": "INV-998877",
        "description": "Hotel Booking for Goa Group"
    }
    `;try{const n=await A(t,e);return M(n)}catch(n){throw console.error("Invoice Parsing Failed",n),n}},He=async(e,t)=>{const n=e.map(o=>({...o,staffName:t[o.staffId]||`Staff #${o.staffId}`})),s=`
    You are a professional marketing coordinator for SHRAWELLO Travel Hub.
    Below is a JSON list of marketing logs submitted by the team for the past week:
    
    ${JSON.stringify(n)}
    
    Summarize these logs into a clean, professional, and inspiring weekly standup update.
    The update should be formatted in Markdown (using bullet points and bold highlights).
    Structure the update into these sections:
    1. 📈 **Overall Performance & Momentum**: Briefly highlight total outreach (emails, DMs, calls), total spend, total leads generated, average CPL (Cost per Lead), and revenue generated.
    2. 📢 **Marketing Activities (Paid & Organic)**: Bullet points summarizing outreach, nurturing, and Meta Ads tests/creative updates from different staff members.
    3. 💡 **Key Learnings & Experiment Insights**: What worked, what failed, and key lessons logged.
    4. 🎯 **Next Steps**: Based on the logs, recommend next steps (e.g. scale what works, fix high CPL ads).

    Ensure it's concise, professional, and ready to share on Slack/WhatsApp. Do not output JSON, return the raw markdown string directly.
    `;try{return await A(s)}catch(o){throw console.error("Weekly Standup Summary Failed",o),o}},Ue=[{id:"meta-llama/llama-3.3-70b-instruct:free",name:"Meta LLaMA 3.3 70B (Free AI)",provider:"OpenRouter"},{id:"deepseek/deepseek-r1:free",name:"DeepSeek R1 (Free Reasoning)",provider:"OpenRouter"},{id:"google/gemini-2.5-flash:free",name:"Gemini 2.5 Flash (Free AI)",provider:"OpenRouter"},{id:"qwen/qwen-2.5-coder-32b-instruct:free",name:"Qwen 2.5 Coder 32B (Free AI)",provider:"OpenRouter"},{id:"smart-logic-engine",name:"Instant Smart Reasoning Engine",provider:"Deterministic AI"}],T=(e,t,n,s,o)=>{const i=(e||"").toLowerCase(),a=(n||"").toLowerCase(),r=(s||"").toLowerCase(),c=i.includes("kashmir")||i.includes("himachal")||i.includes("swiss")||a.includes("cold")||a.includes("chilly")||a.includes("rain"),d=i.includes("bali")||i.includes("goa")||i.includes("kerala")||i.includes("maldives")||i.includes("beach")||a.includes("sunny")||a.includes("warm"),h=r.includes("trek")||r.includes("intense")||r.includes("hiking")||r.includes("adventure"),g=Math.min(t,7),l=Math.max(2,Math.min(Math.ceil(t/2),4)),u=Math.min(t+1,8),f=[{name:d?"Breathable linen shirts / tees":"Comfortable t-shirts",qty:String(g),checked:!1},{name:c?"Warm trousers / fleece-lined pants":"Comfortable trousers / shorts",qty:String(l),checked:!1},{name:"Underwear & socks",qty:String(u),checked:!1},{name:"Sleepwear / Loungewear",qty:"2",checked:!1}];c&&f.push({name:"Heavy Fleece / Down Jacket",qty:"1",checked:!1},{name:"Thermal Innerwear Sets",qty:"2",checked:!1},{name:"Woolen Beanie & Gloves",qty:"1 set",checked:!1}),d&&f.push({name:"Quick-dry Swimwear & Beach Coverups",qty:"2 sets",checked:!1},{name:"UV Protection Sunglasses",qty:"1 pair",checked:!1},{name:"Sun Hat / Visor",qty:"1",checked:!1});const p=[{name:"Travel Toothbrush & Paste",qty:"1 set",checked:!1},{name:"Shampoo & Body Wash Sachet",qty:"1 bottle",checked:!1},{name:"Deodorant / Perfume Spray",qty:"1",checked:!1},{name:d?"Sunscreen Broad Spectrum SPF50+":"Moisturizer / Lip Balm",qty:"1 bottle",checked:!1}],R=[{name:"Passport / Government ID original & copies",qty:"1 set",checked:!1},{name:"Flight Tickets & Hotel Vouchers (Printed/PDF)",qty:"1 file",checked:!1},{name:"Credit/Debit Cards & Local Cash",qty:"As needed",checked:!1},{name:"Travel Insurance Card / Policy copy",qty:"1",checked:!1}],se=[{name:"Smartphone & Fast Charger",qty:"1 set",checked:!1},{name:"Power Bank (10,000mAh+)",qty:"1",checked:!1},{name:"Universal Travel Plug Adapter",qty:"1",checked:!1}],b=[];return h?b.push({name:"Ankle-Support Trekking Boots",qty:"1 pair",checked:!1},{name:"Hydration Flask / Insulated Bottle",qty:"1 L",checked:!1},{name:"First Aid & Bandage Kit",qty:"1 pouch",checked:!1},{name:"Electrolyte Packets & Energy Bars",qty:"5 packs",checked:!1}):b.push({name:"Comfortable Walking Sneakers / Sandals",qty:"1 pair",checked:!1},{name:"Compact Daypack Backpack",qty:"1",checked:!1}),{reasoning:`Reasoning Logic (${t} Days in ${e}): Calculated ${g} tops and ${l} pants based on a ${t}-day duration rule. ${c?"Detected cold/chilly alpine climate — added thermal innerwear, down jacket, and woolen gear.":d?"Detected tropical/coastal climate — prioritized UV SPF50+, quick-dry swimwear, and breathable fabrics.":"Selected versatile smart casual wardrobe for mild climate."} ${h?"Included trekking boots, hydration flask, and emergency first aid for active terrain.":""}`,modelUsed:"Smart Reasoning Logic Engine",items:[{category:"Clothing",items:f},{category:"Toiletries",items:p},{category:"Documents & Money",items:R},{category:"Electronics",items:se},{category:h?"Outdoor & Trekking Gear":"Essentials & Meds",items:b}]}},Pe=async(e,t,n,s,o,i="meta-llama/llama-3.3-70b-instruct:free")=>{if(i==="smart-logic-engine")return T(e,t,n,s);const a=`
  You are an expert travel assistant for SHRAWELLO Travel Hub.
  Generate a detailed packing checklist for a trip to "${e}" for ${t} days.
  The weather will be: ${n}.
  The planned activity level is: ${s}.
  The trip/itinerary category is: ${o}.

  Analyze the trip duration (${t} days), destination climate (${n}), and activity profile (${s}) with careful reasoning.

  Return ONLY a valid raw JSON object formatted exactly as below (no markdown formatting, no code fences, no leading text):
  {
    "reasoning": "A concise 2-sentence logical explanation detailing why these specific clothing quantities, weather protection gear, and activity items were selected for this ${t}-day trip to ${e}.",
    "items": [
      {
        "category": "Clothing",
        "items": [
          { "name": "Light t-shirts", "qty": "5", "checked": false },
          { "name": "Comfortable jeans", "qty": "2", "checked": false }
        ]
      },
      {
        "category": "Toiletries",
        "items": [
          { "name": "Toothbrush & Paste", "qty": "1 set", "checked": false }
        ]
      },
      {
        "category": "Documents & Money",
        "items": [
          { "name": "Passport & Visas", "qty": "1 set", "checked": false }
        ]
      },
      {
        "category": "Electronics",
        "items": [
          { "name": "Power Bank 10000mAh", "qty": "1", "checked": false }
        ]
      }
    ]
  }
  `;try{const r=await ne();let c="";if(r.enabled&&r.apiKey){const h=async g=>{var f,p,R;const l=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${r.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify({model:g,messages:[{role:"user",content:a}]})});if(!l.ok)throw new Error(`OpenRouter (${l.status}): ${await l.text()}`);return((R=(p=(f=(await l.json()).choices)==null?void 0:f[0])==null?void 0:p.message)==null?void 0:R.content)||""};try{c=await h(i)}catch(g){console.warn(`[AI] Selected model ${i} failed, trying LLaMA 3.3 70B free fallback:`,g),c=await h("meta-llama/llama-3.3-70b-instruct:free")}}else c=await A(a);const d=M(c);return d&&Array.isArray(d)?{reasoning:`AI Reasoning (${t} Days in ${e}): Curated ${t}-day packing checklist for ${n} weather and ${s} activities.`,modelUsed:i,items:d}:d&&d.items&&Array.isArray(d.items)?{reasoning:d.reasoning||`AI Reasoning (${t} Days in ${e}): Customized items for ${n} and ${s}.`,modelUsed:i,items:d.items}:T(e,t,n,s,o)}catch(r){return console.warn("OpenRouter Free AI call failed, falling back to Smart Reasoning Engine:",r),T(e,t,n,s)}};export{Ue as O,He as a,Pe as b,qe as g,Fe as p};
