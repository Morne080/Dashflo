import{j as s,c as t}from"./app-Dj4Zne68.js";import{B as r}from"./button-DdGWmaEZ.js";import{c as o}from"./createLucideIcon-DSshzTaM.js";/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],c=o("chevron-left",n);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],a=o("chevron-right",i);function x({paginator:e,label:l}){return s.jsxs("div",{className:"flex flex-col gap-2 border-t border-border bg-muted/30 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between",children:[s.jsxs("p",{className:"text-muted-foreground",children:[l,": page ",e.current_page," of ",e.last_page," (",e.total," total)"]}),s.jsxs("div",{className:"flex gap-2",children:[s.jsxs(r,{type:"button",variant:"outline",size:"sm",disabled:!e.prev_page_url,onClick:()=>e.prev_page_url&&t.get(e.prev_page_url),children:[s.jsx(c,{className:"size-4"}),"Previous"]}),s.jsxs(r,{type:"button",variant:"outline",size:"sm",disabled:!e.next_page_url,onClick:()=>e.next_page_url&&t.get(e.next_page_url),children:["Next",s.jsx(a,{className:"size-4"})]})]})]})}export{x as P};
