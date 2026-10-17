export function el(tag,text='',className=''){
  const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;
}
export function button(text,action,primary=false){const node=el('button',text,primary?'primary-button':'secondary-button');node.type='button';node.addEventListener('click',action);return node;}
export function figure(activity,prefix){
  const node=el('figure','','circuit-figure fet-circuit');node.tabIndex=0;node.setAttribute('aria-label','原创电路图；小屏可在图内横向滚动，聚焦后可用方向键。');
  return node;
}
