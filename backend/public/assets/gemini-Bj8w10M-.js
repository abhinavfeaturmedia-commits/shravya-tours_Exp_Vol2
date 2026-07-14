import{i as Z}from"./index-BZe8VdgA.js";var b;(function(e){e.STRING="string",e.NUMBER="number",e.INTEGER="integer",e.BOOLEAN="boolean",e.ARRAY="array",e.OBJECT="object"})(b||(b={}));/**
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
 */var M;(function(e){e.LANGUAGE_UNSPECIFIED="language_unspecified",e.PYTHON="python"})(M||(M={}));var L;(function(e){e.OUTCOME_UNSPECIFIED="outcome_unspecified",e.OUTCOME_OK="outcome_ok",e.OUTCOME_FAILED="outcome_failed",e.OUTCOME_DEADLINE_EXCEEDED="outcome_deadline_exceeded"})(L||(L={}));/**
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
 */const x=["user","model","function","system"];var D;(function(e){e.HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",e.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",e.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",e.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",e.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT",e.HARM_CATEGORY_CIVIC_INTEGRITY="HARM_CATEGORY_CIVIC_INTEGRITY"})(D||(D={}));var G;(function(e){e.HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",e.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",e.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",e.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",e.BLOCK_NONE="BLOCK_NONE"})(G||(G={}));var k;(function(e){e.HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",e.NEGLIGIBLE="NEGLIGIBLE",e.LOW="LOW",e.MEDIUM="MEDIUM",e.HIGH="HIGH"})(k||(k={}));var $;(function(e){e.BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",e.SAFETY="SAFETY",e.OTHER="OTHER"})($||($={}));var O;(function(e){e.FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",e.STOP="STOP",e.MAX_TOKENS="MAX_TOKENS",e.SAFETY="SAFETY",e.RECITATION="RECITATION",e.LANGUAGE="LANGUAGE",e.BLOCKLIST="BLOCKLIST",e.PROHIBITED_CONTENT="PROHIBITED_CONTENT",e.SPII="SPII",e.MALFORMED_FUNCTION_CALL="MALFORMED_FUNCTION_CALL",e.OTHER="OTHER"})(O||(O={}));var H;(function(e){e.TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",e.RETRIEVAL_QUERY="RETRIEVAL_QUERY",e.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",e.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",e.CLASSIFICATION="CLASSIFICATION",e.CLUSTERING="CLUSTERING"})(H||(H={}));var U;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.AUTO="AUTO",e.ANY="ANY",e.NONE="NONE"})(U||(U={}));var j;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.MODE_DYNAMIC="MODE_DYNAMIC"})(j||(j={}));/**
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
 */class h extends Error{constructor(t){super(`[GoogleGenerativeAI Error]: ${t}`)}}class _ extends h{constructor(t,n){super(t),this.response=n}}class V extends h{constructor(t,n,o,s){super(t),this.status=n,this.statusText=o,this.errorDetails=s}}class y extends h{}class W extends h{}/**
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
 */const ee="https://generativelanguage.googleapis.com",te="v1beta",ne="0.24.1",oe="genai-js";var m;(function(e){e.GENERATE_CONTENT="generateContent",e.STREAM_GENERATE_CONTENT="streamGenerateContent",e.COUNT_TOKENS="countTokens",e.EMBED_CONTENT="embedContent",e.BATCH_EMBED_CONTENTS="batchEmbedContents"})(m||(m={}));class se{constructor(t,n,o,s,i){this.model=t,this.task=n,this.apiKey=o,this.stream=s,this.requestOptions=i}toString(){var t,n;const o=((t=this.requestOptions)===null||t===void 0?void 0:t.apiVersion)||te;let i=`${((n=this.requestOptions)===null||n===void 0?void 0:n.baseUrl)||ee}/${o}/${this.model}:${this.task}`;return this.stream&&(i+="?alt=sse"),i}}function ie(e){const t=[];return e!=null&&e.apiClient&&t.push(e.apiClient),t.push(`${oe}/${ne}`),t.join(" ")}async function ae(e){var t;const n=new Headers;n.append("Content-Type","application/json"),n.append("x-goog-api-client",ie(e.requestOptions)),n.append("x-goog-api-key",e.apiKey);let o=(t=e.requestOptions)===null||t===void 0?void 0:t.customHeaders;if(o){if(!(o instanceof Headers))try{o=new Headers(o)}catch(s){throw new y(`unable to convert customHeaders value ${JSON.stringify(o)} to Headers: ${s.message}`)}for(const[s,i]of o.entries()){if(s==="x-goog-api-key")throw new y(`Cannot set reserved header name ${s}`);if(s==="x-goog-api-client")throw new y(`Header name ${s} can only be set using the apiClient field`);n.append(s,i)}}return n}async function re(e,t,n,o,s,i){const a=new se(e,t,n,o,i);return{url:a.toString(),fetchOptions:Object.assign(Object.assign({},ue(i)),{method:"POST",headers:await ae(a),body:s})}}async function R(e,t,n,o,s,i={},a=fetch){const{url:r,fetchOptions:c}=await re(e,t,n,o,s,i);return ce(r,c,a)}async function ce(e,t,n=fetch){let o;try{o=await n(e,t)}catch(s){le(s,e)}return o.ok||await de(o,e),o}function le(e,t){let n=e;throw n.name==="AbortError"?(n=new W(`Request aborted when fetching ${t.toString()}: ${e.message}`),n.stack=e.stack):e instanceof V||e instanceof y||(n=new h(`Error fetching from ${t.toString()}: ${e.message}`),n.stack=e.stack),n}async function de(e,t){let n="",o;try{const s=await e.json();n=s.error.message,s.error.details&&(n+=` ${JSON.stringify(s.error.details)}`,o=s.error.details)}catch{}throw new V(`Error fetching from ${t.toString()}: [${e.status} ${e.statusText}] ${n}`,e.status,e.statusText,o)}function ue(e){const t={};if((e==null?void 0:e.signal)!==void 0||(e==null?void 0:e.timeout)>=0){const n=new AbortController;(e==null?void 0:e.timeout)>=0&&setTimeout(()=>n.abort(),e.timeout),e!=null&&e.signal&&e.signal.addEventListener("abort",()=>{n.abort()}),t.signal=n.signal}return t}/**
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
 */function N(e){return e.text=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),w(e.candidates[0]))throw new _(`${C(e)}`,e);return fe(e)}else if(e.promptFeedback)throw new _(`Text not available. ${C(e)}`,e);return""},e.functionCall=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),w(e.candidates[0]))throw new _(`${C(e)}`,e);return console.warn("response.functionCall() is deprecated. Use response.functionCalls() instead."),F(e)[0]}else if(e.promptFeedback)throw new _(`Function call not available. ${C(e)}`,e)},e.functionCalls=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),w(e.candidates[0]))throw new _(`${C(e)}`,e);return F(e)}else if(e.promptFeedback)throw new _(`Function call not available. ${C(e)}`,e)},e}function fe(e){var t,n,o,s;const i=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const a of(s=(o=e.candidates)===null||o===void 0?void 0:o[0].content)===null||s===void 0?void 0:s.parts)a.text&&i.push(a.text),a.executableCode&&i.push("\n```"+a.executableCode.language+`
`+a.executableCode.code+"\n```\n"),a.codeExecutionResult&&i.push("\n```\n"+a.codeExecutionResult.output+"\n```\n");return i.length>0?i.join(""):""}function F(e){var t,n,o,s;const i=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const a of(s=(o=e.candidates)===null||o===void 0?void 0:o[0].content)===null||s===void 0?void 0:s.parts)a.functionCall&&i.push(a.functionCall);if(i.length>0)return i}const he=[O.RECITATION,O.SAFETY,O.LANGUAGE];function w(e){return!!e.finishReason&&he.includes(e.finishReason)}function C(e){var t,n,o;let s="";if((!e.candidates||e.candidates.length===0)&&e.promptFeedback)s+="Response was blocked",!((t=e.promptFeedback)===null||t===void 0)&&t.blockReason&&(s+=` due to ${e.promptFeedback.blockReason}`),!((n=e.promptFeedback)===null||n===void 0)&&n.blockReasonMessage&&(s+=`: ${e.promptFeedback.blockReasonMessage}`);else if(!((o=e.candidates)===null||o===void 0)&&o[0]){const i=e.candidates[0];w(i)&&(s+=`Candidate was blocked due to ${i.finishReason}`,i.finishMessage&&(s+=`: ${i.finishMessage}`))}return s}function v(e){return this instanceof v?(this.v=e,this):new v(e)}function ge(e,t,n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var o=n.apply(e,t||[]),s,i=[];return s={},a("next"),a("throw"),a("return"),s[Symbol.asyncIterator]=function(){return this},s;function a(l){o[l]&&(s[l]=function(d){return new Promise(function(f,p){i.push([l,d,f,p])>1||r(l,d)})})}function r(l,d){try{c(o[l](d))}catch(f){E(i[0][3],f)}}function c(l){l.value instanceof v?Promise.resolve(l.value.v).then(u,g):E(i[0][2],l)}function u(l){r("next",l)}function g(l){r("throw",l)}function E(l,d){l(d),i.shift(),i.length&&r(i[0][0],i[0][1])}}/**
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
 */const K=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;function Ee(e){const t=e.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),n=ye(t),[o,s]=n.tee();return{stream:Ce(o),response:pe(s)}}async function pe(e){const t=[],n=e.getReader();for(;;){const{done:o,value:s}=await n.read();if(o)return N(me(t));t.push(s)}}function Ce(e){return ge(this,arguments,function*(){const n=e.getReader();for(;;){const{value:o,done:s}=yield v(n.read());if(s)break;yield yield v(N(o))}})}function ye(e){const t=e.getReader();return new ReadableStream({start(o){let s="";return i();function i(){return t.read().then(({value:a,done:r})=>{if(r){if(s.trim()){o.error(new h("Failed to parse stream"));return}o.close();return}s+=a;let c=s.match(K),u;for(;c;){try{u=JSON.parse(c[1])}catch{o.error(new h(`Error parsing JSON response: "${c[1]}"`));return}o.enqueue(u),s=s.substring(c[0].length),c=s.match(K)}return i()}).catch(a=>{let r=a;throw r.stack=a.stack,r.name==="AbortError"?r=new W("Request aborted when reading from the stream"):r=new h("Error reading from the stream"),r})}}})}function me(e){const t=e[e.length-1],n={promptFeedback:t==null?void 0:t.promptFeedback};for(const o of e){if(o.candidates){let s=0;for(const i of o.candidates)if(n.candidates||(n.candidates=[]),n.candidates[s]||(n.candidates[s]={index:s}),n.candidates[s].citationMetadata=i.citationMetadata,n.candidates[s].groundingMetadata=i.groundingMetadata,n.candidates[s].finishReason=i.finishReason,n.candidates[s].finishMessage=i.finishMessage,n.candidates[s].safetyRatings=i.safetyRatings,i.content&&i.content.parts){n.candidates[s].content||(n.candidates[s].content={role:i.content.role||"user",parts:[]});const a={};for(const r of i.content.parts)r.text&&(a.text=r.text),r.functionCall&&(a.functionCall=r.functionCall),r.executableCode&&(a.executableCode=r.executableCode),r.codeExecutionResult&&(a.codeExecutionResult=r.codeExecutionResult),Object.keys(a).length===0&&(a.text=""),n.candidates[s].content.parts.push(a)}s++}o.usageMetadata&&(n.usageMetadata=o.usageMetadata)}return n}/**
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
 */async function X(e,t,n,o){const s=await R(t,m.STREAM_GENERATE_CONTENT,e,!0,JSON.stringify(n),o);return Ee(s)}async function z(e,t,n,o){const i=await(await R(t,m.GENERATE_CONTENT,e,!1,JSON.stringify(n),o)).json();return{response:N(i)}}/**
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
 */function Q(e){if(e!=null){if(typeof e=="string")return{role:"system",parts:[{text:e}]};if(e.text)return{role:"system",parts:[e]};if(e.parts)return e.role?e:{role:"system",parts:e.parts}}}function I(e){let t=[];if(typeof e=="string")t=[{text:e}];else for(const n of e)typeof n=="string"?t.push({text:n}):t.push(n);return _e(t)}function _e(e){const t={role:"user",parts:[]},n={role:"function",parts:[]};let o=!1,s=!1;for(const i of e)"functionResponse"in i?(n.parts.push(i),s=!0):(t.parts.push(i),o=!0);if(o&&s)throw new h("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");if(!o&&!s)throw new h("No content is provided for sending chat message.");return o?t:n}function Oe(e,t){var n;let o={model:t==null?void 0:t.model,generationConfig:t==null?void 0:t.generationConfig,safetySettings:t==null?void 0:t.safetySettings,tools:t==null?void 0:t.tools,toolConfig:t==null?void 0:t.toolConfig,systemInstruction:t==null?void 0:t.systemInstruction,cachedContent:(n=t==null?void 0:t.cachedContent)===null||n===void 0?void 0:n.name,contents:[]};const s=e.generateContentRequest!=null;if(e.contents){if(s)throw new y("CountTokensRequest must have one of contents or generateContentRequest, not both.");o.contents=e.contents}else if(s)o=Object.assign(Object.assign({},o),e.generateContentRequest);else{const i=I(e);o.contents=[i]}return{generateContentRequest:o}}function P(e){let t;return e.contents?t=e:t={contents:[I(e)]},e.systemInstruction&&(t.systemInstruction=Q(e.systemInstruction)),t}function ve(e){return typeof e=="string"||Array.isArray(e)?{content:I(e)}:e}/**
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
 */const Y=["text","inlineData","functionCall","functionResponse","executableCode","codeExecutionResult"],Ie={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall","executableCode","codeExecutionResult"],system:["text"]};function Re(e){let t=!1;for(const n of e){const{role:o,parts:s}=n;if(!t&&o!=="user")throw new h(`First content should be with role 'user', got ${o}`);if(!x.includes(o))throw new h(`Each item should include role field. Got ${o} but valid roles are: ${JSON.stringify(x)}`);if(!Array.isArray(s))throw new h("Content should have 'parts' property with an array of Parts");if(s.length===0)throw new h("Each Content should have at least one part");const i={text:0,inlineData:0,functionCall:0,functionResponse:0,fileData:0,executableCode:0,codeExecutionResult:0};for(const r of s)for(const c of Y)c in r&&(i[c]+=1);const a=Ie[o];for(const r of Y)if(!a.includes(r)&&i[r]>0)throw new h(`Content with role '${o}' can't contain '${r}' part`);t=!0}}function B(e){var t;if(e.candidates===void 0||e.candidates.length===0)return!1;const n=(t=e.candidates[0])===null||t===void 0?void 0:t.content;if(n===void 0||n.parts===void 0||n.parts.length===0)return!1;for(const o of n.parts)if(o===void 0||Object.keys(o).length===0||o.text!==void 0&&o.text==="")return!1;return!0}/**
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
 */const q="SILENT_ERROR";class we{constructor(t,n,o,s={}){this.model=n,this.params=o,this._requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=t,o!=null&&o.history&&(Re(o.history),this._history=o.history)}async getHistory(){return await this._sendPromise,this._history}async sendMessage(t,n={}){var o,s,i,a,r,c;await this._sendPromise;const u=I(t),g={safetySettings:(o=this.params)===null||o===void 0?void 0:o.safetySettings,generationConfig:(s=this.params)===null||s===void 0?void 0:s.generationConfig,tools:(i=this.params)===null||i===void 0?void 0:i.tools,toolConfig:(a=this.params)===null||a===void 0?void 0:a.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(c=this.params)===null||c===void 0?void 0:c.cachedContent,contents:[...this._history,u]},E=Object.assign(Object.assign({},this._requestOptions),n);let l;return this._sendPromise=this._sendPromise.then(()=>z(this._apiKey,this.model,g,E)).then(d=>{var f;if(B(d.response)){this._history.push(u);const p=Object.assign({parts:[],role:"model"},(f=d.response.candidates)===null||f===void 0?void 0:f[0].content);this._history.push(p)}else{const p=C(d.response);p&&console.warn(`sendMessage() was unsuccessful. ${p}. Inspect response object for details.`)}l=d}).catch(d=>{throw this._sendPromise=Promise.resolve(),d}),await this._sendPromise,l}async sendMessageStream(t,n={}){var o,s,i,a,r,c;await this._sendPromise;const u=I(t),g={safetySettings:(o=this.params)===null||o===void 0?void 0:o.safetySettings,generationConfig:(s=this.params)===null||s===void 0?void 0:s.generationConfig,tools:(i=this.params)===null||i===void 0?void 0:i.tools,toolConfig:(a=this.params)===null||a===void 0?void 0:a.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(c=this.params)===null||c===void 0?void 0:c.cachedContent,contents:[...this._history,u]},E=Object.assign(Object.assign({},this._requestOptions),n),l=X(this._apiKey,this.model,g,E);return this._sendPromise=this._sendPromise.then(()=>l).catch(d=>{throw new Error(q)}).then(d=>d.response).then(d=>{if(B(d)){this._history.push(u);const f=Object.assign({},d.candidates[0].content);f.role||(f.role="model"),this._history.push(f)}else{const f=C(d);f&&console.warn(`sendMessageStream() was unsuccessful. ${f}. Inspect response object for details.`)}}).catch(d=>{d.message!==q&&console.error(d)}),l}}/**
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
 */async function Ae(e,t,n,o){return(await R(t,m.COUNT_TOKENS,e,!1,JSON.stringify(n),o)).json()}/**
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
 */async function Se(e,t,n,o){return(await R(t,m.EMBED_CONTENT,e,!1,JSON.stringify(n),o)).json()}async function Ne(e,t,n,o){const s=n.requests.map(a=>Object.assign(Object.assign({},a),{model:t}));return(await R(t,m.BATCH_EMBED_CONTENTS,e,!1,JSON.stringify({requests:s}),o)).json()}/**
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
 */class J{constructor(t,n,o={}){this.apiKey=t,this._requestOptions=o,n.model.includes("/")?this.model=n.model:this.model=`models/${n.model}`,this.generationConfig=n.generationConfig||{},this.safetySettings=n.safetySettings||[],this.tools=n.tools,this.toolConfig=n.toolConfig,this.systemInstruction=Q(n.systemInstruction),this.cachedContent=n.cachedContent}async generateContent(t,n={}){var o;const s=P(t),i=Object.assign(Object.assign({},this._requestOptions),n);return z(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(o=this.cachedContent)===null||o===void 0?void 0:o.name},s),i)}async generateContentStream(t,n={}){var o;const s=P(t),i=Object.assign(Object.assign({},this._requestOptions),n);return X(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(o=this.cachedContent)===null||o===void 0?void 0:o.name},s),i)}startChat(t){var n;return new we(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(n=this.cachedContent)===null||n===void 0?void 0:n.name},t),this._requestOptions)}async countTokens(t,n={}){const o=Oe(t,{model:this.model,generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:this.cachedContent}),s=Object.assign(Object.assign({},this._requestOptions),n);return Ae(this.apiKey,this.model,o,s)}async embedContent(t,n={}){const o=ve(t),s=Object.assign(Object.assign({},this._requestOptions),n);return Se(this.apiKey,this.model,o,s)}async batchEmbedContents(t,n={}){const o=Object.assign(Object.assign({},this._requestOptions),n);return Ne(this.apiKey,this.model,t,o)}}/**
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
 */class Te{constructor(t){this.apiKey=t}getGenerativeModel(t,n){if(!t.model)throw new h("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new J(this.apiKey,t,n)}getGenerativeModelFromCachedContent(t,n,o){if(!t.name)throw new y("Cached content must contain a `name` field.");if(!t.model)throw new y("Cached content must contain a `model` field.");const s=["model","systemInstruction"];for(const a of s)if(n!=null&&n[a]&&t[a]&&(n==null?void 0:n[a])!==t[a]){if(a==="model"){const r=n.model.startsWith("models/")?n.model.replace("models/",""):n.model,c=t.model.startsWith("models/")?t.model.replace("models/",""):t.model;if(r===c)continue}throw new y(`Different value for "${a}" specified in modelParams (${n[a]}) and cachedContent (${t[a]})`)}const i=Object.assign(Object.assign({},n),{model:t.model,tools:t.tools,toolConfig:t.toolConfig,systemInstruction:t.systemInstruction,cachedContent:t});return new J(this.apiKey,i,o)}}const be="AIzaSyCiJ4EKsxdQInVDkmN9aLo5SO0tigZwfvc";let S=null;S=new Te(be);const Me=async()=>{try{const e=await Z.getSettings(),t=(e==null?void 0:e.data)||[],n={enabled:!1,apiKey:"",defaultModel:"google/gemini-2.5-flash"};return t&&Array.isArray(t)&&t.forEach(o=>{if(o.key==="integrations.openrouter.enabled")try{n.enabled=JSON.parse(o.value)}catch{}else if(o.key==="integrations.openrouter.apiKey")try{n.apiKey=JSON.parse(o.value)}catch{}else if(o.key==="integrations.openrouter.defaultModel")try{n.defaultModel=JSON.parse(o.value)}catch{}}),n}catch(e){return console.warn("[OpenRouter Config] Failed to load settings from DB, using fallback:",e),{enabled:!1,apiKey:"",defaultModel:"google/gemini-2.5-flash"}}},A=async(e,t)=>{var o;const n=await Me();if(n.enabled&&n.apiKey){let s=(n.defaultModel||"meta-llama/llama-3.3-70b-instruct:free").replace(/^["']|["']$/g,"");s==="openrouter/free"&&(s="meta-llama/llama-3.3-70b-instruct:free");const i=[s,"meta-llama/llama-3.3-70b-instruct:free","meta-llama/llama-3.2-3b-instruct:free","nvidia/nemotron-nano-9b-v2:free"],a=Array.from(new Set(i)),r=async u=>{var d;let g;if(t){const f=t.split(",")[1]||t,p=((d=t.match(/data:([^;]+);/))==null?void 0:d[1])||"image/jpeg";g={model:u,messages:[{role:"user",content:[{type:"text",text:e},{type:"image_url",image_url:{url:`data:${p};base64,${f}`}}]}]}}else g={model:u,messages:[{role:"user",content:e}]};const E=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify(g)});if(!E.ok){const f=await E.text();throw new Error(`OpenRouter Error (${E.status}): ${f}`)}const l=await E.json();if(!l.choices||l.choices.length===0)throw new Error("OpenRouter returned an empty response.");return l.choices[0].message.content};let c=null;for(const u of a)try{return console.log(`[AI] Attempting OpenRouter call with model: ${u}`),await r(u)}catch(g){console.warn(`[AI] OpenRouter call failed with model ${u}:`,g),c=g}throw c||new Error("All OpenRouter models in the fallback queue failed.")}else{if(console.log("[AI] Using direct Gemini API fallback"),!S)throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file or enable OpenRouter AI in Settings.");let s="gemini-1.5-flash";n.defaultModel&&n.defaultModel.replace(/^["']|["']$/g,"").toLowerCase().includes("pro")&&(s="gemini-1.5-pro");const i=S.getGenerativeModel({model:s});if(t){const a=t.split(",")[1]||t,r=((o=t.match(/data:([^;]+);/))==null?void 0:o[1])||"image/jpeg",c={inlineData:{data:a,mimeType:r}};return(await i.generateContent([e,c])).response.text()}else return(await i.generateContent(e)).response.text()}},T=e=>{let t=e.replace(/```json/g,"").replace(/```/g,"").trim();const n=t.indexOf("{"),o=t.indexOf("[");let s=-1,i=-1;return n!==-1&&o!==-1?n<o?(s=n,i=t.lastIndexOf("}")):(s=o,i=t.lastIndexOf("]")):n!==-1?(s=n,i=t.lastIndexOf("}")):o!==-1&&(s=o,i=t.lastIndexOf("]")),s!==-1&&i!==-1&&i>s&&(t=t.substring(s,i+1)),JSON.parse(t)},xe=async(e,t,n,o)=>{const s=`
    You are an expert travel planner for SHRAWELLO Travel Hub.
    Create a detailed ${t}-day itinerary for a trip to ${e} for ${n}.
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
  `;try{const i=await A(s);return T(i)}catch(i){throw console.error("Itinerary Generation Error:",i),i}},De=async e=>{const t=`
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
    `;try{const n=await A(t,e);return T(n)}catch(n){throw console.error("Invoice Parsing Failed",n),n}},Ge=async(e,t)=>{const n=e.map(s=>({...s,staffName:t[s.staffId]||`Staff #${s.staffId}`})),o=`
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
    `;try{return await A(o)}catch(s){throw console.error("Weekly Standup Summary Failed",s),s}},ke=async(e,t,n,o,s)=>{const i=`
    You are an expert travel assistant for SHRAWELLO Travel Hub.
    Generate a detailed packing checklist for a trip to "${e}" for ${t} days.
    The weather will be: ${n}.
    The planned activity level is: ${o}.
    The trip/itinerary category is: ${s}.

    Return ONLY a JSON array of sections (no markdown code fences, no extra text, just raw JSON array).
    Each section must follow this format:
    {
      "category": "Clothing",
      "items": [
        { "name": "Light t-shirts", "qty": "5", "checked": false },
        { "name": "Comfortable jeans", "qty": "2", "checked": false }
      ]
    }

    Include essential categories like: "Clothing", "Toiletries", "Documents & Money", "Electronics", "Essentials & Meds".
    Provide specific quantities for items where relevant based on the trip duration (${t} days) and weather (${n}).
    `;try{const a=await A(i);return T(a)}catch(a){throw console.error("Packing Checklist Generation Error:",a),a}};export{Ge as a,ke as b,xe as g,De as p};
