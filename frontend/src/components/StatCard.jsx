const StatCard = ({ title, value, icon: Icon, trend, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    yellow: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
  };

  return (
    <div className="card hover:shadow-2xl hover:shadow-primary-600/10 hover:border-dark-600 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
