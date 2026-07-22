const C = { green:{bg:'var(--accent-light)',color:'var(--accent-dark)'}, amber:{bg:'var(--warn-light)',color:'var(--warn)'}, coral:{bg:'var(--danger-light)',color:'var(--danger)'}, blue:{bg:'var(--info-light)',color:'var(--info)'}, gray:{bg:'#f0f0ea',color:'#666'} }
export default function Badge({ label, color='gray' }) {
  const c = C[color] || C.gray
  return <span style={{ ...c, fontSize:11, fontWeight:500, padding:'3px 8px', borderRadius:20, display:'inline-block', whiteSpace:'nowrap' }}>{label}</span>
}
