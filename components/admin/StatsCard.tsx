interface Props {
  title:  string
  value:  string | number
  sub?:   string
  icon?:  string
  trend?: 'up' | 'down' | 'neutral'
}

export default function StatsCard({ title, value, sub, icon, trend }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      {sub && (
        <p className={`text-sm mt-1 font-medium ${
          trend === 'up'   ? 'text-green-500' :
          trend === 'down' ? 'text-red-500'   : 'text-gray-400'
        }`}>
          {trend === 'up' && '↑ '}{trend === 'down' && '↓ '}{sub}
        </p>
      )}
    </div>
  )
}
