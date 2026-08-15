import{k as de}from"./index-BKqbLQB8.js";var q;(function(e){e.STRING="string",e.NUMBER="number",e.INTEGER="integer",e.BOOLEAN="boolean",e.ARRAY="array",e.OBJECT="object"})(q||(q={}));/**
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
 */var F;(function(e){e.LANGUAGE_UNSPECIFIED="language_unspecified",e.PYTHON="python"})(F||(F={}));var U;(function(e){e.OUTCOME_UNSPECIFIED="outcome_unspecified",e.OUTCOME_OK="outcome_ok",e.OUTCOME_FAILED="outcome_failed",e.OUTCOME_DEADLINE_EXCEEDED="outcome_deadline_exceeded"})(U||(U={}));/**
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
 */const H=["user","model","function","system"];var j;(function(e){e.HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",e.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",e.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",e.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",e.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT",e.HARM_CATEGORY_CIVIC_INTEGRITY="HARM_CATEGORY_CIVIC_INTEGRITY"})(j||(j={}));var Y;(function(e){e.HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",e.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",e.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",e.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",e.BLOCK_NONE="BLOCK_NONE"})(Y||(Y={}));var B;(function(e){e.HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",e.NEGLIGIBLE="NEGLIGIBLE",e.LOW="LOW",e.MEDIUM="MEDIUM",e.HIGH="HIGH"})(B||(B={}));var K;(function(e){e.BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",e.SAFETY="SAFETY",e.OTHER="OTHER"})(K||(K={}));var _;(function(e){e.FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",e.STOP="STOP",e.MAX_TOKENS="MAX_TOKENS",e.SAFETY="SAFETY",e.RECITATION="RECITATION",e.LANGUAGE="LANGUAGE",e.BLOCKLIST="BLOCKLIST",e.PROHIBITED_CONTENT="PROHIBITED_CONTENT",e.SPII="SPII",e.MALFORMED_FUNCTION_CALL="MALFORMED_FUNCTION_CALL",e.OTHER="OTHER"})(_||(_={}));var V;(function(e){e.TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",e.RETRIEVAL_QUERY="RETRIEVAL_QUERY",e.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",e.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",e.CLASSIFICATION="CLASSIFICATION",e.CLUSTERING="CLUSTERING"})(V||(V={}));var J;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.AUTO="AUTO",e.ANY="ANY",e.NONE="NONE"})(J||(J={}));var W;(function(e){e.MODE_UNSPECIFIED="MODE_UNSPECIFIED",e.MODE_DYNAMIC="MODE_DYNAMIC"})(W||(W={}));/**
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
 */class y extends Error{constructor(t){super(`[GoogleGenerativeAI Error]: ${t}`)}}class A extends y{constructor(t,n){super(t),this.response=n}}class ie extends y{constructor(t,n,s,i){super(t),this.status=n,this.statusText=s,this.errorDetails=i}}class I extends y{}class ae extends y{}/**
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
 */const ue="https://generativelanguage.googleapis.com",fe="v1beta",he="0.24.1",ge="genai-js";var w;(function(e){e.GENERATE_CONTENT="generateContent",e.STREAM_GENERATE_CONTENT="streamGenerateContent",e.COUNT_TOKENS="countTokens",e.EMBED_CONTENT="embedContent",e.BATCH_EMBED_CONTENTS="batchEmbedContents"})(w||(w={}));class pe{constructor(t,n,s,i,a){this.model=t,this.task=n,this.apiKey=s,this.stream=i,this.requestOptions=a}toString(){var t,n;const s=((t=this.requestOptions)===null||t===void 0?void 0:t.apiVersion)||fe;let a=`${((n=this.requestOptions)===null||n===void 0?void 0:n.baseUrl)||ue}/${s}/${this.model}:${this.task}`;return this.stream&&(a+="?alt=sse"),a}}function me(e){const t=[];return e!=null&&e.apiClient&&t.push(e.apiClient),t.push(`${ge}/${he}`),t.join(" ")}async function ye(e){var t;const n=new Headers;n.append("Content-Type","application/json"),n.append("x-goog-api-client",me(e.requestOptions)),n.append("x-goog-api-key",e.apiKey);let s=(t=e.requestOptions)===null||t===void 0?void 0:t.customHeaders;if(s){if(!(s instanceof Headers))try{s=new Headers(s)}catch(i){throw new I(`unable to convert customHeaders value ${JSON.stringify(s)} to Headers: ${i.message}`)}for(const[i,a]of s.entries()){if(i==="x-goog-api-key")throw new I(`Cannot set reserved header name ${i}`);if(i==="x-goog-api-client")throw new I(`Header name ${i} can only be set using the apiClient field`);n.append(i,a)}}return n}async function Ee(e,t,n,s,i,a){const o=new pe(e,t,n,s,a);return{url:o.toString(),fetchOptions:Object.assign(Object.assign({},Se(a)),{method:"POST",headers:await ye(o),body:i})}}async function $(e,t,n,s,i,a={},o=fetch){const{url:r,fetchOptions:l}=await Ee(e,t,n,s,i,a);return ve(r,l,o)}async function ve(e,t,n=fetch){let s;try{s=await n(e,t)}catch(i){Ce(i,e)}return s.ok||await Ie(s,e),s}function Ce(e,t){let n=e;throw n.name==="AbortError"?(n=new ae(`Request aborted when fetching ${t.toString()}: ${e.message}`),n.stack=e.stack):e instanceof ie||e instanceof I||(n=new y(`Error fetching from ${t.toString()}: ${e.message}`),n.stack=e.stack),n}async function Ie(e,t){let n="",s;try{const i=await e.json();n=i.error.message,i.error.details&&(n+=` ${JSON.stringify(i.error.details)}`,s=i.error.details)}catch{}throw new ie(`Error fetching from ${t.toString()}: [${e.status} ${e.statusText}] ${n}`,e.status,e.statusText,s)}function Se(e){const t={};if((e==null?void 0:e.signal)!==void 0||(e==null?void 0:e.timeout)>=0){const n=new AbortController;(e==null?void 0:e.timeout)>=0&&setTimeout(()=>n.abort(),e.timeout),e!=null&&e.signal&&e.signal.addEventListener("abort",()=>{n.abort()}),t.signal=n.signal}return t}/**
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
 */function G(e){return e.text=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),L(e.candidates[0]))throw new A(`${C(e)}`,e);return we(e)}else if(e.promptFeedback)throw new A(`Text not available. ${C(e)}`,e);return""},e.functionCall=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),L(e.candidates[0]))throw new A(`${C(e)}`,e);return console.warn("response.functionCall() is deprecated. Use response.functionCalls() instead."),z(e)[0]}else if(e.promptFeedback)throw new A(`Function call not available. ${C(e)}`,e)},e.functionCalls=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`),L(e.candidates[0]))throw new A(`${C(e)}`,e);return z(e)}else if(e.promptFeedback)throw new A(`Function call not available. ${C(e)}`,e)},e}function we(e){var t,n,s,i;const a=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const o of(i=(s=e.candidates)===null||s===void 0?void 0:s[0].content)===null||i===void 0?void 0:i.parts)o.text&&a.push(o.text),o.executableCode&&a.push("\n```"+o.executableCode.language+`
