import{k as me}from"./index-KKv1uJz5.js";var F;(function(e){e.STRING="string",e.NUMBER="number",e.INTEGER="integer",e.BOOLEAN="boolean",e.ARRAY="array",e.OBJECT="object"})(F||(F={}));/**
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
 */var j;(function(e){e.LANGUAGE_UNSPECIFIED="language_unspecified",e.PYTHON="python"})(j||(j={}));var q;(function(e){e.OUTCOME_UNSPECIFIED="outcome_unspecified",e.OUTCOME_OK="outcome_ok",e.OUTCOME_FAILED="outcome_failed",e.OUTCOME_DEADLINE_EXCEEDED="outcome_deadline_exceeded"})(q||(q={}));/**
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
 */const B=["user","model","function","system"];var Y;(function(e){e.HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",e.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",e.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",e.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",e.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT",e.HARM_CATEGORY_CIVIC_INTEGRITY="HARM_CATEGORY_CIVIC_INTEGRITY"})(Y||(Y={}));var K;(function(e){e.HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",e.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",e.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",e.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",e.BLOCK_NONE="BLOCK_NONE"})(K||(K={}));var V;(function(e){e.HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",e.NEGLIGIBLE="NEGLIGIBLE",e.LOW="LOW",e.MEDIUM="MEDIUM",e.HIGH="HIGH"})(V||(V={}));var J;(function(e){e.BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",e.SAFETY="SAFETY",e.OTHER="OTHER"})(J||(J={}));var D;(function(e){e.FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",e.STOP="STOP",e.MAX_TOKENS="MAX_TOKENS",e.SAFETY="SAFETY",e.RECITATION="RECITATION",e.LANGUAGE="LANGUAGE",e.BLOCKLIST="BLOCKLIST",e.PROHIBITED_CONTENT="PROHIBITED_CONTENT",e.SPII="SPII",e.MALFORMED_FUNCTION_CALL="MALFORMED_FUNCTION_CALL",e.OTHER="OTHER"})(D||(D={}));var W;(function(e){e.TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",e.RETRIEVAL_QUERY="RETRIEVAL_QUERY",e.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",e.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",e.CLASSIFICATION="CLASSIFICATION",e.CLUSTERING="CLUSTERING"})(W||(W={}));var z;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.AUTO="AUTO",e.ANY="ANY",e.NONE="NONE"})(z||(z={}));var Q;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.MODE_DYNAMIC="MODE_DYNAMIC"})(Q||(Q={}));/**
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
 */class v extends Error{constructor(t){super(`[GoogleGenerativeAI Error]: ${t}`)}}class b extends v{constructor(t,n){super(t),this.response=n}}class oe extends v{constructor(t,n,i,s){super(t),this.status=n,this.statusText=i,this.errorDetails=s}}class O extends v{}class re extends v{}/**
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
 */const ye="https://generativelanguage.googleapis.com",Ee="v1beta",Ce="0.24.1",ve="genai-js";var w;(function(e){e.GENERATE_CONTENT="generateContent",e.STREAM_GENERATE_CONTENT="streamGenerateContent",e.COUNT_TOKENS="countTokens",e.EMBED_CONTENT="embedContent",e.BATCH_EMBED_CONTENTS="batchEmbedContents"})(w||(w={}));class Ie{constructor(t,n,i,s,a){this.model=t,this.task=n,this.apiKey=i,this.stream=s,this.requestOptions=a}toString(){var t,n;const i=((t=this.requestOptions)===null||t===void 0?void 0:t.apiVersion)||Ee;let a=`${((n=this.requestOptions)===null||n===void 0?void 0:n.baseUrl)||ye}/${i}/${this.model}:${this.task}`;return this.stream&&(a+="?alt=sse"),a}}function Se(e){const t=[];return e!=null&&e.apiClient&&t.push(e.apiClient),t.push(`${ve}/${Ce}`),t.join(" ")}async function Ae(e){var t;const n=new Headers;n.append("Content-Type","application/json"),n.append("x-goog-api-client",Se(e.requestOptions)),n.append("x-goog-api-key",e.apiKey);let i=(t=e.requestOptions)===null||t===void 0?void 0:t.customHeaders;if(i){if(!(i instanceof Headers))try{i=new Headers(i)}catch(s){throw new O(`unable to convert customHeaders value ${JSON.stringify(i)} to Headers: ${s.message}`)}for(const[s,a]of i.entries()){if(s==="x-goog-api-key")throw new O(`Cannot set reserved header name ${s}`);if(s==="x-goog-api-client")throw new O(`Header name ${s} can only be set using the apiClient field`);n.append(s,a)}}return n}async function Re(e,t,n,i,s,a){const o=new Ie(e,t,n,i,a);return{url:o.toString(),fetchOptions:Object.assign(Object.assign({},Ne(a)),{method:"POST",headers:await Ae(o),body:s})}}async function x(e,t,n,i,s,a={},o=fetch){const{url:r,fetchOptions:l}=await Re(e,t,n,i,s,a);return Oe(r,l,o)}async function Oe(e,t,n=fetch){let i;try{i=await n(e,t)}catch(s){Te(s,e)}return i.ok||await we(i,e),i}function Te(e,t){let n=e;throw n.name==="AbortError"?(n=new re(`Request aborted when fetching ${t.toString()}: ${e.message}`),n.stack=e.stack):e instanceof oe||e instanceof O||(n=new v(`Error fetching from ${t.toString()}: ${e.message}`),n.stack=e.stack),n}async function we(e,t){let n="",i;try{const s=await e.json();n=s.error.message,s.error.details&&(n+=` ${JSON.stringify(s.error.details)}`,i=s.error.details)}catch{}throw new oe(`Error fetching from ${t.toString()}: [${e.status} ${e.statusText}] ${n}`,e.status,e.statusText,i)}function Ne(e){const t={};if((e==null?void 0:e.signal)!==void 0||(e==null?void 0:e.timeout)>=0){const n=new AbortController;(e==null?void 0:e.timeout)>=0&&setTimeout(()=>n.abort(),e.timeout),e!=null&&e.signal&&e.signal.addEventListener("abort",()=>{n.abort()}),t.signal=n.signal}return t}/**
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
 */function U(e){return e.text=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),P(e.candidates[0]))throw new b(`${R(e)}`,e);return be(e)}else if(e.promptFeedback)throw new b(`Text not available. ${R(e)}`,e);return""},e.functionCall=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),P(e.candidates[0]))throw new b(`${R(e)}`,e);return console.warn("response.functionCall() is deprecated. Use response.functionCalls() instead."),X(e)[0]}else if(e.promptFeedback)throw new b(`Function call not available. ${R(e)}`,e)},e.functionCalls=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),P(e.candidates[0]))throw new b(`${R(e)}`,e);return X(e)}else if(e.promptFeedback)throw new b(`Function call not available. ${R(e)}`,e)},e}function be(e){var t,n,i,s;const a=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const o of(s=(i=e.candidates)===null||i===void 0?void 0:i[0].content)===null||s===void 0?void 0:s.parts)o.text&&a.push(o.text),o.executableCode&&a.push("\n```"+o.executableCode.language+`
`+o.executableCode.code+"\n```\n"),o.codeExecutionResult&&a.push("\n```\n"+o.codeExecutionResult.output+"\n```\n");return a.length>0?a.join(""):""}function X(e){var t,n,i,s;const a=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const o of(s=(i=e.candidates)===null||i===void 0?void 0:i[0].content)===null||s===void 0?void 0:s.parts)o.functionCall&&a.push(o.functionCall);if(a.length>0)return a}const _e=[D.RECITATION,D.SAFETY,D.LANGUAGE];function P(e){return!!e.finishReason&&_e.includes(e.finishReason)}function R(e){var t,n,i;let s="";if((!e.candidates||e.candidates.length===0)&&e.promptFeedback)s+="Response was blocked",!((t=e.promptFeedback)===null||t===void 0)&&t.blockReason&&(s+=` due to ${e.promptFeedback.blockReason}`),!((n=e.promptFeedback)===null||n===void 0)&&n.blockReasonMessage&&(s+=`: ${e.promptFeedback.blockReasonMessage}`);else if(!((i=e.candidates)===null||i===void 0)&&i[0]){const a=e.candidates[0];P(a)&&(s+=`Candidate was blocked due to ${a.finishReason}`,a.finishMessage&&(s+=`: ${a.finishMessage}`))}return s}function L(e){return this instanceof L?(this.v=e,this):new L(e)}function ke(e,t,n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var i=n.apply(e,t||[]),s,a=[];return s={},o("next"),o("throw"),o("return"),s[Symbol.asyncIterator]=function(){return this},s;function o(c){i[c]&&(s[c]=function(h){return new Promise(function(f,E){a.push([c,h,f,E])>1||r(c,h)})})}function r(c,h){try{l(i[c](h))}catch(f){d(a[0][3],f)}}function l(c){c.value instanceof L?Promise.resolve(c.value.v).then(u,g):d(a[0][2],c)}function u(c){r("next",c)}function g(c){r("throw",c)}function d(c,h){c(h),a.shift(),a.length&&r(a[0][0],a[0][1])}}/**
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
 */const Z=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;function $e(e){const t=e.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),n=Me(t),[i,s]=n.tee();return{stream:Le(i),response:De(s)}}async function De(e){const t=[],n=e.getReader();for(;;){const{done:i,value:s}=await n.read();if(i)return U(xe(t));t.push(s)}}function Le(e){return ke(this,arguments,function*(){const n=e.getReader();for(;;){const{value:i,done:s}=yield L(n.read());if(s)break;yield yield L(U(i))}})}function Me(e){const t=e.getReader();return new ReadableStream({start(i){let s="";return a();function a(){return t.read().then(({value:o,done:r})=>{if(r){if(s.trim()){i.error(new v("Failed to parse stream"));return}i.close();return}s+=o;let l=s.match(Z),u;for(;l;){try{u=JSON.parse(l[1])}catch{i.error(new v(`Error parsing JSON response: "${l[1]}"`));return}i.enqueue(u),s=s.substring(l[0].length),l=s.match(Z)}return a()}).catch(o=>{let r=o;throw r.stack=o.stack,r.name==="AbortError"?r=new re("Request aborted when reading from the stream"):r=new v("Error reading from the stream"),r})}}})}function xe(e){const t=e[e.length-1],n={promptFeedback:t==null?void 0:t.promptFeedback};for(const i of e){if(i.candidates){let s=0;for(const a of i.candidates)if(n.candidates||(n.candidates=[]),n.candidates[s]||(n.candidates[s]={index:s}),n.candidates[s].citationMetadata=a.citationMetadata,n.candidates[s].groundingMetadata=a.groundingMetadata,n.candidates[s].finishReason=a.finishReason,n.candidates[s].finishMessage=a.finishMessage,n.candidates[s].safetyRatings=a.safetyRatings,a.content&&a.content.parts){n.candidates[s].content||(n.candidates[s].content={role:a.content.role||"user",parts:[]});const o={};for(const r of a.content.parts)r.text&&(o.text=r.text),r.functionCall&&(o.functionCall=r.functionCall),r.executableCode&&(o.executableCode=r.executableCode),r.codeExecutionResult&&(o.codeExecutionResult=r.codeExecutionResult),Object.keys(o).length===0&&(o.text=""),n.candidates[s].content.parts.push(o)}s++}i.usageMetadata&&(n.usageMetadata=i.usageMetadata)}return n}/**
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
 */async function ce(e,t,n,i){const s=await x(t,w.STREAM_GENERATE_CONTENT,e,!0,JSON.stringify(n),i);return $e(s)}async function le(e,t,n,i){const a=await(await x(t,w.GENERATE_CONTENT,e,!1,JSON.stringify(n),i)).json();return{response:U(a)}}/**
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
 */function de(e){if(e!=null){if(typeof e=="string")return{role:"system",parts:[{text:e}]};if(e.text)return{role:"system",parts:[e]};if(e.parts)return e.role?e:{role:"system",parts:e.parts}}}function M(e){let t=[];if(typeof e=="string")t=[{text:e}];else for(const n of e)typeof n=="string"?t.push({text:n}):t.push(n);return Ge(t)}function Ge(e){const t={role:"user",parts:[]},n={role:"function",parts:[]};let i=!1,s=!1;for(const a of e)"functionResponse"in a?(n.parts.push(a),s=!0):(t.parts.push(a),i=!0);if(i&&s)throw new v("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");if(!i&&!s)throw new v("No content is provided for sending chat message.");return i?t:n}function Pe(e,t){var n;let i={model:t==null?void 0:t.model,generationConfig:t==null?void 0:t.generationConfig,safetySettings:t==null?void 0:t.safetySettings,tools:t==null?void 0:t.tools,toolConfig:t==null?void 0:t.toolConfig,systemInstruction:t==null?void 0:t.systemInstruction,cachedContent:(n=t==null?void 0:t.cachedContent)===null||n===void 0?void 0:n.name,contents:[]};const s=e.generateContentRequest!=null;if(e.contents){if(s)throw new O("CountTokensRequest must have one of contents or generateContentRequest, not both.");i.contents=e.contents}else if(s)i=Object.assign(Object.assign({},i),e.generateContentRequest);else{const a=M(e);i.contents=[a]}return{generateContentRequest:i}}function ee(e){let t;return e.contents?t=e:t={contents:[M(e)]},e.systemInstruction&&(t.systemInstruction=de(e.systemInstruction)),t}function He(e){return typeof e=="string"||Array.isArray(e)?{content:M(e)}:e}/**
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
 */const te=["text","inlineData","functionCall","functionResponse","executableCode","codeExecutionResult"],Ue={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall","executableCode","codeExecutionResult"],system:["text"]};function Fe(e){let t=!1;for(const n of e){const{role:i,parts:s}=n;if(!t&&i!=="user")throw new v(`First content should be with role 'user', got ${i}`);if(!B.includes(i))throw new v(`Each item should include role field. Got ${i} but valid roles are: ${JSON.stringify(B)}`);if(!Array.isArray(s))throw new v("Content should have 'parts' property with an array of Parts");if(s.length===0)throw new v("Each Content should have at least one part");const a={text:0,inlineData:0,functionCall:0,functionResponse:0,fileData:0,executableCode:0,codeExecutionResult:0};for(const r of s)for(const l of te)l in r&&(a[l]+=1);const o=Ue[i];for(const r of te)if(!o.includes(r)&&a[r]>0)throw new v(`Content with role '${i}' can't contain '${r}' part`);t=!0}}function ne(e){var t;if(e.candidates===void 0||e.candidates.length===0)return!1;const n=(t=e.candidates[0])===null||t===void 0?void 0:t.content;if(n===void 0||n.parts===void 0||n.parts.length===0)return!1;for(const i of n.parts)if(i===void 0||Object.keys(i).length===0||i.text!==void 0&&i.text==="")return!1;return!0}/**
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
 */const ie="SILENT_ERROR";class je{constructor(t,n,i,s={}){this.model=n,this.params=i,this._requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=t,i!=null&&i.history&&(Fe(i.history),this._history=i.history)}async getHistory(){return await this._sendPromise,this._history}async sendMessage(t,n={}){var i,s,a,o,r,l;await this._sendPromise;const u=M(t),g={safetySettings:(i=this.params)===null||i===void 0?void 0:i.safetySettings,generationConfig:(s=this.params)===null||s===void 0?void 0:s.generationConfig,tools:(a=this.params)===null||a===void 0?void 0:a.tools,toolConfig:(o=this.params)===null||o===void 0?void 0:o.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(l=this.params)===null||l===void 0?void 0:l.cachedContent,contents:[...this._history,u]},d=Object.assign(Object.assign({},this._requestOptions),n);let c;return this._sendPromise=this._sendPromise.then(()=>le(this._apiKey,this.model,g,d)).then(h=>{var f;if(ne(h.response)){this._history.push(u);const E=Object.assign({parts:[],role:"model"},(f=h.response.candidates)===null||f===void 0?void 0:f[0].content);this._history.push(E)}else{const E=R(h.response);E&&console.warn(`sendMessage() was unsuccessful. ${E}. Inspect response object for details.`)}c=h}).catch(h=>{throw this._sendPromise=Promise.resolve(),h}),await this._sendPromise,c}async sendMessageStream(t,n={}){var i,s,a,o,r,l;await this._sendPromise;const u=M(t),g={safetySettings:(i=this.params)===null||i===void 0?void 0:i.safetySettings,generationConfig:(s=this.params)===null||s===void 0?void 0:s.generationConfig,tools:(a=this.params)===null||a===void 0?void 0:a.tools,toolConfig:(o=this.params)===null||o===void 0?void 0:o.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(l=this.params)===null||l===void 0?void 0:l.cachedContent,contents:[...this._history,u]},d=Object.assign(Object.assign({},this._requestOptions),n),c=ce(this._apiKey,this.model,g,d);return this._sendPromise=this._sendPromise.then(()=>c).catch(h=>{throw new Error(ie)}).then(h=>h.response).then(h=>{if(ne(h)){this._history.push(u);const f=Object.assign({},h.candidates[0].content);f.role||(f.role="model"),this._history.push(f)}else{const f=R(h);f&&console.warn(`sendMessageStream() was unsuccessful. ${f}. Inspect response object for details.`)}}).catch(h=>{h.message!==ie&&console.error(h)}),c}}/**
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
 */async function qe(e,t,n,i){return(await x(t,w.COUNT_TOKENS,e,!1,JSON.stringify(n),i)).json()}/**
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
 */async function Be(e,t,n,i){return(await x(t,w.EMBED_CONTENT,e,!1,JSON.stringify(n),i)).json()}async function Ye(e,t,n,i){const s=n.requests.map(o=>Object.assign(Object.assign({},o),{model:t}));return(await x(t,w.BATCH_EMBED_CONTENTS,e,!1,JSON.stringify({requests:s}),i)).json()}/**
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
 */class se{constructor(t,n,i={}){this.apiKey=t,this._requestOptions=i,n.model.includes("/")?this.model=n.model:this.model=`models/${n.model}`,this.generationConfig=n.generationConfig||{},this.safetySettings=n.safetySettings||[],this.tools=n.tools,this.toolConfig=n.toolConfig,this.systemInstruction=de(n.systemInstruction),this.cachedContent=n.cachedContent}async generateContent(t,n={}){var i;const s=ee(t),a=Object.assign(Object.assign({},this._requestOptions),n);return le(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(i=this.cachedContent)===null||i===void 0?void 0:i.name},s),a)}async generateContentStream(t,n={}){var i;const s=ee(t),a=Object.assign(Object.assign({},this._requestOptions),n);return ce(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(i=this.cachedContent)===null||i===void 0?void 0:i.name},s),a)}startChat(t){var n;return new je(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(n=this.cachedContent)===null||n===void 0?void 0:n.name},t),this._requestOptions)}async countTokens(t,n={}){const i=Pe(t,{model:this.model,generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:this.cachedContent}),s=Object.assign(Object.assign({},this._requestOptions),n);return qe(this.apiKey,this.model,i,s)}async embedContent(t,n={}){const i=He(t),s=Object.assign(Object.assign({},this._requestOptions),n);return Be(this.apiKey,this.model,i,s)}async batchEmbedContents(t,n={}){const i=Object.assign(Object.assign({},this._requestOptions),n);return Ye(this.apiKey,this.model,t,i)}}/**
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
 */class Ke{constructor(t){this.apiKey=t}getGenerativeModel(t,n){if(!t.model)throw new v("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new se(this.apiKey,t,n)}getGenerativeModelFromCachedContent(t,n,i){if(!t.name)throw new O("Cached content must contain a `name` field.");if(!t.model)throw new O("Cached content must contain a `model` field.");const s=["model","systemInstruction"];for(const o of s)if(n!=null&&n[o]&&t[o]&&(n==null?void 0:n[o])!==t[o]){if(o==="model"){const r=n.model.startsWith("models/")?n.model.replace("models/",""):n.model,l=t.model.startsWith("models/")?t.model.replace("models/",""):t.model;if(r===l)continue}throw new O(`Different value for "${o}" specified in modelParams (${n[o]}) and cachedContent (${t[o]})`)}const a=Object.assign(Object.assign({},n),{model:t.model,tools:t.tools,toolConfig:t.toolConfig,systemInstruction:t.systemInstruction,cachedContent:t});return new se(this.apiKey,a,i)}}const Ve="AIzaSyCiJ4EKsxdQInVDkmN9aLo5SO0tigZwfvc";let $=null;$=new Ke(Ve);let G=null,ae=0;const Je=async()=>{const e=Date.now();if(G&&e-ae<1e3*60*15)return G;try{const t=await fetch("https://openrouter.ai/api/v1/models");if(t.ok){const n=await t.json();if(n&&Array.isArray(n.data)){const i=n.data.filter(s=>{var a;return s.id&&(s.id.endsWith(":free")||s.id==="openrouter/free"||((a=s.pricing)==null?void 0:a.prompt)==="0")}).map(s=>s.id);if(i.length>0)return G=["openrouter/free",...i],ae=e,G}}}catch(t){console.warn("[OpenRouter] Could not fetch live models list:",t)}return["openrouter/free","google/gemma-4-31b-it:free","google/gemma-4-26b-a4b-it:free","openai/gpt-oss-20b:free","nvidia/nemotron-3-super-120b-a12b:free","nvidia/nemotron-3-ultra-550b-a55b:free","nvidia/nemotron-3.5-lightning:free","meta-llama/llama-3.3-70b-instruct:free","deepseek/deepseek-r1:free","qwen/qwen-2.5-72b-instruct:free","mistralai/mistral-small-24b-instruct-2501:free"]},ue=async()=>{try{const e=await me.getSettings(),t=(e==null?void 0:e.data)||[],n={enabled:!1,apiKey:"",defaultModel:"openrouter/free"};return t&&Array.isArray(t)&&t.forEach(i=>{if(i.key==="integrations.openrouter.enabled")try{n.enabled=JSON.parse(i.value)}catch{}else if(i.key==="integrations.openrouter.apiKey")try{n.apiKey=JSON.parse(i.value)}catch{}else if(i.key==="integrations.openrouter.defaultModel")try{n.defaultModel=JSON.parse(i.value)}catch{}}),n}catch(e){return console.warn("[OpenRouter Config] Failed to load settings from DB, using fallback:",e),{enabled:!1,apiKey:"",defaultModel:"openrouter/free"}}},T=async(e,t)=>{var i,s;const n=await ue();if(n.enabled&&n.apiKey){const a=(n.defaultModel||"openrouter/free").replace(/^["']|["']$/g,"").trim(),o=await Je(),r=[];if(a&&(r.push(a),!a.endsWith(":free")&&a!=="openrouter/free")){const d=`${a}:free`;o.includes(d)&&r.push(d)}r.push("openrouter/free"),r.push(...o),r.push("google/gemma-4-31b-it:free","google/gemma-4-26b-a4b-it:free","openai/gpt-oss-20b:free","nvidia/nemotron-3-super-120b-a12b:free","nvidia/nemotron-3-ultra-550b-a55b:free","nvidia/nemotron-3.5-lightning:free","meta-llama/llama-3.3-70b-instruct:free","deepseek/deepseek-r1:free","qwen/qwen-2.5-72b-instruct:free","mistralai/mistral-small-24b-instruct-2501:free");const l=Array.from(new Set(r.filter(Boolean))),u=async d=>{var E;let c;if(t){const I=t.split(",")[1]||t,A=((E=t.match(/data:([^;]+);/))==null?void 0:E[1])||"image/jpeg";c={model:d,messages:[{role:"user",content:[{type:"text",text:e},{type:"image_url",image_url:{url:`data:${A};base64,${I}`}}]}]}}else c={model:d,messages:[{role:"user",content:e}]};const h=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify(c)});if(!h.ok){const I=await h.text();throw new Error(`OpenRouter Error (${h.status}): ${I}`)}const f=await h.json();if(!f.choices||f.choices.length===0)throw new Error("OpenRouter returned an empty response.");return f.choices[0].message.content};let g=null;for(const d of l)try{return console.log(`[AI] Attempting OpenRouter call with model: ${d}`),await u(d)}catch(c){console.warn(`[AI] OpenRouter model ${d} failed (${(c==null?void 0:c.message)||c}). Trying next free model in queue...`),g=c}if($){console.warn("[AI] All OpenRouter models exhausted. Falling back to direct Google Gemini API...");try{const d=$.getGenerativeModel({model:"gemini-1.5-flash"});if(t){const c=t.split(",")[1]||t,h=((i=t.match(/data:([^;]+);/))==null?void 0:i[1])||"image/jpeg",f={inlineData:{data:c,mimeType:h}};return(await d.generateContent([e,f])).response.text()}else return(await d.generateContent(e)).response.text()}catch(d){console.error("[AI] Direct Gemini fallback also failed:",d)}}throw g||new Error("AI service temporarily unavailable. Please check your OpenRouter API key in Settings.")}else{if(console.log("[AI] Using direct Gemini API fallback"),!$)throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file or enable OpenRouter AI in Settings.");let a="gemini-1.5-flash";n.defaultModel&&n.defaultModel.replace(/^["']|["']$/g,"").toLowerCase().includes("pro")&&(a="gemini-1.5-pro");const o=$.getGenerativeModel({model:a});if(t){const r=t.split(",")[1]||t,l=((s=t.match(/data:([^;]+);/))==null?void 0:s[1])||"image/jpeg",u={inlineData:{data:r,mimeType:l}};return(await o.generateContent([e,u])).response.text()}else return(await o.generateContent(e)).response.text()}},N=e=>{if(!e)return null;let t=e.replace(/<think>[\s\S]*?<\/think>/gi,"").trim();t=t.replace(/```json/gi,"").replace(/```/g,"").trim();const n=t.indexOf("{"),i=t.indexOf("[");let s=-1,a=-1;n!==-1&&i!==-1?n<i?(s=n,a=t.lastIndexOf("}")):(s=i,a=t.lastIndexOf("]")):n!==-1?(s=n,a=t.lastIndexOf("}")):i!==-1&&(s=i,a=t.lastIndexOf("]")),s!==-1&&a!==-1&&a>s&&(t=t.substring(s,a+1)),t=t.replace(/,\s*([}\]])/g,"$1");try{return JSON.parse(t)}catch(o){const r=t.match(/\{[\s\S]*\}|\[[\s\S]*\]/);if(r)return JSON.parse(r[0].replace(/,\s*([}\]])/g,"$1"));throw o}},ze=async(e,t,n,i,s)=>{let a;typeof e=="object"?a=e:a={destination:e,days:3,travelers:"2 Adults",startDate:"Upcoming",...s};const{destination:o,destinationsList:r,dayLocationMap:l,days:u,travelers:g,travelerCount:d,recommendedVehicle:c,startDate:h,tripStyle:f="Balanced Vacation",pace:E="Balanced",interests:I=[],specialRequests:A="",masterContext:y}=a;let _="";if(y){const p=[];if(y.hotelsByCity&&Object.keys(y.hotelsByCity).length>0){const S=Object.entries(y.hotelsByCity).map(([m,ge])=>{const pe=ge.slice(0,6).map(k=>`  * Hotel: "${k.name}" (ID: ${k.id}, ${k.stars||4}★, ₹${k.price||0}/night, Area: ${k.area||m})`).join(`
`);return`[Hotels in ${m}]
${pe}`}).join(`

`);p.push(`AVAILABLE AGENCY MASTER HOTELS (Grouped by City - Strictly assign hotel stays in that day's scheduled city):
${S}`)}else if(y.hotels&&y.hotels.length>0){const S=y.hotels.slice(0,10).map(m=>`- Hotel: "${m.name}" (ID: ${m.id}, ${m.stars||4}★, ₹${m.price||0}/night, City/Area: ${m.city||m.area||o})`).join(`
`);p.push(`AVAILABLE AGENCY MASTER HOTELS:
${S}`)}if(y.transports&&y.transports.length>0){const S=y.transports.slice(0,6).map(m=>`- Vehicle: "${m.name}" (ID: ${m.id}, Capacity: ${m.capacity||4} Pax, Type: ${m.type||"SUV"}, Base: ₹${m.cost||0}/day)`).join(`
`);p.push(`AVAILABLE FLEET VEHICLES:
${S}`)}if(y.activities&&y.activities.length>0){const S=y.activities.slice(0,15).map(m=>`- Activity: "${m.name}" (ID: ${m.id}, ₹${m.cost||0}, ${m.duration||"2h"}, City: ${m.city||o}, Category: ${m.category||"Sightseeing"})`).join(`
`);p.push(`AVAILABLE MASTER SIGHTSEEING & ACTIVITIES:
${S}`)}y.masterPlanSummary&&p.push(`MASTER PLAN TEMPLATE REFERENCE:
${y.masterPlanSummary}`),p.length>0&&(_=`
========================================
AGENCY MASTER DATABASE INVENTORY
========================================
${p.join(`

`)}

INVENTORY USAGE DIRECTIVE:
If an item from the master inventory fits the itinerary, use its exact name, "masterId", and estimated cost. Otherwise, suggest premier authentic local experiences.
`)}let C="";l&&l.length>0?C=`
DAY-BY-DAY GEOGRAPHIC SCHEDULE & OVERNIGHT CITIES:
${l.map(p=>p.isTransitDay&&p.transitFrom&&p.transitTo?`Day ${p.day}: Transit Day from ${p.transitFrom} to ${p.transitTo} (Overnight in ${p.transitTo})`:`Day ${p.day}: City: ${p.city} (Overnight in ${p.city})`).join(`
`)}
`:r&&r.length>1&&(C=`
MULTI-DESTINATION ITINERARY ROUTE:
${r.map((p,S)=>`Leg ${S+1}: ${p.name} (${p.nights} Nights)`).join(" -> ")}
Please ensure that inter-destination travel, hotel check-outs, and scenic transfers are scheduled realistically on transit days.
`);const he=c?`RECOMMENDED VEHICLE: ${c} (Required for ${g} to ensure passenger comfort & luggage capacity)`:`RECOMMENDED VEHICLE: Sized appropriately for ${g}`,fe=`
You are a World-Class Destination Management Company (DMC) Senior Tour Designer for SHRAWELLO Travel Hub.
Design an experiential, seamless, geographically sequenced, and luxury-grade ${u}-day itinerary for ${o}.

TRIP PARAMETERS:
- Travelers: ${g} (${d||""} total pax)
- ${he}
- Trip Dates: Starts on ${h} (${u} Days)
- Trip Style & Vibe: ${f}
- Travel Pace: ${E} (Relaxed: 1-2 curated highlights/day; Balanced: 2-3 highlights/day; Explorer: 3-4 highlights/day)
- Specific Interests: ${I.length>0?I.join(", "):"Iconic sights, authentic culinary gems, scenic photography & local culture"}
${A?`- Special Notes/Requests: "${A}"`:""}

${C}
${_}

EXPERT TOUR DESIGN & ROUTING PRINCIPLES:
1. STRICT CITY-SPECIFIC HOTEL MATCHING:
   - For every overnight stay, assign a hotel strictly in that day's scheduled city.
   - When switching cities (e.g. Srinagar to Gulmarg), include a Hotel Check-Out in the departing city, the inter-city scenic drive, and Hotel Check-In at the new city.
   - If master database has hotels for that city, select the best matching master hotel and include its "masterId".

2. VEHICLE SELECTION AS PER PASSENGER COUNT:
   - All airport transfers, inter-city drives, and local sightseeing must use the appropriate vehicle sized for ${g}.
   - Detail the vehicle in transport items (e.g., "Private AC Innova Crysta / Tempo Traveller with dedicated professional chauffeur, all toll taxes, parking & fuel included").

3. GEOGRAPHIC ROUTE SEQUENCING & DISTANCE REALISM:
   - Sequence activities in logical chronological order without backtracking:
     * Day 1 (Arrival): Airport pickup with driving distance/time -> Check-in & freshen up -> Gentle nearby evening attraction/sunset -> Dinner.
     * Transit Days: Morning breakfast -> Hotel check-out -> Scenic drive with en-route viewpoints & road distance/transit time (~X km / Y hours) -> Check-in at next destination -> Evening local stroll.
     * Excursion Days: Group morning and afternoon sights in the same geographical sector/valley.
     * Final Day (Departure): Relaxed breakfast -> Souvenir shopping -> Airport transfer scheduled with 2.5-3 hours domestic flight check-in buffer.
   - In transport descriptions and durations, explicitly include approximate driving distance (km) and transit duration (e.g., "Drive: ~52 km / 2.5 hrs via NH1A").
   - Include acclimatization and weather-appropriate reminders (e.g., Day 1 acclimatization in high-altitude regions like Ladakh/Kashmir).

4. MULTI-SERVICE GRANULARITY & REALISTIC COSTS:
   - Categorize each item strictly into:
     * "transport": Airport pickups, inter-city drives, scenic transfers, private cabs.
     * "hotel": Check-in and property relaxation on Day 1 or inter-city hotel switches.
     * "activity": Guided monuments, nature treks, boat cruises, heritage walks, culinary tours.
     * "guide": Monument escort or private local heritage guides.
     * "note": Essential local tips (dress codes, permits, altitude notes, photo points).
   - Provide realistic estimated Net Costs in INR (₹) for private tours, entry fees, and transfers.

5. INCLUSIONS & EXCLUSIONS:
   - Generate 5-7 specific inclusions and 5-7 specific exclusions tailored to this exact trip, vehicle, and activities.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact structure (no markdown fences, no leading/trailing commentary):
{
  "title": "A catchy, evocative luxury package title (e.g. 'Royal Kashmir Panorama: Srinagar Houseboats, Gulmarg Gondola & Pahalgam Valleys')",
  "highlights": ["3-4 bullet point key highlights of this holiday"],
  "included": [
    "0${u-1} Nights accommodation in verified properties as specified",
    "Daily buffet breakfast & dinner at hotels",
    "Private AC vehicle (${c||"Sized for group"}) for all airport transfers, inter-city drives and sightseeing",
    "Professional chauffeur, driver allowances, toll taxes, state permits and fuel",
    "Key sightseeing entry tickets & activities as per itinerary"
  ],
  "notIncluded": [
    "Airfare / Train tickets unless specified",
    "Lunches and personal dining expenses",
    "Optional adventure sports, pony rides and camera fees",
    "Personal expenses, laundry, room service and tips",
    "Any cost arising due to unforeseen weather disruptions or flight delays"
  ],
  "days": [
    {
      "day": 1,
      "title": "Evocative Theme (e.g. 'Arrival in Srinagar & Sunset Shikara on Dal Lake')",
      "notes": "Acclimatize at ease today. Keep warm layer handy for the evening lake breeze.",
      "items": [
        {
          "time": "10:30 AM",
          "type": "transport",
          "title": "Private Airport Welcome & Hotel Transfer (Srinagar)",
          "description": "Meet your private chauffeur at Srinagar International Airport with a warm welcome. Drive ~15 km (35 mins) to your deluxe property along the scenic Dal Lake boulevard.",
          "cost": 1500,
          "duration": "45 Mins",
          "masterId": ""
        },
        {
          "time": "01:00 PM",
          "type": "hotel",
          "title": "Hotel Check-In & Leisure Lunch (Srinagar)",
          "description": "Check in to your deluxe room in Srinagar. Relax, freshen up, and enjoy traditional Kashmiri cuisine at the property.",
          "cost": 5500,
          "duration": "2 Hours",
          "masterId": ""
        },
        {
          "time": "05:00 PM",
          "type": "activity",
          "title": "Romantic Sunset Shikara Cruise on Dal Lake",
          "description": "Glide over tranquil waters through floating lotus gardens and Char Chinar island as the golden hour illuminates Zabarwan hills.",
          "cost": 1200,
          "duration": "1.5 Hours",
          "masterId": ""
        }
      ]
    }
  ]
}
`;try{const p=await T(fe);return N(p)}catch(p){throw console.error("Itinerary Generation Error:",p),p}},Qe=async e=>{const{dayNumber:t,destination:n,city:i=n,currentItems:s,promptInstruction:a,travelers:o="2 Guests",tripStyle:r="Curated",recommendedVehicle:l}=e,u=`
You are an expert travel designer for SHRAWELLO Travel Hub.
Redesign Day ${t} of an itinerary in ${i} (${n}) for ${o} (${r} style).

USER SPECIFIC REQUEST / MODIFICATION:
"${a}"

CURRENT ITEMS ON THIS DAY (FOR REFERENCE):
${JSON.stringify(s.map(d=>({title:d.title,type:d.type,time:d.time,description:d.description})))}

ROUTING & SEQUENCING PRINCIPLES:
- City: Stays and sights must strictly belong to ${i}.
- Logical Flow: Morning -> Afternoon -> Evening in geographic sequence without zig-zagging.
- Distance & Duration: State approximate driving distance (km) and drive times in transport items.
- Vehicle: ${l||"Private vehicle sized for group"}.

Create a refreshed, high-quality, geographically logical plan for Day ${t}.
Return ONLY a valid JSON object matching this structure:
{
  "day": ${t},
  "title": "New theme/title for this day",
  "notes": "Practical tip, distance note, or reminder for this day",
  "items": [
    {
      "time": "09:30 AM",
      "type": "activity",
      "title": "Clear descriptive title",
      "description": "Vivid 2-sentence description with highlights, distance/time context, and tips",
      "cost": 1500,
      "duration": "2.5 Hours"
    }
  ]
}
`,g=await T(u);return N(g)},Xe=async(e,t,n,i)=>{const s=`
You are a senior luxury travel copywriter. Polish and elevate this travel itinerary item into an evocative, irresistible brochure description.

Destination: ${i||"Destination"}
Item Type: ${n}
Current Title: "${e}"
Current Description: "${t||"Standard sightseeing"}"

Requirements:
- Keep the title clear, premium, and concise.
- Write a vivid, sensory 2-3 sentence description highlighting the unique experience, atmosphere, and what makes it unmissable.
- Return ONLY a JSON object:
{
  "title": "Polished Catchy Title",
  "description": "Evocative, descriptive copy..."
}
`,a=await T(s);return N(a)},Ze=async(e,t,n,i)=>{const s=(n||[]).slice(0,20).map(r=>`${r.type.toUpperCase()}: ${r.title}`).join(", "),a=`
You are a travel contracting specialist for SHRAWELLO Travel Hub.
Generate a comprehensive list of "Included" and "Not Included" package terms for a ${t}-day trip to ${e} (Custom Tour).

PLANNED ITINERARY ITEMS:
${s||"Standard private holiday package"}

Return ONLY a valid JSON object:
{
  "included": [
    "0${t-1} Nights accommodation in verified deluxe properties",
    "Daily buffet breakfast at all hotels",
    "All inter-city transfers and local sightseeing in private AC vehicle",
    "Driver allowances, toll taxes, state permits and fuel charges",
    "Entry tickets & experiences as outlined in the day-by-day plan"
  ],
  "notIncluded": [
    "Airfare / Train tickets unless explicitly mentioned",
    "Meals other than specified (Lunch & Personal dinners)",
    "Monument camera fees & personal guide services where optional",
    "Early check-in and late check-out charges",
    "Personal expenses such as laundry, room service, telephone calls & tips",
    "Any cost arising due to unforeseen weather disruptions or flight delays"
  ]
}
`,o=await T(a);return N(o)},et=async(e,t,n)=>{let i;typeof e=="object"?i=e:i={destination:e,days:3,highlights:n};const{destination:s,days:a,travelers:o="All Travelers",tripStyle:r="Curated Holiday",included:l=[],notIncluded:u=[],items:g=[],destinationsList:d=[],vehicleName:c}=i,h=g.filter(C=>C.type==="activity").map(C=>C.title).slice(0,10).join(", "),f=g.filter(C=>C.type==="hotel").map(C=>C.title).slice(0,6).join(", "),E=d.length>1?d.map(C=>`${C.name} (${C.nights}N)`).join(" -> "):s,I=l.length>0?l.map(C=>`- Included: ${C}`).join(`
`):"- Standard hotel and transport inclusions",A=u.length>0?u.map(C=>`- Excluded: ${C}`).join(`
`):"- Personal expenses, airfare",y=`
You are a senior tour manager and destination specialist for SHRAWELLO Travel Hub.
Create 5 to 7 essential, reassuring, and practical FAQs for travelers booking this specific holiday package.

PACKAGE DETAILS:
- Route & Destination: ${E} (${a} Days)
- Travelers Group: ${o}
- Style: ${r}
- Vehicle Assigned: ${c||"Dedicated Private AC Tourist Vehicle"}
- Scheduled Highlights & Sightseeing: ${h||"Full guided sightseeing as per plan"}
- Scheduled Stays: ${f||"Verified star-rated partner properties"}

PACKAGE TERMS & CONDITIONS:
${I}

PACKAGE EXCLUSIONS:
${A}

FAQ CREATION REQUIREMENTS:
Generate FAQs that directly address questions travelers have about THIS specific trip:
1. TRANSPORT & VEHICLE: Address the specific vehicle provided for ${o}, driver allowance, luggage capacity, and hill/AC policy.
2. HOTELS & ROOM SHARING: Clarify check-in/out times, room category, and breakfast/dinner arrangements.
3. INCLUSIONS CLARIFICATION: Confirm what key entry tickets / boat rides / permits are already covered in the package cost.
4. EXCLUSIONS & ON-GROUND EXPENSES: Clarify what is on direct payment (e.g. lunch, optional snow activities/pony rides, camera fees).
5. DESTINATION PREPARATION: Specific clothing/packing tips, altitude sickness / weather precautions, and mandatory ID proofs needed for ${s}.

Return ONLY a valid JSON array of FAQ objects:
[
  {
    "q": "What type of vehicle is provided for our trip?",
    "a": "Clear, reassuring answer mentioning the private AC vehicle, driver allowances, state permits, and fuel included..."
  },
  {
    "q": "Are entry tickets and activities included in the package?",
    "a": "Detailed answer matching the package inclusions..."
  }
]
`,_=await T(y);return N(_)},tt=async e=>{const t=`
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
    `;try{const n=await T(t,e);return N(n)}catch(n){throw console.error("Invoice Parsing Failed",n),n}},nt=async(e,t)=>{const n=e.map(s=>({...s,staffName:t[s.staffId]||`Staff #${s.staffId}`})),i=`
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
    `;try{return await T(i)}catch(s){throw console.error("Weekly Standup Summary Failed",s),s}},it=[{id:"nvidia/nemotron-3-ultra-550b-a55b:free",name:"NVIDIA Nemotron 3 Ultra 550B (1M Context Free)",provider:"OpenRouter"},{id:"google/gemma-4-26b-a4b-it:free",name:"Google Gemma 4 26B (Free High Quality)",provider:"OpenRouter"},{id:"google/gemma-4-31b-it:free",name:"Google Gemma 4 31B (Free High Quality)",provider:"OpenRouter"},{id:"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",name:"NVIDIA Nemotron Nano Omni (Free Reasoning)",provider:"OpenRouter"},{id:"nvidia/nemotron-3-super-120b-a12b:free",name:"NVIDIA Nemotron 3 Super 120B (Free AI)",provider:"OpenRouter"},{id:"openrouter/free",name:"OpenRouter Dynamic Free Router (Auto Load-Balance)",provider:"OpenRouter"},{id:"smart-logic-engine",name:"Instant Smart Reasoning Engine",provider:"Deterministic AI"}],H=(e,t,n,i,s)=>{const a=(e||"").toLowerCase(),o=(n||"").toLowerCase(),r=(i||"").toLowerCase(),l=a.includes("kashmir")||a.includes("himachal")||a.includes("swiss")||o.includes("cold")||o.includes("chilly")||o.includes("rain"),u=a.includes("bali")||a.includes("goa")||a.includes("kerala")||a.includes("maldives")||a.includes("beach")||o.includes("sunny")||o.includes("warm"),g=r.includes("trek")||r.includes("intense")||r.includes("hiking")||r.includes("adventure"),d=Math.min(t,7),c=Math.max(2,Math.min(Math.ceil(t/2),4)),h=Math.min(t+1,8),f=[{name:u?"Breathable linen shirts / tees":"Comfortable t-shirts",qty:String(d),checked:!1},{name:l?"Warm trousers / fleece-lined pants":"Comfortable trousers / shorts",qty:String(c),checked:!1},{name:"Underwear & socks",qty:String(h),checked:!1},{name:"Sleepwear / Loungewear",qty:"2",checked:!1}];l&&f.push({name:"Heavy Fleece / Down Jacket",qty:"1",checked:!1},{name:"Thermal Innerwear Sets",qty:"2",checked:!1},{name:"Woolen Beanie & Gloves",qty:"1 set",checked:!1}),u&&f.push({name:"Quick-dry Swimwear & Beach Coverups",qty:"2 sets",checked:!1},{name:"UV Protection Sunglasses",qty:"1 pair",checked:!1},{name:"Sun Hat / Visor",qty:"1",checked:!1});const E=[{name:"Travel Toothbrush & Paste",qty:"1 set",checked:!1},{name:"Shampoo & Body Wash Sachet",qty:"1 bottle",checked:!1},{name:"Deodorant / Perfume Spray",qty:"1",checked:!1},{name:u?"Sunscreen Broad Spectrum SPF50+":"Moisturizer / Lip Balm",qty:"1 bottle",checked:!1}],I=[{name:"Passport / Government ID original & copies",qty:"1 set",checked:!1},{name:"Flight Tickets & Hotel Vouchers (Printed/PDF)",qty:"1 file",checked:!1},{name:"Credit/Debit Cards & Local Cash",qty:"As needed",checked:!1},{name:"Travel Insurance Card / Policy copy",qty:"1",checked:!1}],A=[{name:"Smartphone & Fast Charger",qty:"1 set",checked:!1},{name:"Power Bank (10,000mAh+)",qty:"1",checked:!1},{name:"Universal Travel Plug Adapter",qty:"1",checked:!1}],y=[];return g?y.push({name:"Ankle-Support Trekking Boots",qty:"1 pair",checked:!1},{name:"Hydration Flask / Insulated Bottle",qty:"1 L",checked:!1},{name:"First Aid & Bandage Kit",qty:"1 pouch",checked:!1},{name:"Electrolyte Packets & Energy Bars",qty:"5 packs",checked:!1}):y.push({name:"Comfortable Walking Sneakers / Sandals",qty:"1 pair",checked:!1},{name:"Compact Daypack Backpack",qty:"1",checked:!1}),{reasoning:`Reasoning Logic (${t} Days in ${e}): Calculated ${d} tops and ${c} pants based on a ${t}-day duration rule. ${l?"Detected cold/chilly alpine climate — added thermal innerwear, down jacket, and woolen gear.":u?"Detected tropical/coastal climate — prioritized UV SPF50+, quick-dry swimwear, and breathable fabrics.":"Selected versatile smart casual wardrobe for mild climate."} ${g?"Included trekking boots, hydration flask, and emergency first aid for active terrain.":""}`,modelUsed:"Smart Reasoning Logic Engine",items:[{category:"Clothing",items:f},{category:"Toiletries",items:E},{category:"Documents & Money",items:I},{category:"Electronics",items:A},{category:g?"Outdoor & Trekking Gear":"Essentials & Meds",items:y}]}},st=async(e,t,n,i,s,a="meta-llama/llama-3.3-70b-instruct:free")=>{if(a==="smart-logic-engine")return H(e,t,n,i);const o=`
  You are an expert travel assistant for SHRAWELLO Travel Hub.
  Generate a detailed packing checklist for a trip to "${e}" for ${t} days.
  The weather will be: ${n}.
  The planned activity level is: ${i}.
  The trip/itinerary category is: ${s}.

  Analyze the trip duration (${t} days), destination climate (${n}), and activity profile (${i}) with careful reasoning.

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
  `;try{const r=await ue();let l="";if(r.enabled&&r.apiKey){const g=async d=>{var f,E,I;const c=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${r.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify({model:d,messages:[{role:"user",content:o}]})});if(!c.ok)throw new Error(`OpenRouter (${c.status}): ${await c.text()}`);return((I=(E=(f=(await c.json()).choices)==null?void 0:f[0])==null?void 0:E.message)==null?void 0:I.content)||""};try{l=await g(a)}catch(d){console.warn(`[AI] Selected model ${a} failed, trying LLaMA 3.3 70B free fallback:`,d),l=await g("meta-llama/llama-3.3-70b-instruct:free")}}else l=await T(o);const u=N(l);return u&&Array.isArray(u)?{reasoning:`AI Reasoning (${t} Days in ${e}): Curated ${t}-day packing checklist for ${n} weather and ${i} activities.`,modelUsed:a,items:u}:u&&u.items&&Array.isArray(u.items)?{reasoning:u.reasoning||`AI Reasoning (${t} Days in ${e}): Customized items for ${n} and ${i}.`,modelUsed:a,items:u.items}:H(e,t,n,i,s)}catch(r){return console.warn("OpenRouter Free AI call failed, falling back to Smart Reasoning Engine:",r),H(e,t,n,i)}};export{it as O,Ze as a,et as b,tt as c,nt as d,st as e,ze as g,Xe as p,Qe as r};
