import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Interview } from "./pages/Interview";
import { InterviewSetup } from "./pages/InterviewSetup";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/AppLayout";
import { ThemeProvider } from "./hooks/ThemeProvider";
import { AuthProvider } from "./hooks/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";

function App() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <Register />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/interview"
                  element={
                    <ProtectedRoute>
                      <InterviewSetup />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/interview/session"
                  element={
                    <ProtectedRoute>
                      <Interview />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
