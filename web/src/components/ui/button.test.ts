import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {Button} from './button';
for(const label of ['Refresh analytics','Export CSV']) it(`${label} has native disabled semantics during SSR`,()=>{
 const html=renderToString(createElement(Button,{disabled:true},label));
 expect(html).toMatch(/<button\b/);expect(html).toMatch(/\sdisabled=""/);expect(html).toMatch(/data-disabled=""/);
});
it('keeps enabled and focusable-disabled semantics distinct',()=>{
 expect(renderToString(createElement(Button,{disabled:false},'Refresh'))).not.toMatch(/\sdisabled=""/);
 const html=renderToString(createElement(Button,{disabled:true,focusableWhenDisabled:true},'Unavailable'));
 expect(html).not.toMatch(/\sdisabled=""/);expect(html).toMatch(/aria-disabled="true"/);
});
it('renders custom links with aria-disabled, without native disabled',()=>{
 const html=renderToString(createElement(Button,{disabled:true,nativeButton:false,render:createElement('a',{href:'/'})},'Back'));
 expect(html).toMatch(/<a\b/);expect(html).toMatch(/aria-disabled="true"/);expect(html).not.toMatch(/\sdisabled=""/);
});
