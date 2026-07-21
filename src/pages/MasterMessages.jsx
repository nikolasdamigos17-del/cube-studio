import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Send, Search, MessageCircle, Paperclip, Image, Link2, X, Plus, Users, Check, Trash2 } from 'lucide-react';
import { db } from '../lib/db';

function CreateGroupModal({ clients, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const toggle = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const save = async () => {
    if (!name.trim()||selected.length===0) return;
    setSaving(true);
    await db.Group.create({ name:name.trim(), member_ids:selected, created_date:new Date().toISOString() });
    setSaving(false); onCreated(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">Create Group Chat</h2><button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button></div>
        <div className="mb-4"><label className="text-xs font-semibold text-gray-500 uppercase">Group Name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Monday Group Training" className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"/></div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Members *</p>
        <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
          {clients.map(c=>(
            <button key={c.id} onClick={()=>toggle(c.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selected.includes(c.id)?'border-gray-900 bg-gray-50':'border-gray-100 hover:border-gray-200'}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
              <span className="text-sm font-medium text-gray-900 flex-1 text-left">{c.name}</span>
              {selected.includes(c.id)&&<Check className="w-4 h-4 text-gray-900"/>}
            </button>
          ))}
        </div>
        <div className="flex gap-2"><button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm">Cancel</button><button onClick={save} disabled={saving||!name.trim()||selected.length===0} className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">{saving?'Creating…':'Create Group'}</button></div>
      </div>
    </div>
  );
}

export default function MasterMessages() {
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null); // {type:'client'|'group', id, name, color}
  const [newMsg, setNewMsg] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const load = async () => {
    const [c, g, m] = await Promise.all([db.Client.list('name'), db.Group.list('name'), db.Message.list('created_date',500)]);
    setClients(c); setGroups(g); setMessages(m);
  };
  useEffect(()=>{ load(); const iv=setInterval(load,5000); return()=>clearInterval(iv); },[]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages,selected]);

  const markRead = async (threadId) => {
    const unread = messages.filter(m=>m.thread_id===threadId&&m.sender==='client'&&!m.read);
    await Promise.all(unread.map(m=>db.Message.update(m.id,{read:true})));
  };

  const selectThread = async (item) => {
    setSelected(item);
    await markRead(item.id);
    load();
  };

  const sendMsg = async () => {
    if (!newMsg.trim()||!selected) return;
    const isGroup = selected.type==='group';
    await db.Message.create({
      thread_id: selected.id,
      thread_type: selected.type,
      client_id: isGroup ? '' : selected.id,
      client_name: selected.name,
      sender: 'trainer',
      content: newMsg.trim(),
      read: true,
    });
    setNewMsg(''); load();
  };

  const getThreadMsgs = (id) => messages.filter(m=>m.thread_id===id).sort((a,b)=>a.created_date?.localeCompare(b.created_date));
  const getLastMsg = (id) => { const m=messages.filter(x=>x.thread_id===id); return m[m.length-1]; };
  const getUnread = (id) => messages.filter(m=>m.thread_id===id&&m.sender==='client'&&!m.read).length;
  const totalUnread = messages.filter(m=>m.sender==='client'&&!m.read).length;

  const allThreads = [
    ...clients.map(c=>({type:'client',id:c.id,name:c.name,color:c.theme_color||'#6366f1',avatar:c.name?.charAt(0)})),
    ...groups.map(g=>({type:'group',id:g.id,name:g.name,color:'#64748b',avatar:'👥',memberCount:g.member_ids?.length||0})),
  ].filter(t=>t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> Messages {totalUnread>0&&<span className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">{totalUnread}</span>}</h2>
            <button onClick={()=>setShowCreateGroup(true)} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200" title="Create group chat"><Users className="w-3.5 h-3.5 text-gray-600"/></button>
          </div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none"/></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.length>0&&<p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase">Groups</p>}
          {allThreads.filter(t=>t.type==='group').map(t=>{
            const last=getLastMsg(t.id); const unread=getUnread(t.id);
            return (
              <button key={t.id} onClick={()=>selectThread(t)} className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 ${selected?.id===t.id?'bg-gray-100':''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">👥</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p><p className="text-xs text-gray-400">{t.memberCount} members{last?` · ${last.content?.slice(0,20)}...`:''}</p></div>
                  {unread>0&&<span className="w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">{unread}</span>}
                </div>
              </button>
            );
          })}
          {clients.length>0&&<p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase">Direct</p>}
          {allThreads.filter(t=>t.type==='client').map(t=>{
            const last=getLastMsg(t.id); const unread=getUnread(t.id);
            return (
              <button key={t.id} onClick={()=>selectThread(t)} className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 ${selected?.id===t.id?'bg-indigo-50 border-l-2 border-indigo-400':''}`}>
                <div className="flex items-center gap-3">
                  <div className="relative"><div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{backgroundColor:t.color}}>{t.avatar}</div>{unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">{unread}</span>}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${unread>0?'font-bold text-gray-900':'font-medium text-gray-800'}`}>{t.name}</p>
                    {last&&<p className="text-xs truncate text-gray-400">{last.sender==='trainer'?'You: ':''}{last.content}</p>}
                    {!last&&<p className="text-xs text-gray-400">No messages yet</p>}
                  </div>
                  {last&&<p className="text-xs text-gray-400 flex-shrink-0">{format(parseISO(last.created_date),'HH:mm')}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            {selected.type==='group'
              ? <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">👥</div>
              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{backgroundColor:selected.color}}>{selected.avatar}</div>
            }
            <div>
              <p className="font-semibold text-gray-900 text-sm">{selected.name}</p>
              <p className="text-xs text-gray-400">{selected.type==='group'?`${groups.find(g=>g.id===selected.id)?.member_ids?.length||0} members`:'Client'}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
            {getThreadMsgs(selected.id).length===0&&<div className="text-center py-12 text-gray-400 text-sm">No messages yet. Say hello! 👋</div>}
            {getThreadMsgs(selected.id).map(m=>{
              const isTrainer=m.sender==='trainer';
              return (
                <div key={m.id} className={`flex ${isTrainer?'justify-end':'justify-start'}`}>
                  {!isTrainer&&<div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 mt-auto flex-shrink-0" style={{backgroundColor:selected.color}}>{selected.avatar?.charAt?.(0)||'?'}</div>}
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isTrainer?'bg-gray-900 text-white rounded-br-none':'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                    {selected.type==='group'&&!isTrainer&&<p className="text-xs font-semibold mb-1" style={{color:selected.color}}>{m.client_name}</p>}
                    <p>{m.content}</p>
                    <p className={`text-xs mt-1 ${isTrainer?'text-gray-400':'text-gray-400'}`}>{format(parseISO(m.created_date),'HH:mm')}</p>
                  </div>
                  {isTrainer&&<div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold ml-2 mt-auto">T</div>}
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <button onClick={()=>fileRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><Paperclip className="w-4 h-4"/></button>
              <input ref={fileRef} type="file" className="hidden" onChange={async(e)=>{const f=e.target.files[0];if(f){await db.Message.create({thread_id:selected.id,thread_type:selected.type,client_id:selected.type==='client'?selected.id:'',client_name:selected.name,sender:'trainer',content:`📎 File: ${f.name}`,read:true});load();}}}/>
              <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMsg()} placeholder={`Message ${selected.name}...`} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-300"/>
              <button onClick={sendMsg} disabled={!newMsg.trim()} className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40"><Send className="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>Select a client or group to start messaging</p></div>
        </div>
      )}
      {showCreateGroup&&<CreateGroupModal clients={clients} onClose={()=>setShowCreateGroup(false)} onCreated={load}/>}
    </div>
  );
}
