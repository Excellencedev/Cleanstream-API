import { Layout } from './components/Layout';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Introduction } from './pages/Introduction';
import { GettingStarted } from './pages/GettingStarted';
import { APIReference } from './pages/APIReference';
import { Features } from './pages/Features';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Introduction />} />
          <Route path="getting-started" element={<GettingStarted />} />
          <Route path="api-reference" element={<APIReference />} />
          <Route path="features" element={<Features />} />
          <Route path="normalization" element={<Features />} /> {/* Reuse for now */}
          <Route path="audit" element={<Features />} /> {/* Reuse for now */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
