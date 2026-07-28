import { useState, useEffect } from 'react';

export default function TrafficTable() {
  const [trafficData, setTrafficData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchTraffic = async () => {
      try {
        // Replace this endpoint with your actual backend API URL
        const response = await fetch('/api/traffic');
        const data = await response.json();

        if (isMounted) {
          setTrafficData(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch traffic data:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTraffic();

    return () => {
      isMounted = false; // Cleanup to prevent state updates if unmounted
    };
  }, []);

  if (loading) return <div>Loading traffic data...</div>;

  return (
    <div className="traffic-table-container">
      <h2>Traffic Overview</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {trafficData.map((item, index) => (
            <tr key={item.id || index}>
              <td>{item.id}</td>
              <td>{item.location}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}