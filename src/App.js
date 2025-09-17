import './App.css';
import { AuthProvider } from './context/AuthContext';
import MainPage from './component/MainPage';
import { BrowserRouter } from 'react-router-dom';
import { OptionsProvider } from './context/OptionsContext'; // ✅ fixed import
import { ThemeProvider } from './context/ThemeContext';
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <OptionsProvider>
            <MainPage />
          </OptionsProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
