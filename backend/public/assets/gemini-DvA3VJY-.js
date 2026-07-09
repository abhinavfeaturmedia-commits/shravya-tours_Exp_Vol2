import{i as Z}from"./index-C3iJvRyL.js";var T;(function(t){t.STRING="string",t.NUMBER="number",t.INTEGER="integer",t.BOOLEAN="boolean",t.ARRAY="array",t.OBJECT="object"})(T||(T={}));/**
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
 */var b;(function(t){t.LANGUAGE_UNSPECIFIED="language_unspecified",t.PYTHON="python"})(b||(b={}));var M;(function(t){t.OUTCOME_UNSPECIFIED="outcome_unspecified",t.OUTCOME_OK="outcome_ok",t.OUTCOME_FAILED="outcome_failed",t.OUTCOME_DEADLINE_EXCEEDED="outcome_deadline_exceeded"})(M||(M={}));/**
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
 */const L=["user","model","function","system"];var x;(function(t){t.HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",t.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",t.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",t.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",t.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT",t.HARM_CATEGORY_CIVIC_INTEGRITY="HARM_CATEGORY_CIVIC_INTEGRITY"})(x||(x={}));var D;(function(t){t.HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",t.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",t.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",t.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",t.BLOCK_NONE="BLOCK_NONE"})(D||(D={}));var G;(function(t){t.HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",t.NEGLIGIBLE="NEGLIGIBLE",t.LOW="LOW",t.MEDIUM="MEDIUM",t.HIGH="HIGH"})(G||(G={}));var $;(function(t){t.BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",t.SAFETY="SAFETY",t.OTHER="OTHER"})($||($={}));var O;(function(t){t.FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",t.STOP="STOP",t.MAX_TOKENS="MAX_TOKENS",t.SAFETY="SAFETY",t.RECITATION="RECITATION",t.LANGUAGE="LANGUAGE",t.BLOCKLIST="BLOCKLIST",t.PROHIBITED_CONTENT="PROHIBITED_CONTENT",t.SPII="SPII",t.MALFORMED_FUNCTION_CALL="MALFORMED_FUNCTION_CALL",t.OTHER="OTHER"})(O||(O={}));var k;(function(t){t.TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",t.RETRIEVAL_QUERY="RETRIEVAL_QUERY",t.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",t.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",t.CLASSIFICATION="CLASSIFICATION",t.CLUSTERING="CLUSTERING"})(k||(k={}));var H;(function(t){t.MODE_UNSPECIFIED="MODE_UNSPECIFIED",t.AUTO="AUTO",t.ANY="ANY",t.NONE="NONE"})(H||(H={}));var U;(function(t){t.MODE_UNSPECIFIED="MODE_UNSPECIFIED",t.MODE_DYNAMIC="MODE_DYNAMIC"})(U||(U={}));/**
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
 */class h extends Error{constructor(e){super(`[GoogleGenerativeAI Error]: ${e}`)}}class m extends h{constructor(e,n){super(e),this.response=n}}class J extends h{constructor(e,n,o,s){super(e),this.status=n,this.statusText=o,this.errorDetails=s}}class _ extends h{}class V extends h{}/**
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
 */const tt="https://generativelanguage.googleapis.com",et="v1beta",nt="0.24.1",ot="genai-js";var y;(function(t){t.GENERATE_CONTENT="generateContent",t.STREAM_GENERATE_CONTENT="streamGenerateContent",t.COUNT_TOKENS="countTokens",t.EMBED_CONTENT="embedContent",t.BATCH_EMBED_CONTENTS="batchEmbedContents"})(y||(y={}));class st{constructor(e,n,o,s,i){this.model=e,this.task=n,this.apiKey=o,this.stream=s,this.requestOptions=i}toString(){var e,n;const o=((e=this.requestOptions)===null||e===void 0?void 0:e.apiVersion)||et;let i=`${((n=this.requestOptions)===null||n===void 0?void 0:n.baseUrl)||tt}/${o}/${this.model}:${this.task}`;return this.stream&&(i+="?alt=sse"),i}}function it(t){const e=[];return t!=null&&t.apiClient&&e.push(t.apiClient),e.push(`${ot}/${nt}`),e.join(" ")}async function at(t){var e;const n=new Headers;n.append("Content-Type","application/json"),n.append("x-goog-api-client",it(t.requestOptions)),n.append("x-goog-api-key",t.apiKey);let o=(e=t.requestOptions)===null||e===void 0?void 0:e.customHeaders;if(o){if(!(o instanceof Headers))try{o=new Headers(o)}catch(s){throw new _(`unable to convert customHeaders value ${JSON.stringify(o)} to Headers: ${s.message}`)}for(const[s,i]of o.entries()){if(s==="x-goog-api-key")throw new _(`Cannot set reserved header name ${s}`);if(s==="x-goog-api-client")throw new _(`Header name ${s} can only be set using the apiClient field`);n.append(s,i)}}return n}async function rt(t,e,n,o,s,i){const a=new st(t,e,n,o,i);return{url:a.toString(),fetchOptions:Object.assign(Object.assign({},ut(i)),{method:"POST",headers:await at(a),body:s})}}async function R(t,e,n,o,s,i={},a=fetch){const{url:r,fetchOptions:c}=await rt(t,e,n,o,s,i);return ct(r,c,a)}async function ct(t,e,n=fetch){let o;try{o=await n(t,e)}catch(s){lt(s,t)}return o.ok||await dt(o,t),o}function lt(t,e){let n=t;throw n.name==="AbortError"?(n=new V(`Request aborted when fetching ${e.toString()}: ${t.message}`),n.stack=t.stack):t instanceof J||t instanceof _||(n=new h(`Error fetching from ${e.toString()}: ${t.message}`),n.stack=t.stack),n}async function dt(t,e){let n="",o;try{const s=await t.json();n=s.error.message,s.error.details&&(n+=` ${JSON.stringify(s.error.details)}`,o=s.error.details)}catch{}throw new J(`Error fetching from ${e.toString()}: [${t.status} ${t.statusText}] ${n}`,t.status,t.statusText,o)}function ut(t){const e={};if((t==null?void 0:t.signal)!==void 0||(t==null?void 0:t.timeout)>=0){const n=new AbortController;(t==null?void 0:t.timeout)>=0&&setTimeout(()=>n.abort(),t.timeout),t!=null&&t.signal&&t.signal.addEventListener("abort",()=>{n.abort()}),e.signal=n.signal}return e}/**
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
 */function S(t){return t.text=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length>1&&console.warn(`This response had ${t.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),A(t.candidates[0]))throw new m(`${C(t)}`,t);return ft(t)}else if(t.promptFeedback)throw new m(`Text not available. ${C(t)}`,t);return""},t.functionCall=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length>1&&console.warn(`This response had ${t.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),A(t.candidates[0]))throw new m(`${C(t)}`,t);return console.warn("response.functionCall() is deprecated. Use response.functionCalls() instead."),j(t)[0]}else if(t.promptFeedback)throw new m(`Function call not available. ${C(t)}`,t)},t.functionCalls=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length>1&&console.warn(`This response had ${t.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),A(t.candidates[0]))throw new m(`${C(t)}`,t);return j(t)}else if(t.promptFeedback)throw new m(`Function call not available. ${C(t)}`,t)},t}function ft(t){var e,n,o,s;const i=[];if(!((n=(e=t.candidates)===null||e===void 0?void 0:e[0].content)===null||n===void 0)&&n.parts)for(const a of(s=(o=t.candidates)===null||o===void 0?void 0:o[0].content)===null||s===void 0?void 0:s.parts)a.text&&i.push(a.text),a.executableCode&&i.push("\n```"+a.executableCode.language+`
`+a.executableCode.code+"\n```\n"),a.codeExecutionResult&&i.push("\n```\n"+a.codeExecutionResult.output+"\n```\n");return i.length>0?i.join(""):""}function j(t){var e,n,o,s;const i=[];if(!((n=(e=t.candidates)===null||e===void 0?void 0:e[0].content)===null||n===void 0)&&n.parts)for(const a of(s=(o=t.candidates)===null||o===void 0?void 0:o[0].content)===null||s===void 0?void 0:s.parts)a.functionCall&&i.push(a.functionCall);if(i.length>0)return i}const ht=[O.RECITATION,O.SAFETY,O.LANGUAGE];function A(t){return!!t.finishReason&&ht.includes(t.finishReason)}function C(t){var e,n,o;let s="";if((!t.candidates||t.candidates.length===0)&&t.promptFeedback)s+="Response was blocked",!((e=t.promptFeedback)===null||e===void 0)&&e.blockReason&&(s+=` due to ${t.promptFeedback.blockReason}`),!((n=t.promptFeedback)===null||n===void 0)&&n.blockReasonMessage&&(s+=`: ${t.promptFeedback.blockReasonMessage}`);else if(!((o=t.candidates)===null||o===void 0)&&o[0]){const i=t.candidates[0];A(i)&&(s+=`Candidate was blocked due to ${i.finishReason}`,i.finishMessage&&(s+=`: ${i.finishMessage}`))}return s}function v(t){return this instanceof v?(this.v=t,this):new v(t)}function gt(t,e,n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var o=n.apply(t,e||[]),s,i=[];return s={},a("next"),a("throw"),a("return"),s[Symbol.asyncIterator]=function(){return this},s;function a(l){o[l]&&(s[l]=function(d){return new Promise(function(f,p){i.push([l,d,f,p])>1||r(l,d)})})}function r(l,d){try{c(o[l](d))}catch(f){E(i[0][3],f)}}function c(l){l.value instanceof v?Promise.resolve(l.value.v).then(u,g):E(i[0][2],l)}function u(l){r("next",l)}function g(l){r("throw",l)}function E(l,d){l(d),i.shift(),i.length&&r(i[0][0],i[0][1])}}/**
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
 */const F=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;function Et(t){const e=t.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),n=_t(e),[o,s]=n.tee();return{stream:Ct(o),response:pt(s)}}async function pt(t){const e=[],n=t.getReader();for(;;){const{done:o,value:s}=await n.read();if(o)return S(yt(e));e.push(s)}}function Ct(t){return gt(this,arguments,function*(){const n=t.getReader();for(;;){const{value:o,done:s}=yield v(n.read());if(s)break;yield yield v(S(o))}})}function _t(t){const e=t.getReader();return new ReadableStream({start(o){let s="";return i();function i(){return e.read().then(({value:a,done:r})=>{if(r){if(s.trim()){o.error(new h("Failed to parse stream"));return}o.close();return}s+=a;let c=s.match(F),u;for(;c;){try{u=JSON.parse(c[1])}catch{o.error(new h(`Error parsing JSON response: "${c[1]}"`));return}o.enqueue(u),s=s.substring(c[0].length),c=s.match(F)}return i()}).catch(a=>{let r=a;throw r.stack=a.stack,r.name==="AbortError"?r=new V("Request aborted when reading from the stream"):r=new h("Error reading from the stream"),r})}}})}function yt(t){const e=t[t.length-1],n={promptFeedback:e==null?void 0:e.promptFeedback};for(const o of t){if(o.candidates){let s=0;for(const i of o.candidates)if(n.candidates||(n.candidates=[]),n.candidates[s]||(n.candidates[s]={index:s}),n.candidates[s].citationMetadata=i.citationMetadata,n.candidates[s].groundingMetadata=i.groundingMetadata,n.candidates[s].finishReason=i.finishReason,n.candidates[s].finishMessage=i.finishMessage,n.candidates[s].safetyRatings=i.safetyRatings,i.content&&i.content.parts){n.candidates[s].content||(n.candidates[s].content={role:i.content.role||"user",parts:[]});const a={};for(const r of i.content.parts)r.text&&(a.text=r.text),r.functionCall&&(a.functionCall=r.functionCall),r.executableCode&&(a.executableCode=r.executableCode),r.codeExecutionResult&&(a.codeExecutionResult=r.codeExecutionResult),Object.keys(a).length===0&&(a.text=""),n.candidates[s].content.parts.push(a)}s++}o.usageMetadata&&(n.usageMetadata=o.usageMetadata)}return n}/**
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
 */async function W(t,e,n,o){const s=await R(e,y.STREAM_GENERATE_CONTENT,t,!0,JSON.stringify(n),o);return Et(s)}async function X(t,e,n,o){const i=await(await R(e,y.GENERATE_CONTENT,t,!1,JSON.stringify(n),o)).json();return{response:S(i)}}/**
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
 */function z(t){if(t!=null){if(typeof t=="string")return{role:"system",parts:[{text:t}]};if(t.text)return{role:"system",parts:[t]};if(t.parts)return t.role?t:{role:"system",parts:t.parts}}}function I(t){let e=[];if(typeof t=="string")e=[{text:t}];else for(const n of t)typeof n=="string"?e.push({text:n}):e.push(n);return mt(e)}function mt(t){const e={role:"user",parts:[]},n={role:"function",parts:[]};let o=!1,s=!1;for(const i of t)"functionResponse"in i?(n.parts.push(i),s=!0):(e.parts.push(i),o=!0);if(o&&s)throw new h("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");if(!o&&!s)throw new h("No content is provided for sending chat message.");return o?e:n}function Ot(t,e){var n;let o={model:e==null?void 0:e.model,generationConfig:e==null?void 0:e.generationConfig,safetySettings:e==null?void 0:e.safetySettings,tools:e==null?void 0:e.tools,toolConfig:e==null?void 0:e.toolConfig,systemInstruction:e==null?void 0:e.systemInstruction,cachedContent:(n=e==null?void 0:e.cachedContent)===null||n===void 0?void 0:n.name,contents:[]};const s=t.generateContentRequest!=null;if(t.contents){if(s)throw new _("CountTokensRequest must have one of contents or generateContentRequest, not both.");o.contents=t.contents}else if(s)o=Object.assign(Object.assign({},o),t.generateContentRequest);else{const i=I(t);o.contents=[i]}return{generateContentRequest:o}}function K(t){let e;return t.contents?e=t:e={contents:[I(t)]},t.systemInstruction&&(e.systemInstruction=z(t.systemInstruction)),e}function vt(t){return typeof t=="string"||Array.isArray(t)?{content:I(t)}:t}/**
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
 */const Y=["text","inlineData","functionCall","functionResponse","executableCode","codeExecutionResult"],It={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall","executableCode","codeExecutionResult"],system:["text"]};function Rt(t){let e=!1;for(const n of t){const{role:o,parts:s}=n;if(!e&&o!=="user")throw new h(`First content should be with role 'user', got ${o}`);if(!L.includes(o))throw new h(`Each item should include role field. Got ${o} but valid roles are: ${JSON.stringify(L)}`);if(!Array.isArray(s))throw new h("Content should have 'parts' property with an array of Parts");if(s.length===0)throw new h("Each Content should have at least one part");const i={text:0,inlineData:0,functionCall:0,functionResponse:0,fileData:0,executableCode:0,codeExecutionResult:0};for(const r of s)for(const c of Y)c in r&&(i[c]+=1);const a=It[o];for(const r of Y)if(!a.includes(r)&&i[r]>0)throw new h(`Content with role '${o}' can't contain '${r}' part`);e=!0}}function P(t){var e;if(t.candidates===void 0||t.candidates.length===0)return!1;const n=(e=t.candidates[0])===null||e===void 0?void 0:e.content;if(n===void 0||n.parts===void 0||n.parts.length===0)return!1;for(const o of n.parts)if(o===void 0||Object.keys(o).length===0||o.text!==void 0&&o.text==="")return!1;return!0}/**
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
 */const B="SILENT_ERROR";class At{constructor(e,n,o,s={}){this.model=n,this.params=o,this._requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=e,o!=null&&o.history&&(Rt(o.history),this._history=o.history)}async getHistory(){return await this._sendPromise,this._history}async sendMessage(e,n={}){var o,s,i,a,r,c;await this._sendPromise;const u=I(e),g={safetySettings:(o=this.params)===null||o===void 0?void 0:o.safetySettings,generationConfig:(s=this.params)===null||s===void 0?void 0:s.generationConfig,tools:(i=this.params)===null||i===void 0?void 0:i.tools,toolConfig:(a=this.params)===null||a===void 0?void 0:a.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(c=this.params)===null||c===void 0?void 0:c.cachedContent,contents:[...this._history,u]},E=Object.assign(Object.assign({},this._requestOptions),n);let l;return this._sendPromise=this._sendPromise.then(()=>X(this._apiKey,this.model,g,E)).then(d=>{var f;if(P(d.response)){this._history.push(u);const p=Object.assign({parts:[],role:"model"},(f=d.response.candidates)===null||f===void 0?void 0:f[0].content);this._history.push(p)}else{const p=C(d.response);p&&console.warn(`sendMessage() was unsuccessful. ${p}. Inspect response object for details.`)}l=d}).catch(d=>{throw this._sendPromise=Promise.resolve(),d}),await this._sendPromise,l}async sendMessageStream(e,n={}){var o,s,i,a,r,c;await this._sendPromise;const u=I(e),g={safetySettings:(o=this.params)===null||o===void 0?void 0:o.safetySettings,generationConfig:(s=this.params)===null||s===void 0?void 0:s.generationConfig,tools:(i=this.params)===null||i===void 0?void 0:i.tools,toolConfig:(a=this.params)===null||a===void 0?void 0:a.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(c=this.params)===null||c===void 0?void 0:c.cachedContent,contents:[...this._history,u]},E=Object.assign(Object.assign({},this._requestOptions),n),l=W(this._apiKey,this.model,g,E);return this._sendPromise=this._sendPromise.then(()=>l).catch(d=>{throw new Error(B)}).then(d=>d.response).then(d=>{if(P(d)){this._history.push(u);const f=Object.assign({},d.candidates[0].content);f.role||(f.role="model"),this._history.push(f)}else{const f=C(d);f&&console.warn(`sendMessageStream() was unsuccessful. ${f}. Inspect response object for details.`)}}).catch(d=>{d.message!==B&&console.error(d)}),l}}/**
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
 */async function wt(t,e,n,o){return(await R(e,y.COUNT_TOKENS,t,!1,JSON.stringify(n),o)).json()}/**
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
 */async function St(t,e,n,o){return(await R(e,y.EMBED_CONTENT,t,!1,JSON.stringify(n),o)).json()}async function Nt(t,e,n,o){const s=n.requests.map(a=>Object.assign(Object.assign({},a),{model:e}));return(await R(e,y.BATCH_EMBED_CONTENTS,t,!1,JSON.stringify({requests:s}),o)).json()}/**
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
 */class q{constructor(e,n,o={}){this.apiKey=e,this._requestOptions=o,n.model.includes("/")?this.model=n.model:this.model=`models/${n.model}`,this.generationConfig=n.generationConfig||{},this.safetySettings=n.safetySettings||[],this.tools=n.tools,this.toolConfig=n.toolConfig,this.systemInstruction=z(n.systemInstruction),this.cachedContent=n.cachedContent}async generateContent(e,n={}){var o;const s=K(e),i=Object.assign(Object.assign({},this._requestOptions),n);return X(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(o=this.cachedContent)===null||o===void 0?void 0:o.name},s),i)}async generateContentStream(e,n={}){var o;const s=K(e),i=Object.assign(Object.assign({},this._requestOptions),n);return W(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(o=this.cachedContent)===null||o===void 0?void 0:o.name},s),i)}startChat(e){var n;return new At(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(n=this.cachedContent)===null||n===void 0?void 0:n.name},e),this._requestOptions)}async countTokens(e,n={}){const o=Ot(e,{model:this.model,generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:this.cachedContent}),s=Object.assign(Object.assign({},this._requestOptions),n);return wt(this.apiKey,this.model,o,s)}async embedContent(e,n={}){const o=vt(e),s=Object.assign(Object.assign({},this._requestOptions),n);return St(this.apiKey,this.model,o,s)}async batchEmbedContents(e,n={}){const o=Object.assign(Object.assign({},this._requestOptions),n);return Nt(this.apiKey,this.model,e,o)}}/**
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
 */class Tt{constructor(e){this.apiKey=e}getGenerativeModel(e,n){if(!e.model)throw new h("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new q(this.apiKey,e,n)}getGenerativeModelFromCachedContent(e,n,o){if(!e.name)throw new _("Cached content must contain a `name` field.");if(!e.model)throw new _("Cached content must contain a `model` field.");const s=["model","systemInstruction"];for(const a of s)if(n!=null&&n[a]&&e[a]&&(n==null?void 0:n[a])!==e[a]){if(a==="model"){const r=n.model.startsWith("models/")?n.model.replace("models/",""):n.model,c=e.model.startsWith("models/")?e.model.replace("models/",""):e.model;if(r===c)continue}throw new _(`Different value for "${a}" specified in modelParams (${n[a]}) and cachedContent (${e[a]})`)}const i=Object.assign(Object.assign({},n),{model:e.model,tools:e.tools,toolConfig:e.toolConfig,systemInstruction:e.systemInstruction,cachedContent:e});return new q(this.apiKey,i,o)}}const bt="AIzaSyCiJ4EKsxdQInVDkmN9aLo5SO0tigZwfvc";let w=null;w=new Tt(bt);const Mt=async()=>{try{const t=await Z.getSettings(),e=(t==null?void 0:t.data)||[],n={enabled:!1,apiKey:"",defaultModel:"google/gemini-2.5-flash"};return e&&Array.isArray(e)&&e.forEach(o=>{if(o.key==="integrations.openrouter.enabled")try{n.enabled=JSON.parse(o.value)}catch{}else if(o.key==="integrations.openrouter.apiKey")try{n.apiKey=JSON.parse(o.value)}catch{}else if(o.key==="integrations.openrouter.defaultModel")try{n.defaultModel=JSON.parse(o.value)}catch{}}),n}catch(t){return console.warn("[OpenRouter Config] Failed to load settings from DB, using fallback:",t),{enabled:!1,apiKey:"",defaultModel:"google/gemini-2.5-flash"}}},N=async(t,e)=>{var o;const n=await Mt();if(n.enabled&&n.apiKey){let s=(n.defaultModel||"meta-llama/llama-3.3-70b-instruct:free").replace(/^["']|["']$/g,"");s==="openrouter/free"&&(s="meta-llama/llama-3.3-70b-instruct:free");const i=[s,"meta-llama/llama-3.3-70b-instruct:free","meta-llama/llama-3.2-3b-instruct:free","nvidia/nemotron-nano-9b-v2:free"],a=Array.from(new Set(i)),r=async u=>{var d;let g;if(e){const f=e.split(",")[1]||e,p=((d=e.match(/data:([^;]+);/))==null?void 0:d[1])||"image/jpeg";g={model:u,messages:[{role:"user",content:[{type:"text",text:t},{type:"image_url",image_url:{url:`data:${p};base64,${f}`}}]}]}}else g={model:u,messages:[{role:"user",content:t}]};const E=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify(g)});if(!E.ok){const f=await E.text();throw new Error(`OpenRouter Error (${E.status}): ${f}`)}const l=await E.json();if(!l.choices||l.choices.length===0)throw new Error("OpenRouter returned an empty response.");return l.choices[0].message.content};let c=null;for(const u of a)try{return console.log(`[AI] Attempting OpenRouter call with model: ${u}`),await r(u)}catch(g){console.warn(`[AI] OpenRouter call failed with model ${u}:`,g),c=g}throw c||new Error("All OpenRouter models in the fallback queue failed.")}else{if(console.log("[AI] Using direct Gemini API fallback"),!w)throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file or enable OpenRouter AI in Settings.");let s="gemini-1.5-flash";n.defaultModel&&n.defaultModel.replace(/^["']|["']$/g,"").toLowerCase().includes("pro")&&(s="gemini-1.5-pro");const i=w.getGenerativeModel({model:s});if(e){const a=e.split(",")[1]||e,r=((o=e.match(/data:([^;]+);/))==null?void 0:o[1])||"image/jpeg",c={inlineData:{data:a,mimeType:r}};return(await i.generateContent([t,c])).response.text()}else return(await i.generateContent(t)).response.text()}},Q=t=>{let e=t.replace(/```json/g,"").replace(/```/g,"").trim();const n=e.indexOf("{"),o=e.indexOf("[");let s=-1,i=-1;return n!==-1&&o!==-1?n<o?(s=n,i=e.lastIndexOf("}")):(s=o,i=e.lastIndexOf("]")):n!==-1?(s=n,i=e.lastIndexOf("}")):o!==-1&&(s=o,i=e.lastIndexOf("]")),s!==-1&&i!==-1&&i>s&&(e=e.substring(s,i+1)),JSON.parse(e)},xt=async(t,e,n,o)=>{const s=`
    You are an expert travel planner for SHRAWELLO Travel Hub.
    Create a detailed ${e}-day itinerary for a trip to ${t} for ${n}.
    The trip starts on ${o}.

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
  `;try{const i=await N(s);return Q(i)}catch(i){throw console.error("Itinerary Generation Error:",i),i}},Dt=async t=>{const e=`
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
    `;try{const n=await N(e,t);return Q(n)}catch(n){throw console.error("Invoice Parsing Failed",n),n}},Gt=async(t,e)=>{const n=t.map(s=>({...s,staffName:e[s.staffId]||`Staff #${s.staffId}`})),o=`
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
    `;try{return await N(o)}catch(s){throw console.error("Weekly Standup Summary Failed",s),s}};export{Gt as a,xt as g,Dt as p};
