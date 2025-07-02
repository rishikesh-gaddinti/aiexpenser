import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useExpenses } from '../contexts/ExpenseContext';
import { useToast } from '@/hooks/use-toast';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

const Reports = () => {
  const { expenses, categories } = useExpenses();
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [reportType, setReportType] = useState('summary');
  const [includeIncome, setIncludeIncome] = useState<boolean>(true);
  const [includeExpenses, setIncludeExpenses] = useState<boolean>(true);

  // Filter expenses based on date range and selected categories
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    const isInDateRange = dateRange?.from && dateRange?.to ? 
      expenseDate >= dateRange.from && expenseDate <= dateRange.to : true;
    const isInSelectedCategories = selectedCategories.length === 0 || selectedCategories.includes(expense.category);
    const typeFilter = (includeIncome && expense.type === 'income') || (includeExpenses && expense.type === 'expense');
    
    return isInDateRange && isInSelectedCategories && typeFilter;
  });

  // Generate report data
  const reportData = {
    totalIncome: filteredExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0),
    totalExpenses: filteredExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0),
    netAmount: 0,
    transactionCount: filteredExpenses.length,
    categoryBreakdown: categories.map(category => {
      const categoryExpenses = filteredExpenses.filter(e => e.category === category.name);
      const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        name: category.name,
        icon: category.icon,
        color: category.color,
        total,
        count: categoryExpenses.length,
        percentage: filteredExpenses.length > 0 ? (total / filteredExpenses.reduce((sum, e) => sum + e.amount, 0)) * 100 : 0
      };
    }).filter(cat => cat.total > 0)
  };

  reportData.netAmount = reportData.totalIncome - reportData.totalExpenses;

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('EXPENSER - Financial Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Period: ${dateRange?.from?.toLocaleDateString()} - ${dateRange?.to?.toLocaleDateString()}`, 20, 35);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);

    // Summary section
    doc.setFontSize(16);
    doc.text('Summary', 20, 65);
    
    const summaryData = [
      ['Total Income', `$${reportData.totalIncome.toFixed(2)}`],
      ['Total Expenses', `$${reportData.totalExpenses.toFixed(2)}`],
      ['Net Amount', `$${reportData.netAmount.toFixed(2)}`],
      ['Total Transactions', reportData.transactionCount.toString()]
    ];

    doc.autoTable({
      startY: 75,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid'
    });

    // Category breakdown
    if (reportData.categoryBreakdown.length > 0) {
      doc.text('Category Breakdown', 20, doc.lastAutoTable.finalY + 20);
      
      const categoryData = reportData.categoryBreakdown.map(cat => [
        cat.name,
        cat.count.toString(),
        `$${cat.total.toFixed(2)}`,
        `${cat.percentage.toFixed(1)}%`
      ]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 30,
        head: [['Category', 'Transactions', 'Amount', 'Percentage']],
        body: categoryData,
        theme: 'grid'
      });
    }

    // Detailed transactions
    if (reportType === 'detailed' && filteredExpenses.length > 0) {
      doc.addPage();
      doc.text('Detailed Transactions', 20, 20);
      
      const transactionData = filteredExpenses.map(expense => [
        new Date(expense.date).toLocaleDateString(),
        expense.description,
        expense.category,
        expense.type,
        `$${expense.amount.toFixed(2)}`
      ]);

      doc.autoTable({
        startY: 35,
        head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
        body: transactionData,
        theme: 'grid'
      });
    }

    doc.save(`expenser-report-${dateRange?.from?.toISOString().split('T')[0]}-to-${dateRange?.to?.toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF report downloaded successfully!",
      description: "Your financial report has been saved.",
    });
  };

  const generateCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Tags'];
    const csvData = [
      headers.join(','),
      ...filteredExpenses.map(expense => [
        expense.date,
        `"${expense.description}"`,
        `"${expense.category}"`,
        expense.type,
        expense.amount.toFixed(2),
        `"${expense.tags?.join(';') || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenser-data-${dateRange?.from?.toISOString().split('T')[0]}-to-${dateRange?.to?.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV data exported successfully!",
      description: "Your transaction data has been downloaded.",
    });
  };

  const generateJSON = () => {
    const jsonData = {
      reportMetadata: {
        generatedOn: new Date().toISOString(),
        dateRange: {
          from: dateRange?.from?.toISOString(),
          to: dateRange?.to?.toISOString()
        },
        filters: {
          categories: selectedCategories,
          includeIncome,
          includeExpenses
        }
      },
      summary: reportData,
      transactions: filteredExpenses
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenser-report-${dateRange?.from?.toISOString().split('T')[0]}-to-${dateRange?.to?.toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "JSON report exported successfully!",
      description: "Your complete report data has been downloaded.",
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleIncomeChange = (checked: boolean) => {
    setIncludeIncome(checked);
  };

  const handleExpensesChange = (checked: boolean) => {
    setIncludeExpenses(checked);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate detailed financial reports and export your data</p>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Configuration
          </CardTitle>
          <CardDescription>Customize your report parameters and filters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={handleDateRangeChange}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction Types</label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-income"
                    checked={includeIncome}
                    onCheckedChange={handleIncomeChange}
                  />
                  <label htmlFor="include-income" className="text-sm">Include Income</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-expenses"
                    checked={includeExpenses}
                    onCheckedChange={handleExpensesChange}
                  />
                  <label htmlFor="include-expenses" className="text-sm">Include Expenses</label>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Categories (optional)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const isSelected = selectedCategories.includes(category.name);
                return (
                  <Badge
                    key={category.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategories(prev => prev.filter(c => c !== category.name));
                      } else {
                        setSelectedCategories(prev => [...prev, category.name]);
                      }
                    }}
                  >
                    {category.icon} {category.name}
                  </Badge>
                );
              })}
            </div>
            {selectedCategories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategories([])}
                className="text-muted-foreground"
              >
                Clear all filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${reportData.totalIncome.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${reportData.totalExpenses.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reportData.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${reportData.netAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.transactionCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {reportData.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Spending distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.categoryBreakdown.map(category => (
                <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: category.color + '20', color: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{category.count} transactions</p>
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
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Options
          </CardTitle>
          <CardDescription>Download your financial data in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={generatePDF} className="h-20 flex flex-col items-center gap-2">
              <FileText className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">PDF Report</div>
                <div className="text-xs text-muted-foreground">Professional formatted report</div>
              </div>
            </Button>
            
            <Button onClick={generateCSV} variant="outline" className="h-20 flex flex-col items-center gap-2">
              <Download className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">CSV Export</div>
                <div className="text-xs text-muted-foreground">Spreadsheet compatible data</div>
              </div>
            </Button>
            
            <Button onClick={generateJSON} variant="outline" className="h-20 flex flex-col items-center gap-2">
              <Download className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">JSON Export</div>
                <div className="text-xs text-muted-foreground">Raw data with full details</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {filteredExpenses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No data found</h3>
            <p className="text-muted-foreground text-center">
              No transactions match your current filters. Try adjusting the date range or category filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
