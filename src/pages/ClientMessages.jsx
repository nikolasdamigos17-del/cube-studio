import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Send, MessageCircle, Paperclip } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';

export default function ClientMessages() {
  const { clientUser } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const load = async () => {
    if (!clientUser?.clientId) return;
    const msgs = await db.Message.filter({client_id:clientUser.clientId},'created_date',200);
    setMessages(msgs);
    // mark trainer messages as read
    const unread = msgs.filter(m => m.sender==='trainer'&&!m.read);
    await Promise.all(unread.map(m=>db.Message.update(m.id,{read:true})));
  };
  useEffect(() => { load(); const iv=setInterval(load,5000); return ()=>clearInterval(iv); }, [clientUser]);
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const send = async () => {
    if (!newMsg.trim()||!clientUser?.clientId) return;
    await db.Message.create({client_id:clientUser.clientId,client_name:clientUser.name||'',sender:'client',content:newMsg.trim(),read:false});
    setNewMsg(''); load();
  };

  return (
    <ClientLayout title="Messages">
      <div className="flex flex-col h-full" style={{height:'calc(100vh - 120px)'}}>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{backgroundColor:'var(--cp-bg)'}}>
          {messages.length===0&&<div className="text-center py-12" style={{color:'var(--cp-text-dim)'}}><MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="text-sm">No messages yet</p><p className="text-xs mt-1 opacity-70">Start the conversation with your trainer</p></div>}
          {messages.map((m)=>{
            const isClient=m.sender==='client';
            return (
              <div key={m.id} className={`flex ${isClient?'justify-end':'justify-start'}`}>
                {!isClient&&<div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold mr-2 mt-auto flex-shrink-0">T</div>}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm`} style={isClient?{backgroundColor:'var(--cp-accent)',color:'white',borderBottomRightRadius:4}:{backgroundColor:'var(--cp-card-bg)',color:'var(--cp-text)',border:'1px solid var(--cp-border)',borderBottomLeftRadius:4}}>
                  <p>{m.content}</p>
                  <p className="text-xs mt-1 opacity-60">{m.created_date?format(parseISO(m.created_date),'HH:mm'):''}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
        <div className="px-4 py-3 border-t" style={{backgroundColor:'var(--cp-card-bg)',borderColor:'var(--cp-border)'}}>
          <div className="flex items-center gap-2">
            <button onClick={()=>fileRef.current?.click()} className="p-2 rounded-xl" style={{backgroundColor:'var(--cp-bg)',color:'var(--cp-text-dim)'}}><Paperclip className="w-4 h-4"/></button>
            <input ref={fileRef} type="file" className="hidden" onChange={async(e)=>{const f=e.target.files[0];if(f){await db.Message.create({client_id:clientUser.clientId,client_name:clientUser.name||'',sender:'client',content:`📎 ${f.name}`,read:false});load();}}}/>
            <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Message your trainer..." className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none" style={{backgroundColor:'var(--cp-bg)',color:'var(--cp-text)',border:'1px solid var(--cp-border)'}}/>
            <button onClick={send} disabled={!newMsg.trim()} className="p-2.5 rounded-xl disabled:opacity-40" style={{backgroundColor:'var(--cp-accent)',color:'white'}}><Send className="w-4 h-4"/></button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
