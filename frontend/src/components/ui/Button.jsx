export default function Button({ children, variant='default', size='md', onClick, disabled, type='button', style={} }) {
  const sizes = { sm:{fontSize:12,padding:'5px 10px'}, md:{fontSize:13,padding:'8px 14px'}, lg:{fontSize:14,padding:'10px 18px'} }
  const variants = { default:{background:'transparent',borderColor:'var(--border)',color:'var(--text)'}, primary:{background:'var(--accent)',borderColor:'var(--accent)',color:'#fff'}, danger:{background:'var(--danger-light)',borderColor:'var(--danger)',color:'var(--danger)'} }
  return <button type={type} onClick={onClick} disabled={disabled} style={{ display:'inline-flex', alignItems:'center', gap:6, borderRadius:8, fontWeight:500, border:'1px solid', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, transition:'all .15s', fontFamily:'inherit', ...sizes[size], ...variants[variant], ...style }}>{children}</button>
}
