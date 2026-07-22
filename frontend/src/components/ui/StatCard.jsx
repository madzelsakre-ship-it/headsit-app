export default function StatCard({ label, value, sub, subColor, icon: Icon, iconColor }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{label}</div>
        {Icon && <Icon size={18} color={iconColor || 'var(--muted)'}/>}
      </div>
      <div style={{ fontSize:24, fontWeight:600 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color: subColor || 'var(--muted)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}
