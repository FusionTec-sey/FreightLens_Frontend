import './App.css';
import { AuthProvider } from './context/AuthContext';
import MainPage from './component/MainPage';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import DraftNavigationProvider from './context/DraftNavigationProvider';
import { OptionsProvider } from './context/OptionsContext'; // ✅ fixed import
import { ConfirmProvider } from './context/ConfirmContext';
import { ThemeProvider } from './context/ThemeContext';
import IdleLogoutProvider from './utils/IdleTimer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ApplicationProviders() {
  // useIdleLogout(15 * 60 * 1000); // 15 minutes
  return (
    <DraftNavigationProvider>
      {/* <IdleLogoutProvider timeoutMs={1 * 60 * 1000} warningMs={60 * 1000}>  */}
        <AuthProvider>
          <ThemeProvider>
            <ConfirmProvider>
              <OptionsProvider>
                <MainPage />
                <ToastContainer position="top-right" autoClose={3000} />
              </OptionsProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </AuthProvider>
      {/* </IdleLogoutProvider> */}
    </DraftNavigationProvider>
  );
}

// Keep existing MainPage routes/providers intact; data-router blocking covers
// sidebar links, programmatic navigation and browser Back/Forward consistently.
const router = createBrowserRouter([{ path: '*', element: <ApplicationProviders /> }]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
