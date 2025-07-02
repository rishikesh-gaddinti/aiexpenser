
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExpenses } from '../contexts/ExpenseContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, PieChart as PieChartIcon } from 'lucide-react';

const Analytics = () => {
  const { expenses, categories } = useExpenses();
  const [timeRange, setTimeRange] = useState('3months');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter expenses based on time range
  const getFilteredExpenses = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const matchesTimeRange = expenseDate >= startDate;
      const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
      return matchesTimeRange && matchesCategory;
    });
  };

  const filteredExpenses = getFilteredExpenses();

  // Calculate summary statistics
  const totalIncome = filteredExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = filteredExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const avgDailySpending = totalExpenses / Math.max(1, Math.ceil((new Date().getTime() - new Date(Math.min(...filteredExpenses.map(e => new Date(e.date).getTime()))).getTime()) / (1000 * 60 * 60 * 24)));

  // Monthly trend data
  const monthlyTrend = filteredExpenses.reduce((acc, expense) => {
    const monthYear = new Date(expense.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const existing = acc.find(item => item.period === monthYear);
    
    if (existing) {
      if (expense.type === 'income') {
        existing.income += expense.amount;
      } else {
        existing.expenses += expense.amount;
      }
      existing.net = existing.income - existing.expenses;
    } else {
      acc.push({
        period: monthYear,
        income: expense.type === 'income' ? expense.amount : 0,
        expenses: expense.type === 'expense' ? expense.amount : 0,
        net: expense.type === 'income' ? expense.amount : -expense.amount,
      });
    }
    
    return acc;
  }, []).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

  // Category breakdown
  const categoryBreakdown = categories.map(category => {
    const categoryExpenses = filteredExpenses.filter(e => e.category === category.name);
    const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    const count = categoryExpenses.length;
    const avgAmount = count > 0 ? total / count : 0;
    
    return {
      name: category.name,
      total,
      count,
      avgAmount,
      color: category.color,
      icon: category.icon,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
    };
  }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);

  // Daily spending pattern
  const dailyPattern = Array.from({ length: 7 }, (_, i) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i];
    const dayExpenses = filteredExpenses.filter(e => {
      const expenseDay = new Date(e.date).getDay();
      return expenseDay === i && e.type === 'expense';
    });
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      day: dayName.slice(0, 3),
      amount: total,
      count: dayExpenses.length
    };
  });

  // Top spending days
  const topSpendingDays = filteredExpenses
    .filter(e => e.type === 'expense')
    .reduce((acc, expense) => {
      const date = expense.date;
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.amount += expense.amount;
        existing.count += 1;
      } else {
        acc.push({
          date,
          amount: expense.amount,
          count: 1,
          description: expense.description
        });
      }
      
      return acc;
    }, [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">Deep insights into your financial patterns</p>
        </div>
        <div className="flex space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.name}>
                  {category.icon} {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="financial-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'expense-positive' : 'expense-negative'}`}>
              ${netBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netBalance >= 0 ? 'Surplus' : 'Deficit'} for selected period
            </p>
          </CardContent>
        </Card>

        <Card className="financial-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Spending</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgDailySpending.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {filteredExpenses.filter(e => e.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="financial-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoryBreakdown[0]?.name || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${categoryBreakdown[0]?.total.toFixed(2) || '0.00'} spent
            </p>
          </CardContent>
        </Card>

        <Card className="financial-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredExpenses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total transactions recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Monthly Income vs Expenses</CardTitle>
                <CardDescription>Track your financial flow over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Net Balance Trend</CardTitle>
                <CardDescription>Your financial balance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Visual breakdown of your expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
                <CardDescription>Detailed breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {categoryBreakdown.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium">{category.icon} {category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.count} transactions • Avg: ${category.avgAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${category.total.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Spending by Day of Week</CardTitle>
                <CardDescription>Identify your spending patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyPattern}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Top Spending Days</CardTitle>
                <CardDescription>Your highest expense days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topSpendingDays.map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {day.count} transaction{day.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold expense-negative">${day.amount.toFixed(2)}</p>
                        <div className="flex items-center">
                          <span className="text-lg mr-1">#{index + 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Financial Health Score</CardTitle>
                <CardDescription>Based on your spending patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {Math.max(0, Math.min(100, Math.round((netBalance / Math.max(totalIncome, 1)) * 100 + 50))).toFixed(0)}
                  </div>
                  <p className="text-lg font-semibold mb-4">Financial Health Score</p>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex justify-between">
                      <span>Income vs Expenses:</span>
                      <span className={netBalance >= 0 ? 'expense-positive' : 'expense-negative'}>
                        {netBalance >= 0 ? 'Positive' : 'Negative'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Savings Rate:</span>
                      <span>{totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transaction Frequency:</span>
                      <span>{filteredExpenses.length} transactions</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="financial-card">
              <CardHeader>
                <CardTitle>Smart Recommendations</CardTitle>
                <CardDescription>AI-powered financial advice</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {netBalance < 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        ⚠️ You're spending more than you earn. Consider reducing expenses in your top categories.
                      </p>
                    </div>
                  )}
                  
                  {categoryBreakdown[0] && categoryBreakdown[0].percentage > 40 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        💡 {categoryBreakdown[0].percentage.toFixed(1)}% of your expenses are in {categoryBreakdown[0].name}. Consider setting a budget for this category.
                      </p>
                    </div>
                  )}
                  
                  {avgDailySpending > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        📊 Your average daily spending is ${avgDailySpending.toFixed(2)}. Track this to meet your monthly budget goals.
                      </p>
                    </div>
                  )}
                  
                  {netBalance > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✅ Great job! You're maintaining a positive balance. Consider setting up an emergency fund with your surplus.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