`+o.executableCode.code+"\n```\n"),o.codeExecutionResult&&a.push("\n```\n"+o.codeExecutionResult.output+"\n```\n");return a.length>0?a.join(""):""}function z(e){var t,n,s,i;const a=[];if(!((n=(t=e.candidates)===null||t===void 0?void 0:t[0].content)===null||n===void 0)&&n.parts)for(const o of(i=(s=e.candidates)===null||s===void 0?void 0:s[0].content)===null||i===void 0?void 0:i.parts)o.functionCall&&a.push(o.functionCall);if(a.length>0)return a}const Oe=[_.RECITATION,_.SAFETY,_.LANGUAGE];function L(e){return!!e.finishReason&&Oe.includes(e.finishReason)}function C(e){var t,n,s;let i="";if((!e.candidates||e.candidates.length===0)&&e.promptFeedback)i+="Response was blocked",!((t=e.promptFeedback)===null||t===void 0)&&t.blockReason&&(i+=` due to ${e.promptFeedback.blockReason}`),!((n=e.promptFeedback)===null||n===void 0)&&n.blockReasonMessage&&(i+=`: ${e.promptFeedback.blockReasonMessage}`);else if(!((s=e.candidates)===null||s===void 0)&&s[0]){const a=e.candidates[0];L(a)&&(i+=`Candidate was blocked due to ${a.finishReason}`,a.finishMessage&&(i+=`: ${a.finishMessage}`))}return i}function N(e){return this instanceof N?(this.v=e,this):new N(e)}function Re(e,t,n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var s=n.apply(e,t||[]),i,a=[];return i={},o("next"),o("throw"),o("return"),i[Symbol.asyncIterator]=function(){return this},i;function o(c){s[c]&&(i[c]=function(d){return new Promise(function(h,g){a.push([c,d,h,g])>1||r(c,d)})})}function r(c,d){try{l(s[c](d))}catch(h){f(a[0][3],h)}}function l(c){c.value instanceof N?Promise.resolve(c.value.v).then(u,p):f(a[0][2],c)}function u(c){r("next",c)}function p(c){r("throw",c)}function f(c,d){c(d),a.shift(),a.length&&r(a[0][0],a[0][1])}}/**
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
 */const Q=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;function Ae(e){const t=e.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),n=_e(t),[s,i]=n.tee();return{stream:Te(s),response:be(i)}}async function be(e){const t=[],n=e.getReader();for(;;){const{done:s,value:i}=await n.read();if(s)return G(Ne(t));t.push(i)}}function Te(e){return Re(this,arguments,function*(){const n=e.getReader();for(;;){const{value:s,done:i}=yield N(n.read());if(i)break;yield yield N(G(s))}})}function _e(e){const t=e.getReader();return new ReadableStream({start(s){let i="";return a();function a(){return t.read().then(({value:o,done:r})=>{if(r){if(i.trim()){s.error(new y("Failed to parse stream"));return}s.close();return}i+=o;let l=i.match(Q),u;for(;l;){try{u=JSON.parse(l[1])}catch{s.error(new y(`Error parsing JSON response: "${l[1]}"`));return}s.enqueue(u),i=i.substring(l[0].length),l=i.match(Q)}return a()}).catch(o=>{let r=o;throw r.stack=o.stack,r.name==="AbortError"?r=new ae("Request aborted when reading from the stream"):r=new y("Error reading from the stream"),r})}}})}function Ne(e){const t=e[e.length-1],n={promptFeedback:t==null?void 0:t.promptFeedback};for(const s of e){if(s.candidates){let i=0;for(const a of s.candidates)if(n.candidates||(n.candidates=[]),n.candidates[i]||(n.candidates[i]={index:i}),n.candidates[i].citationMetadata=a.citationMetadata,n.candidates[i].groundingMetadata=a.groundingMetadata,n.candidates[i].finishReason=a.finishReason,n.candidates[i].finishMessage=a.finishMessage,n.candidates[i].safetyRatings=a.safetyRatings,a.content&&a.content.parts){n.candidates[i].content||(n.candidates[i].content={role:a.content.role||"user",parts:[]});const o={};for(const r of a.content.parts)r.text&&(o.text=r.text),r.functionCall&&(o.functionCall=r.functionCall),r.executableCode&&(o.executableCode=r.executableCode),r.codeExecutionResult&&(o.codeExecutionResult=r.codeExecutionResult),Object.keys(o).length===0&&(o.text=""),n.candidates[i].content.parts.push(o)}i++}s.usageMetadata&&(n.usageMetadata=s.usageMetadata)}return n}/**
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
 */async function oe(e,t,n,s){const i=await $(t,w.STREAM_GENERATE_CONTENT,e,!0,JSON.stringify(n),s);return Ae(i)}async function re(e,t,n,s){const a=await(await $(t,w.GENERATE_CONTENT,e,!1,JSON.stringify(n),s)).json();return{response:G(a)}}/**
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
 */function ce(e){if(e!=null){if(typeof e=="string")return{role:"system",parts:[{text:e}]};if(e.text)return{role:"system",parts:[e]};if(e.parts)return e.role?e:{role:"system",parts:e.parts}}}function k(e){let t=[];if(typeof e=="string")t=[{text:e}];else for(const n of e)typeof n=="string"?t.push({text:n}):t.push(n);return ke(t)}function ke(e){const t={role:"user",parts:[]},n={role:"function",parts:[]};let s=!1,i=!1;for(const a of e)"functionResponse"in a?(n.parts.push(a),i=!0):(t.parts.push(a),s=!0);if(s&&i)throw new y("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");if(!s&&!i)throw new y("No content is provided for sending chat message.");return s?t:n}function $e(e,t){var n;let s={model:t==null?void 0:t.model,generationConfig:t==null?void 0:t.generationConfig,safetySettings:t==null?void 0:t.safetySettings,tools:t==null?void 0:t.tools,toolConfig:t==null?void 0:t.toolConfig,systemInstruction:t==null?void 0:t.systemInstruction,cachedContent:(n=t==null?void 0:t.cachedContent)===null||n===void 0?void 0:n.name,contents:[]};const i=e.generateContentRequest!=null;if(e.contents){if(i)throw new I("CountTokensRequest must have one of contents or generateContentRequest, not both.");s.contents=e.contents}else if(i)s=Object.assign(Object.assign({},s),e.generateContentRequest);else{const a=k(e);s.contents=[a]}return{generateContentRequest:s}}function X(e){let t;return e.contents?t=e:t={contents:[k(e)]},e.systemInstruction&&(t.systemInstruction=ce(e.systemInstruction)),t}function Me(e){return typeof e=="string"||Array.isArray(e)?{content:k(e)}:e}/**
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
 */const Z=["text","inlineData","functionCall","functionResponse","executableCode","codeExecutionResult"],De={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall","executableCode","codeExecutionResult"],system:["text"]};function Le(e){let t=!1;for(const n of e){const{role:s,parts:i}=n;if(!t&&s!=="user")throw new y(`First content should be with role 'user', got ${s}`);if(!H.includes(s))throw new y(`Each item should include role field. Got ${s} but valid roles are: ${JSON.stringify(H)}`);if(!Array.isArray(i))throw new y("Content should have 'parts' property with an array of Parts");if(i.length===0)throw new y("Each Content should have at least one part");const a={text:0,inlineData:0,functionCall:0,functionResponse:0,fileData:0,executableCode:0,codeExecutionResult:0};for(const r of i)for(const l of Z)l in r&&(a[l]+=1);const o=De[s];for(const r of Z)if(!o.includes(r)&&a[r]>0)throw new y(`Content with role '${s}' can't contain '${r}' part`);t=!0}}function ee(e){var t;if(e.candidates===void 0||e.candidates.length===0)return!1;const n=(t=e.candidates[0])===null||t===void 0?void 0:t.content;if(n===void 0||n.parts===void 0||n.parts.length===0)return!1;for(const s of n.parts)if(s===void 0||Object.keys(s).length===0||s.text!==void 0&&s.text==="")return!1;return!0}/**
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
 */const te="SILENT_ERROR";class xe{constructor(t,n,s,i={}){this.model=n,this.params=s,this._requestOptions=i,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=t,s!=null&&s.history&&(Le(s.history),this._history=s.history)}async getHistory(){return await this._sendPromise,this._history}async sendMessage(t,n={}){var s,i,a,o,r,l;await this._sendPromise;const u=k(t),p={safetySettings:(s=this.params)===null||s===void 0?void 0:s.safetySettings,generationConfig:(i=this.params)===null||i===void 0?void 0:i.generationConfig,tools:(a=this.params)===null||a===void 0?void 0:a.tools,toolConfig:(o=this.params)===null||o===void 0?void 0:o.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(l=this.params)===null||l===void 0?void 0:l.cachedContent,contents:[...this._history,u]},f=Object.assign(Object.assign({},this._requestOptions),n);let c;return this._sendPromise=this._sendPromise.then(()=>re(this._apiKey,this.model,p,f)).then(d=>{var h;if(ee(d.response)){this._history.push(u);const g=Object.assign({parts:[],role:"model"},(h=d.response.candidates)===null||h===void 0?void 0:h[0].content);this._history.push(g)}else{const g=C(d.response);g&&console.warn(`sendMessage() was unsuccessful. ${g}. Inspect response object for details.`)}c=d}).catch(d=>{throw this._sendPromise=Promise.resolve(),d}),await this._sendPromise,c}async sendMessageStream(t,n={}){var s,i,a,o,r,l;await this._sendPromise;const u=k(t),p={safetySettings:(s=this.params)===null||s===void 0?void 0:s.safetySettings,generationConfig:(i=this.params)===null||i===void 0?void 0:i.generationConfig,tools:(a=this.params)===null||a===void 0?void 0:a.tools,toolConfig:(o=this.params)===null||o===void 0?void 0:o.toolConfig,systemInstruction:(r=this.params)===null||r===void 0?void 0:r.systemInstruction,cachedContent:(l=this.params)===null||l===void 0?void 0:l.cachedContent,contents:[...this._history,u]},f=Object.assign(Object.assign({},this._requestOptions),n),c=oe(this._apiKey,this.model,p,f);return this._sendPromise=this._sendPromise.then(()=>c).catch(d=>{throw new Error(te)}).then(d=>d.response).then(d=>{if(ee(d)){this._history.push(u);const h=Object.assign({},d.candidates[0].content);h.role||(h.role="model"),this._history.push(h)}else{const h=C(d);h&&console.warn(`sendMessageStream() was unsuccessful. ${h}. Inspect response object for details.`)}}).catch(d=>{d.message!==te&&console.error(d)}),c}}/**
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
 */async function Ge(e,t,n,s){return(await $(t,w.COUNT_TOKENS,e,!1,JSON.stringify(n),s)).json()}/**
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
 */async function Pe(e,t,n,s){return(await $(t,w.EMBED_CONTENT,e,!1,JSON.stringify(n),s)).json()}async function qe(e,t,n,s){const i=n.requests.map(o=>Object.assign(Object.assign({},o),{model:t}));return(await $(t,w.BATCH_EMBED_CONTENTS,e,!1,JSON.stringify({requests:i}),s)).json()}/**
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
 */class ne{constructor(t,n,s={}){this.apiKey=t,this._requestOptions=s,n.model.includes("/")?this.model=n.model:this.model=`models/${n.model}`,this.generationConfig=n.generationConfig||{},this.safetySettings=n.safetySettings||[],this.tools=n.tools,this.toolConfig=n.toolConfig,this.systemInstruction=ce(n.systemInstruction),this.cachedContent=n.cachedContent}async generateContent(t,n={}){var s;const i=X(t),a=Object.assign(Object.assign({},this._requestOptions),n);return re(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(s=this.cachedContent)===null||s===void 0?void 0:s.name},i),a)}async generateContentStream(t,n={}){var s;const i=X(t),a=Object.assign(Object.assign({},this._requestOptions),n);return oe(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(s=this.cachedContent)===null||s===void 0?void 0:s.name},i),a)}startChat(t){var n;return new xe(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:(n=this.cachedContent)===null||n===void 0?void 0:n.name},t),this._requestOptions)}async countTokens(t,n={}){const s=$e(t,{model:this.model,generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:this.cachedContent}),i=Object.assign(Object.assign({},this._requestOptions),n);return Ge(this.apiKey,this.model,s,i)}async embedContent(t,n={}){const s=Me(t),i=Object.assign(Object.assign({},this._requestOptions),n);return Pe(this.apiKey,this.model,s,i)}async batchEmbedContents(t,n={}){const s=Object.assign(Object.assign({},this._requestOptions),n);return qe(this.apiKey,this.model,t,s)}}/**
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
 */class Fe{constructor(t){this.apiKey=t}getGenerativeModel(t,n){if(!t.model)throw new y("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new ne(this.apiKey,t,n)}getGenerativeModelFromCachedContent(t,n,s){if(!t.name)throw new I("Cached content must contain a `name` field.");if(!t.model)throw new I("Cached content must contain a `model` field.");const i=["model","systemInstruction"];for(const o of i)if(n!=null&&n[o]&&t[o]&&(n==null?void 0:n[o])!==t[o]){if(o==="model"){const r=n.model.startsWith("models/")?n.model.replace("models/",""):n.model,l=t.model.startsWith("models/")?t.model.replace("models/",""):t.model;if(r===l)continue}throw new I(`Different value for "${o}" specified in modelParams (${n[o]}) and cachedContent (${t[o]})`)}const a=Object.assign(Object.assign({},n),{model:t.model,tools:t.tools,toolConfig:t.toolConfig,systemInstruction:t.systemInstruction,cachedContent:t});return new ne(this.apiKey,a,s)}}const Ue="AIzaSyCiJ4EKsxdQInVDkmN9aLo5SO0tigZwfvc";let T=null;T=new Fe(Ue);let D=null,se=0;const He=async()=>{const e=Date.now();if(D&&e-se<1e3*60*15)return D;try{const t=await fetch("https://openrouter.ai/api/v1/models");if(t.ok){const n=await t.json();if(n&&Array.isArray(n.data)){const s=n.data.filter(i=>{var a;return i.id&&(i.id.endsWith(":free")||i.id==="openrouter/free"||((a=i.pricing)==null?void 0:a.prompt)==="0")}).map(i=>i.id);if(s.length>0)return D=["openrouter/free",...s],se=e,D}}}catch(t){console.warn("[OpenRouter] Could not fetch live models list:",t)}return["openrouter/free","google/gemma-4-31b-it:free","google/gemma-4-26b-a4b-it:free","openai/gpt-oss-20b:free","nvidia/nemotron-3-super-120b-a12b:free","nvidia/nemotron-3-ultra-550b-a55b:free","nvidia/nemotron-3.5-lightning:free","meta-llama/llama-3.3-70b-instruct:free","deepseek/deepseek-r1:free","qwen/qwen-2.5-72b-instruct:free","mistralai/mistral-small-24b-instruct-2501:free"]},le=async()=>{try{const e=await de.getSettings(),t=(e==null?void 0:e.data)||[],n={enabled:!1,apiKey:"",defaultModel:"openrouter/free"};return t&&Array.isArray(t)&&t.forEach(s=>{if(s.key==="integrations.openrouter.enabled")try{n.enabled=JSON.parse(s.value)}catch{}else if(s.key==="integrations.openrouter.apiKey")try{n.apiKey=JSON.parse(s.value)}catch{}else if(s.key==="integrations.openrouter.defaultModel")try{n.defaultModel=JSON.parse(s.value)}catch{}}),n}catch(e){return console.warn("[OpenRouter Config] Failed to load settings from DB, using fallback:",e),{enabled:!1,apiKey:"",defaultModel:"openrouter/free"}}},S=async(e,t)=>{var s,i;const n=await le();if(n.enabled&&n.apiKey){const a=(n.defaultModel||"openrouter/free").replace(/^["']|["']$/g,"").trim(),o=await He(),r=[];if(a&&(r.push(a),!a.endsWith(":free")&&a!=="openrouter/free")){const f=`${a}:free`;o.includes(f)&&r.push(f)}r.push("openrouter/free"),r.push(...o),r.push("google/gemma-4-31b-it:free","google/gemma-4-26b-a4b-it:free","openai/gpt-oss-20b:free","nvidia/nemotron-3-super-120b-a12b:free","nvidia/nemotron-3-ultra-550b-a55b:free","nvidia/nemotron-3.5-lightning:free","meta-llama/llama-3.3-70b-instruct:free","deepseek/deepseek-r1:free","qwen/qwen-2.5-72b-instruct:free","mistralai/mistral-small-24b-instruct-2501:free");const l=Array.from(new Set(r.filter(Boolean))),u=async f=>{var g;let c;if(t){const E=t.split(",")[1]||t,R=((g=t.match(/data:([^;]+);/))==null?void 0:g[1])||"image/jpeg";c={model:f,messages:[{role:"user",content:[{type:"text",text:e},{type:"image_url",image_url:{url:`data:${R};base64,${E}`}}]}]}}else c={model:f,messages:[{role:"user",content:e}]};const d=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify(c)});if(!d.ok){const E=await d.text();throw new Error(`OpenRouter Error (${d.status}): ${E}`)}const h=await d.json();if(!h.choices||h.choices.length===0)throw new Error("OpenRouter returned an empty response.");return h.choices[0].message.content};let p=null;for(const f of l)try{return console.log(`[AI] Attempting OpenRouter call with model: ${f}`),await u(f)}catch(c){console.warn(`[AI] OpenRouter model ${f} failed (${(c==null?void 0:c.message)||c}). Trying next free model in queue...`),p=c}if(T){console.warn("[AI] All OpenRouter models exhausted. Falling back to direct Google Gemini API...");try{const f=T.getGenerativeModel({model:"gemini-1.5-flash"});if(t){const c=t.split(",")[1]||t,d=((s=t.match(/data:([^;]+);/))==null?void 0:s[1])||"image/jpeg",h={inlineData:{data:c,mimeType:d}};return(await f.generateContent([e,h])).response.text()}else return(await f.generateContent(e)).response.text()}catch(f){console.error("[AI] Direct Gemini fallback also failed:",f)}}throw p||new Error("AI service temporarily unavailable. Please check your OpenRouter API key in Settings.")}else{if(console.log("[AI] Using direct Gemini API fallback"),!T)throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file or enable OpenRouter AI in Settings.");let a="gemini-1.5-flash";n.defaultModel&&n.defaultModel.replace(/^["']|["']$/g,"").toLowerCase().includes("pro")&&(a="gemini-1.5-pro");const o=T.getGenerativeModel({model:a});if(t){const r=t.split(",")[1]||t,l=((i=t.match(/data:([^;]+);/))==null?void 0:i[1])||"image/jpeg",u={inlineData:{data:r,mimeType:l}};return(await o.generateContent([e,u])).response.text()}else return(await o.generateContent(e)).response.text()}},O=e=>{if(!e)return null;let t=e.replace(/<think>[\s\S]*?<\/think>/gi,"").trim();t=t.replace(/```json/gi,"").replace(/```/g,"").trim();const n=t.indexOf("{"),s=t.indexOf("[");let i=-1,a=-1;n!==-1&&s!==-1?n<s?(i=n,a=t.lastIndexOf("}")):(i=s,a=t.lastIndexOf("]")):n!==-1?(i=n,a=t.lastIndexOf("}")):s!==-1&&(i=s,a=t.lastIndexOf("]")),i!==-1&&a!==-1&&a>i&&(t=t.substring(i,a+1)),t=t.replace(/,\s*([}\]])/g,"$1");try{return JSON.parse(t)}catch(o){const r=t.match(/\{[\s\S]*\}|\[[\s\S]*\]/);if(r)return JSON.parse(r[0].replace(/,\s*([}\]])/g,"$1"));throw o}},Ye=async(e,t,n,s,i)=>{let a;typeof e=="object"?a=e:a={destination:e,days:3,travelers:"2 Adults",startDate:"Upcoming",...i};const{destination:o,destinationsList:r,days:l,travelers:u,startDate:p,tripStyle:f="Balanced Vacation",pace:c="Balanced",interests:d=[],specialRequests:h="",masterContext:g}=a;let E="";if(g){const v=(g.hotels||[]).slice(0,8).map(m=>`- Hotel: "${m.name}" (ID: ${m.id}, ${m.stars||4}★, ₹${m.price||0}/night, Area: ${m.area||o})`).join(`
`),M=(g.activities||[]).slice(0,12).map(m=>`- Activity: "${m.name}" (ID: ${m.id}, ₹${m.cost||0}, ${m.duration||"2h"}, Category: ${m.category||"Sightseeing"})`).join(`
`),P=(g.transports||[]).slice(0,4).map(m=>`- Vehicle: "${m.name}" (ID: ${m.id}, ₹${m.cost||0}/day, ${m.type||"SUV"})`).join(`
`);E=`
AVAILABLE AGENCY MASTER DATABASE INVENTORY (Use matching ID and names where appropriate):
${v?`[Hotels]
${v}
`:""}
${M?`[Activities]
${M}
`:""}
${P?`[Transports]
${P}
`:""}
If an item from the master inventory fits the itinerary, use its exact name, "masterId", and estimated cost. Otherwise, you may suggest premier local activities.
`}let R="";r&&r.length>1&&(R=`
MULTI-DESTINATION ITINERARY ROUTE:
${r.map((v,M)=>`Leg ${M+1}: ${v.name} (${v.nights} Nights)`).join(" -> ")}
Please ensure that inter-destination travel, hotel check-outs, and scenic transfers are scheduled realistically on transit days.
`);const b=`
You are a World-Class Destination Management Company (DMC) Senior Tour Designer for SHRAWELLO Travel Hub.
Design an experiential, seamless, and premium ${l}-day itinerary for ${o}.

TRIP PARAMETERS:
- Travelers: ${u}
- Trip Dates: Starts on ${p} (${l} Days)
- Trip Style & Vibe: ${f}
- Travel Pace: ${c} (e.g. Relaxed: 1-2 curated highlights per day; Balanced: 2-4 items; Explorer: 4-5 items)
- Specific Interests: ${d.length>0?d.join(", "):"Iconic sights, authentic culinary gems, scenic photography & local culture"}
${h?`- Special Notes/Requests: "${h}"`:""}
${R}
${E}

EXPERT TOUR DESIGN PRINCIPLES:
1. GEOGRAPHIC PROXIMITY: Group morning, afternoon, and evening sights in the same sector/neighborhood to minimize transit.
2. SENSORY & IMMERSIVE DESCRIPTIONS: Avoid plain 1-line text. Write vivid, engaging descriptions with highlights, atmosphere, and practical tips.
3. MULTI-SERVICE GRANULARITY: Categorize each line item strictly into:
   - "transport": Airport pickups, inter-city drives, scenic transfers, private cabs.
   - "hotel": Check-in and property relaxation on Day 1 or inter-city hotel switches.
   - "activity": Guided monuments, nature treks, boat cruises, heritage walks, culinary tours.
   - "guide": Monument escort or private local heritage guides.
   - "note": Essential local tips (e.g., dress codes for temples, altitude acclimation, best photo angles).
4. REALISTIC COSTS: Provide realistic estimated Net Costs in INR (₹) for private tours, entry fees, and transfers (do NOT just return 0 unless genuinely free).
5. INCLUSIONS & EXCLUSIONS: Generate 4-6 specific inclusions and 4-6 specific exclusions tailored to this exact trip.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact structure (no markdown fences, no leading/trailing commentary):
{
  "title": "A catchy, evocative luxury package title (e.g. 'Enchanting Kashmir: Houseboats, Glaciers & Mughal Splendor')",
  "highlights": ["3-4 bullet point key highlights of this holiday"],
  "included": ["Daily buffet breakfast at hotels", "Private AC vehicle for all transfers and sightseeing", "Sightseeing entry tickets & shikara ride"],
  "notIncluded": ["Personal expenses & tips", "Airfare unless specified", "Optional adventure water sports"],
  "days": [
    {
      "day": 1,
      "title": "Evocative Theme (e.g. 'Arrival in Paradise & Sunset Shikara on Dal Lake')",
      "notes": "Acclimatize at ease today. Keep warm shawl handy for the evening breeze.",
      "items": [
        {
          "time": "10:30 AM",
          "type": "transport",
          "title": "Private Airport Welcome & Hotel Transfer",
          "description": "Meet your private chauffeur at the arrivals terminal with a warm welcome. Enjoy a scenic drive to your resort with refreshing welcome drinks.",
          "cost": 1500,
          "duration": "45 Mins",
          "masterId": ""
        },
        {
          "time": "01:00 PM",
          "type": "hotel",
          "title": "Resort Check-In & Leisure Lunch",
          "description": "Check in to your deluxe lakefront room. Freshen up and savor traditional Kashmiri Wazwan or continental delicacies at the garden cafe.",
          "cost": 6500,
          "duration": "2 Hours",
          "masterId": ""
        },
        {
          "time": "05:00 PM",
          "type": "activity",
          "title": "Romantic Sunset Shikara Cruise on Dal Lake",
          "description": "Glide over tranquil waters through floating lotus gardens and the historic Char Chinar island as the sun casts a golden glow over Zabarwan hills.",
          "cost": 1200,
          "duration": "1.5 Hours",
          "masterId": ""
        }
      ]
    }
  ]
}
`;try{const v=await S(b);return O(v)}catch(v){throw console.error("Itinerary Generation Error:",v),v}},Be=async e=>{const{dayNumber:t,destination:n,currentItems:s,promptInstruction:i,travelers:a="2 Guests",tripStyle:o="Curated"}=e,r=`
You are an expert travel designer for SHRAWELLO Travel Hub.
Redesign Day ${t} of an itinerary in ${n} for ${a} (${o} style).

USER SPECIFIC REQUEST / MODIFICATION:
"${i}"

CURRENT ITEMS ON THIS DAY (FOR REFERENCE):
${JSON.stringify(s.map(u=>({title:u.title,type:u.type,time:u.time})))}

Create a refreshed, high-quality, geographically logical plan for Day ${t}.
Return ONLY a valid JSON object matching this structure:
{
  "day": ${t},
  "title": "New theme/title for this day",
  "notes": "Practical tip or reminder for this day",
  "items": [
    {
      "time": "09:30 AM",
      "type": "activity",
      "title": "Clear descriptive title",
      "description": "Vivid 2-sentence description with highlights and tips",
      "cost": 1500,
      "duration": "2.5 Hours"
    }
  ]
}
`,l=await S(r);return O(l)},Ke=async(e,t,n,s)=>{const i=`
You are a senior luxury travel copywriter. Polish and elevate this travel itinerary item into an evocative, irresistible brochure description.

Destination: ${s||"Destination"}
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
`,a=await S(i);return O(a)},Ve=async(e,t,n,s)=>{const i=(n||[]).slice(0,20).map(r=>`${r.type.toUpperCase()}: ${r.title}`).join(", "),a=`
You are a travel contracting specialist for SHRAWELLO Travel Hub.
Generate a comprehensive list of "Included" and "Not Included" package terms for a ${t}-day trip to ${e} (Custom Tour).

PLANNED ITINERARY ITEMS:
${i||"Standard private holiday package"}

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
`,o=await S(a);return O(o)},Je=async(e,t,n)=>{const s=`
You are a local tour guide and destination specialist for ${e}.
Create 4 to 5 essential, practical FAQs that travelers ask when planning a ${t}-day trip to ${e}.

Consider destination-specific topics such as:
1. Best season / weather conditions
2. Local permit requirements / ID proofs / Border passes
3. Recommended clothing / dress codes for temples or mountains
4. Health / altitude sickness precautions or packing advice
5. Local currency / SIM card / connectivity tips

Return ONLY a valid JSON array of FAQ objects:
[
  {
    "q": "What is the best time to visit ${e}?",
    "a": "Detailed, accurate answer..."
  },
  {
    "q": "Are special permits or IDs required for sightseeing?",
    "a": "Detailed, accurate answer..."
  }
]
`,i=await S(s);return O(i)},We=async e=>{const t=`
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
    `;try{const n=await S(t,e);return O(n)}catch(n){throw console.error("Invoice Parsing Failed",n),n}},ze=async(e,t)=>{const n=e.map(i=>({...i,staffName:t[i.staffId]||`Staff #${i.staffId}`})),s=`
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
    `;try{return await S(s)}catch(i){throw console.error("Weekly Standup Summary Failed",i),i}},Qe=[{id:"meta-llama/llama-3.3-70b-instruct:free",name:"Meta LLaMA 3.3 70B (Free AI)",provider:"OpenRouter"},{id:"deepseek/deepseek-r1:free",name:"DeepSeek R1 (Free Reasoning)",provider:"OpenRouter"},{id:"google/gemini-2.5-flash:free",name:"Gemini 2.5 Flash (Free AI)",provider:"OpenRouter"},{id:"qwen/qwen-2.5-coder-32b-instruct:free",name:"Qwen 2.5 Coder 32B (Free AI)",provider:"OpenRouter"},{id:"smart-logic-engine",name:"Instant Smart Reasoning Engine",provider:"Deterministic AI"}],x=(e,t,n,s,i)=>{const a=(e||"").toLowerCase(),o=(n||"").toLowerCase(),r=(s||"").toLowerCase(),l=a.includes("kashmir")||a.includes("himachal")||a.includes("swiss")||o.includes("cold")||o.includes("chilly")||o.includes("rain"),u=a.includes("bali")||a.includes("goa")||a.includes("kerala")||a.includes("maldives")||a.includes("beach")||o.includes("sunny")||o.includes("warm"),p=r.includes("trek")||r.includes("intense")||r.includes("hiking")||r.includes("adventure"),f=Math.min(t,7),c=Math.max(2,Math.min(Math.ceil(t/2),4)),d=Math.min(t+1,8),h=[{name:u?"Breathable linen shirts / tees":"Comfortable t-shirts",qty:String(f),checked:!1},{name:l?"Warm trousers / fleece-lined pants":"Comfortable trousers / shorts",qty:String(c),checked:!1},{name:"Underwear & socks",qty:String(d),checked:!1},{name:"Sleepwear / Loungewear",qty:"2",checked:!1}];l&&h.push({name:"Heavy Fleece / Down Jacket",qty:"1",checked:!1},{name:"Thermal Innerwear Sets",qty:"2",checked:!1},{name:"Woolen Beanie & Gloves",qty:"1 set",checked:!1}),u&&h.push({name:"Quick-dry Swimwear & Beach Coverups",qty:"2 sets",checked:!1},{name:"UV Protection Sunglasses",qty:"1 pair",checked:!1},{name:"Sun Hat / Visor",qty:"1",checked:!1});const g=[{name:"Travel Toothbrush & Paste",qty:"1 set",checked:!1},{name:"Shampoo & Body Wash Sachet",qty:"1 bottle",checked:!1},{name:"Deodorant / Perfume Spray",qty:"1",checked:!1},{name:u?"Sunscreen Broad Spectrum SPF50+":"Moisturizer / Lip Balm",qty:"1 bottle",checked:!1}],E=[{name:"Passport / Government ID original & copies",qty:"1 set",checked:!1},{name:"Flight Tickets & Hotel Vouchers (Printed/PDF)",qty:"1 file",checked:!1},{name:"Credit/Debit Cards & Local Cash",qty:"As needed",checked:!1},{name:"Travel Insurance Card / Policy copy",qty:"1",checked:!1}],R=[{name:"Smartphone & Fast Charger",qty:"1 set",checked:!1},{name:"Power Bank (10,000mAh+)",qty:"1",checked:!1},{name:"Universal Travel Plug Adapter",qty:"1",checked:!1}],b=[];return p?b.push({name:"Ankle-Support Trekking Boots",qty:"1 pair",checked:!1},{name:"Hydration Flask / Insulated Bottle",qty:"1 L",checked:!1},{name:"First Aid & Bandage Kit",qty:"1 pouch",checked:!1},{name:"Electrolyte Packets & Energy Bars",qty:"5 packs",checked:!1}):b.push({name:"Comfortable Walking Sneakers / Sandals",qty:"1 pair",checked:!1},{name:"Compact Daypack Backpack",qty:"1",checked:!1}),{reasoning:`Reasoning Logic (${t} Days in ${e}): Calculated ${f} tops and ${c} pants based on a ${t}-day duration rule. ${l?"Detected cold/chilly alpine climate — added thermal innerwear, down jacket, and woolen gear.":u?"Detected tropical/coastal climate — prioritized UV SPF50+, quick-dry swimwear, and breathable fabrics.":"Selected versatile smart casual wardrobe for mild climate."} ${p?"Included trekking boots, hydration flask, and emergency first aid for active terrain.":""}`,modelUsed:"Smart Reasoning Logic Engine",items:[{category:"Clothing",items:h},{category:"Toiletries",items:g},{category:"Documents & Money",items:E},{category:"Electronics",items:R},{category:p?"Outdoor & Trekking Gear":"Essentials & Meds",items:b}]}},Xe=async(e,t,n,s,i,a="meta-llama/llama-3.3-70b-instruct:free")=>{if(a==="smart-logic-engine")return x(e,t,n,s);const o=`
  You are an expert travel assistant for SHRAWELLO Travel Hub.
  Generate a detailed packing checklist for a trip to "${e}" for ${t} days.
  The weather will be: ${n}.
  The planned activity level is: ${s}.
  The trip/itinerary category is: ${i}.

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
  `;try{const r=await le();let l="";if(r.enabled&&r.apiKey){const p=async f=>{var h,g,E;const c=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${r.apiKey}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"Shrawello Travel Hub"},body:JSON.stringify({model:f,messages:[{role:"user",content:o}]})});if(!c.ok)throw new Error(`OpenRouter (${c.status}): ${await c.text()}`);return((E=(g=(h=(await c.json()).choices)==null?void 0:h[0])==null?void 0:g.message)==null?void 0:E.content)||""};try{l=await p(a)}catch(f){console.warn(`[AI] Selected model ${a} failed, trying LLaMA 3.3 70B free fallback:`,f),l=await p("meta-llama/llama-3.3-70b-instruct:free")}}else l=await S(o);const u=O(l);return u&&Array.isArray(u)?{reasoning:`AI Reasoning (${t} Days in ${e}): Curated ${t}-day packing checklist for ${n} weather and ${s} activities.`,modelUsed:a,items:u}:u&&u.items&&Array.isArray(u.items)?{reasoning:u.reasoning||`AI Reasoning (${t} Days in ${e}): Customized items for ${n} and ${s}.`,modelUsed:a,items:u.items}:x(e,t,n,s,i)}catch(r){return console.warn("OpenRouter Free AI call failed, falling back to Smart Reasoning Engine:",r),x(e,t,n,s)}};export{Qe as O,Ve as a,Je as b,We as c,ze as d,Xe as e,Ye as g,Ke as p,Be as r};
