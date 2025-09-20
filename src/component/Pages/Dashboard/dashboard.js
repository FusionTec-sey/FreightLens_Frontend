import React, { useEffect, useState } from "react";
import {
  Package,
  Truck,
  Anchor,
  BadgeCheck,
  CheckCircle,
  BarChart2,
} from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 125,
    inTransit: 40,
    onPort: 30,
    gatePass: 25,
    arrived: 30,
    emptied: 10,
  });

  const [arrivedContainers, setArrivedContainers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => (2020 + i).toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [yearlyData, setYearlyData] = useState(Array(12).fill(0));
  const { theme } = useTheme();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const chartData = {
    labels: months,
    datasets: [
      {
        label: "Containers",
        data: yearlyData,
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 10 },
      },
    },
  };

  const cards = [
    { label: "Total Containers", key: "total", icon: <Package size={24} />, bg: "bg-gray-100 text-gray-700" },
    { label: "In Transit", key: "inTransit", icon: <Truck size={24} />, bg: "bg-yellow-100 text-yellow-600" },
    { label: "On Port", key: "onPort", icon: <Anchor size={24} />, bg: "bg-blue-100 text-blue-600" },
    { label: "Gate Pass Issued", key: "gatePass", icon: <BadgeCheck size={24} />, bg: "bg-purple-100 text-purple-600" },
    { label: "Emptied", key: "emptied", icon: <Package size={24} />, bg: "bg-green-100 text-green-700" },

  ];

  useEffect(() => {
    async function getDashboardInfo() {
      try {
        setIsLoading(true);
        const res = await axios.get(`http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/getDashboardInfo`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        let data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        setStats({
          total: data.TotalContainer,
          inTransit: data.InTransit,
          onPort: data.OnPort,
          gatePass: data.GatePass,
          arrived: data.Arrived,
          emptied: data.Emptied,
        });
        // console.log(data.ArrivedAtLocation)
        setArrivedContainers(data.ArrivedAtLocation || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    getDashboardInfo();
  }, []);

  useEffect(() => {
    async function updateGraph() {
      try {
        setIsChartLoading(true);
        const res = await axios.get(`http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/getContainerCountsByMonth/${selectedYear}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        setYearlyData(data || []);
      } catch (err) {
        console.error("Graph data fetch error:", err);
      } finally {
        setIsChartLoading(false);
      }
    }
    updateGraph();
  }, [selectedYear]);

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="rounded-xl border-2 border-gray-200 shadow-sm p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-12"></div>
        </div>
        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );

  return (
    <div className={`p-4 sm:p-6 h-full ${theme.background} ${theme.text}`}>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          cards.map((card, i) => (
            <div
              key={i}
              className={`group rounded-xl border-2 border-gray-200 shadow-sm p-4 flex items-center justify-between hover:shadow-lg hover:scale-[1.02] transition-all duration-300 ${theme.border} ${theme.background} hover:border-blue-300`}
            >
            <div>
              <h2 className={`text-sm font-medium uppercase ${theme.profileText} group-hover:text-gray-300 transition-colors`}>{card.label}</h2>
              <p className={`text-2xl font-bold ${theme.text} group-hover:text-blue-400 transition-colors`}>{stats[card.key]}</p>
              </div>
              <div className={`${card.bg} p-3 rounded-full group-hover:scale-110 transition-transform duration-300`}>{card.icon}</div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4">
        <div className={`h-max border-2 rounded-xl p-4 shadow-sm lg:col-span-1 hover:shadow-md transition-shadow ${theme.border} ${theme.background}`}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className={`text-sm font-medium uppercase ${theme.profileText}`}>Arrived</h2>
              <p className={`text-2xl font-bold ${theme.text}`}>{stats.arrived}</p>
            </div>
            <div className="p-3 rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle size={24} />
            </div>
          </div>
          <div className={`overflow-y-auto max-h-52 border-2 rounded ${theme.scrollbar} ${theme.border}`}>
            <table className="w-full text-sm">
              <thead className={`sticky top-0 ${theme.tableHeader} border-b ${theme.border}`}>
                <tr>
                  <th className={`p-2 text-left text-xs font-semibold ${theme.text}`}>Container</th>
                  <th className={`p-2 text-left text-xs font-semibold ${theme.text}`}>Location</th>
                </tr>
              </thead>
              <tbody>
                {arrivedContainers.map((c, i) => (
                  <tr key={i} className={`border-t ${theme.border} ${theme.tableRow} transition-colors`}>
                    <td className={`p-2 font-medium ${theme.tableText}`}>{c.container_no}</td>
                    <td className={`p-2 ${theme.tableMutedText}`}>{c.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`border rounded-xl p-4 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow ${theme.border} ${theme.background}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div>
              <h2 className={`text-lg font-semibold ${theme.text}`}>Containers per Month</h2>
              <p className={`text-sm ${theme.profileText}`}>Yearly overview with monthly breakdown</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                className={`border ${theme.border} rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 ${theme.text} ${theme.background} hover:border-gray-400 transition-colors`}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="p-2 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 transition-colors">
                <BarChart2 size={20} />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <span className={`font-medium ${theme.profileText}`}>Total containers in {selectedYear}: </span>
            <span className={`font-bold text-lg ${theme.accentText}`}>
              {yearlyData.reduce((sum, val) => sum + val, 0)}
            </span>
          </div>

          <div className="h-[30vh] w-full overflow-x-auto ">
            <Bar data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
