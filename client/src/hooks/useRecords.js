import { useState, useEffect, useCallback, useRef } from "react";
import { recordsApi } from "../utils/api";
import { useSocket } from "../context/SocketContext";

export const useRecords = (filters = {}, onRemoteEvent) => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    Active: 0,
    "Expiring Soon": 0,
    Expired: 0,
    total: 0,
  });
  const [upcomingExpiries, setUpcomingExpiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useSocket();
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const onRemoteEventRef = useRef(onRemoteEvent);
  onRemoteEventRef.current = onRemoteEvent;

  const fetchRecords = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const res = await recordsApi.getAll({ ...filtersRef.current, ...params });
      setRecords(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await recordsApi.getStats();
      setStats(res.data.counts);
      setUpcomingExpiries(res.data.upcomingExpiries || []);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchRecords(), fetchStats()]);
  }, [fetchRecords, fetchStats]);

  // Initial load
  useEffect(() => {
    refresh();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchRecords();
  }, [filters.status, filters.category, filters.search]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleCreate = ({ record, stats: newStats, origin }) => {
      setRecords((prev) => {
        const exists = prev.find((r) => r._id === record._id);
        if (exists) return prev;
        return [record, ...prev];
      });
      if (newStats) setStats(newStats);
      if (origin && origin !== socket.id) {
        onRemoteEventRef.current?.("created", record);
      }
    };

    const handleUpdate = ({ record, stats: newStats, origin }) => {
      setRecords((prev) =>
        prev.map((r) => (r._id === record._id ? record : r))
      );
      if (newStats) setStats(newStats);
      fetchStats(); // Refresh upcoming expiries too
      if (origin && origin !== socket.id) {
        onRemoteEventRef.current?.("updated", record);
      }
    };

    const handleDelete = ({ recordId, stats: newStats, origin }) => {
      setRecords((prev) => prev.filter((r) => r._id !== recordId));
      if (newStats) setStats(newStats);
      if (origin && origin !== socket.id) {
        onRemoteEventRef.current?.("deleted", { _id: recordId });
      }
    };

    const handleRecalculate = ({ stats: newStats }) => {
      if (newStats) setStats(newStats);
      fetchRecords(); // Re-fetch to get updated statuses
    };

    socket.on("record:created", handleCreate);
    socket.on("record:updated", handleUpdate);
    socket.on("record:deleted", handleDelete);
    socket.on("records:recalculated", handleRecalculate);

    return () => {
      socket.off("record:created", handleCreate);
      socket.off("record:updated", handleUpdate);
      socket.off("record:deleted", handleDelete);
      socket.off("records:recalculated", handleRecalculate);
    };
  }, [socket, fetchRecords, fetchStats]);

  // CRUD operations
  const createRecord = async (data) => {
    const res = await recordsApi.create(data);
    return res.data;
  };

  const updateRecord = async (id, data) => {
    const res = await recordsApi.update(id, data);
    return res.data;
  };

  const deleteRecord = async (id) => {
    await recordsApi.delete(id);
  };

  return {
    records,
    stats,
    upcomingExpiries,
    loading,
    error,
    refresh,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
