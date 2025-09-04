import './App.css';
import { AuthProvider } from './context/AuthContext';
import MainPage from './component/MainPage';
import { BrowserRouter } from 'react-router-dom';
import { OptionsProvider } from './context/OptionsContext'; // ✅ fixed import

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OptionsProvider>
          <MainPage />
        </OptionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
