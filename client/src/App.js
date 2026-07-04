import React from "react";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <Dashboard />
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
