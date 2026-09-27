// Read DOM values that do not require layout before changing them. Comparing the
// actual value also respects event handlers that update the same element.
export function setText(element,value){const text=value==null?'':String(value);if(element.textContent!==text)element.textContent=text;}
export function setHidden(element,hidden){if(element.hidden!==hidden)element.hidden=hidden;}
export function setAttribute(element,name,value){const text=String(value);if(element.getAttribute(name)!==text)element.setAttribute(name,text);}
export function setData(element,name,value){const text=String(value);if(element.dataset[name]!==text)element.dataset[name]=text;}
export function setStyle(element,name,value){const text=String(value);if(element.style[name]!==text)element.style[name]=text;}
