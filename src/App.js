import './App.css';
import { AuthProvider } from './context/AuthContext';
import MainPage from './component/MainPage';
import { BrowserRouter } from 'react-router-dom';
import { OptionsProvider } from './context/OptionsContext'; // ✅ fixed import
import { ConfirmProvider } from './context/ConfirmContext';
import { ThemeProvider } from './context/ThemeContext';
import IdleLogoutProvider from './utils/IdleTimer';
function App() {
  // useIdleLogout(15 * 60 * 1000); // 15 minutes
  return (
    <BrowserRouter>
      {/* <IdleLogoutProvider timeoutMs={1 * 60 * 1000} warningMs={60 * 1000}>  */}
        <AuthProvider>
          <ThemeProvider>
            <ConfirmProvider>
              <OptionsProvider>
                <MainPage />
              </OptionsProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </AuthProvider>
      {/* </IdleLogoutProvider> */}
    </BrowserRouter>
  );
}

export default App;
